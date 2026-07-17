/**
 * Backend API client. Points at the Flask API — localhost:5000 in dev,
 * the real ECS/Fargate endpoint once Phase 19 CI/CD deploys it.
 */

import { getCurrentIdToken } from "./cognito";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type Circle = {
  circle_id: string;
  name: string;
  description: string;
  creator_id: string;
  moderator_ids: string[];
  created_at: number;
};

export type Post = {
  post_id: string;
  circle_id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  image_key?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  circle_name?: string;
  held_for_review?: boolean;
  removed?: boolean;
  created_at: number;
  nod_count: number;
  pass_count: number;
  comment_count: number;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  
  try {
    const token = await getCurrentIdToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (err) {
    // Ignore errors (e.g. not signed in or Cognito config missing during build/dev)
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

export type VoteResult = { nod_count: number; pass_count: number; your_vote: "nod" | "pass" | null };

export type Comment = {
  comment_id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string;
  author_name: string;
  body: string;
  created_at: number;
  nod_count: number;
  pass_count: number;
};

export type Profile = {
  user_id: string;
  anonymous_name: string;
  avatar_seed: string;
  interests: string[];
  resonance_score: number;
  rhythm_streak_days: number;
  posts_count: number;
  comments_count: number;
  circles_created_count: number;
};

export type Token = { token_id: string; label: string };

export type Report = {
  report_id: string;
  SK: string;
  circle_id: string;
  target_type: "post" | "comment";
  target_id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  detail: string;
  status: "open" | "resolved";
  action_taken: string | null;
  resolved_by: string | null;
  created_at: number;
};

export type ModLogEntry = {
  log_id: string;
  moderator_id: string;
  action: string;
  target_type: string;
  target_id: string;
  note: string;
  created_at: number;
};

export const REPORT_REASONS = ["Harassment", "Doxxing attempt", "Spam", "Other"] as const;

export type DmMessage = {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: number;
};

export type DmConversation = {
  conversation_id: string;
  other_user_id: string;
  other_anonymous_name?: string;
  last_message: string;
  last_message_at: number;
};

export const api = {
  listCircles: () => request<Circle[]>("/api/circles"),
  getCircle: (id: string) => request<Circle>(`/api/circles/${id}`),
  createCircle: (data: { name: string; description: string; creator_id: string }) =>
    request<Circle>("/api/circles", { method: "POST", body: JSON.stringify(data) }),
  listPostsForCircle: (circleId: string) => request<Post[]>(`/api/circles/${circleId}/posts`),
  getPost: (circleId: string, postId: string) => request<Post>(`/api/circles/${circleId}/posts/${postId}`),
  createPost: (
    circleId: string,
    data: { title: string; body: string; author_id: string; author_name: string; image_key?: string; link_url?: string }
  ) => request<Post>(`/api/circles/${circleId}/posts`, { method: "POST", body: JSON.stringify(data) }),
  joinCircle: (circleId: string, userId: string) =>
    request<{ joined: boolean }>(`/api/circles/${circleId}/join`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),
  leaveCircle: (circleId: string, userId: string) =>
    request<{ joined: boolean }>(`/api/circles/${circleId}/leave`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),
  getJoinedCircles: (userId: string) => request<string[]>(`/api/users/${userId}/circles`),
  getFeed: (userId: string) => request<Post[]>(`/api/users/${userId}/feed`),
  getPresignedUploadUrl: (userId: string, contentType: string) =>
    request<{ upload_url: string; key: string }>("/api/uploads/presigned-url", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, content_type: contentType }),
    }),
  voteOnPost: (circleId: string, postId: string, userId: string, vote: "nod" | "pass") =>
    request<VoteResult>(`/api/circles/${circleId}/posts/${postId}/vote`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, vote }),
    }),
  getPostVote: (circleId: string, postId: string, userId: string) =>
    request<{ your_vote: "nod" | "pass" | null }>(
      `/api/circles/${circleId}/posts/${postId}/vote?user_id=${encodeURIComponent(userId)}`
    ),
  voteOnComment: (postId: string, commentId: string, userId: string, vote: "nod" | "pass") =>
    request<VoteResult>(`/api/posts/${postId}/comments/${commentId}/vote`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, vote }),
    }),
  getCommentVote: (postId: string, commentId: string, userId: string) =>
    request<{ your_vote: "nod" | "pass" | null }>(
      `/api/posts/${postId}/comments/${commentId}/vote?user_id=${encodeURIComponent(userId)}`
    ),
  listComments: (postId: string) => request<Comment[]>(`/api/posts/${postId}/comments`),
  getComment: (postId: string, commentId: string) => request<Comment>(`/api/posts/${postId}/comments/${commentId}`),
  createComment: (
    postId: string,
    data: { body: string; author_id: string; author_name: string; parent_comment_id?: string | null }
  ) => request<Comment>(`/api/posts/${postId}/comments`, { method: "POST", body: JSON.stringify(data) }),
  createProfile: (data: { user_id: string; anonymous_name: string; avatar_seed?: string; interests?: string[] }) =>
    request<Profile>("/api/identity", { method: "POST", body: JSON.stringify(data) }),
  getProfile: (userId: string) => request<Profile>(`/api/identity/${userId}`),
  getProfileByName: (name: string) => request<Profile>(`/api/identity/by-name/${encodeURIComponent(name)}`),
  getTokens: (userId: string) => request<Token[]>(`/api/identity/${userId}/tokens`),
  createReport: (
    circleId: string,
    data: { reporter_id: string; target_type: "post" | "comment"; target_id: string; post_id: string; reason: string; detail?: string }
  ) => request<Report>(`/api/circles/${circleId}/reports`, { method: "POST", body: JSON.stringify(data) }),
  listReports: (circleId: string, moderatorId: string, status?: string) =>
    request<Report[]>(
      `/api/circles/${circleId}/reports?moderator_id=${encodeURIComponent(moderatorId)}${status ? `&status=${status}` : ""}`
    ),
  resolveReport: async (circleId: string, reportId: string, action: "remove" | "ban" | "dismiss") => {
    const token = await getCurrentIdToken();
    if (!token) throw new Error("You need to be signed in to do this.");
    return request<Report>(`/api/circles/${circleId}/reports/${reportId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ action }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  getModLog: (circleId: string, moderatorId: string) =>
    request<ModLogEntry[]>(`/api/circles/${circleId}/moderation/log?moderator_id=${encodeURIComponent(moderatorId)}`),
  sendDm: (senderId: string, recipientId: string, body: string) =>
    request<DmMessage>("/api/dm/send", {
      method: "POST",
      body: JSON.stringify({ sender_id: senderId, recipient_id: recipientId, body }),
    }),
  getDmConversation: (userId: string, otherUserId: string) =>
    request<DmMessage[]>(`/api/dm/conversation/${otherUserId}?user_id=${encodeURIComponent(userId)}`),
  getDmInbox: (userId: string) => request<DmConversation[]>(`/api/dm/inbox?user_id=${encodeURIComponent(userId)}`),
  blockUser: (userId: string, blockedUserId: string) =>
    request<{ blocked: boolean }>("/api/dm/block", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, blocked_user_id: blockedUserId }),
    }),
  unblockUser: (userId: string, blockedUserId: string) =>
    request<{ blocked: boolean }>("/api/dm/unblock", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, blocked_user_id: blockedUserId }),
    }),
  getAudioUrl: (circleId: string, postId: string) =>
    request<{ audio_url: string }>(`/api/circles/${circleId}/posts/${postId}/audio`),
};

/** Uploads a file directly to S3 using a presigned PUT URL — bytes never touch our backend. */
export async function uploadImageDirect(file: File, uploadUrl: string) {
  const res = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!res.ok) throw new Error("Image upload failed. Try a smaller file or a different format.");
}
