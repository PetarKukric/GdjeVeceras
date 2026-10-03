---
description: Run the Gdje Večeras marketing agent team (daily, weekly, or one agent)
argument-hint: "[daily | weekly | <agent-name> [daily|weekly]]"
---

Read `.agents/marketing-team/ORCHESTRATOR.md` and act as the orchestrator.

Arguments: `$ARGUMENTS`

First get the run variables from the system clock with one shell call
(`date +%F`, `date +%G-W%V`, `date -Iseconds`) and pass them as RUN_DATE, RUN_WEEK and RUN_STARTED.

- Empty → run the `daily` cycle; if today is Monday, run `daily` and then `weekly`.
- `daily` or `weekly` → run that full cycle.
- An agent folder name (`strategy`, `paid-measurement`, `sales-gtm`, `seo-content`, `content-copy`,
  `cro`, `growth-retention`), optionally followed by `daily` or `weekly` → run only that agent
  (cycle `agent:<name>`), default `daily`.

Follow the wave order and DONE conditions exactly, and finish with the escalation summary.
