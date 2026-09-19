// Onboarding question options (mobile S3–S7), labels verbatim from the designs.
// Keys are what gets stored on Assessment; labels are what the UI shows.

export const BATTLES = [
  { key: "procrastinating", label: "I keep procrastinating" },
  { key: "not-finishing", label: "I start but do not finish" },
  { key: "no-direction", label: "I lack direction" },
  { key: "more-discipline", label: "I want more discipline" },
  { key: "what-people-think", label: "I care too much what people think" },
  { key: "confidence", label: "I need to rebuild my confidence" },
  { key: "work-or-money", label: "I want to improve my work or money" },
  { key: "reactive", label: "I feel emotionally reactive" },
  { key: "better-habits", label: "I want to build better habits" },
] as const;

export const PATTERNS = [
  { key: "overthink-first-step", label: "I overthink the first step" },
  { key: "distracted", label: "I get distracted" },
  { key: "wait-until-ready", label: "I wait until I feel ready" },
  { key: "plan-too-ambitious", label: "I make the plan too ambitious" },
  { key: "lose-momentum", label: "I lose momentum after a few days" },
  { key: "fear-judgement", label: "I worry about being judged" },
  { key: "changing-goals", label: "I keep changing goals" },
  { key: "avoid-important", label: "I avoid the most important task" },
] as const;

export const DAILY_MINUTES = [
  { minutes: 3, label: "3 minutes" },
  { minutes: 10, label: "5–10 minutes" },
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "20–30 minutes" },
  { minutes: 45, label: "I want a serious challenge" },
] as const;

export const TONES = [
  { key: "CALM", label: "Calm and reflective" },
  { key: "DIRECT", label: "Direct and challenging" },
  { key: "STRATEGIC", label: "Strategic and analytical" },
  { key: "ENCOURAGING", label: "Encouraging but firm" },
  { key: "NO_NONSENSE", label: "No-nonsense" },
] as const;

export type BattleKey = (typeof BATTLES)[number]["key"];
export type PatternKey = (typeof PATTERNS)[number]["key"];
export type ToneKey = (typeof TONES)[number]["key"];

export const battleKeys = BATTLES.map((b) => b.key) as [BattleKey, ...BattleKey[]];
export const patternKeys = PATTERNS.map((p) => p.key) as [PatternKey, ...PatternKey[]];
export const toneKeys = TONES.map((t) => t.key) as [ToneKey, ...ToneKey[]];
