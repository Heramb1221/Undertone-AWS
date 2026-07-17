import Link from "next/link";
import { Card } from "./Card";
import { Circle } from "@/lib/api";

export function CircleCard({ circle }: { circle: Circle }) {
  return (
    <Link href={`/circles/${circle.circle_id}`}>
      <Card className="hover:opacity-90 transition-opacity h-full">
        <div className="text-base font-medium text-text-primary mb-1">{circle.name}</div>
        <p className="text-sm line-clamp-2" style={{ color: "var(--text-secondary)" }}>
          {circle.description || "No description yet."}
        </p>
      </Card>
    </Link>
  );
}
