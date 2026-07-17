/**
 * Params for screens reachable from BOTH the Explore stack and the Feed stack
 * (PostDetail can be opened from a Circle's post list or from the home feed).
 * Kept in one place so both stacks' param lists stay in sync without duplication.
 */
export type PostDetailParams = { circleId: string; postId: string };
export type NewPostParams = { circleId: string };
