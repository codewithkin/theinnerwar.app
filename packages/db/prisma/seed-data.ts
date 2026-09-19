// Catalog copy taken verbatim from designs/ (website W1/W2, mobile S5/S8/S9).
// Only content that exists in the designs is seeded; the remaining paths and
// days are left for the content pass rather than invented here.

export const books = [
  {
    slug: "the-war-of-art",
    title: "The War of Art",
    author: "Steven Pressfield",
    year: 2002,
    coverImage: "/images/war-of-art-cover.jpg",
    pickerNote: "For resistance, procrastination, creative work, and finishing.",
    sortOrder: 1,
  },
  {
    slug: "meditations",
    title: "Meditations",
    author: "Marcus Aurelius",
    year: null,
    coverImage: "/images/statue-thinker.jpg",
    pickerNote: "For emotional control, resilience, focus, and difficult situations.",
    sortOrder: 2,
  },
  {
    slug: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    year: 2018,
    coverImage: "/images/statue-reading.jpg",
    pickerNote: "For consistency, identity, environment, and behavior change.",
    sortOrder: 3,
  },
  {
    slug: "think-and-grow-rich",
    title: "Think and Grow Rich",
    author: "Napoleon Hill",
    year: 1937,
    coverImage: "/images/statue-hand.jpg",
    pickerNote: "For purpose, persistence, confidence, ambition, and fear.",
    sortOrder: 4,
  },
] as const;

export const paths = [
  {
    slug: "defeat-resistance",
    bookSlug: "the-war-of-art",
    title: "Defeat Resistance",
    tagline: "30 days to stop negotiating with the work that matters.",
    description: "For procrastination, overthinking the first step, and waiting to feel ready.",
    focus: "FOR RESISTANCE",
    promises: [
      "Identify how Resistance appears in your day",
      "Make important tasks easier to begin",
      "Build a repeatable work ritual",
      "Finish more of what you start",
    ],
    coverImage: "/images/war-of-art-cover.jpg",
    sortOrder: 1,
    chapters: [
      {
        number: 1,
        title: "Recognition",
        description: "Learn how Resistance appears in your own day, by name and by hour.",
        startDay: 1,
        endDay: 10,
      },
      {
        number: 2,
        title: "The Work",
        description: "Build the ritual: the hour, the first move, and finishing what was started.",
        startDay: 11,
        endDay: 20,
      },
      {
        number: 3,
        title: "Proof",
        description: "Turn thirty days of evidence into a Personal Code you keep after the campaign.",
        startDay: 21,
        endDay: 30,
      },
    ],
    days: [
      {
        dayNumber: 1,
        principle: "Resistance becomes stronger when the first action is vague.",
        principleSource: null,
        lessonBody:
          "You do not have to finish the task now. You only have to make the beginning undeniable.",
        lessonMinutes: 3,
        missionTitle:
          "Choose one important task you have been avoiding. Write the smallest physical action required to begin it.",
        missionMinutes: 5,
        missionSteps: [
          "Open the document",
          "Put on your training shoes",
          "Write the first sentence",
          "Send the first message",
          "Read one page",
        ],
        smallerMissions: [],
        evidencePrompt: "Today I proved that I can…",
      },
    ],
  },
  {
    slug: "govern-the-response",
    bookSlug: "meditations",
    title: "Govern the Response",
    description: "For emotional reactivity, and the hours lost to things outside your control.",
    promises: [],
    coverImage: "/images/statue-thinker.jpg",
    sortOrder: 2,
    chapters: [],
    days: [],
  },
  {
    slug: "build-the-small-loop",
    bookSlug: "atomic-habits",
    title: "Build the Small Loop",
    description: "For inconsistency, restarting every Monday, and routines that never hold.",
    promises: [],
    coverImage: "/images/statue-reading.jpg",
    sortOrder: 3,
    chapters: [],
    days: [],
  },
  {
    slug: "hold-the-aim",
    bookSlug: "think-and-grow-rich",
    title: "Hold the Aim",
    description: "For drifting goals, and decisions reopened every week without new information.",
    promises: [],
    coverImage: "/images/statue-hand.jpg",
    sortOrder: 4,
    chapters: [],
    days: [],
  },
] as const;
