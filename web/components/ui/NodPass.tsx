/**
 * Nod / Pass — renamed upvote/downvote per Glossary.md.
 * Controlled component: the parent (PostCard, CommentThread) owns vote state and
 * talks to the real backend (Phase 7) — this component just renders and reports clicks.
 * Muted taupe for Pass rather than red — voting is quiet, not alarming (Colour.md section 3).
 */
export function NodPass({
  nodCount,
  passCount,
  yourVote,
  onVote,
  disabled = false,
}: {
  nodCount: number;
  passCount: number;
  yourVote: "nod" | "pass" | null;
  onVote: (vote: "nod" | "pass") => void;
  disabled?: boolean;
}) {
  const score = nodCount - passCount;

  return (
    <div className="flex items-center gap-1 rounded-lg bg-elevated px-1 py-1 w-fit" style={{ borderRadius: "20px" }}>
      <button
        aria-label="Nod"
        disabled={disabled}
        onClick={() => onVote("nod")}
        className="px-2 py-1 rounded-sm text-xs font-medium disabled:opacity-40"
        style={{ color: yourVote === "nod" ? "var(--accent-primary)" : "var(--text-secondary)" }}
      >
        Nod
      </button>
      <span className="text-xs font-medium text-text-primary min-w-[24px] text-center">{score}</span>
      <button
        aria-label="Pass"
        disabled={disabled}
        onClick={() => onVote("pass")}
        className="px-2 py-1 rounded-sm text-xs font-medium disabled:opacity-40"
        style={{ color: yourVote === "pass" ? "var(--accent-pass)" : "var(--text-secondary)" }}
      >
        Pass
      </button>
    </div>
  );
}
