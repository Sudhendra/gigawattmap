"""Serve the static production build with gzip for representative local network tests."""

from __future__ import annotations

import gzip
import io
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import BinaryIO

ROOT = Path(__file__).resolve().parents[2] / "apps/web/out"


class Handler(SimpleHTTPRequestHandler):
    def send_head(self) -> BinaryIO | None:
        path = Path(self.translate_path(self.path))
        if path.is_dir():
            path /= "index.html"
        if (
            path.is_file()
            and path.suffix in {".html", ".css", ".js", ".json", ".svg"}
            and "gzip" in self.headers.get("Accept-Encoding", "")
        ):
            body = gzip.compress(path.read_bytes(), mtime=0)
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(str(path)))
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Vary", "Accept-Encoding")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return io.BytesIO(body)
        return super().send_head()


if __name__ == "__main__":
    ThreadingHTTPServer(
        ("127.0.0.1", 3002), partial(Handler, directory=str(ROOT))
    ).serve_forever()
