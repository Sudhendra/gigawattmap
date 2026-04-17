"""Gigawatt Map data pipeline.

Ingests raw datasets (OSM, GEM, TeleGeography, curated CSVs), normalizes
them against the Pydantic schemas in :mod:`opendc.schemas`, and emits the
artifacts the web app consumes (PMTiles, merged GeoJSON, per-source
attributions). The CLI in :mod:`opendc.cli` is the only supported entry
point.
"""

__version__ = "0.1.0"
