import { createAdDietGoal } from "../lib/goals";
import { saveGoal } from "../lib/storage";
import type { TargetPlatform } from "../lib/types";

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

function printUsage(): void {
  console.error(`Usage: npm run create:goal -- --positive="<desired ads>" [options]

Options:
  --positive=<text>      Required. What ads you want more of.
  --negative=<text>      Optional. What ads you want fewer of.
  --window-days=<number> How many days before you expect to re-scan and compare
                         ad feeds (default: 7). Stored on the goal only — not
                         used while browsing.
  --platforms=<list>     Comma-separated: instagram, google, mock
                         (default: instagram)

Example:
  npm run create:goal -- \\
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
  const platformsRaw = parseArg("platforms");

  let timeWindowDays: number | undefined;
  if (daysRaw !== undefined) {
    timeWindowDays = Number(daysRaw);
    if (!Number.isFinite(timeWindowDays) || timeWindowDays < 1) {
      console.error("Invalid window-days value. Use a positive number.");
      process.exit(1);
    }
  }

  let targetPlatforms: TargetPlatform[] | undefined;
  if (platformsRaw) {
    const allowed: TargetPlatform[] = ["instagram", "google", "mock"];
    targetPlatforms = platformsRaw
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean) as TargetPlatform[];

    const invalid = targetPlatforms.filter((p) => !allowed.includes(p));
    if (invalid.length > 0) {
      console.error(`Invalid platform(s): ${invalid.join(", ")}`);
      console.error(`Allowed: ${allowed.join(", ")}`);
      process.exit(1);
    }
  }

  const goal = createAdDietGoal({
    rawPositivePrompt,
    rawNegativePrompt,
    timeWindowDays,
    targetPlatforms,
  });

  await saveGoal(goal);

  console.log("\n================================================");
  console.log("Ad Diet goal created.");
  console.log(`Goal ID: ${goal.id}`);
  console.log(`Saved: data/goals.json`);
  console.log("\nPositive intents:", goal.positiveIntents.join(", ") || "(none)");
  console.log("Negative intents:", goal.negativeIntents.join(", ") || "(none)");
  console.log("Platforms:", goal.targetPlatforms.join(", "));
  console.log(
    `Observation window: ${goal.timeWindowDays} day(s) before you re-scan to compare ads`
  );
  console.log("\nNext steps:");
  console.log(`  npm run create:plan -- --goalId=${goal.id}`);
  console.log("================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
