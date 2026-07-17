import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { signUp, confirmSignUp, signIn, getCurrentUserId } from "../lib/cognito";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");

  async function handleSignup() {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);
    if (!verificationCode.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    setLoading(true);
    try {
      await confirmSignUp(email, verificationCode);
      try {
        await signIn(email, password);
        navigation.replace("OnboardingInterests");
      } catch (signInErr) {
        // If auto-signin fails, fallback to manual login screen
        console.warn("Auto sign-in failed:", signInErr);
        navigation.replace("Login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "verify") {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.bgBase }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>Verify your email</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We sent a verification code to {email}. Enter it below to confirm your account.
        </Text>

        <View style={styles.form}>
          <Input
            accessibilityLabel="Verification Code"
            placeholder="6-digit code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
        </View>

        {error && <Text style={[styles.error, { color: colors.accentDanger }]}>{error}</Text>}

        <Button title={loading ? "Verifying…" : "Confirm code"} variant="primary" onPress={handleVerifyCode} loading={loading} />
        
        <Button title="Back to sign in" variant="secondary" onPress={() => navigation.replace("Login")} />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgBase }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Create your account</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Just an email and password. We never ask for your real name.
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

      <Button title={loading ? "Creating…" : "Create account"} variant="primary" onPress={handleSignup} loading={loading} />

      <Button title="Already have an account? Sign in" variant="secondary" onPress={() => navigation.navigate("Login")} />
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
