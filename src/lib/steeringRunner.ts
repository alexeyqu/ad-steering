import { chromium, type Page } from "playwright";
import fs from "fs/promises";
import path from "path";
import type {
  AdDietGoal,
  AgentLogEntry,
  RunSteeringPlanOptions,
  SteeringAction,
} from "./types";
import { hasInstagramAuthState, INSTAGRAM_AUTH_PATH } from "./instagramAuth";
import { instagramExploreSearchUrl } from "./steeringPlanner";

const SPONSORED_LABELS = ["Sponsored", "Реклама", "Promoted"];

const BETWEEN_ACTION_MS_MIN = 1200;
const BETWEEN_ACTION_MS_MAX = 3200;
const AFTER_POST_MS_MIN = 9000;
const AFTER_POST_MS_MAX = 15000;
const SCROLL_PAUSE_MS_MIN = 1200;
const SCROLL_PAUSE_MS_MAX = 2800;

function isInstagramUrl(url: string): boolean {
  return /instagram\.com/i.test(url);
}

function goalUsesInstagram(goal: AdDietGoal): boolean {
  return goal.targetPlatforms.includes("instagram");
}

function makeLog(
  partial: Omit<AgentLogEntry, "timestamp">
): AgentLogEntry {
  return { timestamp: new Date().toISOString(), ...partial };
}

function logAction(event: "click" | "sleep" | "scroll", message: string): void {
  console.log(`[${event}] ${message}`);
}

function progressBar(done: number, total: number, width = 28): string {
  const safeTotal = Math.max(1, total);
  const ratio = Math.min(1, Math.max(0, done / safeTotal));
  const filled = Math.round(ratio * width);
  const bar = `${"=".repeat(filled)}${"-".repeat(width - filled)}`;
  const pct = Math.round(ratio * 100);
  return `[${bar}] ${pct}% (${done}/${total})`;
}

function logProgress(done: number, total: number, label: string): void {
  console.log(`[progress] ${progressBar(done, total)} ${label}`);
}

async function humanPause(
  page: Page,
  minMs: number,
  maxMs: number
): Promise<number> {
  const durationMs = Math.round(minMs + Math.random() * (maxMs - minMs));
  logAction("sleep", `${durationMs}ms`);
  await page.waitForTimeout(durationMs);
  return durationMs;
}

async function ensureScreenshotDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function saveScreenshot(page: Page, absPath: string): Promise<boolean> {
  try {
    await page.screenshot({ path: absPath, fullPage: false });
    return true;
  } catch {
    return false;
  }
}

function toWebScreenshotPath(
  screenshotsDir: string,
  goalId: string,
  fileName: string
): string {
  const base = screenshotsDir.replace(/^public\/?/, "").replace(/\/$/, "");
  return `/${base}/${goalId}/${fileName}`.replace(/\/+/g, "/");
}

function textMatchesIntent(text: string, intent: string): boolean {
  const lower = text.toLowerCase();
  const intentLower = intent.toLowerCase().trim();
  if (!intentLower) return true;
  if (lower.includes(intentLower)) return true;

  const tokens = intentLower.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return true;
  return tokens.some((token) => lower.includes(token));
}

function articleIsSponsored(rawText: string): boolean {
  return SPONSORED_LABELS.some((label) => rawText.includes(label));
}

async function lightScroll(page: Page, scrollCount = 3): Promise<void> {
  const viewportHeight = page.viewportSize()?.height ?? 800;
  for (let i = 0; i < scrollCount; i++) {
    const delta = Math.round(viewportHeight * (0.25 + Math.random() * 0.2));
    logAction("scroll", `wheel +${delta}px (${i + 1}/${scrollCount})`);
    await page.mouse.wheel(0, delta);
    await humanPause(page, SCROLL_PAUSE_MS_MIN, SCROLL_PAUSE_MS_MAX);
  }
}

