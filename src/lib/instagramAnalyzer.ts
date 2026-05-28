import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import type {
  InstagramAdCandidate,
  InstagramScanResult,
  InstagramScanLogEntry,
  ScanOptions,
} from "./types";

// "Ad" is the English Instagram label (appears where the timestamp would be on organic posts).
// Use word-boundary patterns for short labels to avoid false matches on "Address", etc.
const SPONSORED_LABEL_PATTERNS = [
  /\bAd\b/,
  /\bSponsored\b/,
  /\bPromoted\b/,
  /\bРеклама\b/,
];

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
];

// Profile URL patterns to exclude when extracting advertiser handle
const EXCLUDED_PATH_SEGMENTS = ["/p/", "/reel/", "/explore/", "/accounts/", "/stories/"];

const AUTH_PATH = path.join(process.cwd(), ".auth", "instagram.json");

function makeLog(
  level: InstagramScanLogEntry["level"],
  message: string
): InstagramScanLogEntry {
  return { timestamp: new Date().toISOString(), level, message };
}

function adHash(handle: string | undefined, rawText: string): string {
  const key = handle
    ? `${handle}::${rawText.slice(0, 500)}`
    : rawText.slice(0, 1000);
  return crypto.createHash("sha256").update(key).digest("hex");
}

function extractHandle(href: string): string | undefined {
  try {
    const url = new URL(href, "https://www.instagram.com");
    if (url.hostname !== "www.instagram.com" && url.hostname !== "instagram.com") {
      return undefined;
    }
    const parts = url.pathname.replace(/^\/|\/$/g, "").split("/");
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0];
    }
  } catch {
    // relative or malformed URL
    const match = href.match(/^\/([^/]+)\/?$/);
    if (match) return match[1];
  }
  return undefined;
}

function isExcludedPath(href: string): boolean {
  return EXCLUDED_PATH_SEGMENTS.some((seg) => href.includes(seg));
}

async function tryLoadAuth(): Promise<boolean> {
  try {
    await fs.access(AUTH_PATH);
    return true;
  } catch {
    return false;
  }
}

async function waitForUserLogin(page: Page): Promise<void> {
  console.log("\n================================================");
  console.log("Please log in manually in the opened browser window.");
  console.log("After the Instagram feed is visible, press Enter here.");
  console.log("================================================\n");

  await new Promise<void>((resolve) => {
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", () => resolve());
    process.stdin.resume();
  });

  process.stdin.pause();
}

