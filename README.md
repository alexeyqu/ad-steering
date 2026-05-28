# Ad Diet — Instagram Feed Analyzer

A local tool for inspecting what ads Instagram is showing you and running safe, Instagram-only steering actions to express what you want more or less of.

Opens Instagram in a real browser, scrolls the feed, detects sponsored posts using visible DOM text, saves screenshots and structured JSON, and shows everything in a local dashboard.

## What it does

1. Opens Instagram in Chromium via Playwright
2. Lets you log in manually if needed (no automated credential input)
3. Scrolls the feed looking for posts with "Sponsored" / "Реклама" / "Promoted" labels
4. Extracts visible text, links, advertiser handle, and CTA from each detected ad
5. Saves screenshots and scan JSON under `data/scans/`
6. Optionally builds a **steering plan** (explore search, hashtags, ad preferences on Instagram only)
7. Runs that plan with human-paced pauses — no Google, retailers, or paid-ad clicks
8. Displays results in a local web dashboard

No OCR. No paid-ad clicks. No automated login.

## Install

```bash
npm install
npx playwright install chromium
```

## Auth state

After a successful login during a scan, the session is saved to `.auth/instagram.json`. Later scans and steering runs reuse it when possible.

Run `npm run scan:instagram` once while logged in before steering, if you have not already.

`.auth/` is gitignored — never commit session tokens.

## Run a scan (CLI — most reliable)

```bash
npm run scan:instagram
```

A browser window opens. Log in if prompted, wait until the feed is visible, then press **Enter** in the terminal.

After the scan completes:

```
Scan complete.
Detected ads: 7
Saved result: data/scans/scan_....json
Screenshots:  public/screenshots/scan_.../
```

## Steering workflow (CLI)

Steering stays on **Instagram only** (explore search, hashtags, ad preferences). It does not open Google, Argos, Currys, or similar sites.

### 1. Create a goal

Define what ads you want more and less of:

```bash
npm run create:goal -- \
  --positive="electric kettles, tea, kitchen appliances" \
  --negative="crypto, gambling, payday loans"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--positive` | Yes | Comma-separated topics you want more ads about |
| `--negative` | No | Comma-separated topics you want fewer ads about |
| `--window-days` | No | Days you plan to wait before re-scanning to compare results (default: `7`). Stored on the goal only — not used while browsing. Alias: `--days` |
| `--platforms` | No | Default: `instagram`. Use `instagram` only unless you explicitly want Google-only steering (`google`) |

Output includes a `goal_...` id. Goals are stored in `data/goals.json`.

### 2. Create a steering plan

```bash
npm run create:plan -- --goalId=goal_abc123
```

Writes `data/plans/plan_....json` and prints each planned action (Instagram explore URLs, pauses, ad preferences).

### 3. Run the plan

```bash
npm run run:plan -- --planId=plan_abc123
```

Opens a browser (headed by default), runs each action with **6–14 second** random pauses between steps, and saves:

- Agent logs: `data/logs/{goalId}.json`
- Screenshots: `public/screenshots/{goalId}/action-act_1.png`, etc.

Add `--headless` to run without a visible window (less reliable for login checks).

### End-to-end example

```bash
# Baseline: what ads are showing now?
npm run scan:instagram

# Goal + plan + steer
npm run create:goal -- --positive="tea, electric kettles" --negative="crypto"
npm run create:plan -- --goalId=goal_<id from previous command>
npm run run:plan -- --planId=plan_<id from previous command>

# Later: scan again and compare (dashboard / future report)
npm run scan:instagram
```

## API (optional)

With `npm run dev` running:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/goals` | Create goal (JSON body: `rawPositivePrompt`, `rawNegativePrompt`, …) |
| `POST` | `/api/goals/:goalId/create-plan` | Generate and save steering plan |
| `POST` | `/api/plans/:planId/run` | Execute plan (blocks until finished) |
| `GET` | `/api/goals/:goalId/logs` | Agent log entries for a goal |

Playwright routes may time out on long runs; prefer the CLI for scans and steering.

## Open the dashboard

```bash
npm run dev
```

Open http://localhost:3000.

The dashboard lists saved scans (newest first) with advertiser, CTA, text preview, links, and screenshots. You can also trigger a scan from the UI (the request blocks until the scan finishes).

## Limitations

- Depends on Instagram's DOM structure; sponsored detection breaks if labels move or change.
- Only detects ads where "Sponsored" / "Реклама" / "Promoted" is visible as text (no OCR).
- Platform response to steering is **not guaranteed**; short demos are noisy.
- Re-scan after steering (`--window-days`) before judging whether ads improved.
- Next.js API routes may time out on long Playwright jobs — use CLI commands instead.

## Safety notes

Ad Diet is for inspecting and steering ad relevance on accounts you own.

- Does **not** click paid or sponsored posts
- Does **not** automate login or bypass access controls
- Does **not** guarantee changes to ad delivery
- Uses visible DOM text and slow, organic Instagram browsing only

## Project structure

```
/src
  /lib
    types.ts
    goals.ts              — create Ad Diet goals
    intentParser.ts
    steeringPlanner.ts    — Module 6: plan generator
    steeringRunner.ts     — Module 7: Playwright runner
    instagramAnalyzer.ts
    instagramAuth.ts
    storage.ts
  /scripts
    scan.ts
    createGoal.ts
    createPlan.ts
    runSteeringPlan.ts
  /app
    page.tsx
    /api
      /goals
      /goals/[goalId]/create-plan
      /plans/[planId]/run
      /scan-instagram
      /scans
/data
  goals.json
  /scans
  /plans
  /logs
/public/screenshots
/.auth/instagram.json       — gitignored
```
