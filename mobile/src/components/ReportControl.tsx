import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography, radius } from "../theme/theme";
import { Button } from "./Button";
import { api, REPORT_REASONS } from "../lib/api";
import { getLocalIdentity } from "../lib/localIdentity";

/** Blunt reason categories, no euphemisms — per PRD.md section 7.6 and your
 * original direction. Independent mobile implementation of web's ReportControl. */
export function ReportControl({
  circleId,
  targetType,
  targetId,
  postId,
}: {
  circleId: string;
  targetType: "post" | "comment";
  targetId: string;
  postId: string;
}) {
  const { colors } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getLocalIdentity().then((identity) => setUserId(identity?.userId ?? null));
  }, []);

  if (!userId) return null;

  if (submitted) {
    return <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>Reported.</Text>;
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>Report</Text>
      </Pressable>
    );
  }

  async function submit() {
    if (!reason || !userId) return;
    setSubmitting(true);
    try {
      await api.createReport(circleId, {
        reporter_id: userId,
        target_type: targetType,
        target_id: targetId,
        post_id: postId,
        reason,
        detail,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { borderColor: colors.borderSubtle }]}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing.xs }}>
        Why are you reporting this?
      </Text>
      <View style={styles.reasonRow}>
        {REPORT_REASONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setReason(r)}
            style={[
              styles.reasonChip,
              { borderColor: reason === r ? colors.accentDanger : colors.borderSubtle },
            ]}
          >
            <Text style={{ color: reason === r ? colors.accentDanger : colors.textSecondary, fontSize: typography.xs }}>
              {r}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={detail}
        onChangeText={setDetail}
        placeholder="Anything else moderators should know? (optional)"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Additional report details (optional)"
        multiline
        style={[styles.detailInput, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
      />
      <View style={styles.actions}>
        <Button title={submitting ? "Submitting…" : "Submit report"} variant="danger" onPress={submit} disabled={!reason || submitting} />
        <Button title="Cancel" variant="secondary" onPress={() => setOpen(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm, padding: spacing.sm, borderWidth: 1, borderRadius: radius.sm, maxWidth: 300 },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  reasonChip: { paddingVertical: spacing.xs / 2, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1 },
  detailInput: { borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm, fontSize: typography.xs, minHeight: 50, marginBottom: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm },
});
