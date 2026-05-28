import { NextResponse } from "next/server";
import { loadAgentLogs } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: { goalId: string } }
) {
  const logs = await loadAgentLogs(params.goalId);
  return NextResponse.json({ logs });
}
