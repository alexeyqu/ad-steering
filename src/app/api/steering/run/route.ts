import { NextRequest, NextResponse } from "next/server";
import { executeSteering } from "@/lib/executeSteering";
import type { TargetPlatform } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: {
    rawPositivePrompt?: string;
    rawNegativePrompt?: string;
    timeWindowDays?: number;
    targetPlatforms?: TargetPlatform[];
    headless?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawPositivePrompt = body.rawPositivePrompt?.trim() ?? "";
  if (!rawPositivePrompt) {
    return NextResponse.json(
      { error: "rawPositivePrompt is required" },
      { status: 400 }
    );
  }

  try {
    const result = await executeSteering({
      rawPositivePrompt,
      rawNegativePrompt: body.rawNegativePrompt,
      timeWindowDays: body.timeWindowDays,
      targetPlatforms: body.targetPlatforms,
      headless: body.headless ?? false,
      screenshotsDir: "public/screenshots",
    });

    const actionSuccesses = result.logs.filter(
      (l) => l.status === "success" && l.actionId
    );
    const failures = result.logs.filter((l) => l.status === "failed");

    return NextResponse.json({
      goalId: result.goal.id,
      planId: result.plan.id,
      actionCount: result.plan.actions.length,
      successCount: actionSuccesses.length,
      failureCount: failures.length,
      goal: result.goal,
      plan: result.plan,
      logs: result.logs,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Steering failed: ${err}` },
      { status: 500 }
    );
  }
}
