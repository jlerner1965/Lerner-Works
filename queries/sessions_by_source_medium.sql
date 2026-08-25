-- Sessions by source / medium (last click), last 28 days.
--
-- session_traffic_source_last_click is present on exports linked since
-- mid-2024, so a fresh link has it. On an older export, derive source and
-- medium from collected_traffic_source on the session_start event instead.
--
-- Replace analytics_XXXXXXXXX — see queries/README.md.

SELECT
  COALESCE(session_traffic_source_last_click.manual_campaign.source, '(direct)') AS source,
  COALESCE(session_traffic_source_last_click.manual_campaign.medium, '(none)') AS medium,
  COUNT(DISTINCT CONCAT(
    user_pseudo_id, '.',
    CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
  )) AS sessions
FROM `analytics_XXXXXXXXX.events_*`
WHERE _TABLE_SUFFIX BETWEEN
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
  AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY source, medium
ORDER BY sessions DESC;
