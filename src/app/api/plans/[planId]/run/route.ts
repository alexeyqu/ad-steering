import { NextRequest, NextResponse } from "next/server";
import { runSteeringPlan } from "@/lib/steeringRunner";
import {
  appendAgentLogs,
  getGoal,
  loadSteeringPlan,
  saveGoal,
} from "@/lib/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  const plan = await loadSteeringPlan(params.planId);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const goal = await getGoal(plan.goalId);
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  let headless = false;
  try {
    const body = await req.json();
    if (typeof body.headless === "boolean") headless = body.headless;
  } catch {
    // use default
  }

  try {
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

    return NextResponse.json({
      goalId: goal.id,
      planId: plan.id,
      logCount: logs.length,
      logs,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Steering run failed: ${err}` },
      { status: 500 }
    );
  }
}
