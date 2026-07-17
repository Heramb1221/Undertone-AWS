"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Post } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";
import { PostCard } from "@/components/ui/PostCard";
import { timeAgo } from "@/lib/timeAgo";
import { Header } from "@/components/ui/Header";

export default function FeedPage() {
  const [identity, setIdentity] = useState<any>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const id = getLocalIdentity();
    setIdentity(id);
    setIsLoaded(true);
    if (!id) return;
    api
      .getFeed(id.userId)
      .then(setPosts)
      .catch(() => setError("Couldn't reach the backend. Is it running? See README.md."));
  }, []);

  if (!isLoaded || !identity) {
    return (
      <main className="max-w-reading mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Finish onboarding to get a feed.
        </p>
        <Link href="/onboarding" className="text-sm underline" style={{ color: "var(--accent-primary)" }}>
          Start onboarding →
        </Link>
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-reading mx-auto px-4 py-12 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display text-text-primary">Your feed</h1>
          <Link href="/circles" className="text-sm underline" style={{ color: "var(--accent-primary)" }}>
            Explore Circles →
          </Link>
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--accent-danger)" }}>
            {error}
          </p>
        )}

        {posts && posts.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Nothing here yet. Join a Circle to start seeing posts.
          </p>
        )}

        <div className="space-y-4">
          {posts?.map((post) => (
            <PostCard
              key={post.post_id}
              circleId={post.circle_id}
              postId={post.post_id}
              authorId={post.author_id}
              authorName={post.author_name}
              circle={post.circle_name || post.circle_id}
              timeAgo={timeAgo(post.created_at)}
              title={post.title}
              body={post.body}
              initialNodCount={post.nod_count}
              initialPassCount={post.pass_count}
              replyCount={post.comment_count}
              imageUrl={post.image_url}
            />
          ))}
        </div>
      </main>
    </>
  );
}
