"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { CircleChip } from "./CircleChip";
import { NodPass } from "./NodPass";
import { TokenChip } from "./TokenChip";
import { Card } from "./Card";
import { ReportControl } from "./ReportControl";
import { ReadAloudButton } from "./ReadAloudButton";
import { api } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";

export function PostCard({
  circleId,
  postId,
  authorId,
  authorName,
  circle,
  timeAgo,
  title,
  body,
  initialNodCount,
  initialPassCount,
  replyCount,
  token,
  imageUrl,
}: {
  circleId: string;
  postId: string;
  authorId: string;
  authorName: string;
  circle: string;
  timeAgo: string;
  title: string;
  body: string;
  initialNodCount: number;
  initialPassCount: number;
  replyCount: number;
  token?: string;
  imageUrl?: string | null;
}) {
  const [identity, setIdentity] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isOwnPost = identity?.userId === authorId;

  const [nodCount, setNodCount] = useState(initialNodCount);
  const [passCount, setPassCount] = useState(initialPassCount);
  const [yourVote, setYourVote] = useState<"nod" | "pass" | null>(null);

  useEffect(() => {
    const id = getLocalIdentity();
    setIdentity(id);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || !identity || isOwnPost) return;
    api.getPostVote(circleId, postId, identity.userId).then((r) => setYourVote(r.your_vote));
  }, [circleId, postId, isLoaded, identity, isOwnPost]);

  async function handleVote(vote: "nod" | "pass") {
    if (!identity || isOwnPost) return;
    const result = await api.voteOnPost(circleId, postId, identity.userId, vote);
    setNodCount(result.nod_count);
    setPassCount(result.pass_count);
    setYourVote(result.your_vote);
  }

  return (
    <Card className="max-w-reading">
      <div className="flex items-center gap-3 mb-3">
        <Avatar seed={authorId} size={36} />
        <div>
          <div className="text-sm font-medium text-text-primary">{authorName}</div>
          <div className="text-xs flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <CircleChip name={circle} />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>

      <Link href={`/circles/${circleId}/posts/${postId}`}>
        <div className="text-lg font-medium text-text-primary mb-1.5 hover:underline">{title}</div>
      </Link>
      {body && (
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {body}
        </p>
      )}

      {imageUrl && (
        <div className="mb-4 rounded-md overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned URLs are short-lived and dynamic, not worth Next/Image's static optimization */}
          <img src={imageUrl} alt="" className="w-full max-h-96 object-cover" />
        </div>
      )}

      <div className="flex items-center gap-4">
        <NodPass
          nodCount={nodCount}
          passCount={passCount}
          yourVote={yourVote}
          onVote={handleVote}
          disabled={!isLoaded || !identity || isOwnPost}
        />
        <Link href={`/circles/${circleId}/posts/${postId}`} className="text-xs hover:underline" style={{ color: "var(--text-secondary)" }}>
          {replyCount} replies
        </Link>
        {token && <div className="ml-auto"><TokenChip label={token} /></div>}
      </div>

      <div className="mt-2">
        <ReadAloudButton circleId={circleId} postId={postId} />
      </div>

      {(!isLoaded || !isOwnPost) && (
        <div className="mt-2 flex gap-3">
          <Link href={`/dm/${encodeURIComponent(authorId)}`} className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Message
          </Link>
          <ReportControl circleId={circleId} targetType="post" targetId={postId} postId={postId} />
        </div>
      )}
    </Card>
  );
}
