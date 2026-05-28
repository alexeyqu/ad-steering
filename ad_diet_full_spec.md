# Ad Diet — Full Product & Engineering Spec

**Target reader:** Claude Code / Cursor / hackathon teammate  
**Project type:** Hackathon MVP  
**Stack:** TypeScript, Node.js, Playwright, React/Next.js, local JSON storage  
**Primary demo:** A user tells an agent what ads they want more/less of. The system inspects the current ad feed, creates safe organic intent signals, scans again, and reports whether the ad diet improved.

---

## 0. Product Summary

### One-liner

**Ad Diet** is a user-side agent that helps people steer and measure their ad experience.

### Core pitch

Ad platforms infer user intent from noisy behaviour. Ad Diet lets a user explicitly state what commercial content they want more or less of, then uses safe organic browsing/search actions and platform controls where available to steer the ad ecosystem. It measures the before/after ad feed and reports whether relevance improved.

### Demo slogan

> **AdBlock blocks ads. Ad Diet trains them.**

### Important ethical framing

Ad Diet is **not** an ad fraud tool.

It must not:

- click paid ads;
- generate fake ad traffic;
- automate login credentials;
- bypass platform protections;
- use stealth/fingerprint evasion;
- scrape private data for resale;
- promise guaranteed influence over ad platforms.

It does:

- inspect ads shown to the logged-in user;
- extract visible text and metadata where possible;
- use organic search/product browsing to express intent;
- use official ad preference controls where feasible;
- measure whether the ad feed changes;
- keep the user informed about limitations.

---

## 1. MVP Scope

The full MVP consists of these modules:

1. **Goal Input & Intent Parser**
2. **Instagram Feed Analyzer**
3. **Mock Feed Analyzer**
4. **Ad Normalization Layer**
5. **Ad Scoring Engine**
6. **Steering Plan Generator**
7. **Playwright Steering Runner**
8. **Rescan & Comparison Engine**
9. **Dashboard UI**
10. **Local Storage Layer**
11. **API / Job Runner Layer**
12. **Safety & Ethics Layer**
13. **Demo Mode**
14. **Testing / Debugging Tools**

### First milestone

Build **Instagram Feed Analyzer only**, without scoring.

It should:

- open Instagram in Playwright;
- allow manual login;
- scroll the feed;
- detect sponsored posts by DOM text;
- extract visible metadata;
- save screenshots;
- save JSON;
- show results in UI.

---

## 2. Non-goals

Do not build in the MVP:

- production-grade Instagram automation;
- real account management;
- OCR-based image understanding;
- database-backed persistence;
- browser fingerprint evasion;
- automated paid ad clicking;
- long-running background worker infrastructure;
- real-time multi-user SaaS;
- Chrome extension, unless there is extra time;
- exact proof that Instagram/Google algorithms changed because of our actions.

The MVP should demonstrate the loop:

```text
user intent -> baseline scan -> steering actions -> after scan -> relevance report
```

---

## 3. Recommended Tech Stack

Use:

- **TypeScript** for all app logic.
- **Node.js** for Playwright workers and API routes.
- **Playwright** for browser automation.
- **Next.js** for dashboard + API routes.
- **Local JSON files** for storage.
- **No DB** for hackathon MVP.
- **No OCR**.
- Optional LLM calls later, but deterministic logic must work first.

Suggested project structure:

```text
ad-diet/
  package.json
  tsconfig.json
  playwright.config.ts
  README.md
  .env.example
  .auth/
    instagram.json                 # optional, gitignored
  data/
    goals.json
    scans/
    plans/
    logs/
    reports/
  public/
    screenshots/
  src/
    app/                           # Next.js app router, or pages/ if preferred
      page.tsx
      scans/[scanId]/page.tsx
      api/
        goals/route.ts
        scans/route.ts
        scan-instagram/route.ts
        create-plan/route.ts
        run-plan/route.ts
        report/[goalId]/route.ts
    components/
      GoalForm.tsx
      ScanList.tsx
      AdTable.tsx
      SteeringPlan.tsx
      AgentLogs.tsx
      ReportCard.tsx
    lib/
      types.ts
      storage.ts
      ids.ts
      text.ts
      scoring.ts
      normalize.ts
      safety.ts
      mockFeed.ts
      instagramAnalyzer.ts
      steeringPlanner.ts
      steeringRunner.ts
      comparison.ts
    scripts/
      scanInstagram.ts
      runSteeringPlan.ts
      seedMockData.ts
```