async function runInstagramClickPosts(
  page: Page,
  action: SteeringAction,
  screenshotAbsPath: string,
  screenshotWebPath: string
): Promise<{ message: string; screenshotPath?: string }> {
  const intent = action.query ?? "";
  const maxClicks = action.maxClicks ?? 2;
  const dwellMs = action.dwellMs ?? 10000;
  const targetUrl =
    action.url ??
    (intent ? instagramExploreSearchUrl(intent) : "https://www.instagram.com/");

  if (!page.url().includes("instagram.com") || !page.url().includes("explore")) {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await humanPause(page, 2000, 4000);
  }

  await lightScroll(page, 4 + Math.floor(Math.random() * 2));

  let clicked = 0;
  const articles = await page.$$("article");

  for (const article of articles) {
    if (clicked >= maxClicks) break;

    let rawText = "";
    try {
      rawText = (await article.innerText()).trim();
    } catch {
      continue;
    }

    if (articleIsSponsored(rawText)) continue;
    if (!textMatchesIntent(rawText, intent)) continue;

    try {
      const postLink = await article.$('a[href*="/p/"], a[href*="/reel/"]');
      if (postLink) {
        logAction("click", `open organic post link for intent "${intent}"`);
        await postLink.click({ timeout: 8000 });
      } else {
        logAction("click", `open organic article for intent "${intent}"`);
        await article.click({ timeout: 8000 });
      }

      await page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {});
      await lightScroll(page, 1 + Math.floor(Math.random() * 2));
      await page.waitForTimeout(dwellMs + Math.random() * 3000);
      clicked++;

      logAction("click", "go back to explore feed");
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {
        return page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      });
      await humanPause(page, 1500, 3000);
      await lightScroll(page, 1);
    } catch {
      // try next article
    }
  }

  const saved = await saveScreenshot(page, screenshotAbsPath);

  const message =
    clicked > 0
      ? `Opened ${clicked} organic post(s) matching "${intent}" and dwelled ~${Math.round(dwellMs / 1000)}s each (sponsored skipped).`
      : `No matching organic posts found to open for "${intent}" (sponsored posts were skipped).`;

  return {
    message,
    screenshotPath: saved ? screenshotWebPath : undefined,
  };
}

async function runInstagramBrowse(
  page: Page,
  action: SteeringAction,
  screenshotAbsPath: string,
  screenshotWebPath: string
): Promise<{ message: string; screenshotPath?: string }> {
  const url =
    action.url ??
    (action.query
      ? instagramExploreSearchUrl(action.query)
      : "https://www.instagram.com/");

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await humanPause(page, 2000, 4000);
  await lightScroll(page, 4 + Math.floor(Math.random() * 2));

  const saved = await saveScreenshot(page, screenshotAbsPath);

  return {
    message: `Browsed Instagram at ${url} with extended scrolling (no sponsored clicks).`,
    screenshotPath: saved ? screenshotWebPath : undefined,
  };
}

async function isInPaidContainer(
  locator: ReturnType<Page["locator"]>
): Promise<boolean> {
  return locator.evaluate((el, labels) => {
    let node: Element | null = el;
    while (node) {
      const text = (node as HTMLElement).innerText?.slice(0, 500) ?? "";
      if (labels.some((label: string) => text.includes(label))) return true;
      node = node.parentElement;
    }
    return false;
  }, [...SPONSORED_LABELS, "Ad"]);
}

async function clickOrganicGoogleResults(
  page: Page,
  maxClicks: number
): Promise<number> {
  let clicked = 0;
  const candidateLocators = [
    page.locator("#rso a h3"),
    page.locator("#search .g a h3"),
  ];

  for (const locator of candidateLocators) {
    const count = await locator.count();
    for (let i = 0; i < count && clicked < maxClicks; i++) {
      const heading = locator.nth(i);
      const link = heading.locator("xpath=ancestor::a[1]");
      try {
        if ((await link.count()) === 0) continue;
        if (await isInPaidContainer(link)) continue;

        await link.click({ timeout: 5000 });
        await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
        await humanPause(page, 2000, 4000);
        clicked++;

        await page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
        await humanPause(page, 1500, 3000);
      } catch {
        // try next result
      }
    }
    if (clicked > 0) break;
  }

  return clicked;
}

