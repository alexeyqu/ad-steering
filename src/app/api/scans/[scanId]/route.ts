import { NextRequest, NextResponse } from "next/server";
import { loadScanResult } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { scanId: string } }
) {
  const result = await loadScanResult(params.scanId);
  if (!result) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