---

## 4. Domain Model

Create `src/lib/types.ts`.

### 4.1 User goal

```ts
export type TargetPlatform = "instagram" | "google" | "mock";

export type AdDietGoal = {
  id: string;
  createdAt: string;
  updatedAt: string;

  rawPositivePrompt: string;
  rawNegativePrompt: string;

  positiveIntents: string[];
  negativeIntents: string[];

  timeWindowDays: number;
  targetPlatforms: TargetPlatform[];

  status: "draft" | "baseline_scanned" | "plan_created" | "plan_run" | "after_scanned" | "reported";
};
```

Example:

```json
{
  "id": "goal_abc123",
  "rawPositivePrompt": "I want more ads about electric kettles, tea, and kitchen appliances.",
  "rawNegativePrompt": "I want fewer ads about crypto, gambling, payday loans, and AI courses.",
  "positiveIntents": ["electric kettles", "tea", "kitchen appliances", "UK delivery"],
  "negativeIntents": ["crypto", "gambling", "payday loans", "AI courses"],
  "timeWindowDays": 7,
  "targetPlatforms": ["instagram", "mock"],
  "status": "draft"
}
```

### 4.2 Extracted ad

```ts
export type ExtractedAd = {
  id: string;
  scanId: string;
  goalId?: string;
  platform: TargetPlatform;
  detectedAt: string;

  advertiserHandle?: string;
  advertiserName?: string;
  sponsoredLabelFound: boolean;

  title?: string;
  body?: string;
  captionText?: string;
  ctaText?: string;

  rawText: string;
  links: string[];
  postUrls: string[];

  screenshotPath?: string;

  extractionWarnings: string[];
};
```

### 4.3 Scored ad

Scoring is not needed for milestone 1, but define the type now.

```ts
export type ScoredAd = ExtractedAd & {
  relevanceScore: number; // 0..1
  unwantedScore: number; // 0..1
  matchedPositiveIntents: string[];
  matchedNegativeIntents: string[];
  explanation: string;
};
```

### 4.4 Scan result

```ts
export type ScanPhase = "baseline" | "after" | "manual";

export type ScanLogEntry = {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
};

export type ScanSummary = {
  totalAds: number;
  relevantAds?: number;
  unwantedAds?: number;
  averageRelevance?: number;
  averageUnwanted?: number;
};

export type AdScanResult = {
  scanId: string;
  goalId?: string;
  platform: TargetPlatform;
  phase: ScanPhase;

  startedAt: string;
  finishedAt: string;

  requestedScrolls: number;
  detectedAds: ExtractedAd[];
  scoredAds?: ScoredAd[];

  summary?: ScanSummary;
  logs: ScanLogEntry[];
};
```

### 4.5 Steering plan

```ts
export type SteeringActionType =
  | "search"
  | "visit_url"
  | "browse_results"
  | "ad_preferences"
  | "wait";

export type SteeringAction = {
  id: string;
  type: SteeringActionType;
  query?: string;
  url?: string;
  reason: string;
  safetyNote?: string;
};

export type SteeringPlan = {
  id: string;
  goalId: string;
  createdAt: string;
  actions: SteeringAction[];
  caveats: string[];
};
```

### 4.6 Agent logs

```ts
export type AgentLogEntry = {
  timestamp: string;
  goalId: string;
  planId?: string;
  actionId?: string;
  status: "started" | "success" | "failed" | "skipped" | "info";
  message: string;
  screenshotPath?: string;
};
```

### 4.7 Report

```ts
export type AdDietReport = {
  id: string;
  goalId: string;
  createdAt: string;

  beforeScanId: string;
  afterScanId: string;

  before: ScanSummary;
  after: ScanSummary;

  relevanceDelta?: number;
  unwantedDelta?: number;

  conclusion: string;
  caveats: string[];
};
```

---

## 5. Module 1 — Goal Input & Intent Parser

### Purpose

Let the user define what ads they want more and less of.

### UI fields

- Desired ads textarea.
- Unwanted ads textarea.
- Time window days input.
- Platform selector: Instagram, Google, Mock.
- Button: **Create Ad Diet Goal**.

### Behaviour

Given raw user text:

```text
Desired: I want more ads about electric kettles, tea, and kitchen appliances.
Unwanted: I want fewer ads about crypto, gambling, payday loans, and AI courses.
```

