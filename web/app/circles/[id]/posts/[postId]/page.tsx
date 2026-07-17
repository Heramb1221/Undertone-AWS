import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { PostCard } from "@/components/ui/PostCard";
import { CommentThread } from "@/components/ui/CommentThread";
import { CircleChip } from "@/components/ui/CircleChip";
import { timeAgo } from "@/lib/timeAgo";
import { Header } from "@/components/ui/Header";

export default async function PostDetailPage({ params }: { params: { id: string; postId: string } }) {
  let post;
  let circle;
  try {
    [post, circle] = await Promise.all([api.getPost(params.id, params.postId), api.getCircle(params.id)]);
  } catch {
    notFound();
  }

  const comments = await api.listComments(params.postId).catch(() => []);

  return (
    <>
      <Header />
      <main className="max-w-reading mx-auto px-4 py-12 space-y-8">
        <CircleChip name={circle.name} />

        <PostCard
          circleId={params.id}
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

        <div className="pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Comments</h2>
          <CommentThread postId={post.post_id} circleId={params.id} initialComments={comments} />
        </div>
      </main>
    </>
  );
}
