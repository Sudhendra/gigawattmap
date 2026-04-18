"""Tests for the Nominatim geocoder wrapper."""

from __future__ import annotations

import time

from opendc.sources import geocode


def test_confidence_bands() -> None:
    f = geocode._confidence_from_importance
    assert f(0.95) == "high"
    assert f(0.7) == "high"
    assert f(0.55) == "medium"
    assert f(0.4) == "low"
    assert f(None) == "low"


def test_rate_limiter_enforces_minimum_interval() -> None:
    """Two acquisitions back-to-back should never be closer than the policy floor."""
    limiter = geocode._RateLimiter(min_interval=0.1)
    limiter.acquire()
    started = time.monotonic()
    limiter.acquire()
    elapsed = time.monotonic() - started
    assert elapsed >= 0.09  # allow tiny scheduler jitter


def test_geocode_empty_query_returns_none() -> None:
    """No network roundtrip for whitespace-only queries."""
    assert geocode.geocode("   ") is None
