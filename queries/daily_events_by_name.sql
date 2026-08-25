-- Daily event counts by event name, last 28 days.
--
-- analytics_XXXXXXXXX is a placeholder for the export dataset
-- (analytics_<GA4 property id> — `bq ls` shows it, and
-- scripts/ga4-bigquery-setup.sh --apply patches it into these files).
--
-- Run:  bq query --use_legacy_sql=false --project_id=<PROJECT_ID> \
--         < queries/daily_events_by_name.sql

SELECT
  PARSE_DATE('%Y%m%d', event_date) AS day,
  event_name,
  COUNT(*) AS events,
  COUNT(DISTINCT user_pseudo_id) AS users
FROM `analytics_XXXXXXXXX.events_*`
WHERE _TABLE_SUFFIX BETWEEN
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
  AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY day, event_name
ORDER BY day DESC, events DESC;
