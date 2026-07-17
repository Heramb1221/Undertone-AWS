import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography, radius } from "../theme/theme";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { api, DmConversation } from "../lib/api";
import { getLocalIdentity } from "../lib/localIdentity";
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

type Props = NativeStackScreenProps<DmStackParamList, "DmInbox">;

export function DmInboxScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<DmConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search user to start new chat
  const [searchName, setSearchName] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    const identity = await getLocalIdentity();
    if (!identity) return;
    try {
      setConversations(await api.getDmInbox(identity.userId));
      setError(null);
    } catch {
      setError("Couldn't reach the backend. Is it running?");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleStartChat() {
    setSearchError(null);
    if (!searchName.trim()) return;

    setSearching(true);
    try {
      const identity = await getLocalIdentity();
      const profile = await api.getProfileByName(searchName.trim());
      if (profile) {
        if (identity && profile.user_id === identity.userId) {
          setSearchError("You can't message yourself.");
          return;
        }
        setSearchName("");
        navigation.navigate("DmConversation", { otherUserId: profile.user_id });
      } else {
        setSearchError("User not found. Check the spelling.");
      }
    } catch (err) {
      setSearchError("User not found.");
    } finally {
      setSearching(false);
    }
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.header, { color: colors.textPrimary }]}>Messages</Text>
      
      {/* Search user card */}
      <Card style={[styles.searchCard, { borderColor: colors.borderSubtle }]}>
        <Text style={[styles.searchTitle, { color: colors.textPrimary }]}>Start a new chat</Text>
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Enter anonymous name (e.g. DistantHummer_91)"
            placeholderTextColor={colors.textSecondary}
            value={searchName}
            onChangeText={setSearchName}
            style={[styles.searchInput, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
          />
          <Pressable 
            onPress={handleStartChat} 
            disabled={searching}
            style={[styles.searchButton, { backgroundColor: colors.accentPrimary }]}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#2B1608" />
            ) : (
              <Text style={styles.searchButtonText}>Chat</Text>
            )}
          </Pressable>
        </View>
        {searchError && <Text style={[styles.searchErrorText, { color: colors.accentDanger }]}>{searchError}</Text>}
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Chats</Text>
      {error && <Text style={{ color: colors.accentDanger, marginTop: spacing.xs }}>{error}</Text>}
      {conversations && conversations.length === 0 && !error && (
        <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
          No conversations yet. Search a member above or click &ldquo;Message&rdquo; on any post/comment to chat.
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgBase }]} edges={["top", "left", "right"]}>
      <FlatList
        data={conversations ?? []}
        keyExtractor={(c) => c.conversation_id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const displayName = (item as any).other_anonymous_name || item.other_user_id;
          return (
            <Pressable onPress={() => navigation.navigate("DmConversation", { otherUserId: item.other_user_id })}>
              <Card style={styles.row}>
                <Avatar seed={displayName} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: "500" }}>
                    {displayName}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.xs }} numberOfLines={1}>
                    {item.last_message}
                  </Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
                  {timeAgo(item.last_message_at)}
                </Text>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  header: { fontSize: typography.xl, fontWeight: "600", marginBottom: spacing.sm },
  sectionTitle: { fontSize: typography.sm, fontWeight: "600", marginTop: spacing.md, marginBottom: spacing.xs },
  searchCard: { borderWidth: 1, padding: spacing.md, borderRadius: radius.sm, gap: spacing.xs, marginBottom: spacing.md },
  searchTitle: { fontSize: typography.xs, fontWeight: "600" },
  searchRow: { flexDirection: "row", gap: spacing.xs },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: typography.xs },
  searchButton: { paddingHorizontal: spacing.md, justifyContent: "center", alignItems: "center", borderRadius: radius.sm },
  searchButtonText: { color: "#2B1608", fontSize: typography.xs, fontWeight: "500" },
  searchErrorText: { fontSize: typography.xs, marginTop: spacing.xs },
  list: { paddingBottom: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.sm },
});
