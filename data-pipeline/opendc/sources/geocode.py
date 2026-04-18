"""Nominatim (OpenStreetMap) geocoder with strict rate limiting.

Built as a defensive fallback for sources that occasionally ship rows
without coordinates. The opposition tracker (task 018) is the first
caller; later sources (curated press-release ingest, FOIA filings) will
reuse this helper rather than re-implement Nominatim politeness.

Nominatim's `usage policy <https://operations.osmfoundation.org/policies/nominatim/>`_
caps free-tier requests at **1 per second** with a "valid HTTP referer
or User-Agent". We honour both: the shared :func:`opendc.utils.http.get_http_client`
sets the project UA, and a process-local token bucket here enforces the
1 req/sec floor across concurrent calls within a single ingest run.

The module exposes a single :func:`geocode` function returning
``(lat, lon, confidence)`` or ``None`` when nothing matches. Confidence
is mapped from Nominatim's ``importance`` score so callers (and the UI)
can warn when a result is a country centroid masquerading as a town.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Literal

from opendc.utils.http import get_http_client

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# Nominatim free-tier policy floor; do NOT lower without switching to a
# self-hosted instance or a paid provider.
MIN_INTERVAL_S = 1.0

GeocodeConfidence = Literal["high", "medium", "low"]


@dataclass(frozen=True, slots=True)
class GeocodeResult:
    lat: float
    lon: float
    confidence: GeocodeConfidence
    display_name: str


# Process-local rate-limit gate. A class wrapping the lock + last-call
# timestamp keeps the policy testable: tests can substitute a fresh
# instance to avoid sleeping on every assertion.
class _RateLimiter:
    """Block until at least ``min_interval`` seconds have passed since the prior call."""

    def __init__(self, min_interval: float = MIN_INTERVAL_S) -> None:
        self._min_interval = min_interval
        self._lock = threading.Lock()
        self._last_call: float = 0.0

    def acquire(self) -> None:
        with self._lock:
            now = time.monotonic()
            wait = self._min_interval - (now - self._last_call)
            if wait > 0:
                time.sleep(wait)
            self._last_call = time.monotonic()


_GLOBAL_LIMITER = _RateLimiter()


def _confidence_from_importance(importance: float | None) -> GeocodeConfidence:
    """Translate Nominatim's importance score (0..1) into a UI-facing band.

    The cutoffs are deliberately strict — Nominatim's importance reflects
    Wikipedia popularity more than spatial precision, so anything below
    0.5 typically means "no specific match, here's a country/region
    centroid". Surfacing that as ``"low"`` lets the card warn explicitly.
    """
    if importance is None:
        return "low"
    if importance >= 0.7:
        return "high"
    if importance >= 0.5:
        return "medium"
    return "low"


def geocode(
    query: str,
    *,
    country_code: str | None = None,
    limiter: _RateLimiter | None = None,
) -> GeocodeResult | None:
    """Look up ``query`` via Nominatim. Returns ``None`` on no match.

    ``country_code`` is the ISO 3166-1 alpha-2 hint (e.g. ``"US"``) that
    Nominatim uses to prune unrelated matches; pass it whenever the
    caller knows it. Network errors propagate so the caller can decide
    whether to skip the row or fail the run.
    """
    if not query.strip():
        return None
    (limiter or _GLOBAL_LIMITER).acquire()

    params: dict[str, str] = {
        "q": query,
        "format": "jsonv2",
        "limit": "1",
        "addressdetails": "0",
    }
    if country_code:
        params["countrycodes"] = country_code.lower()

    with get_http_client() as client:
        resp = client.get(NOMINATIM_URL, params=params)
        resp.raise_for_status()
        rows = resp.json()
    if not rows:
        return None
    top = rows[0]
    try:
        lat = float(top["lat"])
        lon = float(top["lon"])
    except (KeyError, TypeError, ValueError) as exc:
        logger.warning("nominatim returned malformed lat/lon for %r: %s", query, exc)
        return None
    importance = top.get("importance")
    return GeocodeResult(
        lat=lat,
        lon=lon,
        confidence=_confidence_from_importance(
            float(importance) if isinstance(importance, (int, float)) else None
        ),
        display_name=str(top.get("display_name", "")),
    )
