import { NextResponse } from "next/server";
import { getGoal } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: { goalId: string } }
) {
  const goal = await getGoal(params.goalId);
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
  return NextResponse.json({ goal });
}
