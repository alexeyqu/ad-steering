import { NextResponse } from "next/server";
import { createSteeringPlan } from "@/lib/steeringPlanner";
import { getGoal, saveGoal, saveSteeringPlan } from "@/lib/storage";

export async function POST(
  _req: Request,
  { params }: { params: { goalId: string } }
) {
  const goal = await getGoal(params.goalId);
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const plan = createSteeringPlan(goal);
  await saveSteeringPlan(plan);

  goal.status = "plan_created";
  goal.updatedAt = new Date().toISOString();
  await saveGoal(goal);

  return NextResponse.json({
    planId: plan.id,
    actionCount: plan.actions.length,
    plan,
  });
}
