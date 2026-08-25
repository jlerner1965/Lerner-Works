-- Daily conversion counts, last 28 days.
--
-- The export has no "is a conversion" flag — GA4 calls them key events and
-- keeps the list in Admin → Events. Edit the IN list to match what the
-- property actually marks as key events (these three are sensible defaults
-- for a lead-gen site: form sends, outbound clicks to the booking link,
-- tel: taps — the latter two need their own event tagging to exist).
--
-- Replace analytics_XXXXXXXXX — see queries/README.md.

SELECT
  PARSE_DATE('%Y%m%d', event_date) AS day,
  event_name,
  COUNT(*) AS conversions,
  COUNT(DISTINCT user_pseudo_id) AS converting_users
FROM `analytics_XXXXXXXXX.events_*`
WHERE _TABLE_SUFFIX BETWEEN
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
  AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name IN ('generate_lead', 'book_call_click', 'phone_click')
GROUP BY day, event_name
ORDER BY day DESC, conversions DESC;
