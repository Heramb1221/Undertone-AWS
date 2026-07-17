/** Circle — renamed community/subreddit per Glossary.md. */
export function CircleChip({ name }: { name: string }) {
  return (
    <span
      className="text-xs px-2 py-1 rounded-sm font-medium border"
      style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
    >
      {name}
    </span>
  );
}