Create:

```json
{
  "positiveIntents": ["electric kettles", "tea", "kitchen appliances"],
  "negativeIntents": ["crypto", "gambling", "payday loans", "AI courses"]
}
```

### Implementation

Start deterministic:

- split by comma;
- remove phrases like `I want more ads about`, `I want fewer ads about`, `avoid`, `stop showing me`;
- trim whitespace;
- lower-case for matching, preserve display version if desired.

Optional later:

- LLM parser that returns structured JSON.

### API

```http
POST /api/goals
```

Request:

```json
{
  "rawPositivePrompt": "I want more ads about electric kettles, tea, and kitchen appliances.",
  "rawNegativePrompt": "I want fewer ads about crypto, gambling, payday loans, and AI courses.",
  "timeWindowDays": 7,
  "targetPlatforms": ["instagram", "mock"]
}
```

Response:

```json
{
  "goalId": "goal_abc123"
}
```

---

## 6. Module 2 — Instagram Feed Analyzer

### Purpose

Inspect the logged-in user’s Instagram feed, detect sponsored posts, extract available DOM text/metadata, and save screenshots.

### Current milestone

This is the first thing to build.

For milestone 1, do not implement:

- scoring;
- steering;
- relevance classification;
- before/after comparison.

### Main function

```ts
export async function scanInstagramFeed(options: {
  goalId?: string;
  phase?: ScanPhase;
  maxScrolls: number;
  maxAds: number;
  headless: boolean;
  screenshotsDir: string;
  reuseAuthState: boolean;
}): Promise<AdScanResult>;
```

Default options:

```ts
{
  maxScrolls: 20,
  maxAds: 20,
  headless: false,
  screenshotsDir: "public/screenshots",
  reuseAuthState: true
}
```

### Login flow

Use headed browser by default.

1. Launch Chromium.
2. Navigate to `https://www.instagram.com/`.
3. If login screen is visible, print:

```text
Please log in manually in the opened browser window.
After the Instagram feed is visible, press Enter in this terminal.
```

4. Wait for terminal input.
5. Save optional storage state to `.auth/instagram.json`.
6. Continue scanning.

Do not automate username/password input.

### Auth state

If `.auth/instagram.json` exists and `reuseAuthState = true`, pass it to Playwright context:

```ts
const context = await browser.newContext({
  storageState: ".auth/instagram.json"
});
```

If it fails, fall back to manual login.

### Ad detection strategy

Do not use OCR.

Instagram feed posts are usually represented as `article` elements. Use best-effort detection.

Algorithm:

1. Find visible `article` elements.
2. Extract `innerText` for each article.
3. Treat an article as an ad candidate if text contains a sponsored label.
4. Extract links and possible advertiser handle.
5. Save screenshot of the article.
6. Deduplicate.
7. Scroll and repeat.

Sponsored labels:

```ts
const SPONSORED_LABELS = [
  "Sponsored",
  "Реклама",
  "Promoted"
];
```

CTA labels:

```ts
const CTA_LABELS = [
  "Shop now",
  "Learn more",
  "Sign up",
  "Download",
  "Install now",
  "Apply now",
  "Book now",
  "Order now",
  "Contact us",
  "Subscribe",
  "Get offer",
  "View products"
];
```

### Extract fields

For every detected ad:

- `id`
- `scanId`
- `platform = "instagram"`
- `detectedAt`
- `advertiserHandle`
- `advertiserName` if available
- `sponsoredLabelFound = true`
- `rawText`
- `captionText`
- `ctaText`
- `links`
- `postUrls`
- `screenshotPath`
- `extractionWarnings`

### Advertiser handle extraction

Extract all links inside the article.

A plausible handle URL looks like:

```text
https://www.instagram.com/<handle>/
/<handle>/
```

Exclude paths containing:

```ts
const EXCLUDED_IG_PATH_PREFIXES = [
  "/p/",
  "/reel/",
  "/explore/",
  "/accounts/",
  "/stories/",
  "/direct/"
];
```

Pick the first plausible profile link near the top of the article.

### Post URL extraction

`postUrls` are links containing:

- `/p/`
- `/reel/`

### Screenshot saving

For each ad candidate:

```text
/public/screenshots/{scanId}/ad-{index}.png
```

Store public path:

```text
/screenshots/{scanId}/ad-{index}.png
```

