import { newGoalId } from "./ids";
import { parseGoalIntents } from "./intentParser";
import type { AdDietGoal, TargetPlatform } from "./types";

export type CreateGoalInput = {
  rawPositivePrompt: string;
  rawNegativePrompt?: string;
  timeWindowDays?: number;
  targetPlatforms?: TargetPlatform[];
};

export function createAdDietGoal(input: CreateGoalInput): AdDietGoal {
  const rawPositivePrompt = input.rawPositivePrompt.trim();
  const rawNegativePrompt = (input.rawNegativePrompt ?? "").trim();

  if (!rawPositivePrompt) {
    throw new Error("rawPositivePrompt is required");
  }

  const { positiveIntents, negativeIntents } = parseGoalIntents(
    rawPositivePrompt,
    rawNegativePrompt
  );

  const now = new Date().toISOString();

  return {
    id: newGoalId(),
    createdAt: now,
    updatedAt: now,
    rawPositivePrompt,
    rawNegativePrompt,
    positiveIntents,
    negativeIntents,
    timeWindowDays:
      typeof input.timeWindowDays === "number" ? input.timeWindowDays : 7,
    targetPlatforms: input.targetPlatforms?.length
      ? input.targetPlatforms
      : ["instagram"],
    status: "draft",
  };
}
