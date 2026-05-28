# Ad Diet — Instagram Feed Analyzer

A local tool for inspecting what ads Instagram is currently showing you.

Opens Instagram in a real browser, scrolls the feed, detects sponsored posts using visible DOM text, saves screenshots and structured JSON, and shows everything in a local dashboard.

## What it does

1. Opens Instagram in a Chromium browser via Playwright
2. Lets you log in manually if needed (no automated credential input)
3. Scrolls the feed looking for posts with "Sponsored" / "Реклама" / "Promoted" labels
4. Extracts visible text, links, advertiser handle, and CTA from each detected ad
5. Saves screenshots of each detected ad card
6. Stores structured results as JSON in `data/scans/`
7. Displays all detected ads in a local web dashboard

No OCR. No ad clicks. No scoring. This module only extracts and displays.

## Install

```bash
npm install
npx playwright install chromium
```

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

## Open the dashboard

```bash
npm run dev
```

Open http://localhost:3000.

The dashboard shows:
- All previous scans (sorted newest first)
- Per-scan: advertiser handle, CTA, raw text preview, links, screenshots
- Expandable rows with full text and all links
- Scan logs

You can also trigger a scan directly from the UI (note: the API route blocks until the scan finishes, which may take a few minutes).

## Auth state

After a successful login, the browser session is saved to `.auth/instagram.json`. Subsequent runs reuse it automatically so you don't need to log in every time.

`.auth/` is gitignored — never commit session tokens.

## Limitations

- Depends on Instagram's DOM structure. If Instagram changes their markup, sponsored label detection may stop working.
- Only detects ads where the "Sponsored" / "Реклама" / "Promoted" label is visible as text in the DOM. Image-only ads without a text label will not be captured.
- No OCR is used, so text inside images is not extracted.
- Advertiser handle extraction is best-effort; it may fail for some ad formats.
- The Next.js API route for triggering scans may time out for long scans. Use `npm run scan:instagram` instead.

## Safety notes

This tool is for inspecting the ads shown to the logged-in user.
It does not click paid ads.
It does not automate login.
It does not bypass platform access controls.
It extracts visible text and links from the page DOM where available.

## Project structure

```
/src
  /lib
    types.ts              — core data types
    instagramAnalyzer.ts  — Playwright scanner
    storage.ts            — JSON read/write helpers
  /scripts
    scan.ts               — CLI entrypoint
  /app
    page.tsx              — dashboard UI
    layout.tsx
    globals.css
    /api
      /scan-instagram     — POST trigger endpoint
      /scans              — GET scan list
      /scans/[scanId]     — GET single scan
/data
  /scans                  — JSON scan results
/public
  /screenshots            — ad screenshots (served statically)
/.auth
  instagram.json          — saved browser session (gitignored)
```