async function runGenericVisit(
  page: Page,
  url: string,
  screenshotAbsPath: string,
  screenshotWebPath: string
): Promise<{ message: string; screenshotPath?: string }> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await humanPause(page, 2000, 4000);
  await lightScroll(page, 2);
  const saved = await saveScreenshot(page, screenshotAbsPath);
  return {
    message: `Visited ${url} and saved screenshot.`,
    screenshotPath: saved ? screenshotWebPath : undefined,
  };
}

async function runGoogleSearchAction(
  page: Page,
  action: SteeringAction,
  screenshotAbsPath: string,
  screenshotWebPath: string
): Promise<{ message: string; screenshotPath?: string }> {
  const query = action.query ?? "";
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await humanPause(page, 1500, 3000);
  await page.waitForSelector("#search, body", { timeout: 15000 }).catch(() => {});

  const organicClicks = await clickOrganicGoogleResults(page, 2);
  const saved = await saveScreenshot(page, screenshotAbsPath);

  const clickNote =
    organicClicks > 0
      ? ` Clicked ${organicClicks} organic result(s); skipped sponsored results.`
      : " No organic results clicked (sponsored results were avoided).";

  return {
    message: `Searched Google for '${query}' and saved screenshot.${clickNote}`,
    screenshotPath: saved ? screenshotWebPath : undefined,
  };
}

async function runGoogleAdPreferencesAction(
  page: Page,
  action: SteeringAction,
  screenshotAbsPath: string,
  screenshotWebPath: string
): Promise<{ message: string; screenshotPath?: string }> {
  const url = action.url ?? "https://adssettings.google.com/";
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await humanPause(page, 2000, 4000);
  const saved = await saveScreenshot(page, screenshotAbsPath);
  return {
    message: `Opened Google ad settings at ${url}. Manual updates only.`,
    screenshotPath: saved ? screenshotWebPath : undefined,
  };
}

async function runWaitAction(
  page: Page,
  action: SteeringAction
): Promise<{ message: string }> {
  const durationMs = action.durationMs ?? 5000;
  await page.waitForTimeout(durationMs);
  return { message: `Waited ${durationMs}ms (${action.reason}).` };
}

