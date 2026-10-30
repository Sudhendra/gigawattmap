from pathlib import Path
from unittest.mock import patch

import httpx
import pytest

from opendc.sources import osm


def test_fetch_fails_over_after_transient_primary_exhaustion(tmp_path: Path) -> None:
    calls: list[str] = []

    def post(client: httpx.Client, query: str, endpoint: str) -> bytes:
        calls.append(endpoint)
        if len(calls) == 1:
            response = httpx.Response(504, request=httpx.Request("POST", endpoint))
            response.raise_for_status()
        return b'{"elements": []}'

    with patch.object(osm, "_post_overpass", side_effect=post):
        result = osm.fetch(out_dir=tmp_path)
    assert len(calls) == 2
    assert calls[0] != calls[1]
    assert result.read_bytes() == b'{"elements": []}'


def test_permanent_error_is_not_sent_to_another_server(tmp_path: Path) -> None:
    response = httpx.Response(400, request=httpx.Request("POST", osm.OVERPASS_URL))
    with (
        patch.object(
            osm,
            "_post_overpass",
            side_effect=httpx.HTTPStatusError(
                "bad query", request=response.request, response=response
            ),
        ) as post,
        pytest.raises(httpx.HTTPStatusError),
    ):
        osm.fetch(out_dir=tmp_path)
    assert post.call_count == 1