### Deduplication

Use a stable hash of:

```text
advertiserHandle + rawText.slice(0, 500)
```

Fallback:

```text
rawText.slice(0, 1000)
```

### Scrolling loop

```ts
for (let i = 0; i < maxScrolls; i++) {
  await collectVisibleArticles();
  if (ads.length >= maxAds) break;
  await page.mouse.wheel(0, viewportHeight * 0.9);
  await page.waitForTimeout(1500 + Math.random() * 1500);
}
```

Do not click posts or ads.

### CLI command

```bash
npm run scan:instagram
```

Expected output:

```text
Starting Instagram scan...
Open browser window and log in if needed.
Detected ads: 7
Saved result: data/scans/scan_abc123.json
Screenshots: public/screenshots/scan_abc123/
```

### API endpoint

```http
POST /api/scan-instagram
```

Request:

```json
{
  "goalId": "goal_abc123",
  "phase": "baseline",
  "maxScrolls": 20,
  "maxAds": 20,
  "headless": false
}
```

Response:

```json
{
  "scanId": "scan_abc123",
  "detectedAdsCount": 7,
  "resultPath": "data/scans/scan_abc123.json"
}
```

For MVP, endpoint may block until scan completes. If Next.js route timeouts are problematic, use the CLI first.

### Error handling

Log warnings for:

- login screen still visible;
- no feed visible;
- no sponsored posts found;
- screenshot failed;
- extraction failed for a specific article;
- file write failed.

Example log:

```json
{
  "timestamp": "2026-05-28T18:30:00.000Z",
  "level": "warn",
  "message": "No sponsored posts detected. Instagram may not have shown ads during this scan, or sponsored labels were not available in the DOM."
}
```

---

## 7. Module 3 — Mock Feed Analyzer

### Purpose

Guarantee a reliable demo even if Instagram automation fails.

### Function

```ts
export async function scanMockFeed(options: {
  goalId?: string;
  phase: "baseline" | "after";
}): Promise<AdScanResult>;
```

### Mock baseline ads

```json
[
  {
    "platform": "mock",
    "title": "Trade crypto with zero fees",
    "body": "Start investing today",
    "advertiserName": "CoinRocket",
    "rawText": "Trade crypto with zero fees. Start investing today."
  },
  {
    "platform": "mock",
    "title": "AI productivity course",
    "body": "10x your workflow with AI",
    "advertiserName": "Prompt Academy",
    "rawText": "AI productivity course. 10x your workflow with AI."
  },
  {
    "platform": "mock",
    "title": "Running shoes sale",
    "body": "New season trainers",
    "advertiserName": "Sporty",
    "rawText": "Running shoes sale. New season trainers."
  }
]
```

### Mock after ads

```json
[
  {
    "platform": "mock",
    "title": "Electric kettles under £50",
    "body": "Fast boil kettles with UK delivery",
    "advertiserName": "KitchenHub",
    "rawText": "Electric kettles under £50. Fast boil kettles with UK delivery."
  },
  {
    "platform": "mock",
    "title": "Energy efficient kitchen appliances",
    "body": "Compare top-rated kettles and toasters",
    "advertiserName": "HomeCompare",
    "rawText": "Energy efficient kitchen appliances. Compare top-rated kettles and toasters."
  }
]
```

### UI label

When using mock mode, clearly show:

```text
Simulated platform response for demo reliability.
```

---

## 8. Module 4 — Ad Normalization Layer

### Purpose

Make ads from Instagram, mock feed, and future platforms look the same to scoring/reporting modules.

### Function

```ts
export function normalizeAdText(ad: ExtractedAd): string;
```

Implementation:

```ts
const parts = [
  ad.advertiserHandle,
  ad.advertiserName,
  ad.title,
  ad.body,
  ad.captionText,
  ad.ctaText,
  ad.rawText,
  ad.links.join(" ")
];

return parts
  .filter(Boolean)
  .join(" ")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim();
```

### Function

```ts
export function extractDomain(url: string): string | null;
```

Use for future scoring/reporting.

---

## 9. Module 5 — Ad Scoring Engine

### Purpose

Score whether extracted ads match the user’s desired/unwanted ad diet.

### Not part of milestone 1

Do this after the Instagram analyzer works.

### Function

```ts
export function scoreAd(goal: AdDietGoal, ad: ExtractedAd): ScoredAd;
```

