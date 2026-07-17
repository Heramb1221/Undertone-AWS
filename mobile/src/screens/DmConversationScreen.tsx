import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography, radius } from "../theme/theme";
import { Button } from "../components/Button";
import { api, DmMessage } from "../lib/api";
import { getLocalIdentity } from "../lib/localIdentity";
import { useRealtimeConnection } from "../lib/useRealtimeConnection";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { DmStackParamList } from "../navigation/DmStackNavigator";

function timeAgo(unixMillis: number): string {
  const seconds = Math.floor((Date.now() - unixMillis) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type Props = NativeStackScreenProps<DmStackParamList, "DmConversation">;

export function DmConversationScreen({ route, navigation }: Props) {
  const { otherUserId } = route.params;
  const { colors } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [body, setBody] = useState("");
  const [blocked, setBlocked] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { connected, addListener } = useRealtimeConnection(userId);

  useEffect(() => {
    getLocalIdentity().then((identity) => setUserId(identity?.userId ?? null));
    
    // Fetch recipient profile for display name
    api.getProfile(otherUserId)
      .then((profile) => {
        navigation.setOptions({ title: profile.anonymous_name });
      })
      .catch(() => {
        navigation.setOptions({ title: otherUserId });
      });
  }, [navigation, otherUserId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const data = await api.getDmConversation(userId, otherUserId);
    setMessages(data);
  }, [userId, otherUserId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 4000); // polling fallback, same as web
      return () => clearInterval(interval);
    }, [refresh])
  );

  useEffect(() => addListener((event) => {
    if (event.type === "dm") refresh();
  }), [addListener, refresh]);

  async function send() {
    if (!userId || !body.trim()) return;
    const text = body;
    setBody("");
    try {
      await api.sendDm(userId, otherUserId, text);
      await refresh();
    } catch (err) {
      if (err instanceof Error && err.message.includes("message this person")) setBlocked(true);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgBase }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={[styles.status, { color: connected ? colors.accentSecondary : colors.textSecondary }]}>
        {connected ? "live" : "polling"}
      </Text>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.message_id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.sender_id === userId;
          return (
            <View style={[styles.bubbleRow, { justifyContent: mine ? "flex-end" : "flex-start" }]}>
              <View style={[styles.bubble, { backgroundColor: mine ? colors.accentPrimary : colors.bgElevated }]}>
                <Text style={{ color: mine ? colors.onAccent : colors.textPrimary, fontSize: typography.sm }}>
                  {item.body}
                </Text>
                <Text style={{ color: mine ? colors.onAccent : colors.textSecondary, fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {blocked ? (
        <Text style={{ color: colors.accentDanger, padding: spacing.md, textAlign: "center" }}>
          You can&apos;t message this person.
        </Text>
      ) : (
        <View style={[styles.inputRow, { borderTopColor: colors.borderSubtle }]}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Message…"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Message"
            style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
          />
          <Button title="Send" variant="primary" onPress={send} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  status: { fontSize: 11, textAlign: "right", paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  list: { padding: spacing.lg, gap: spacing.sm },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "75%", paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md },
  inputRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: typography.sm },
});
