import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { CircleChip } from "@/components/ui/CircleChip";
import { Card } from "@/components/ui/Card";
import { PostCard } from "@/components/ui/PostCard";
import { JoinButton } from "@/components/ui/JoinButton";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/timeAgo";
import { Header } from "@/components/ui/Header";

export default async function CirclePage({ params }: { params: { id: string } }) {
  let circle;
  try {
    circle = await api.getCircle(params.id);
  } catch {
    notFound();
  }

  const posts = await api.listPostsForCircle(params.id).catch(() => []);

  return (
    <>
      <Header />
      <main className="max-w-reading mx-auto px-4 py-12 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CircleChip name={circle.name} />
          <h1 className="text-2xl font-display text-text-primary mt-2 mb-1">{circle.name}</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {circle.description || "No description yet."}
          </p>
        </div>
        <JoinButton circleId={circle.circle_id} />
      </div>

      <Link href={`/circles/${circle.circle_id}/moderation`} className="text-xs underline" style={{ color: "var(--text-secondary)" }}>
        Moderator queue
      </Link>

      <Card>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {circle.moderator_ids.length} moderator{circle.moderator_ids.length !== 1 ? "s" : ""}
        </p>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-semibold text-text-primary">Posts</h2>
        <Link href={`/circles/${circle.circle_id}/posts/new`}>
          <Button variant="primary">New post</Button>
        </Link>
      </div>

      {posts.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Nothing posted here yet. Be the first.
        </p>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.post_id}
            circleId={circle.circle_id}
            postId={post.post_id}
            authorId={post.author_id}
            authorName={post.author_name}
            circle={circle.name}
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
