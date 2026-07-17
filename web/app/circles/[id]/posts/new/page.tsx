"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, uploadImageDirect } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";

export default function NewPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [heldForReview, setHeldForReview] = useState(false);

  async function handleSubmit() {
    setError(null);

    const identity = getLocalIdentity();
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

      if (imageFile) {
        const { upload_url, key } = await api.getPresignedUploadUrl(identity.userId, imageFile.type);
        await uploadImageDirect(imageFile, upload_url);
        image_key = key;
      }

      const post = await api.createPost(params.id, {
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

      router.push(`/circles/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-reading mx-auto px-4 py-16 space-y-6">
      <h1 className="text-2xl font-display text-text-primary">New post</h1>

      {heldForReview ? (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Your image was automatically flagged for review before it goes live. A Circle moderator will take a
            look — if it&apos;s fine, it&apos;ll appear normally; if not, it stays down. This isn&apos;t a
            judgment on you, just a routine check.
          </p>
          <Link href={`/circles/${params.id}`} className="text-sm underline" style={{ color: "var(--accent-primary)" }}>
            Back to Circle →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
        <input
          placeholder="Title"
          aria-label="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-sm border text-sm bg-transparent outline-none"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        />
        <textarea
          placeholder="What's on your mind?"
          aria-label="Post body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-sm border text-sm bg-transparent outline-none"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        />
        <input
          placeholder="Link (optional)"
          aria-label="Link URL (optional)"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-sm border text-sm bg-transparent outline-none"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        />
        <div>
          <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Image (optional)
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="block text-sm mt-1"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--accent-danger)" }}>
          {error}
        </p>
      )}

      <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Posting…" : "Post"}
      </Button>
        </>
      )}
    </main>
  </>
  );
}
