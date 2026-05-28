import { runSteeringPlan } from "../lib/steeringRunner";
import {
  appendAgentLogs,
  getGoal,
  loadSteeringPlan,
  saveGoal,
} from "../lib/storage";

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const goalId = parseArg("goalId");
  const planId = parseArg("planId");
  const headless = hasFlag("headless");

  if (!planId) {
    console.error("Usage: npm run run:plan -- --planId=<plan_id> [--headless]");
    process.exit(1);
  }

  const plan = await loadSteeringPlan(planId);
  if (!plan) {
    console.error(`Plan not found: ${planId}`);
    process.exit(1);
  }

  const resolvedGoalId = goalId ?? plan.goalId;
  const goal = await getGoal(resolvedGoalId);
  if (!goal) {
    console.error(`Goal not found: ${resolvedGoalId}`);
    process.exit(1);
  }

  console.log(`Running steering plan ${plan.id} for goal ${goal.id}...`);
  console.log(`Actions: ${plan.actions.length}, headless=${headless}\n`);

  const logs = await runSteeringPlan({
    goal,
    plan,
    headless,
    screenshotsDir: "public/screenshots",
  });

  await appendAgentLogs(goal.id, logs);

  goal.status = "plan_run";
  goal.updatedAt = new Date().toISOString();
  await saveGoal(goal);

  const successes = logs.filter((l) => l.status === "success" && l.actionId);
  const failures = logs.filter((l) => l.status === "failed");

  console.log("\n================================================");
  console.log("Steering plan complete.");
  console.log(`Successful actions: ${successes.length}`);
  console.log(`Failed actions: ${failures.length}`);
  console.log(`Logs saved: data/logs/${goal.id}.json`);
  console.log(`Screenshots: public/screenshots/${goal.id}/`);
  console.log("================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
