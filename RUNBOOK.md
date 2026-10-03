# Marketing Team Runbook

Seven autonomous marketing agents run on Claude Code from instruction files in this repo. They write
ready-to-ship drafts, reports, and proposals. They never post, send, spend, push, or deploy. They only
contact you through `.agents/marketing-team/ESCALATIONS.md`, for blockers and budget approvals.

```
.agents/
├── product-marketing.md            ← shared context, every agent and skill reads it first
└── marketing-team/
    ├── ORCHESTRATOR.md             ← run order, waves, DONE conditions, guardrails
    ├── ESCALATIONS.md              ← the only file you must read
    ├── data/                       ← drop GA4 / Ads / Search Console exports here
    ├── handoffs/<agent>/           ← agent-to-agent inboxes (created on first run)
    ├── runs/<date>/                ← .done files, one per agent per cycle
    └── <agent>/
        ├── INSTRUCTIONS.md
        └── outputs/<date or week>/ ← deliverables
```

Agents: `strategy`, `paid-measurement`, `sales-gtm`, `seo-content`, `content-copy`, `cro`, `growth-retention`.

## 1. Run the whole team with one command

From the project root in PowerShell:

```powershell
.\scripts\marketing-team.ps1
```

That runs the daily cycle. On Mondays it runs the daily cycle and then the weekly cycle. Force one:

```powershell
.\scripts\marketing-team.ps1 -Cycle daily
.\scripts\marketing-team.ps1 -Cycle weekly
```

Inside an interactive Claude Code session, the same thing:

```
/marketing-team
/marketing-team weekly
```

If PowerShell blocks the script, allow local scripts once:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**Run it every day automatically:** Windows Task Scheduler, daily at 09:00 for example:

```powershell
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -File `"$PWD\scripts\marketing-team.ps1`"" -WorkingDirectory $PWD
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "GdjeVeceras Marketing Team" -Action $action -Trigger $trigger
```

The computer must be on and logged in to Claude Code. Re-running a cycle on the same day is safe:
agents that already finished are skipped.

## 2. Run one agent on its own

```powershell
.\scripts\marketing-team.ps1 -Agent cro
.\scripts\marketing-team.ps1 -Agent content-copy -Cycle weekly
```

or in Claude Code: `/marketing-team cro` or `/marketing-team content-copy weekly`.

A single agent uses the latest outputs and inbox files from the other agents. If one of those is
missing, it says so in its output and continues. To redo an agent that already finished today, delete
its file in `.agents/marketing-team/runs/<date>/` first.

## 3. Review the outputs

1. **Open `.agents/marketing-team/ESCALATIONS.md`.** Each `status: open` entry needs a decision from
   you. Write `Decision: …` under it and change it to `status: resolved`. The agents act on it in the
   next run.
2. **Read the daily digest:** `.agents/marketing-team/strategy/outputs/<date>/daily-digest.md`. It
   summarizes the whole team's day.
3. **On Mondays read** `strategy/outputs/<week>/weekly-brief.md` and `weekly-review.md`.
4. **Ship what you approve:** posts in `content-copy/outputs/`, messages in `growth-retention/outputs/`,
   ad variations and budget changes in `paid-measurement/outputs/`, outreach drafts in
   `sales-gtm/outputs/`.
5. **Code proposals** from `cro` and `seo-content` are in `outputs/<week>/changes/`. Any implemented
   proposal sits on a local branch `marketing/<agent>/<date>`. Review with `git diff main...<branch>`
   and merge yourself if you agree.
6. **Check status:** `.agents/marketing-team/runs/<date>/` has one `.done` file per agent with
   `status: done` or `status: blocked` and a short note.

**Feed the agents data.** They cannot log in to GA4, Meta, or Search Console. Export those
regularly into `.agents/marketing-team/data/` using the names in `data/README.md`. Without exports,
the reports say `n/a (no export)` and after 2 days it becomes an escalation.

## 4. Update the product marketing context

All 7 agents, and every marketing skill they use, read `.agents/product-marketing.md` at the start of
every run. Change it once and the next run inherits it. No agent instructions need editing.

- **Easiest:** in Claude Code run `/product-marketing`. It shows the current version, asks what to
  change, bumps the version, and adds a changelog line.
- **By hand:** edit `.agents/product-marketing.md`, raise `Document version` (v1 → v2), set
  `Last updated`, and add a line at the top of the `Changelog` saying what changed and why.
  Typo fixes don't need a version bump.
- **Start with the `[VERIFY]` items.** The first version was drafted from the site code. Partner
  pricing, current metrics, competitor names, and real customer quotes still need your input.
- Big positioning changes (new audience, new city, new offer) take effect in the next weekly cycle.
  Run `.\scripts\marketing-team.ps1 -Cycle weekly` to apply them right away.
- The strategy agent may suggest edits in `strategy/outputs/<week>/context-proposal.md`. It never edits
  the context file itself.

To change how one agent works, edit its `INSTRUCTIONS.md`. To change run order, DONE conditions, or
guardrails for everyone, edit `ORCHESTRATOR.md`.
