import { executeSteering } from "../lib/executeSteering";

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function printUsage(): void {
  console.error(`Usage: npm run steering:run -- --positive="<desired ads>" [options]

Creates a goal, generates an Instagram steering plan, and runs it in the browser.

Options:
  --positive=<text>      Required. What ads you want more of.
  --negative=<text>      Optional. What ads you want fewer of.
  --window-days=<n>      Observation window in days (default: 7)
  --headless             Run browser without a visible window

Example:
  npm run steering:run -- \\
    --positive="electric kettles, tea, kitchen appliances" \\
    --negative="crypto, gambling"`);
}

async function main() {
  const rawPositivePrompt = parseArg("positive");
  if (!rawPositivePrompt) {
    printUsage();
    process.exit(1);
  }

  const rawNegativePrompt = parseArg("negative") ?? "";
  const daysRaw = parseArg("window-days") ?? parseArg("days");
  let timeWindowDays: number | undefined;
  if (daysRaw !== undefined) {
    timeWindowDays = Number(daysRaw);
    if (!Number.isFinite(timeWindowDays) || timeWindowDays < 1) {
      console.error("Invalid window-days value.");
      process.exit(1);
    }
  }

  console.log("\n================================================");
  console.log("Ad Diet steering — create goal, plan, and run");
  console.log("================================================\n");

  const { goal, plan, logs } = await executeSteering({
    rawPositivePrompt,
    rawNegativePrompt,
    timeWindowDays,
    headless: hasFlag("headless"),
  });

  const actionSuccesses = logs.filter((l) => l.status === "success" && l.actionId);
  const failures = logs.filter((l) => l.status === "failed");

  console.log("\n================================================");
  console.log("Steering complete.");
  console.log(`Goal ID:  ${goal.id}`);
  console.log(`Plan ID:  ${plan.id}`);
  console.log(`Actions:  ${plan.actions.length} planned, ${actionSuccesses.length} succeeded, ${failures.length} failed`);
  console.log(`Logs:     data/logs/${goal.id}.json`);
  console.log(`Screens:  public/screenshots/${goal.id}/`);
  console.log("================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
