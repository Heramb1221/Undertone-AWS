/**
 * Interest-based Anonymous Identity generator.
 * Mirrors backend/app/identity/name_generator.py exactly — keep both in sync.
 * See docs/PRD.md section 7.1 and docs/Glossary.md #10.
 */

export const INTERESTS = [
  { id: "books", label: "Books & Reading", nouns: ["Reader", "Bookworm", "Pageturner"] },
  { id: "nature", label: "Nature & Outdoors", nouns: ["Wanderer", "Trailwalker", "Rambler"] },
  { id: "music", label: "Music", nouns: ["Listener", "Hummer", "Tunesmith"] },
  { id: "art", label: "Art & Illustration", nouns: ["Sketcher", "Doodler", "Inkwell"] },
  { id: "gaming", label: "Gaming", nouns: ["Gamer", "Questgiver", "Pixelwalker"] },
  { id: "movies", label: "Movies & TV", nouns: ["Watcher", "Screenwriter", "Storyfan"] },
  { id: "coding", label: "Coding & Tech", nouns: ["Coder", "Debugger", "Tinkerer"] },
  { id: "writing", label: "Writing & Journaling", nouns: ["Scribe", "Journalist", "Wordsmith"] },
  { id: "cooking", label: "Cooking & Baking", nouns: ["Baker", "Simmerer", "Spicehunter"] },
  { id: "fitness", label: "Fitness & Movement", nouns: ["Runner", "Stretcher", "Pathfinder"] },
  { id: "conversations", label: "Deep Conversations", nouns: ["Thinker", "Muser", "Philosopher"] },
  { id: "quiet_hobbies", label: "Quiet Hobbies", nouns: ["Knitter", "Collector", "Puzzler"] },
] as const;

const ADJECTIVES = [
  "Quiet",
  "Moonlit",
  "Gentle",
  "Hushed",
  "Soft",
  "Slow",
  "Late-Night",
  "Early-Morning",
  "Muted",
  "Calm",
  "Wandering",
  "Distant",
];

export type InterestId = (typeof INTERESTS)[number]["id"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateAnonymousName(selectedInterests: InterestId[]): string {
  const pool = INTERESTS.filter((i) => selectedInterests.includes(i.id));
  const noun = pool.length > 0 ? pick(pick(pool).nouns) : pick(INTERESTS.flatMap((i) => i.nouns));
  const adjective = pick(ADJECTIVES);
  const number = Math.floor(Math.random() * 90) + 10; // 10-99

  return `${adjective}${noun}_${number}`;
}
