import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { signIn, getCurrentUserId } from "../lib/cognito";
import { api } from "../lib/api";
import { saveLocalIdentity, getLocalIdentity } from "../lib/localIdentity";
import { registerForPushNotificationsAsync } from "../lib/pushNotifications";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

/** Fire-and-forget — push registration failing should never block sign-in. */
function registerPushToken(userId: string) {
  registerForPushNotificationsAsync()
    .then((token) => {
      if (token) return api.registerPushToken(userId, token, "expo");
    })
    .catch(() => {});
}

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkAutoLogin() {
      try {
        const identity = await getLocalIdentity();
        if (identity && identity.userId) {
          const userId = await getCurrentUserId();
          if (userId === identity.userId) {
            navigation.replace("Main");
          }
        }
      } catch {
        // No cached session or expired, stay on login screen
      }
    }
    checkAutoLogin();
  }, [navigation]);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      const userId = await getCurrentUserId();

      try {
        const profile = await api.getProfile(userId);
        await saveLocalIdentity({ userId, name: profile.anonymous_name, avatarSeed: profile.avatar_seed });
        registerPushToken(userId);
        navigation.replace("Main");
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "";
        if (errMsg.includes("Profile not found") || errMsg.includes("404")) {
          // No profile yet — this account hasn't finished onboarding.
          navigation.replace("OnboardingInterests");
        } else {
          setError(errMsg || "Couldn't reach the server.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgBase }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>undertone</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Welcome back. Nobody here knows it&apos;s you.
      </Text>

      <View style={styles.form}>
        <Input
          accessibilityLabel="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          accessibilityLabel="Password"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      {error && <Text style={[styles.error, { color: colors.accentDanger }]}>{error}</Text>}

      <Button title={loading ? "Signing in…" : "Sign in"} variant="primary" onPress={handleLogin} loading={loading} />

      <Button title="Don't have an account? Sign up" variant="secondary" onPress={() => navigation.navigate("Signup")} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  title: { fontSize: typography.xxl, fontWeight: "600", textAlign: "center", marginBottom: spacing.xs },
  subtitle: { fontSize: typography.sm, textAlign: "center", marginBottom: spacing.xl },
  form: { gap: spacing.sm, marginBottom: spacing.md },
  error: { fontSize: typography.xs, textAlign: "center", marginBottom: spacing.sm },
});
