"""Permitted RSS headlines only; no article scraping or inferred deal metadata."""

from __future__ import annotations

import hashlib
import logging
import re
import xml.etree.ElementTree as ET
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

import httpx

from opendc.schemas import Announcement
from opendc.utils.http import USER_AGENT, get_http_client, retry_network

logger = logging.getLogger(__name__)
FEED_URL = "https://convergedigest.com/feed/"
SOURCE_NAME = "Converge Digest"
TERMS_URL = "https://convergedigest.com/terms-of-service/"
KEYWORDS = re.compile(
    r"data[ -]?cent(?:er|re)|hyperscal|megawatt|gigawatt|nuclear|power (?:grid|budget)|"
    r"\bAI\b.{0,30}(?:infrastructure|compute|cloud|cluster|factory)|"
    r"\bGPU\b.{0,30}(?:cluster|cloud|infrastructure)",
    re.I,
)


def is_relevant(title: str) -> bool:
    """Conservative title-only filter; generic AI product stories are excluded."""
    return KEYWORDS.search(title) is not None


class NewsError(ValueError):
    """The source cannot safely contribute to a refresh."""


@retry_network
def _get(url: str) -> bytes:
    with get_http_client() as client:
        response = client.get(url)
        response.raise_for_status()
        if len(response.content) > 5_000_000:
            raise NewsError("RSS response exceeds 5 MB")
        return response.content


def fetch() -> bytes:
    rules = RobotFileParser()
    rules.parse(_get("https://convergedigest.com/robots.txt").decode().splitlines())
    if not rules.can_fetch(USER_AGENT, FEED_URL):
        raise NewsError("Publisher robots rules disallow the feed")
    return _get(FEED_URL)


def _date(raw: str) -> datetime:
    try:
        value = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        value = parsedate_to_datetime(raw)
    if value.tzinfo is None:
        raise ValueError("Date must include timezone")
    return value.astimezone(UTC)


def normalize(
    body: bytes, *, now: datetime | None = None, sample: bool = False
) -> list[Announcement]:
    now = now or datetime.now(UTC)
    if b"<!DOCTYPE" in body.upper() or b"<!ENTITY" in body.upper():
        raise NewsError("XML declarations with entities are not accepted")
    try:
        root = ET.fromstring(body)
    except ET.ParseError as exc:
        raise NewsError("Invalid RSS/Atom XML") from exc
    atom = root.tag == "{http://www.w3.org/2005/Atom}feed"
    if not atom and (root.tag != "rss" or root.find("channel") is None):
        raise NewsError("Expected RSS channel or Atom feed")
    prefix = "{http://www.w3.org/2005/Atom}" if atom else ""
    items = root.findall(f"{prefix}entry") if atom else root.findall("./channel/item")
    if not items:
        raise NewsError("Empty publisher feed")
    rows: dict[str, Announcement] = {}
    for item in items[: 100 if sample else 1000]:
        title = " ".join((item.findtext(f"{prefix}title") or "").split())
        raw_url = item.findtext("link") or ""
        if atom:
            raw_url = next(
                (
                    link.get("href", "")
                    for link in item.findall(f"{prefix}link")
                    if link.get("rel", "alternate") == "alternate"
                ),
                "",
            )
        url = urlsplit(raw_url)
        raw_date = (
            item.findtext(f"{prefix}published")
            or item.findtext(f"{prefix}updated")
            or item.findtext("pubDate")
            or ""
        )
        try:
            published = _date(raw_date)
        except (ValueError, TypeError, OverflowError):
            logger.warning("Skipping entry with invalid date")
            continue
        if not title or len(title) > 300 or not is_relevant(title):
            continue
        if published > now or published < now - timedelta(days=180):
            continue
        if (
            url.scheme != "https"
            or url.hostname not in {"convergedigest.com", "www.convergedigest.com"}
            or url.username
            or url.password
        ):
            continue
        canonical = urlunsplit(("https", "convergedigest.com", url.path, "", ""))
        row_id = "rss-" + hashlib.sha256(canonical.encode()).hexdigest()[:24]
        rows[row_id] = Announcement(
            id=row_id,
            date=published.date().isoformat(),
            title=title,
            category="news",
            source_url=canonical,
            source_name=SOURCE_NAME,
        )
    return sorted(rows.values(), key=lambda row: (row.date, row.id), reverse=True)


def validate(rows: list[Announcement]) -> None:
    for row in rows:
        if row.category != "news" or row.datacenter_id or row.amount_usd or row.operator_id:
            raise NewsError("RSS entries must not claim editorial enrichment")


def run(*, sample: bool = False) -> list[Announcement]:
    try:
        rows = normalize(fetch(), sample=sample)
    except httpx.HTTPError as exc:
        raise NewsError("Publisher fetch failed; keep the previous release") from exc
    validate(rows)
    return rows