export async function runSteeringPlan(
  options: RunSteeringPlanOptions
): Promise<AgentLogEntry[]> {
  const { goal, plan, headless, screenshotsDir } = options;
  const logs: AgentLogEntry[] = [];
  const useInstagram = goalUsesInstagram(goal);

  const screenshotDirAbs = path.join(process.cwd(), screenshotsDir, goal.id);
  await ensureScreenshotDir(screenshotDirAbs);

  logs.push(
    makeLog({
      goalId: goal.id,
      planId: plan.id,
      status: "started",
      message: `Starting steering plan ${plan.id} (${plan.actions.length} actions, ${useInstagram ? "Instagram only" : "Google"}).`,
    })
  );

  if (useInstagram && !(await hasInstagramAuthState())) {
    logs.push(
      makeLog({
        goalId: goal.id,
        planId: plan.id,
        status: "info",
        message:
          "No saved Instagram session (.auth/instagram.json). Log in via npm run scan:instagram first for best results.",
      })
    );
  }

  const hasAuth = useInstagram && (await hasInstagramAuthState());
  const browser = await chromium.launch({ headless });
  const context = hasAuth
    ? await browser.newContext({ storageState: INSTAGRAM_AUTH_PATH })
    : await browser.newContext();
  const page = await context.newPage();

  try {
    logProgress(0, plan.actions.length, "starting");
    for (let i = 0; i < plan.actions.length; i++) {
      const action = plan.actions[i];
      logProgress(i, plan.actions.length, `starting ${action.type}`);

      if (i > 0) {
        const previousAction = plan.actions[i - 1];
        const minPauseMs =
          previousAction.type === "click_post"
            ? AFTER_POST_MS_MIN
            : BETWEEN_ACTION_MS_MIN;
        const maxPauseMs =
          previousAction.type === "click_post"
            ? AFTER_POST_MS_MAX
            : BETWEEN_ACTION_MS_MAX;
        const pauseMs = await humanPause(
          page,
          minPauseMs,
          maxPauseMs
        );
        logs.push(
          makeLog({
            goalId: goal.id,
            planId: plan.id,
            status: "info",
            message: `Paused ${pauseMs}ms before next action.`,
          })
        );
      }

      const screenshotFile = `action-${action.id}.png`;
      const screenshotAbsPath = path.join(screenshotDirAbs, screenshotFile);
      const screenshotWebPath = toWebScreenshotPath(
        screenshotsDir,
        goal.id,
        screenshotFile
      );

      logs.push(
        makeLog({
          goalId: goal.id,
          planId: plan.id,
          actionId: action.id,
          status: "started",
          message: `Running ${action.type}: ${action.query ?? action.url ?? action.reason}`,
        })
      );

      try {
        let result: { message: string; screenshotPath?: string };

        switch (action.type) {
          case "search":
            if (useInstagram) {
              result = await runInstagramBrowse(
                page,
                action,
                screenshotAbsPath,
                screenshotWebPath
              );
            } else {
              result = await runGoogleSearchAction(
                page,
                action,
                screenshotAbsPath,
                screenshotWebPath
              );
            }
            break;
          case "click_post":
            result = await runInstagramClickPosts(
              page,
              action,
              screenshotAbsPath,
              screenshotWebPath
            );
            break;
          case "visit_url":
          case "browse_results":
            if (useInstagram || isInstagramUrl(action.url ?? "")) {
              result = await runInstagramBrowse(
                page,
                action,
                screenshotAbsPath,
                screenshotWebPath
              );
            } else if (action.url) {
              result = await runGenericVisit(
                page,
                action.url,
                screenshotAbsPath,
                screenshotWebPath
              );
            } else {
              result = { message: "Skipped visit with no URL." };
            }
            break;
          case "ad_preferences":
            if (useInstagram) {
              result = {
                message:
                  "Skipped ad_preferences — no supported Instagram ad-settings URL in this build.",
              };
            } else {
              result = await runGoogleAdPreferencesAction(
                page,
                action,
                screenshotAbsPath,
                screenshotWebPath
              );
            }
            break;
          case "wait":
            result = await runWaitAction(page, action);
            break;
          default:
            logs.push(
              makeLog({
                goalId: goal.id,
                planId: plan.id,
                actionId: action.id,
                status: "skipped",
                message: "Skipped unknown action type.",
              })
            );
            continue;
        }

        logs.push(
          makeLog({
            goalId: goal.id,
            planId: plan.id,
            actionId: action.id,
            status: "success",
            message: result.message,
            screenshotPath:
              result.screenshotPath ??
              (action.type !== "wait" ? screenshotWebPath : undefined),
          })
        );
        logProgress(i + 1, plan.actions.length, `completed ${action.type}`);
      } catch (err) {
        logs.push(
          makeLog({
            goalId: goal.id,
            planId: plan.id,
            actionId: action.id,
            status: "failed",
            message: `Action failed: ${err}`,
          })
        );
        logProgress(i + 1, plan.actions.length, `failed ${action.type}`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  logs.push(
    makeLog({
      goalId: goal.id,
      planId: plan.id,
      status: "success",
      message: `Steering plan ${plan.id} finished.`,
    })
  );

  return logs;
}
