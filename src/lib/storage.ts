import fs from "fs/promises";
import path from "path";
import type {
  AdDietGoal,
  AgentLogEntry,
  InstagramScanResult,
  SteeringPlan,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const SCANS_DIR = path.join(DATA_DIR, "scans");
const GOALS_FILE = path.join(DATA_DIR, "goals.json");
const PLANS_DIR = path.join(DATA_DIR, "plans");
const LOGS_DIR = path.join(DATA_DIR, "logs");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tempPath, filePath);
}

// --- Scans ---

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

// --- Goals ---

async function loadGoalsFile(): Promise<AdDietGoal[]> {
  return readJsonFile<AdDietGoal[]>(GOALS_FILE, []);
}

async function saveGoalsFile(goals: AdDietGoal[]): Promise<void> {
  await writeJsonAtomic(GOALS_FILE, goals);
}

export async function saveGoal(goal: AdDietGoal): Promise<void> {
  const goals = await loadGoalsFile();
  const index = goals.findIndex((g) => g.id === goal.id);
  if (index >= 0) {
    goals[index] = goal;
  } else {
    goals.push(goal);
  }
  await saveGoalsFile(goals);
}

export async function getGoal(goalId: string): Promise<AdDietGoal | null> {
  const goals = await loadGoalsFile();
  return goals.find((g) => g.id === goalId) ?? null;
}

export async function listGoals(): Promise<AdDietGoal[]> {
  const goals = await loadGoalsFile();
  return goals.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// --- Steering plans ---

export async function saveSteeringPlan(plan: SteeringPlan): Promise<void> {
  await ensureDir(PLANS_DIR);
  const filePath = path.join(PLANS_DIR, `${plan.id}.json`);
  await writeJsonAtomic(filePath, plan);
}

export async function loadSteeringPlan(planId: string): Promise<SteeringPlan | null> {
  const filePath = path.join(PLANS_DIR, `${planId}.json`);
  return readJsonFile<SteeringPlan | null>(filePath, null);
}

export async function listSteeringPlans(goalId?: string): Promise<SteeringPlan[]> {
  try {
    await ensureDir(PLANS_DIR);
    const files = await fs.readdir(PLANS_DIR);
    const plans: SteeringPlan[] = [];
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      const plan = await readJsonFile<SteeringPlan | null>(
        path.join(PLANS_DIR, file),
        null
      );
      if (plan && (!goalId || plan.goalId === goalId)) {
        plans.push(plan);
      }
    }
    return plans.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

// --- Agent logs ---

function logsPath(goalId: string): string {
  return path.join(LOGS_DIR, `${goalId}.json`);
}

export async function appendAgentLogs(
  goalId: string,
  logs: AgentLogEntry[]
): Promise<void> {
  if (logs.length === 0) return;
  await ensureDir(LOGS_DIR);
  const existing = await loadAgentLogs(goalId);
  await writeJsonAtomic(logsPath(goalId), [...existing, ...logs]);
}

export async function loadAgentLogs(goalId: string): Promise<AgentLogEntry[]> {
  return readJsonFile<AgentLogEntry[]>(logsPath(goalId), []);
}
