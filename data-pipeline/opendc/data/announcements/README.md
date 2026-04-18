# Announcements YAML schema

One file per announcement. Keep entries neutral, source-backed, and auditable.

```yaml
id: 2026-04-14-talen-aws-expansion
date: 2026-04-14
title: "Talen-Amazon nuclear arrangement expanded"
category: deal
amount_usd: 18000000000
operator_id: talen
datacenter_id: talen-susquehanna
source_url: https://example.com/source
summary: |
  Two-sentence neutral summary of the announcement.
  Cite only what the linked source actually supports.
```

Rules:

- `category` must be one of `deal`, `launch`, `milestone`, `opposition`, `policy`.
- `operator_id` must exist in `../operators.csv` when present.
- `datacenter_id` must exist in `../ai-campuses.csv` when present.
- `source_url` must point to a primary or first-tier secondary source.
- Dates are UTC `YYYY-MM-DD`.
