import React, { useState } from "react";
import { View, Text, TextInput, Image, StyleSheet, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography, radius } from "../theme/theme";
import { Button } from "../components/Button";
import { api, uploadImageDirect } from "../lib/api";
import { getLocalIdentity } from "../lib/localIdentity";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ExploreStackParamList } from "../navigation/ExploreStackNavigator";

type Props = NativeStackScreenProps<ExploreStackParamList, "NewPost">;

export function NewPostScreen({ route, navigation }: Props) {
  const { circleId } = route.params;
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heldForReview, setHeldForReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is needed to attach an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function handleSubmit() {
    setError(null);
    const identity = await getLocalIdentity();
    if (!identity) {
      setError("Finish onboarding first.");
      return;
    }
    if (!title.trim()) {
      setError("Give the post a title.");
      return;
    }

    setSubmitting(true);
    try {
      let image_key: string | undefined;
      if (imageUri) {
        const contentType = "image/jpeg"; // expo-image-picker's default output format
        const { upload_url, key } = await api.getPresignedUploadUrl(identity.userId, contentType);
        await uploadImageDirect(imageUri, upload_url, contentType);
        image_key = key;
      }

      const post = await api.createPost(circleId, {
        title,
        body,
        author_id: identity.userId,
        author_name: identity.name,
        image_key,
        link_url: linkUrl || undefined,
      });

      if (post.held_for_review) {
        setHeldForReview(true);
        return;
      }

      navigation.replace("CircleDetail", { circleId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (heldForReview) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase, justifyContent: "center" }]}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: "center" }}>
          Your image was automatically flagged for review before it goes live. A Circle moderator will take a look
          — if it&apos;s fine, it&apos;ll appear normally.
        </Text>
        <Button title="Back to Circle" variant="primary" onPress={() => navigation.replace("CircleDetail", { circleId })} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bgBase }} contentContainerStyle={styles.container}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Post title"
        style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="What's on your mind?"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Post body"
        multiline
        style={[styles.input, styles.bodyInput, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
      />
      <TextInput
        value={linkUrl}
        onChangeText={setLinkUrl}
        placeholder="Link (optional)"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Link URL (optional)"
        autoCapitalize="none"
        style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
      />

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      ) : (
        <Button title="Add image" variant="secondary" onPress={pickImage} />
      )}

      {error && <Text style={{ color: colors.accentDanger, fontSize: typography.xs }}>{error}</Text>}

      <Button title={submitting ? "Posting…" : "Post"} variant="primary" onPress={handleSubmit} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm, fontSize: typography.sm },
  bodyInput: { minHeight: 100, textAlignVertical: "top" },
  preview: { width: "100%", height: 200, borderRadius: radius.md },
});
