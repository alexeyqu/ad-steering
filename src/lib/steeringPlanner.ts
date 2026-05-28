import type { AdDietGoal, SteeringAction, SteeringPlan, TargetPlatform } from "./types";
import { newActionId, newPlanId } from "./ids";

/** Hard cap so a plan cannot grow without bound. */
const MAX_ACTIONS = 120;

const DEFAULT_CAVEATS = [
  "Platform response is not guaranteed.",
  "The agent will not click paid or sponsored posts.",
  "Results may be noisy in a short hackathon demo.",
];

const INSTAGRAM_SEARCH_WAIT_MS = 1500;
const INSTAGRAM_AFTER_CLICK_WAIT_MS = 9000;
const DEFAULT_POST_CLICKS = 2;
const DEFAULT_DWELL_MS = 18000;

const GOOGLE_SEARCH_TEMPLATES = [
  (intent: string) => `best ${intent} UK`,
  (intent: string) => `${intent} reviews`,
  (intent: string) => `${intent} deals UK`,
  (intent: string) => `${intent} comparison`,
];

const GOOGLE_AD_SETTINGS_URL = "https://adssettings.google.com/";

function usesInstagramSteering(platforms: TargetPlatform[]): boolean {
  return platforms.includes("instagram");
}

function usesGoogleSteering(platforms: TargetPlatform[]): boolean {
  return platforms.includes("google") && !platforms.includes("instagram");
}

function intentToHashtag(intent: string): string {
  return intent.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function instagramExploreSearchUrl(query: string): string {
  return `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`;
}

function instagramHashtagUrl(intent: string): string {
  const tag = intentToHashtag(intent);
  return `https://www.instagram.com/explore/tags/${tag}/`;
}

/** Many query variants — emulates a user doing deep product research. */
function buildInstagramSearchQueries(intent: string): string[] {
  const queries = [
    intent,
    `best ${intent}`,
    `best ${intent} UK`,
    `buy ${intent}`,
    `buy ${intent} UK`,
    `${intent} reviews`,
    `${intent} reviews UK`,
    `${intent} deals`,
    `${intent} deals UK`,
    `${intent} comparison`,
    `affordable ${intent}`,
    `top ${intent}`,
    `top ${intent} 2026`,
    `where to buy ${intent}`,
    `${intent} recommendations`,
    `${intent} brands`,
    `${intent} shopping`,
    `how to choose ${intent}`,
    `${intent} worth it`,
    `${intent} guide`,
  ];

  return Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
}

function reindexActions(actions: SteeringAction[]): SteeringAction[] {
  return actions.map((action, index) => ({ ...action, id: newActionId(index) }));
}

function capActions(actions: SteeringAction[]): SteeringAction[] {
  if (actions.length <= MAX_ACTIONS) return reindexActions(actions);
  return reindexActions(actions.slice(0, MAX_ACTIONS));
}

function insertWaits(actions: SteeringAction[]): SteeringAction[] {
  const withWaits: SteeringAction[] = [];
  for (const action of actions) {
    withWaits.push(action);
    if (action.type === "wait") continue;

    const durationMs =
      action.type === "click_post"
        ? INSTAGRAM_AFTER_CLICK_WAIT_MS
        : INSTAGRAM_SEARCH_WAIT_MS;

    withWaits.push({
      id: "pending",
      type: "wait",
      durationMs,
      reason: "Pause so activity looks organic before the next step.",
      safetyNote: "No clicks during wait.",
    });
  }
  return withWaits;
}

function clickPostAction(intent: string, maxClicks = DEFAULT_POST_CLICKS): SteeringAction {
  return {
    id: "pending",
    type: "click_post",
    query: intent,
    maxClicks,
    dwellMs: DEFAULT_DWELL_MS,
    reason: `Open up to ${maxClicks} organic posts related to "${intent}" (skip sponsored).`,
    safetyNote: "Only non-sponsored posts whose visible text matches the intent.",
  };
}

function buildInstagramActions(goal: AdDietGoal): SteeringAction[] {
  const intents =
    goal.positiveIntents.length > 0
      ? goal.positiveIntents
      : ["content you want more of"];

  const actions: SteeringAction[] = [];

  for (const intent of intents) {
    for (const query of buildInstagramSearchQueries(intent)) {
      actions.push({
        id: "pending",
        type: "search",
        query,
        url: instagramExploreSearchUrl(query),
        reason: `Search Instagram explore for "${query}".`,
        safetyNote: "Organic search only; no paid placements.",
      });
      actions.push(clickPostAction(intent, DEFAULT_POST_CLICKS));
    }

    const tag = intentToHashtag(intent);
    if (tag.length >= 2) {
      actions.push({
        id: "pending",
        type: "visit_url",
        url: instagramHashtagUrl(intent),
        reason: `Browse the #${tag} hashtag on Instagram.`,
        safetyNote: "Scroll and open matching organic posts only.",
      });
      actions.push(clickPostAction(intent, 3));
    }
  }

  return actions;
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

export function createSteeringPlan(goal: AdDietGoal): SteeringPlan {
  let actions: SteeringAction[];

  if (usesInstagramSteering(goal.targetPlatforms)) {
    actions = insertWaits(buildInstagramActions(goal));
  } else if (usesGoogleSteering(goal.targetPlatforms)) {
    actions = buildGoogleActions(goal);
  } else {
    actions = insertWaits(buildInstagramActions(goal));
  }

  actions = capActions(actions);

  const caveats = [...DEFAULT_CAVEATS];
  if (usesInstagramSteering(goal.targetPlatforms)) {
    caveats.push(
      `Large Instagram plan: ${actions.length} steps (many explore searches + organic post clicks).`
    );
    caveats.push(
      "Steering stays on Instagram only — no Google, retailers, or ad-settings URLs."
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
