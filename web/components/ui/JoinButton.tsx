"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";
import { Button } from "./Button";

export function JoinButton({ circleId }: { circleId: string }) {
  const [identity, setIdentity] = useState<any>(null);
  const [joined, setJoined] = useState<boolean | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const id = getLocalIdentity();
    setIdentity(id);
    setIsLoaded(true);
    if (!id) {
      setJoined(false);
      return;
    }
    api.getJoinedCircles(id.userId).then((ids) => setJoined(ids.includes(circleId)));
  }, [circleId]);

  if (!isLoaded || !identity) {
    return (
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Finish onboarding to join Circles.
      </p>
    );
  }

  if (joined === null) return null;

  async function toggle() {
    if (joined) {
      await api.leaveCircle(circleId, identity!.userId);
      setJoined(false);
    } else {
      await api.joinCircle(circleId, identity!.userId);
      setJoined(true);
    }
  }

  return (
    <Button variant={joined ? "secondary" : "primary"} onClick={toggle}>
      {joined ? "Leave Circle" : "Join Circle"}
    </Button>
  );
}
