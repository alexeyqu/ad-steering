import type { AdDietGoal, SteeringAction, SteeringPlan, TargetPlatform } from "./types";
import { newActionId, newPlanId } from "./ids";

const MIN_ACTIONS = 5;
const MAX_ACTIONS = 10;

const DEFAULT_CAVEATS = [
  "Platform response is not guaranteed.",
  "The agent will not click paid ads or sponsored posts.",
  "Results may be noisy in a short hackathon demo.",
];

const INSTAGRAM_WAIT_MS = 5000;

/** Google / retailer steering — only when the goal explicitly targets Google. */
const GOOGLE_SEARCH_TEMPLATES = [
  (intent: string) => `best ${intent} UK`,
  (intent: string) => `${intent} reviews`,
];

const GOOGLE_AD_SETTINGS_URL = "https://adssettings.google.com/";
const INSTAGRAM_AD_PREFERENCES_URL =
  "https://www.instagram.com/accounts/ad_preferences/";

function usesInstagramSteering(platforms: TargetPlatform[]): boolean {
  return platforms.includes("instagram");
}

function usesGoogleSteering(platforms: TargetPlatform[]): boolean {
  return platforms.includes("google") && !platforms.includes("instagram");
}

function intentToHashtag(intent: string): string {
  return intent.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function instagramExploreSearchUrl(intent: string): string {
  return `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(intent)}`;
}

function instagramHashtagUrl(intent: string): string {
  const tag = intentToHashtag(intent);
  return `https://www.instagram.com/explore/tags/${tag}/`;
}

function reindexActions(actions: SteeringAction[]): SteeringAction[] {
  return actions.map((action, index) => ({ ...action, id: newActionId(index) }));
}

function trimToActionLimit(actions: SteeringAction[]): SteeringAction[] {
  if (actions.length <= MAX_ACTIONS) return reindexActions(actions);
  return reindexActions(actions.slice(0, MAX_ACTIONS));
}

function insertWaitsBetweenVisits(actions: SteeringAction[]): SteeringAction[] {
  const withWaits: SteeringAction[] = [];
  for (const action of actions) {
    withWaits.push(action);
    if (action.type === "visit_url" || action.type === "browse_results") {
      withWaits.push({
        id: "pending",
        type: "wait",
        durationMs: INSTAGRAM_WAIT_MS,
        reason: "Pause so activity looks organic before the next step.",
        safetyNote: "No clicks during wait.",
      });
    }
  }
  return withWaits;
}

function buildInstagramActions(goal: AdDietGoal): SteeringAction[] {
  const intents =
    goal.positiveIntents.length > 0
      ? goal.positiveIntents
      : ["content you want more of"];

  const actions: SteeringAction[] = [];

  for (const intent of intents) {
    actions.push({
      id: "pending",
      type: "browse_results",
      url: instagramExploreSearchUrl(intent),
      reason: `Browse Instagram explore results for "${intent}" without clicking sponsored posts.`,
      safetyNote: "Organic browse only; no paid ad clicks.",
    });

    const tag = intentToHashtag(intent);
    if (tag.length >= 2) {
      actions.push({
        id: "pending",
        type: "visit_url",
        url: instagramHashtagUrl(intent),
        reason: `Browse the #${tag} hashtag feed on Instagram.`,
        safetyNote: "Scroll only; do not click sponsored posts.",
      });
    }
  }

  actions.push({
    id: "pending",
    type: "ad_preferences",
    url: INSTAGRAM_AD_PREFERENCES_URL,
    reason:
      "Open Instagram ad preferences so you can optionally adjust interests manually.",
    safetyNote:
      "Manual changes only — the agent will not automate sensitive settings.",
  });

  return insertWaitsBetweenVisits(actions);
}

function buildGoogleActions(goal: AdDietGoal): SteeringAction[] {
  const actions: SteeringAction[] = [];
  const intents =
    goal.positiveIntents.length > 0
      ? goal.positiveIntents
      : ["products matching your preferences"];

  for (const intent of intents) {
    for (const template of GOOGLE_SEARCH_TEMPLATES) {
      actions.push({
        id: "pending",
        type: "search",
        query: template(intent),
        reason: `Creates explicit organic commercial intent around ${intent}.`,
        safetyNote: "Will not click sponsored Google results.",
      });
    }
  }

  actions.push({
    id: "pending",
    type: "ad_preferences",
    url: GOOGLE_AD_SETTINGS_URL,
    reason:
      "Opens Google ad settings so you can optionally update preferences manually.",
    safetyNote:
      "Manual user action may be required. The agent will not automate sensitive changes.",
  });

  return actions;
}

function padWithWaits(actions: SteeringAction[]): SteeringAction[] {
  if (actions.length >= MIN_ACTIONS) return actions;
  const padded = [...actions];
  while (padded.length < MIN_ACTIONS) {
    padded.push({
      id: "pending",
      type: "wait",
      durationMs: INSTAGRAM_WAIT_MS + 2000,
      reason: "Extra pause between steering steps.",
    });
  }
  return padded;
}

export function createSteeringPlan(goal: AdDietGoal): SteeringPlan {
  let actions: SteeringAction[];

  if (usesInstagramSteering(goal.targetPlatforms)) {
    actions = buildInstagramActions(goal);
  } else if (usesGoogleSteering(goal.targetPlatforms)) {
    actions = buildGoogleActions(goal);
  } else {
    actions = buildInstagramActions(goal);
  }

  actions = trimToActionLimit(padWithWaits(actions));

  const caveats = [...DEFAULT_CAVEATS];
  if (usesInstagramSteering(goal.targetPlatforms)) {
    caveats.push(
      "Steering stays on Instagram only (explore search, hashtags, ad preferences)."
    );
  }

  return {
    id: newPlanId(),
    goalId: goal.id,
    createdAt: new Date().toISOString(),
    actions,
    caveats,
  };
}
