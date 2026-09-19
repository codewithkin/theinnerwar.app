import type { BattleKey, PatternKey } from "./onboarding";

// Which book each answer points toward. Follows the framework picker notes
// (S5): War of Art for resistance and finishing, Meditations for reactivity,
// Atomic Habits for consistency, Think and Grow Rich for purpose and fear.
const BATTLE_BOOK: Record<BattleKey, string> = {
  procrastinating: "the-war-of-art",
  "not-finishing": "the-war-of-art",
  "no-direction": "think-and-grow-rich",
  "more-discipline": "atomic-habits",
  "what-people-think": "meditations",
  confidence: "think-and-grow-rich",
  "work-or-money": "think-and-grow-rich",
  reactive: "meditations",
  "better-habits": "atomic-habits",
};

const PATTERN_BOOK: Record<PatternKey, string> = {
  "overthink-first-step": "the-war-of-art",
  distracted: "meditations",
  "wait-until-ready": "the-war-of-art",
  "plan-too-ambitious": "atomic-habits",
  "lose-momentum": "atomic-habits",
  "fear-judgement": "think-and-grow-rich",
  "changing-goals": "think-and-grow-rich",
  "avoid-important": "the-war-of-art",
};

export type RecommendInput = {
  battles: readonly BattleKey[];
  pattern?: PatternKey | null;
  // An explicit S5 choice wins; null means "I am not sure".
  bookSlug?: string | null;
};

export type CandidatePath = { slug: string; bookSlug: string; sortOrder: number };

/**
 * Picks the starting path. An explicit book choice wins; otherwise the pattern
 * counts double and each battle once, ties going to catalog order.
 */
export function recommendPath<P extends CandidatePath>(
  input: RecommendInput,
  paths: readonly P[],
): P | null {
  const ordered = [...paths].sort((a, b) => a.sortOrder - b.sortOrder);
  if (ordered.length === 0) return null;

  if (input.bookSlug) {
    const chosen = ordered.find((p) => p.bookSlug === input.bookSlug);
    if (chosen) return chosen;
  }

  const score = new Map<string, number>();
  const add = (book: string, weight: number) => score.set(book, (score.get(book) ?? 0) + weight);
  for (const battle of input.battles) add(BATTLE_BOOK[battle], 1);
  if (input.pattern) add(PATTERN_BOOK[input.pattern], 2);

  let best = ordered[0]!;
  let bestScore = score.get(best.bookSlug) ?? 0;
  for (const path of ordered) {
    const s = score.get(path.bookSlug) ?? 0;
    if (s > bestScore) {
      best = path;
      bestScore = s;
    }
  }
  return best;
}
