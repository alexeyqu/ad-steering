import { scanInstagramFeed } from "../lib/instagramAnalyzer";
import { saveScanResult } from "../lib/storage";
import path from "path";

async function main() {
  const result = await scanInstagramFeed({
    maxScrolls: 20,
    maxAds: 20,
    headless: false,
    screenshotsDir: "public/screenshots",
  });

  await saveScanResult(result);

  console.log("\n================================================");
  console.log("Scan complete.");
  console.log(`Detected ads: ${result.detectedAds.length}`);
  console.log(`Saved result: data/scans/${result.scanId}.json`);
  console.log(`Screenshots:  public/screenshots/${result.scanId}/`);
  console.log("================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
