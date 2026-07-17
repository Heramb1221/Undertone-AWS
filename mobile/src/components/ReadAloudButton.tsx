import React, { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useTheme } from "../theme/ThemeContext";
import { typography } from "../theme/theme";
import { api } from "../lib/api";

/**
 * Polly "read aloud" — mirrors web's ReadAloudButton, independent mobile
 * implementation. Uses expo-audio (NOT expo-av, which was fully removed as of
 * SDK 55 — we're on SDK 57. Verified current via web search rather than
 * assumed, since training data on this specific API is likely stale given how
 * recently expo-av was removed).
 *
 * UNVERIFIED: expo-audio's dynamic-source-reload behavior (fetch URL on tap,
 * then play) is implemented against documented hook patterns but has not been
 * exercised on a device from this sandbox.
 */
export function ReadAloudButton({ circleId, postId }: { circleId: string; postId: string }) {
  const { colors } = useTheme();
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">("idle");

  const player = useAudioPlayer(audioUri ? { uri: audioUri } : null);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    if (audioUri && playerStatus.isLoaded && status === "loading") {
      player.play();
      setStatus("playing");
    }
  }, [audioUri, playerStatus.isLoaded, status, player]);

  useEffect(() => {
    if (playerStatus.didJustFinish) setStatus("idle");
  }, [playerStatus.didJustFinish]);

  async function play() {
    if (status === "loading") return;
    if (audioUri) {
      player.seekTo(0);
      player.play();
      setStatus("playing");
      return;
    }
    setStatus("loading");
    try {
      const { audio_url } = await api.getAudioUrl(circleId, postId);
      setAudioUri(audio_url); // triggers useAudioPlayer to reload with the new source
    } catch {
      setStatus("error");
    }
  }

  const labels = { idle: "Read aloud", loading: "Loading…", playing: "Playing…", error: "Unavailable right now" };

  return (
    <Pressable onPress={play} disabled={status === "loading"} accessibilityRole="button" accessibilityLabel="Read aloud">
      <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>{labels[status]}</Text>
    </Pressable>
  );
}
