import { NextRequest, NextResponse } from "next/server";
import { scanInstagramFeed } from "@/lib/instagramAnalyzer";
import { saveScanResult } from "@/lib/storage";

export async function POST(req: NextRequest) {
  let body: { maxScrolls?: number; maxAds?: number; headless?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // use defaults
  }

  const maxScrolls = typeof body.maxScrolls === "number" ? body.maxScrolls : 20;
  const maxAds = typeof body.maxAds === "number" ? body.maxAds : 20;
  const headless = typeof body.headless === "boolean" ? body.headless : false;

  try {
    const result = await scanInstagramFeed({
      maxScrolls,
      maxAds,
      headless,
      screenshotsDir: "public/screenshots",
    });

    await saveScanResult(result);

    return NextResponse.json({
      scanId: result.scanId,
      detectedAdsCount: result.detectedAds.length,
      resultPath: `data/scans/${result.scanId}.json`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Scan failed: ${err}` },
      { status: 500 }
    );
  }
}
