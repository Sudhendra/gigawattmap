"""Scheduled refresh entrypoints used locally and by GitHub Actions."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

import typer
from rich.console import Console

from opendc import releases
from opendc.schemas import Announcement
from opendc.sources import announcements, news

app = typer.Typer(no_args_is_help=True)
console = Console()


@app.callback()
def main() -> None:
    """Refresh and publish live datasets."""


def refresh_news(*, out_dir: Path, sample: bool = False) -> releases.Release:
    config, client = releases.storage()
    previous = releases.read_current("news", config, client)
    # Fetch first: a failure aborts before any public write.
    fresh = news.run(sample=sample)
    now = datetime.now(UTC)
    cutoff = (now - timedelta(days=180)).date().isoformat()
    rows: dict[str, Announcement] = {}
    if previous:
        for raw in previous.records:
            row = Announcement.model_validate(raw)
            if row.category != "news" or (row.date >= cutoff and news.is_relevant(row.title)):
                rows[row.source_url.rstrip("/")] = row
    for row in fresh:
        rows[row.source_url.rstrip("/")] = row
    # Curated entries take precedence over matching RSS URLs.
    for row in announcements.iter_rows():
        rows[row.source_url.rstrip("/")] = row
    if not any(row.category == "news" for row in rows.values()):
        raise releases.ReleaseError("No recent publisher headlines; retain the previous release")
    release = releases.Release(
        channel="news",
        updated_at=now.isoformat(),
        records=[
            row.model_dump()
            for row in sorted(rows.values(), key=lambda row: (row.date, row.id), reverse=True)
        ],
        sources=[
            {
                "name": news.SOURCE_NAME,
                "url": news.FEED_URL,
                "terms_url": news.TERMS_URL,
                "checked_at": now.isoformat(),
                "new_rows": len(fresh),
                "license": "Publisher-owned headlines; attributed non-commercial excerpts only",
            }
        ],
    )
    if sample:
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "news-sample.json").write_text(release.model_dump_json())
    else:
        releases.publish(release, out_dir=out_dir, config=config, client=client)
    return release


@app.command("news")
def news_cmd(out_dir: Path = typer.Option(Path("out/refresh-news")), sample: bool = False) -> None:
    """Refresh attributed headlines and preserve curated history."""
    result = refresh_news(out_dir=out_dir, sample=sample)
    console.log(
        f"{'Validated sample' if sample else 'Published'} {len(result.records)} news records"
    )


if __name__ == "__main__":
    app()
