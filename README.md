# Ad Diet — Instagram Feed Analyzer

A local tool for inspecting what ads Instagram is showing you and running safe, Instagram-only steering actions to express what you want more or less of.

Opens Instagram in a real browser, scrolls the feed, detects sponsored posts using visible DOM text, saves screenshots and structured JSON, and shows everything in a local dashboard.

## What it does

1. Opens Instagram in Chromium via Playwright
2. Lets you log in manually if needed (no automated credential input)
3. Scrolls the feed looking for posts with "Sponsored" / "Реклама" / "Promoted" labels
4. Extracts visible text, links, advertiser handle, and CTA from each detected ad
5. Saves screenshots and scan JSON under `data/scans/`
6. Optionally builds a **steering plan** (many Instagram explore searches, hashtag browses, organic post clicks)
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

## Run steering (goal + plan + browser)

One command creates your goal, builds the Instagram plan, and runs it in the browser.

Steering stays on **Instagram only** (many explore searches, hashtags, organic post clicks). No Google, retailers, or paid-ad clicks.

### CLI

```bash
npm run steering:run -- \
  --positive="electric kettles, tea, kitchen appliances" \
  --negative="crypto, gambling, payday loans"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--positive` | Yes | What ads you want more of |
| `--negative` | No | What ads you want fewer of |
| `--window-days` | No | Days before you re-scan to compare (default: `7`, metadata only) |
| `--headless` | No | Run without a visible browser window |

Terminal output includes `[progress]`, `[click]`, `[scroll]`, and `[sleep]` lines. Saves:

- Goal: `data/goals.json`
- Plan: `data/plans/plan_....json`
- Logs: `data/logs/{goalId}.json`
- Screenshots: `public/screenshots/{goalId}/`

### Dashboard UI

```bash
npm run dev
```

Open http://localhost:3000. Use **Run Ad Diet steering** — enter desired/unwanted ads and click **Run steering**. Same flow as the CLI (blocks until finished).

### Full loop example

```bash
npm run scan:instagram          # baseline ads
npm run steering:run -- --positive="tea, kettles" --negative="crypto"
npm run scan:instagram          # after steering
```

## API

With `npm run dev` running:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/steering/run` | Create goal, plan, and run (one shot) |
| `POST` | `/api/scan-instagram` | Feed scan |
| `GET` | `/api/scans` | List scans |

Playwright routes may time out on long runs; prefer `npm run steering:run` in a terminal if the UI request fails.

## Open the dashboard

```bash
npm run dev
```

Open http://localhost:3000.

Steering at the top; scan results below. Lists saved scans with advertiser, CTA, text preview, links, and screenshots.

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
    executeSteering.ts    — goal + plan + run
    steeringPlanner.ts
    steeringRunner.ts
    instagramAnalyzer.ts
    instagramAuth.ts
    storage.ts
  /scripts
    scan.ts
    runSteering.ts
  /app
    page.tsx
    /api
      /steering/run
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
