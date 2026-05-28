import { createAdDietGoal, type CreateGoalInput } from "./goals";
import { createSteeringPlan } from "./steeringPlanner";
import { runSteeringPlan } from "./steeringRunner";
import {
  appendAgentLogs,
  saveGoal,
  saveSteeringPlan,
} from "./storage";
import type { AdDietGoal, AgentLogEntry, SteeringPlan } from "./types";

export type ExecuteSteeringInput = CreateGoalInput & {
  headless?: boolean;
  screenshotsDir?: string;
};

export type ExecuteSteeringResult = {
  goal: AdDietGoal;
  plan: SteeringPlan;
  logs: AgentLogEntry[];
};

export async function executeSteering(
  input: ExecuteSteeringInput
): Promise<ExecuteSteeringResult> {
  const headless = input.headless ?? false;
  const screenshotsDir = input.screenshotsDir ?? "public/screenshots";

  const goal = createAdDietGoal(input);
  await saveGoal(goal);

  const plan = createSteeringPlan(goal);
  await saveSteeringPlan(plan);

  goal.status = "plan_created";
  goal.updatedAt = new Date().toISOString();
  await saveGoal(goal);

  const logs = await runSteeringPlan({
    goal,
    plan,
    headless,
    screenshotsDir,
  });

  await appendAgentLogs(goal.id, logs);

  goal.status = "plan_run";
  goal.updatedAt = new Date().toISOString();
  await saveGoal(goal);

  return { goal, plan, logs };
}
