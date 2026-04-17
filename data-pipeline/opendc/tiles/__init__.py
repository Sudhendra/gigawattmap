"""Tile artifact orchestration.

Two stages, kept separate so they can be invoked independently:

* :mod:`opendc.tiles.build` — runs ``tippecanoe`` against the interim
  GeoJSONs and produces :file:`out/tiles/*.pmtiles`.
* :mod:`opendc.tiles.upload` — pushes the built tiles to Cloudflare R2
  via the S3-compatible API.
"""
