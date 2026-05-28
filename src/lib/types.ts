// --- Instagram scan (Phase 1) ---

export type InstagramAdCandidate = {
  id: string;
  scanId: string;
  platform: "instagram";
  detectedAt: string;

  advertiserHandle?: string;
  advertiserName?: string;
  sponsoredLabelFound: boolean;

  rawText: string;
  captionText?: string;
  ctaText?: string;

  links: string[];
  postUrls: string[];

  screenshotPath?: string;

  extractionWarnings: string[];
};

export type InstagramOrganicPost = {
  id: string;
  scanId: string;
  capturedAt: string;
  authorHandle?: string;
  rawText: string;
  screenshotPath?: string;
};

export type InstagramScanResult = {
  scanId: string;
  startedAt: string;
  finishedAt: string;
  requestedScrolls: number;
  detectedAds: InstagramAdCandidate[];
  organicPosts: InstagramOrganicPost[];
  logs: InstagramScanLogEntry[];
};

export type InstagramScanLogEntry = {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
};

export type ScanOptions = {
  maxScrolls: number;
  maxAds: number;
  headless: boolean;
  screenshotsDir: string;
};

// --- Full domain model (spec §4) ---

export type TargetPlatform = "instagram" | "google" | "mock";

export type AdDietGoal = {
  id: string;
  createdAt: string;
  updatedAt: string;

  rawPositivePrompt: string;
  rawNegativePrompt: string;

  positiveIntents: string[];
  negativeIntents: string[];

  /** How long you plan to wait before re-scanning to judge if ads changed (metadata only). */
  timeWindowDays: number;
  targetPlatforms: TargetPlatform[];

  status:
    | "draft"
    | "baseline_scanned"
    | "plan_created"
    | "plan_run"
    | "after_scanned"
    | "reported";
};

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
  /** Used by wait actions (milliseconds). */
  durationMs?: number;
};

export type SteeringPlan = {
  id: string;
  goalId: string;
  createdAt: string;
  actions: SteeringAction[];
  caveats: string[];
};

export type AgentLogEntry = {
  timestamp: string;
  goalId: string;
  planId?: string;
  actionId?: string;
  status: "started" | "success" | "failed" | "skipped" | "info";
  message: string;
  screenshotPath?: string;
};

export type RunSteeringPlanOptions = {
  goal: AdDietGoal;
  plan: SteeringPlan;
  headless: boolean;
  screenshotsDir: string;
};
