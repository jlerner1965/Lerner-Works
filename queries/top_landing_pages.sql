-- Top landing pages by sessions, last 28 days.
--
-- A session's landing page is the page_location on its session_start
-- event, with the query string and fragment stripped so campaign-tagged
-- URLs roll up to the page itself.
--
-- Replace analytics_XXXXXXXXX — see queries/README.md.

SELECT
  REGEXP_REPLACE(
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location'),
    r'[?#].*$', '') AS landing_page,
  COUNT(*) AS sessions,
  COUNT(DISTINCT user_pseudo_id) AS users
FROM `analytics_XXXXXXXXX.events_*`
WHERE _TABLE_SUFFIX BETWEEN
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
  AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'session_start'
GROUP BY landing_page
ORDER BY sessions DESC
LIMIT 25;
