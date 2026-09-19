// Landing copy, verbatim from designs/Website (W1 · §1.1).
import type { LedgerState } from "@theinnerwar.app/ui/components/ledger";

export const nav = [
  { i: "01", label: "How it works", href: "/#how-it-works" },
  { i: "02", label: "Paths", href: "/#paths" },
  { i: "03", label: "Books", href: "/#books" },
  { i: "04", label: "Pricing", href: "/#pricing" },
  { i: "05", label: "Philosophy", href: "/#philosophy" },
] as const;

// Until the app opens, every call to action joins the newsletter.
export const letterNote =
  "One letter every Sunday: a story or a principle you can use that week. You'll hear here first when the app opens.";

export const heroStats = [
  { v: "30", k: "DAYS PER CAMPAIGN" },
  { v: "15", k: "MINUTES A DAY" },
  { v: "9", k: "PATHS, FOUR BOOKS" },
] as const;

// The sample campaign shown on the landing page: day 12, day 9 missed.
export const sampleLedger = Array.from({ length: 30 }, (_, i) => {
  const dayNumber = i + 1;
  const state: LedgerState =
    dayNumber < 12 ? (dayNumber === 9 ? "missed" : "kept") : dayNumber === 12 ? "today" : "locked";
  return { dayNumber, state };
});

export const books = ["The War of Art", "Meditations", "Atomic Habits", "Think and Grow Rich"];

export const askRows = [
  { k: "Minutes a day", v: "15" },
  { k: "Days in a campaign", v: "30" },
  { k: "Decisions each day", v: "1" },
] as const;

export const gapPoints = [
  {
    i: "01",
    t: "One principle a day, in the voice you chose, applied to the area of life you named.",
  },
  {
    i: "02",
    t: "A mission small enough to finish on an ordinary day, with a smaller version when the day turns.",
  },
  {
    i: "03",
    t: "Evidence in your own words, so progress is something you can read back instead of a number.",
  },
] as const;

export const loop = [
  {
    n: "01",
    t: "Read the principle",
    d: "Three minutes. One idea from the book, written for the pattern you are working on.",
    meta: "3 MIN",
  },
  {
    n: "02",
    t: "Take the mission",
    d: "One action at the hour you named. A smaller version is always offered.",
    meta: "15 MIN",
  },
  {
    n: "03",
    t: "Write the reflection",
    d: "What happened, and how hard it actually was. Private, always.",
    meta: "2 MIN",
  },
  {
    n: "04",
    t: "Save the evidence",
    d: "One sentence that proves you acted. It joins your library and your Personal Code.",
    meta: "1 MIN",
  },
] as const;

export const paths = [
  {
    i: "PATH 01",
    slug: "defeat-resistance",
    book: "The War of Art",
    title: "Defeat Resistance",
    d: "For procrastination, overthinking the first step, and waiting to feel ready.",
    meta: "30 DAYS · MOST STARTED",
    cover: "/images/war-of-art-cover.jpg",
    coverOpacity: 1,
    featured: true,
  },
  {
    i: "PATH 02",
    slug: "govern-the-response",
    book: "Meditations",
    title: "Govern the Response",
    d: "For emotional reactivity, and the hours lost to things outside your control.",
    meta: "30 DAYS · 9 PRINCIPLES",
    cover: "/images/statue-thinker.jpg",
    coverOpacity: 0.5,
    featured: false,
  },
  {
    i: "PATH 03",
    slug: "build-the-small-loop",
    book: "Atomic Habits",
    title: "Build the Small Loop",
    d: "For inconsistency, restarting every Monday, and routines that never hold.",
    meta: "30 DAYS · 9 PRINCIPLES",
    cover: "/images/statue-reading.jpg",
    coverOpacity: 0.45,
    featured: false,
  },
  {
    i: "PATH 04",
    slug: "hold-the-aim",
    book: "Think and Grow Rich",
    title: "Hold the Aim",
    d: "For drifting goals, and decisions reopened every week without new information.",
    meta: "30 DAYS · 9 PRINCIPLES",
    cover: "/images/statue-hand.jpg",
    coverOpacity: 0.4,
    featured: false,
  },
] as const;

// W2 · Path detail. Only Defeat Resistance has a designed detail page so far.
export const pathDetails = [
  {
    slug: "defeat-resistance",
    eyebrow: "THE WAR OF ART · PATH 01 / 03",
    title: "Defeat Resistance",
    book: "The War of Art",
    d: "Thirty days to stop negotiating with the work that matters. For procrastination, overthinking the first step, and waiting to feel ready.",
    facts: ["30 DAYS", "15 MIN A DAY", "9 PRINCIPLES", "FOR RESISTANCE"],
    cover: "/images/war-of-art-cover.jpg",
    coverNote: "Steven Pressfield · 2002 · three paths drawn from this book",
    chapters: [
      {
        tag: "CHAPTER I · DAYS 1–10",
        title: "Recognition",
        d: "Learn how Resistance appears in your own day, by name and by hour.",
      },
      {
        tag: "CHAPTER II · DAYS 11–20",
        title: "The Work",
        d: "Build the ritual: the hour, the first move, and finishing what was started.",
      },
      {
        tag: "CHAPTER III · DAYS 21–30",
        title: "Proof",
        d: "Turn thirty days of evidence into a Personal Code you keep after the campaign.",
      },
    ],
    sample: "Resistance becomes stronger when the first action is vague.",
  },
] as const;

export const plans = [
  {
    id: "monthly",
    label: "MONTHLY",
    price: "$9.99",
    per: "per month",
    badge: null,
    d: "Stay as long as the campaign is useful. Leave whenever it is not.",
    rows: [
      "Your full 30-day path",
      "Mission variants for your life area",
      "Evidence library and history",
      "Cancel in two taps",
    ],
    cta: "Start with three free days",
    note: "Then $9.99 per month",
    featured: false,
  },
  {
    id: "lifetime",
    label: "LIFETIME",
    price: "$59.99",
    per: "once",
    badge: "FOUNDING MEMBER",
    d: "Founding member price. Every path we publish, with no renewal.",
    rows: [
      "Everything in monthly",
      "Every future book-inspired path",
      "Personal Code at the end of each campaign",
      "No renewal, ever",
    ],
    cta: "Take the lifetime price",
    note: "Three free days first",
    featured: true,
  },
] as const;

export const faq = [
  {
    q: "Is this another collection of book summaries?",
    a: "No. Each path turns one book's principles into thirty days of missions and reflections. You act daily rather than read daily.",
  },
  {
    q: "What happens if I miss a day?",
    a: "Nothing punitive. You choose to resume, shift the campaign forward, or restart the chapter. Nothing you proved is deleted.",
  },
  {
    q: "Do I need an account to try it?",
    a: "No. You complete the first lesson, mission and evidence line before we ask for anything.",
  },
  {
    q: "Can I use it without notifications?",
    a: "Yes. Reminders are optional and the browser is only asked for permission after you choose one.",
  },
  {
    q: "Who can read my reflections?",
    a: "Only you. They are private by default, never published, and exportable at any time.",
  },
] as const;

export const footerCols = [
  { h: "THE APP", links: ["How it works", "Paths", "Books", "Pricing"] },
  { h: "COMPANY", links: ["Philosophy", "Write to us", "Changelog", "Press"] },
  { h: "LEGAL", links: ["Privacy", "Terms", "Attribution", "Refunds"] },
] as const;

export const social = ["X", "IG", "in", "✉"] as const;
