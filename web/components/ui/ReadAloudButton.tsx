"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";

export function ReadAloudButton({ circleId, postId }: { circleId: string; postId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function play() {
    if (status === "loading") return;
    if (audioRef.current) {
      audioRef.current.play();
      setStatus("playing");
      return;
    }
    setStatus("loading");
    try {
      const { audio_url } = await api.getAudioUrl(circleId, postId);
      const audio = new Audio(audio_url);
      audio.onended = () => setStatus("idle");
      audioRef.current = audio;
      await audio.play();
      setStatus("playing");
    } catch {
      setStatus("error");
    }
  }

  return (
    <button onClick={play} className="text-xs" style={{ color: "var(--text-secondary)" }} disabled={status === "loading"}>
      {status === "idle" && "Read aloud"}
      {status === "loading" && "Loading…"}
      {status === "playing" && "Playing…"}
      {status === "error" && "Unavailable right now"}
    </button>
  );
}
