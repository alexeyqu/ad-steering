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