### Deterministic scoring

Start without LLM.

Rules:

- For each positive intent matched in normalized ad text: add positive points.
- For each negative intent matched: add unwanted points.
- Clamp scores to 0..1.
- Generate a short explanation.

Pseudo-code:

```ts
const positiveMatches = goal.positiveIntents.filter(intent =>
  normalized.includes(intent.toLowerCase())
);

const negativeMatches = goal.negativeIntents.filter(intent =>
  normalized.includes(intent.toLowerCase())
);

const relevanceScore = Math.min(1, positiveMatches.length / Math.max(1, goal.positiveIntents.length));
const unwantedScore = Math.min(1, negativeMatches.length / Math.max(1, goal.negativeIntents.length));
```

### Later optional improvements

- synonyms;
- keyword expansion;
- embeddings;
- LLM classification;
- category classifier;
- image-based analysis, only if explicit and safe.

### Output example

```json
{
  "relevanceScore": 0.75,
  "unwantedScore": 0,
  "matchedPositiveIntents": ["electric kettles", "kitchen appliances", "UK delivery"],
  "matchedNegativeIntents": [],
  "explanation": "Matched electric kettles, kitchen appliances, and UK delivery."
}
```

---

## 10. Module 6 — Steering Plan Generator

### Purpose

Generate safe organic browsing/search actions to express user intent.

### Function

```ts
export function createSteeringPlan(goal: AdDietGoal): SteeringPlan;
```

### Rules

The plan may include:

- organic Google searches;
- visits to retailer category pages;
- visits to review/comparison pages;
- official platform ad preference pages, if feasible;
- waits.

The plan must not include:

- paid ad clicks;
- fake purchases;
- fake signups;
- mass following/liking/commenting;
- stealth/evasion;
- anything that pretends to be a human endorsement.

### Example plan for kettles

```json
{
  "actions": [
    {
      "id": "act_1",
      "type": "search",
      "query": "best electric kettles UK 2026",
      "reason": "Creates explicit organic commercial intent around electric kettles."
    },
    {
      "id": "act_2",
      "type": "search",
      "query": "quiet fast boil kettle under £100 UK",
      "reason": "Refines the purchase intent."
    },
    {
      "id": "act_3",
      "type": "visit_url",
      "url": "https://www.argos.co.uk/browse/appliances/kettles/c:29644/",
      "reason": "Visits an organic retailer category page without clicking paid ads."
    },
    {
      "id": "act_4",
      "type": "visit_url",
      "url": "https://www.currys.co.uk/appliances/small-kitchen-appliances/kettles",
      "reason": "Visits another relevant retailer category page."
    }
  ],
  "caveats": [
    "Platform response is not guaranteed.",
    "The agent will not click paid ads.",
    "Results may be noisy in a short hackathon demo."
  ]
}
```

### Search query generation

For each positive intent, generate:

- `best {intent} UK`
- `{intent} reviews`
- `{intent} deals UK`
- `{intent} comparison`

Limit total actions to 5–10 for the demo.

---

## 11. Module 7 — Playwright Steering Runner

### Purpose

Execute the steering plan in a browser and log evidence.

### Function

```ts
export async function runSteeringPlan(options: {
  goal: AdDietGoal;
  plan: SteeringPlan;
  headless: boolean;
  screenshotsDir: string;
}): Promise<AgentLogEntry[]>;
```

### Behaviour

For `search` actions:

1. Navigate to Google search URL.
2. Wait for results.
3. Do not click sponsored results.
4. Optionally click one or two organic results only.
5. Save screenshot.

For `visit_url` actions:

1. Navigate to the URL.
2. Wait.
3. Scroll lightly.
4. Save screenshot.

For `ad_preferences` actions:

1. Open official ad preference page if known.
2. Do not automate sensitive changes unless explicit and safe.
3. Prefer showing the page and logging that manual user action may be required.

### Paid ad avoidance

On Google search result pages:

- avoid containers labelled `Sponsored` or `Ad`;
- do not click links inside them;
- prefer organic result containers.

### Logs

Every action produces logs:

```json
{
  "timestamp": "2026-05-28T18:45:00.000Z",
  "goalId": "goal_abc123",
  "planId": "plan_abc123",
  "actionId": "act_1",
  "status": "success",
  "message": "Searched Google for 'best electric kettles UK 2026' and saved screenshot.",
  "screenshotPath": "/screenshots/goal_abc123/action-act_1.png"
}
```

