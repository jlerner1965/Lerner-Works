# Starter queries for the GA4 → BigQuery export

Four questions the export can answer from day one:

```
daily_events_by_name.sql        what's firing, per day
top_landing_pages.sql           where sessions start
sessions_by_source_medium.sql   where sessions come from (last click)
conversion_counts.sql           how often the events that matter fire
```

## The dataset name

Every file reads from `analytics_XXXXXXXXX.events_*` — a placeholder.
The BigQuery link creates a dataset named `analytics_<GA4 property id>`
in the project, with the first `events_YYYYMMDD` table landing within
~24 hours of linking (plus `events_intraday_*` if streaming export is on).

Find it and patch it in with either:

```sh
bq ls --project_id=<PROJECT_ID>                      # by hand, then edit
scripts/ga4-bigquery-setup.sh --project <PROJECT_ID> --apply   # scripted
```

## Running them

In the console: <https://console.cloud.google.com/bigquery> — paste a file
into the editor. From the terminal:

```sh
bq query --use_legacy_sql=false --project_id=<PROJECT_ID> \
  < queries/daily_events_by_name.sql
```

Each query scans only the last 28 days via `_TABLE_SUFFIX`; keep that
habit in new queries, since BigQuery bills by bytes scanned. At this
site's traffic the whole folder costs fractions of a cent — the free
tier (1 TB of scans a month) will cover it for years. The $300 budget
from the setup script is the backstop, not an expectation.
