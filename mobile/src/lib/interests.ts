/** Mirrors web/lib/nameGenerator.ts's INTERESTS list — the actual name generation
 * logic lives server-side (backend/app/identity/name_generator.py) and is called
 * via api.generateName(), so only the id/label pairs need to match here, not the
 * noun pools themselves. */
export const INTERESTS = [
  { id: "books", label: "Books & Reading" },
  { id: "nature", label: "Nature & Outdoors" },
  { id: "music", label: "Music" },
  { id: "art", label: "Art & Illustration" },
  { id: "gaming", label: "Gaming" },
  { id: "movies", label: "Movies & TV" },
  { id: "coding", label: "Coding & Tech" },
  { id: "writing", label: "Writing & Journaling" },
  { id: "cooking", label: "Cooking & Baking" },
  { id: "fitness", label: "Fitness & Movement" },
  { id: "conversations", label: "Deep Conversations" },
  { id: "quiet_hobbies", label: "Quiet Hobbies" },
] as const;

export type InterestId = (typeof INTERESTS)[number]["id"];
