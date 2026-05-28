import { NextRequest, NextResponse } from "next/server";
import { createAdDietGoal } from "@/lib/goals";
import { listGoals, saveGoal } from "@/lib/storage";
import type { TargetPlatform } from "@/lib/types";

export async function GET() {
  const goals = await listGoals();
  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  let body: {
    rawPositivePrompt?: string;
    rawNegativePrompt?: string;
    timeWindowDays?: number;
    targetPlatforms?: TargetPlatform[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let goal;
  try {
    goal = createAdDietGoal({
      rawPositivePrompt: body.rawPositivePrompt ?? "",
      rawNegativePrompt: body.rawNegativePrompt,
      timeWindowDays: body.timeWindowDays,
      targetPlatforms: body.targetPlatforms,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  await saveGoal(goal);

  return NextResponse.json({ goalId: goal.id, goal });
}