export async function scanInstagramFeed(options: ScanOptions): Promise<InstagramScanResult> {
  const scanId = `scan_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
  const startedAt = new Date().toISOString();
  const logs: InstagramScanLogEntry[] = [];
  const detectedAds: InstagramAdCandidate[] = [];
  const seenHashes = new Set<string>();

  function log(level: InstagramScanLogEntry["level"], message: string) {
    const entry = makeLog(level, message);
    logs.push(entry);
    console.log(`[${entry.level.toUpperCase()}] ${message}`);
  }

  const screenshotDir = path.join(process.cwd(), options.screenshotsDir, scanId);
  await fs.mkdir(screenshotDir, { recursive: true });

  log("info", `Starting scan ${scanId}`);
  log("info", `Options: maxScrolls=${options.maxScrolls}, maxAds=${options.maxAds}, headless=${options.headless}`);

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    const hasAuth = await tryLoadAuth();
    log("info", hasAuth ? "Found saved auth state, attempting reuse" : "No saved auth state found");

    browser = await chromium.launch({ headless: options.headless });
    context = hasAuth
      ? await browser.newContext({ storageState: AUTH_PATH })
      : await browser.newContext();

    page = await context.newPage();
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 30000 });

    // Detect if login is required
    const currentUrl = page.url();
    const pageContent = await page.content();
    const needsLogin =
      currentUrl.includes("/accounts/login") ||
      pageContent.includes('name="username"') ||
      pageContent.includes("Log in") && !pageContent.includes("article");

    if (needsLogin) {
      log("info", "Login page detected — awaiting manual login");
      await waitForUserLogin(page);

      // Save auth state for future runs
      try {
        await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
        await context.storageState({ path: AUTH_PATH });
        log("info", "Auth state saved to .auth/instagram.json");
      } catch (err) {
        log("warn", `Failed to save auth state: ${err}`);
      }
    }

    // Verify feed is visible
    try {
      await page.waitForSelector("article", { timeout: 15000 });
      log("info", "Feed articles detected, starting scroll loop");
    } catch {
      log("error", "No feed articles found. Instagram feed may not be visible.");
      log("warn", "No sponsored posts detected. This may mean Instagram did not show ads during this scan, or the DOM labels were not visible.");
      return buildResult(scanId, startedAt, options.maxScrolls, detectedAds, logs);
    }

    // Scroll loop
    for (let scrollIndex = 0; scrollIndex < options.maxScrolls; scrollIndex++) {
      log("info", `Scroll ${scrollIndex + 1}/${options.maxScrolls} — detected ads so far: ${detectedAds.length}`);

      const articles = await page.$$("article");
      log("info", `Found ${articles.length} article elements`);

      for (const article of articles) {
        if (detectedAds.length >= options.maxAds) break;

        const warnings: string[] = [];

        let rawText = "";
        try {
          rawText = (await article.innerText()).trim().slice(0, 5000);
        } catch (err) {
          warnings.push(`Could not extract innerText: ${err}`);
          log("warn", `Article text extraction failed: ${err}`);
          continue;
        }

        // Check for sponsored labels
        const sponsoredLabelFound = SPONSORED_LABEL_PATTERNS.some((re) =>
          re.test(rawText)
        );

        if (!sponsoredLabelFound) continue;

        // Extract all links
        const linkElements = await article.$$("a[href]");
        const links: string[] = [];
        for (const el of linkElements) {
          const href = await el.getAttribute("href");
          if (href) links.push(href);
        }

        const postUrls = links.filter(
          (href) => href.includes("/p/") || href.includes("/reel/")
        );

        // Extract advertiser handle
        let advertiserHandle: string | undefined;
        for (const href of links) {
          if (isExcludedPath(href)) continue;
          const handle = extractHandle(href);
          if (handle) {
            advertiserHandle = handle;
            break;
          }
        }

        // CTA detection
        const ctaText = CTA_LABELS.find((cta) =>
          rawText.toLowerCase().includes(cta.toLowerCase())
        );

        // Deduplicate
        const hash = adHash(advertiserHandle, rawText);
        if (seenHashes.has(hash)) {
          log("info", `Duplicate ad skipped (handle=${advertiserHandle})`);
          continue;
        }
        seenHashes.add(hash);

        // Screenshot
        const adIndex = detectedAds.length;
        const screenshotFileName = `ad-${adIndex}.png`;
        const screenshotAbsPath = path.join(screenshotDir, screenshotFileName);
        const screenshotWebPath = `/screenshots/${scanId}/${screenshotFileName}`;
        let screenshotPath: string | undefined;

        try {
          await article.screenshot({ path: screenshotAbsPath });
          screenshotPath = screenshotWebPath;
        } catch (err) {
          warnings.push(`Screenshot failed: ${err}`);
          log("warn", `Screenshot failed for ad ${adIndex}: ${err}`);
        }

        const candidate: InstagramAdCandidate = {
          id: uuidv4(),
          scanId,
          platform: "instagram",
          detectedAt: new Date().toISOString(),
          advertiserHandle,
          sponsoredLabelFound,
          rawText,
          captionText: rawText,
          ctaText,
          links,
          postUrls,
          screenshotPath,
          extractionWarnings: warnings,
        };

        detectedAds.push(candidate);
        log("info", `Detected ad #${adIndex + 1} — handle=${advertiserHandle ?? "unknown"}, cta=${ctaText ?? "none"}`);
      }

      if (detectedAds.length >= options.maxAds) {
        log("info", `Reached maxAds limit (${options.maxAds}), stopping`);
        break;
      }

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500 + Math.random() * 1500);
    }

    if (detectedAds.length === 0) {
      log("warn", "No sponsored posts detected. This may mean Instagram did not show ads during this scan, or the DOM labels were not visible.");
    }

    log("info", `Scan complete. Detected ${detectedAds.length} ads.`);
  } catch (err) {
    log("error", `Unexpected error during scan: ${err}`);
  } finally {
    try {
      await context?.close();
      await browser?.close();
    } catch {
      // ignore cleanup errors
    }
  }

  return buildResult(scanId, startedAt, options.maxScrolls, detectedAds, logs);
}

function buildResult(
  scanId: string,
  startedAt: string,
  requestedScrolls: number,
  detectedAds: InstagramAdCandidate[],
  logs: InstagramScanLogEntry[]
): InstagramScanResult {
  return {
    scanId,
    startedAt,
    finishedAt: new Date().toISOString(),
    requestedScrolls,
    detectedAds,
    logs,
  };
}