---

## 12. Module 8 — Rescan & Comparison Engine

### Purpose

Compare baseline and after scans.

### Function

```ts
export function compareScans(options: {
  goal: AdDietGoal;
  before: AdScanResult;
  after: AdScanResult;
}): AdDietReport;
```

### Inputs

- goal;
- baseline scan;
- after scan.

### Output

- before summary;
- after summary;
- relevance delta;
- unwanted delta;
- conclusion;
- caveats.

### Summary calculation

```ts
const totalAds = scoredAds.length;
const relevantAds = scoredAds.filter(ad => ad.relevanceScore >= 0.5).length;
const unwantedAds = scoredAds.filter(ad => ad.unwantedScore >= 0.5).length;
const averageRelevance = average(scoredAds.map(ad => ad.relevanceScore));
const averageUnwanted = average(scoredAds.map(ad => ad.unwantedScore));
```

### Conclusion logic

```ts
if relevanceDelta > 0.2 and unwantedDelta <= 0:
  "Ad relevance improved after steering actions."
else if relevanceDelta > 0:
  "Ad relevance slightly improved, but results are noisy."
else:
  "No clear improvement detected yet. More time or stronger explicit preference controls may be needed."
```

### Caveats

Always include:

```text
Platform response is not guaranteed.
Short-term demo results may be noisy.
Ad Diet did not click paid ads.
Detected ads are based on visible DOM text, not OCR.
```

---

## 13. Module 9 — Dashboard UI

### Purpose

A simple local UI for demoing the full loop.

### Main page sections

#### 13.1 Header

Title:

```text
Ad Diet
```

Subtitle:

```text
A user-side agent for steering and measuring your ad experience.
```

#### 13.2 Safety banner

```text
Ad Diet does not click paid ads, automate login, or bypass platform protections. It uses visible page metadata and organic browsing actions to help users inspect and steer their ad experience.
```

#### 13.3 Goal card

Fields:

- desired ads textarea;
- unwanted ads textarea;
- time window;
- platform selector;
- create goal button.

#### 13.4 Baseline scan card

Controls:

- platform selector;
- max scrolls;
- max ads;
- headless toggle;
- run baseline scan button.

Show:

- scan status;
- detected ads count;
- link to scan details.

#### 13.5 Ad table

Columns:

- screenshot thumbnail;
- platform;
- advertiser;
- CTA;
- raw text preview;
- links count;
- warnings;
- expand button.

Expanded view:

- full raw text;
- all links;
- post URLs;
- screenshot.

#### 13.6 Steering plan card

Show generated actions:

- action type;
- query/URL;
- reason;
- safety note.

Button:

```text
Run steering agent
```

#### 13.7 Agent logs card

Live or static log table:

- timestamp;
- status;
- message;
- screenshot link.

#### 13.8 After scan card

Same as baseline scan, but phase = after.

#### 13.9 Report card

Show:

- before relevance;
- after relevance;
- delta;
- unwanted ads before/after;
- conclusion;
- caveats.

### Visual style

- Clean, hackathon-demo-friendly.
- Cards with clear headings.
- Use badges: `Detected`, `Sponsored`, `Warning`, `Mock`, `Baseline`, `After`.
- Do not overbuild.

---

## 14. Module 10 — Local Storage Layer

### Purpose

Persist everything to JSON files.

Create `src/lib/storage.ts`.

### Paths

```text
data/goals.json
data/scans/{scanId}.json
data/plans/{planId}.json
data/logs/{goalId}.json
data/reports/{reportId}.json
public/screenshots/{scanId}/...
```

### Functions

```ts
export async function saveGoal(goal: AdDietGoal): Promise<void>;
export async function getGoal(goalId: string): Promise<AdDietGoal | null>;
export async function listGoals(): Promise<AdDietGoal[]>;

export async function saveScanResult(result: AdScanResult): Promise<void>;
export async function loadScanResult(scanId: string): Promise<AdScanResult | null>;
export async function listScanResults(): Promise<AdScanResult[]>;

export async function saveSteeringPlan(plan: SteeringPlan): Promise<void>;
export async function loadSteeringPlan(planId: string): Promise<SteeringPlan | null>;
export async function listSteeringPlans(goalId?: string): Promise<SteeringPlan[]>;

export async function appendAgentLogs(goalId: string, logs: AgentLogEntry[]): Promise<void>;
export async function loadAgentLogs(goalId: string): Promise<AgentLogEntry[]>;

export async function saveReport(report: AdDietReport): Promise<void>;
export async function loadReport(reportId: string): Promise<AdDietReport | null>;
export async function listReports(goalId?: string): Promise<AdDietReport[]>;
```

