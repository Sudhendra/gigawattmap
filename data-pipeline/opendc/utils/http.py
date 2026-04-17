"""Shared HTTP client.

Every external fetch in the pipeline goes through :func:`get_http_client`
so we apply timeout, retry, and User-Agent identity in exactly one place.
The retry policy is conservative (5 attempts, exponential backoff) because
several of our upstreams (Overpass, GEM) rate-limit aggressively and a
flapping ingest run is worse than a slow one.
"""

from __future__ import annotations

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

# Identifies our crawler to upstreams. URL is included so a sysop seeing
# our requests in their logs can find us without hunting. If you fork the
# project, change this — leaving it pointed at gigawattmap would be rude
# and would mis-attribute load against our reputation budget.
USER_AGENT = "Gigawatt Map / 0.1 — https://gigawattmap.com"

# 30s is generous for HTTP fetches but Overpass commonly needs more for
# country-scale queries; modules that need longer pass their own timeout
# to ``client.get(...)`` rather than mutating the default here.
DEFAULT_TIMEOUT_S = 30.0


def get_http_client(timeout: float = DEFAULT_TIMEOUT_S) -> httpx.Client:
    """Return a configured :class:`httpx.Client`.

    The caller is responsible for closing the client (use ``with`` blocks
    in real code). HTTP/2 is enabled because most of our upstreams support
    it and it cuts handshake cost when we re-use the client across many
    requests, which the ingest jobs do.
    """
    return httpx.Client(
        timeout=httpx.Timeout(timeout),
        headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip, deflate"},
        follow_redirects=True,
        http2=False,  # http2 needs the optional `h2` dep; revisit when warranted
    )


# A network-error retry decorator the rest of the codebase can apply to
# specific fetch functions. We deliberately don't wrap the client itself —
# some calls (e.g. probing an unknown URL) should fail fast.
retry_network = retry(
    reraise=True,
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=1, max=30),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
