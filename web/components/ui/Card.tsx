import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-md border p-4 ${className}`}
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
      {...props}
    />
  );
}
