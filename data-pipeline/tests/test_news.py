from datetime import UTC, datetime

import pytest

from opendc.sources.news import NewsError, normalize

NOW = datetime(2026, 10, 24, tzinfo=UTC)


def rss(items: str) -> bytes:
    return f"<rss><channel>{items}</channel></rss>".encode()


def item(
    url: str = "https://convergedigest.com/data-center/",
    date: str = "Fri, 23 Oct 2026 15:00:00 +0000",
) -> str:
    return f"<item><title>New data center announced</title><link>{url}</link><pubDate>{date}</pubDate></item>"


def test_duplicates_and_tracking_urls_collapse() -> None:
    rows = normalize(
        rss(item() + item("https://convergedigest.com/data-center/?utm_source=rss")), now=NOW
    )
    assert len(rows) == 1
    assert rows[0].category == "news"
    assert rows[0].amount_usd is None
    assert rows[0].datacenter_id is None
    assert rows[0].source_name == "Converge Digest"


def test_invalid_dates_future_dates_and_unsafe_links_are_skipped() -> None:
    assert (
        normalize(
            rss(
                item(date="not a date")
                + item("javascript:alert(1)")
                + item(date="Fri, 23 Oct 2027 15:00:00 +0000")
            ),
            now=NOW,
        )
        == []
    )


@pytest.mark.parametrize("body", [b"<html/>", b"<rss>", b'<!DOCTYPE x [<!ENTITY x "boom">]><rss/>'])
def test_malformed_feed_fails(body: bytes) -> None:
    with pytest.raises(NewsError):
        normalize(body, now=NOW)


def test_atom_is_supported() -> None:
    body = b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>New data center</title><link href="https://convergedigest.com/atom/"/><published>2026-10-23T12:00:00Z</published></entry></feed>'
    assert len(normalize(body, now=NOW)) == 1


def test_generic_ai_headlines_are_not_datacenter_news() -> None:
    body = rss(
        item().replace(
            "New data center announced",
            "Automaker Accelerates Engineering with AI and Autonomous Networks",
        )
    )
    assert normalize(body, now=NOW) == []


def test_datacenter_power_budget_headlines_are_relevant() -> None:
    body = rss(
        item().replace(
            "New data center announced", "Chipmaker Targets More Compute Within Fixed Power Budgets"
        )
    )
    assert len(normalize(body, now=NOW)) == 1
