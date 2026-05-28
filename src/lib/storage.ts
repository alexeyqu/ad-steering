import fs from "fs/promises";
import path from "path";
import type { InstagramScanResult } from "./types";

const SCANS_DIR = path.join(process.cwd(), "data", "scans");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveScanResult(result: InstagramScanResult): Promise<void> {
  await ensureDir(SCANS_DIR);
  const filePath = path.join(SCANS_DIR, `${result.scanId}.json`);
  await fs.writeFile(filePath, JSON.stringify(result, null, 2), "utf-8");
}

export async function loadScanResult(scanId: string): Promise<InstagramScanResult | null> {
  const filePath = path.join(SCANS_DIR, `${scanId}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as InstagramScanResult;
  } catch {
    return null;
  }
}

export async function listScanResults(): Promise<InstagramScanResult[]> {
  try {
    await ensureDir(SCANS_DIR);
    const files = await fs.readdir(SCANS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const results: InstagramScanResult[] = [];
    for (const file of jsonFiles) {
      const raw = await fs.readFile(path.join(SCANS_DIR, file), "utf-8");
      try {
        results.push(JSON.parse(raw) as InstagramScanResult);
      } catch {
        // skip malformed files
      }
    }
    return results.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  } catch {
    return [];
  }
}