### Implementation details

- Ensure directories exist before writing.
- Use atomic-ish writes where simple: write temp file, rename.
- Pretty-print JSON with 2 spaces.
- Never commit `.auth/` or real scan data with private info.

---

## 15. Module 11 — API / Job Runner Layer

### Purpose

Expose local endpoints for UI.

### Endpoints

#### Goals

```http
POST /api/goals
GET /api/goals
GET /api/goals/:goalId
```

#### Scans

```http
POST /api/scan-instagram
POST /api/scan-mock
GET /api/scans
GET /api/scans/:scanId
```

#### Plans

```http
POST /api/goals/:goalId/create-plan
GET /api/goals/:goalId/plans
```

#### Runner

```http
POST /api/plans/:planId/run
GET /api/goals/:goalId/logs
```

#### Reports

```http
POST /api/goals/:goalId/report
GET /api/goals/:goalId/reports
```

### Timeout note

Playwright scans may exceed serverless/API route timeouts.

For hackathon local demo, it is acceptable to:

- run long operations in API routes locally;
- or prefer CLI commands;
- or make the UI instruct the user to run CLI and refresh.

### CLI commands

Add scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "scan:instagram": "tsx src/scripts/scanInstagram.ts",
    "scan:mock": "tsx src/scripts/seedMockData.ts",
    "run:plan": "tsx src/scripts/runSteeringPlan.ts"
  }
}
```

---

## 16. Module 12 — Safety & Ethics Layer

### Purpose

Make sure the product is defensible.

### Required UI copy

Footer / safety banner:

```text
Ad Diet is a user-side inspection and preference-steering tool. It does not click paid ads, automate login, bypass platform protections, or guarantee that platforms will change ad delivery. It extracts visible text and links from the page DOM where available and uses organic browsing actions to express user intent.
```

### Required README section

Include:

```text
Safety notes:
- Do not use this tool to click paid ads.
- Do not use this tool for fake engagement.
- Do not bypass platform access controls.
- Do not run this against accounts you do not own.
- Platform response is not guaranteed.
- Some scans may fail because platform DOMs change frequently.
```

### Terminology

Avoid:

- manipulate;
- trick;
- fake clicks;
- bot traffic;
- exploit;
- bypass.

Use:

- steer;
- measure;
- inspect;
- express intent;
- organic browsing;
- preference controls;
- ad diet.

---

## 17. Module 13 — Demo Mode

### Purpose

Ensure demo cannot fail due to Instagram login, network, or lack of ads.

### Demo modes

1. **Full live mode**
   - Instagram scan;
   - steering plan;
   - after scan.

2. **Hybrid mode**
   - live Playwright steering;
   - mock before/after feed.

3. **Mock-only mode**
   - no platform dependency;
   - deterministic before/after improvement.

### UI toggle

Add a small toggle:

```text
Demo mode: Live / Hybrid / Mock
```

### Demo script

Use this exact script:

> “Ad platforms infer what users want from noisy behaviour. We built Ad Diet: a user-side agent that lets people explicitly steer their ad experience. You tell it what ads you want more or less of. It scans your current ad diet, creates safe organic intent signals, then measures whether your ads changed.”

Steps:

1. Enter goal: more electric kettles, fewer crypto/loans/AI courses.
2. Run baseline scan.
3. Show extracted sponsored posts.
4. Generate steering plan.
5. Run Playwright agent.
6. Run after scan.
7. Show before/after report.
8. Mention caveat: platform response is observable, not guaranteed.

---

## 18. Module 14 — Testing & Debugging Tools

### Unit tests

Add tests for:

- intent parsing;
- text normalization;
- deduplication hash;
- scoring;
- report comparison.

### Manual debug commands

```bash
npm run scan:instagram -- --maxScrolls=5 --maxAds=3
npm run scan:mock
npm run run:plan -- --goalId=goal_abc123
```

### Debug logging

For Playwright modules, log:

- page URL;
- number of article elements found;
- number of sponsored candidates;
- screenshot save path;
- scan duration.

### Failure cases to handle

- Instagram not logged in;
- Instagram asks for verification;
- no `article` elements found;
- sponsored label not visible;
- screenshot path not writable;
- API route timeout;
- scan returns zero ads.

---

## 19. Build Order

### Phase 1 — Instagram Analyzer MVP

1. Create Next.js/TypeScript project.
2. Add Playwright.
3. Add domain types.
4. Add storage helpers.
5. Implement `scanInstagramFeed` CLI.
6. Implement manual login wait.
7. Implement visible `article` extraction.
8. Implement sponsored label detection.
9. Implement screenshot saving.
10. Save scan JSON.
11. Build UI to list scans and show extracted ads.
12. Add README safety notes.

Acceptance:

- `npm run scan:instagram` opens Instagram.
- User can log in manually.
- Scanner scrolls feed.
- Sponsored posts are detected from DOM text.
- JSON and screenshots are saved.
- UI displays saved scans.
- No scoring.
- No paid ad clicking.

### Phase 2 — Mock + Goal UI

1. Add goal form.
2. Add mock scan mode.
3. Link goal to scan.
4. Show goal details on scan page.

Acceptance:

- User can create an ad diet goal.
- User can run mock baseline/after scans.

### Phase 3 — Scoring

1. Implement deterministic scoring.
2. Score mock and Instagram ads.
3. Show badges and matched intents.

Acceptance:

- Relevant/unwanted ads are clearly labelled.
- No LLM required.

### Phase 4 — Steering Plan

1. Generate organic search plan from positive intents.
2. Display plan.
3. Save plan.

Acceptance:

- User can see exactly what the agent plans to do.
- Plan contains no paid ad clicks.

### Phase 5 — Steering Runner

1. Execute search actions.
2. Visit organic pages.
3. Save logs/screenshots.
4. Display logs.

Acceptance:

- Playwright visibly performs organic browsing.
- Logs prove actions.

### Phase 6 — Report

1. Run baseline and after scans.
2. Compare scored results.
3. Show before/after report.

Acceptance:

- Dashboard shows relevance delta and caveats.

---

## 20. Acceptance Criteria for Full MVP

The project is successful if:

- User can define desired and unwanted ad categories.
- The app can inspect Instagram feed for sponsored posts.
- The app can save screenshots and structured ad metadata.
- Mock mode provides a reliable deterministic demo.
- The app can classify extracted ads against the user goal.
- The app can generate a safe organic steering plan.
- Playwright can execute the plan without clicking paid ads.
- The app can compare before/after scans.
- The dashboard shows a clear report.
- Safety caveats are visible.

---

## 21. README Requirements

Create `README.md` with:

1. Project title.
2. One-liner.
3. Safety notes.
4. Install commands.
5. Running the dashboard.
6. Running Instagram scan.
7. Running mock mode.
8. Known limitations.
9. Demo script.

Commands:

```bash
npm install
npx playwright install chromium
npm run dev
npm run scan:instagram
npm run scan:mock
```

---

## 22. Example README Safety Text

```text
Ad Diet is a user-side tool for inspecting and steering ad relevance.
It does not click paid ads, automate login, bypass access controls, or guarantee changes to ad delivery.
Use it only with accounts you own or are authorized to inspect.
Platform DOMs change frequently, so extraction is best-effort.
```

---

## 23. Final Hackathon Pitch

> “Ad platforms infer what users want from noisy behaviour. We built Ad Diet: a user-side agent that lets people explicitly steer their ad experience. It scans the ads you currently see, asks what you want more or less of, performs safe organic browsing actions to express that intent, and measures whether your ad feed changes. We don’t click paid ads or bypass platform controls — we help users inspect, steer, and measure their own ad diet.”

---

## 24. First Task for Claude Code

Start with this:

```text
Implement Phase 1 only: Instagram Feed Analyzer MVP.

Use TypeScript, Playwright, and local JSON storage.
Do not implement scoring, steering, or reports yet.
Create a CLI command npm run scan:instagram that opens Instagram, waits for manual login if needed, scrolls the feed, detects articles containing Sponsored/Реклама/Promoted, extracts raw visible text and links, saves screenshots of detected ad cards, writes data/scans/{scanId}.json, and creates a simple Next.js dashboard for viewing saved scans.

Do not click ads. Do not automate login. Do not use OCR. Do not bypass platform protections.
```
