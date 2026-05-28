import { v4 as uuidv4 } from "uuid";

function shortId(): string {
  return uuidv4().replace(/-/g, "").slice(0, 12);
}

export function newGoalId(): string {
  return `goal_${shortId()}`;
}

export function newPlanId(): string {
  return `plan_${shortId()}`;
}

export function newActionId(index: number): string {
  return `act_${index + 1}`;
}
