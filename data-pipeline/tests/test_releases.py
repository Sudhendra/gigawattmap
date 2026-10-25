from pathlib import Path
from unittest.mock import Mock, patch

import httpx
import pytest

from opendc import refresh, releases
from opendc.sources.news import NewsError, run
from opendc.tiles.upload import R2Config

CONFIG = R2Config("account", "key", "secret", "bucket", "")


def test_empty_release_never_writes(tmp_path: Path) -> None:
    client = Mock()
    value = releases.Release(
        channel="news", updated_at="2026-10-24T00:00:00Z", records=[], sources=[]
    )
    with pytest.raises(releases.ReleaseError):
        releases.publish(value, out_dir=tmp_path, config=CONFIG, client=client)
    client.put_object.assert_not_called()


def test_archive_failure_leaves_live_release_untouched(tmp_path: Path) -> None:
    client = Mock()
    client.put_object.side_effect = RuntimeError("R2 unavailable")
    value = releases.Release(
        channel="news", updated_at="2026-10-24T00:00:00Z", records=[{"id": "test"}], sources=[]
    )
    with pytest.raises(RuntimeError):
        releases.publish(value, out_dir=tmp_path, config=CONFIG, client=client)
    assert client.put_object.call_count == 1
    assert client.put_object.call_args.kwargs["Key"].startswith("v1/releases/news/")


def test_success_writes_archive_before_live_snapshot(tmp_path: Path) -> None:
    client = Mock()
    value = releases.Release(
        channel="news", updated_at="2026-10-24T00:00:00Z", records=[{"id": "test"}], sources=[]
    )
    releases.publish(value, out_dir=tmp_path, config=CONFIG, client=client)
    assert client.put_object.call_args_list[1].kwargs["Key"] == "v1/live/news.json"
    assert (tmp_path / "manifest.json").exists()


def test_source_failure_never_publishes(tmp_path: Path) -> None:
    client = Mock()
    with (
        patch("opendc.refresh.releases.storage", return_value=(CONFIG, client)),
        patch("opendc.refresh.releases.read_current", return_value=None),
        patch("opendc.refresh.news.run", side_effect=NewsError("timeout")),
        pytest.raises(NewsError),
    ):
        refresh.refresh_news(out_dir=tmp_path)
    client.put_object.assert_not_called()


def test_network_timeout_is_a_source_failure() -> None:
    with patch("opendc.sources.news.fetch", side_effect=httpx.ReadTimeout("timeout")), pytest.raises(NewsError):
        run()
