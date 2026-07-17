/** Token — renamed badge per Glossary.md. */
export function TokenChip({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-2 py-1 rounded-sm font-medium"
      style={{ background: "var(--token-gold)", color: "#3A2C0C" }}
    >
      Token: {label}
    </span>
  );
}
