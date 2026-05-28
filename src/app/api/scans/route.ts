import { NextResponse } from "next/server";
import { listScanResults } from "@/lib/storage";

export async function GET() {
  const scans = await listScanResults();
  return NextResponse.json(scans);
}
