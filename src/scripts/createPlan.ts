import { createSteeringPlan } from "../lib/steeringPlanner";
import { getGoal, saveGoal, saveSteeringPlan } from "../lib/storage";

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

async function main() {
  const goalId = parseArg("goalId");
  if (!goalId) {
    console.error("Usage: npm run create:plan -- --goalId=<goal_id>");
    process.exit(1);
  }

  const goal = await getGoal(goalId);
  if (!goal) {
    console.error(`Goal not found: ${goalId}`);
    process.exit(1);
  }

  const plan = createSteeringPlan(goal);
  await saveSteeringPlan(plan);

  goal.status = "plan_created";
  goal.updatedAt = new Date().toISOString();
  await saveGoal(goal);

  console.log("\n================================================");
  console.log("Steering plan created.");
  console.log(`Plan ID: ${plan.id}`);
  console.log(`Actions: ${plan.actions.length}`);
  console.log(`Saved: data/plans/${plan.id}.json`);
  console.log("\nActions:");
  for (const action of plan.actions) {
    const detail = action.query ?? action.url ?? action.reason;
    console.log(`  [${action.type}] ${detail}`);
  }
  console.log("\nRun with:");
  console.log(`  npm run run:plan -- --planId=${plan.id}`);
  console.log("================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
