ere is the complete list of fully functional features on the mobile application:

Cognito Onboarding Flow:
Interest Selection (OnboardingInterests): A tag selector to choose user interests.
Identity Reroller (OnboardingIdentity): Generates a custom pseudonymous username matching user interests using the backend's generator, with avatar generation and profile registration tied directly to their Cognito sub ID.
Cognito Email Verification: Added confirmation input to SignupScreen.tsx allowing users to enter their 6-digit confirmation code directly inside the mobile app to verify their email, followed by auto-login.
Home Feed (FeedScreen): Merges and displays posts from all unique Circles that the user has joined.
Explore Circles (ExploreCirclesScreen): Lists all available Circles and enables creating new ones.
Auto-Join Creator: Creating a Circle immediately joins the creator to its subscriber list so its posts appear on their Home Feed automatically.
Detailed Posting (NewPostScreen): Supports creating new posts with titles, descriptions, links, and media (using expo-image-picker to upload images directly to AWS S3).
Direct Messaging with Display Name Lookup (DmInboxScreen & DmConversationScreen):
Inbox lists active message threads with recipients' actual display names and avatar seeds.
Includes a search bar to find members by anonymous username to start direct chats.
Resolves the recipient's display name and displays it in the screen's navigation header.
Threaded Comments & Collapse Controls (CommentItem & PostDetailScreen): Nested Reddit-style comments that support collapsed threads and nested replies mapped to correct usernames instead of UUIDs.
Nod/Pass (Upvote/Downvote): Upvote/downvote posts and comments with reactive state updates.
Circle Moderation Queue (ModerationQueueScreen): Allows moderators to inspect reported posts/comments, dismiss reports, and remove content.