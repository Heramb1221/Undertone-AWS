import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { api, Report, Post, Comment } from "../lib/api";
import { getLocalIdentity } from "../lib/localIdentity";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ExploreStackParamList } from "../navigation/ExploreStackNavigator";

type Props = NativeStackScreenProps<ExploreStackParamList, "ModerationQueue">;

type TargetPreview = { kind: "post"; data: Post } | { kind: "comment"; data: Comment } | { kind: "missing" };

function ReportRow({
  circleId,
  report,
  onResolved,
}: {
  circleId: string;
  report: Report;
  onResolved: () => void;
}) {
  const { colors } = useTheme();
  const [preview, setPreview] = useState<TargetPreview | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (report.target_type === "post") {
      api.getPost(circleId, report.target_id).then((data) => setPreview({ kind: "post", data })).catch(() => setPreview({ kind: "missing" }));
    } else {
      api.getComment(report.post_id, report.target_id).then((data) => setPreview({ kind: "comment", data })).catch(() => setPreview({ kind: "missing" }));
    }
  }, [circleId, report]);

  async function act(action: "remove" | "ban" | "dismiss") {
    setActing(true);
    try {
      await api.resolveReport(circleId, report.report_id, action);
      onResolved();
    } finally {
      setActing(false);
    }
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={styles.reportHeader}>
        <Text style={{ color: colors.accentDanger, fontSize: typography.xs, fontWeight: "600" }}>{report.reason}</Text>
      </View>

      {!!report.detail && (
        <Text style={{ color: colors.textSecondary, fontSize: typography.xs, fontStyle: "italic", marginBottom: spacing.xs }}>
          &ldquo;{report.detail}&rdquo;
        </Text>
      )}

      <View style={[styles.previewBox, { backgroundColor: colors.bgElevated }]}>
        {!preview && <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>Loading content…</Text>}
        {preview?.kind === "missing" && (
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>Content already removed.</Text>
        )}
        {preview?.kind === "post" && (
          <>
            <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: "500" }}>{preview.data.title}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>{preview.data.body}</Text>
          </>
        )}
        {preview?.kind === "comment" && (
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>{preview.data.body}</Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Button title="Remove" variant="danger" onPress={() => act("remove")} disabled={acting} />
        <Button title="Ban author" variant="danger" onPress={() => act("ban")} disabled={acting} />
        <Button title="Dismiss" variant="secondary" onPress={() => act("dismiss")} disabled={acting} />
      </View>
    </Card>
  );
}

export function ModerationQueueScreen({ route }: Props) {
  const { circleId } = route.params;
  const { colors } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const identity = await getLocalIdentity();
    if (!identity) return;
    setUserId(identity.userId);
    try {
      setReports(await api.listReports(circleId, identity.userId, "open"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load reports.");
    }
  }, [circleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!userId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <Text style={{ color: colors.textSecondary, padding: spacing.lg }}>Finish onboarding first.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Text style={[styles.header, { color: colors.textPrimary }]}>Moderator queue</Text>

      {error && (
        <Text style={{ color: colors.accentDanger, paddingHorizontal: spacing.lg }}>
          {error}{error.toLowerCase().includes("moderator") ? " (only Circle moderators can view this queue)" : ""}
        </Text>
      )}

      {reports && reports.length === 0 && !error && (
        <Text style={{ color: colors.textSecondary, paddingHorizontal: spacing.lg }}>No open reports. Quiet in here.</Text>
      )}

      <FlatList
        data={reports ?? []}
        keyExtractor={(r) => r.report_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ReportRow circleId={circleId} report={item} onResolved={load} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: typography.xl, fontWeight: "600", padding: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  reportHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs },
  previewBox: { padding: spacing.sm, borderRadius: 8, marginBottom: spacing.sm, gap: 2 },
  actionsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
});
