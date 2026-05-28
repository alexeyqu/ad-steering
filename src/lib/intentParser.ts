const POSITIVE_PREFIXES = [
  /^i want more ads about\s+/i,
  /^i want more\s+/i,
  /^more ads about\s+/i,
  /^show me more\s+/i,
];

const NEGATIVE_PREFIXES = [
  /^i want fewer ads about\s+/i,
  /^i want fewer\s+/i,
  /^fewer ads about\s+/i,
  /^stop showing me\s+/i,
  /^avoid\s+/i,
  /^no more\s+/i,
];

function stripPrefixes(text: string, prefixes: RegExp[]): string {
  let result = text.trim();
  for (const prefix of prefixes) {
    result = result.replace(prefix, "");
  }
  return result.trim();
}

function splitIntents(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function parseGoalIntents(
  rawPositivePrompt: string,
  rawNegativePrompt: string
): { positiveIntents: string[]; negativeIntents: string[] } {
  const positiveRaw = stripPrefixes(rawPositivePrompt, POSITIVE_PREFIXES);
  const negativeRaw = stripPrefixes(rawNegativePrompt, NEGATIVE_PREFIXES);

  return {
    positiveIntents: splitIntents(positiveRaw),
    negativeIntents: splitIntents(negativeRaw),
  };
}
