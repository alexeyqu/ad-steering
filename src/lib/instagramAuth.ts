import fs from "fs/promises";
import path from "path";

export const INSTAGRAM_AUTH_PATH = path.join(process.cwd(), ".auth", "instagram.json");

export async function hasInstagramAuthState(): Promise<boolean> {
  try {
    await fs.access(INSTAGRAM_AUTH_PATH);
    return true;
  } catch {
    return false;
  }
}
