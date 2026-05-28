import { NextResponse } from "next/server";
import { listSteeringPlans } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: { goalId: string } }
) {
  const plans = await listSteeringPlans(params.goalId);
  return NextResponse.json({ plans });
}
