# Data inbox

Agents cannot log in to GA4, Meta Ads, or Search Console. There is no TikTok Ads account. Drop exports here and the
agents pick up the newest file of each kind. Keep the date in the file name.

| File name pattern | Source | Used by |
|---|---|---|
| `ga4-YYYY-MM-DD.csv` | GA4: sessions, signups, check-in and save events by city/day | paid-measurement, cro |
| `meta-ads-YYYY-MM-DD.csv` | Meta Ads Manager: campaign/ad level, spend, CPM, results | paid-measurement |
| `gsc-queries-YYYY-MM-DD.csv` | Search Console export zip → `Queries.csv` | seo-content |
| `gsc-pages-YYYY-MM-DD.csv` | Search Console export zip → `Pages.csv` | seo-content |
| `checkins-YYYY-MM-DD.csv` | Admin panel → Izvoz podataka → Check-ini (one row per check-in, anonymous `user_ref`, `user_checkin_number`) | paid-measurement, cro, sales-gtm, growth-retention |
| `signups-YYYY-MM-DD.csv` | Admin panel → Izvoz podataka → Registracije (method, email verified, days to first check-in) | paid-measurement, cro, growth-retention |
| `events-YYYY-MM-DD.csv` | Admin panel → Izvoz podataka → Događaji (by start date; default today + 13 days) | sales-gtm, content-copy, seo-content |
| `instagram-posts-YYYY-MM-DD.csv` | Instagram insights per feed post / Reel | content-copy, paid-measurement |
| `instagram-stories-YYYY-MM-DD.csv` | Instagram insights per story | content-copy |
| `tiktok-overview-YYYY-MM-DD.csv` | TikTok account overview per day (views, profile views, likes, comments, shares) | content-copy, paid-measurement |
| `tiktok-content-YYYY-MM-DD.csv` | TikTok insights per video | content-copy, paid-measurement |
| `tiktok-followers-YYYY-MM-DD.csv` | TikTok follower growth / audience | content-copy, strategy |
| `messages-YYYY-MM-DD.csv` | Email/push tool: sent, opened, clicked | growth-retention |

`YYYY-MM-DD` is the **last day the export covers**, not the day you downloaded it. TikTok exports
write dates without a year ("September 4"); agents take the year from the file name.

A missing export is noted in the outputs. Missing for 2+ days becomes a blocker in `ESCALATIONS.md`.
