import Link from "next/link";
import { api, Circle } from "@/lib/api";
import { CircleCard } from "@/components/ui/CircleCard";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";

export default async function ExploreCirclesPage() {
  let circles: Circle[];
  let error: string | null = null;

  try {
    circles = await api.listCircles();
  } catch {
    error = "Couldn't reach the backend. Is it running? See README.md.";
    circles = [];
  }

  return (
    <>
      <Header />
      <main className="max-w-reading mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display text-text-primary">Explore Circles</h1>
          <Link href="/circles/new">
            <Button variant="primary">Create a Circle</Button>
          </Link>
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--accent-danger)" }}>
            {error}
          </p>
        )}

        {!error && circles.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No Circles yet. Be the first to start one.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {circles.map((circle) => (
            <CircleCard key={circle.circle_id} circle={circle} />
          ))}
        </div>
      </main>
    </>
  );
}
