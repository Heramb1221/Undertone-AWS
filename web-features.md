# Walkthrough of Web Authentication & Reddit-Style Layout Overhaul

I have completed the user authentication flow migration and implemented a beautiful, Reddit-inspired layout structure with interactive navigation, search controls, and direct message lookups.

## Changes Made

### 1. Database User ID Migration (Cognito `sub`)
- **Backend Model and Route Extensions**:
  - Implemented `get_profile_by_name` in [user.py](file:///f:/Programming%20Languages/React%20Native/projects/undertone/backend/app/models/user.py) to look up profiles by display name using a scan.
  - Exposed `GET /api/identity/by-name/<name>` in [identity.py](file:///f:/Programming%20Languages/React%20Native/projects/undertone/backend/app/routes/identity.py).
  - Enriched the `/api/dm/inbox` route in [dm.py](file:///f:/Programming%20Languages/React%20Native/projects/undertone/backend/app/routes/dm.py) to attach the other participant's `other_anonymous_name` to inbox results.
- **Frontend ID Integration**:
  - Updated `LocalIdentity` in [localIdentity.ts](file:///f:/Programming%20Languages/React%20Native/projects/undertone/web/lib/localIdentity.ts) to hold a `userId` field storing the Cognito `sub` string.
  - Added `getCurrentUserSub` and `signOut` helper exports to [cognito.ts](file:///f:/Programming%20Languages/React%20Native/projects/undertone/web/lib/cognito.ts).
  - Updated [onboarding/page.tsx](file:///f:/Programming%20Languages/React%20Native/projects/undertone/web/app/onboarding/page.tsx) to fetch the Cognito `sub` upon verification, write the DynamoDB profile under the `sub` as primary key, and store it locally.
  - Refactored all components and pages to identify the active user by `identity.userId` (Cognito `sub`) rather than their display name (`identity.name`) when making calls to listing joined circles, fetching feeds, voting, creating posts/comments, DMs, and loading profile stats.

### 2. Reddit-style Navigation Header
- Created [Header.tsx](file:///f:/Programming%20Languages/React%20Native/projects/undertone/web/components/ui/Header.tsx):
  - **Left**: Displays the user's avatar chip and anonymous name linking to their profile.
  - **Center**: A search input that pulls all Circles on mount, filtering them dynamically as the user types, and showing a dropdown overlay for quick navigation.
  - **Right**: Quick actions for "Create Circle", "Messages" inbox, "Explore Circles", and "Log out" (calls Cognito signOut, deletes local identity, and redirects to home).
- Integrated `<Header />` on `/feed`, `/profile`, `/dm`, `/dm/[userId]`, `/circles`, `/circles/[id]`, `/circles/[id]/posts/new`, `/circles/[id]/posts/[postId]`, `/circles/new`, and `/circles/[id]/moderation` pages.

### 3. Authentication & Page Flows
- **Landing Page Overhaul** in [page.tsx](file:///f:/Programming%20Languages/React%20Native/projects/undertone/web/app/page.tsx):
  - Checks if a user session exists in `localStorage`. If found, it automatically redirects the browser to `/feed`.
  - Otherwise, presents a high-end dark landing page offering a choice between "Onboard / Create Identity" and "Log In".
- **Dedicated Login Page** in [login/page.tsx](file:///f:/Programming%20Languages/React%20Native/projects/undertone/web/app/login/page.tsx):
  - Authenticates credentials against Cognito.
  - Queries the user profile using the Cognito `sub`.
  - Saves the recovered profile (`anonymous_name`, `avatar_seed`, `userId`) and redirects to `/feed`.

### 4. Interactive Messaging Search
- **DMs Page Update** in [dm/page.tsx](file:///f:/Programming%20Languages/React%20Native/projects/undertone/web/app/dm/page.tsx):
  - Added a search form allowing the user to search other members by their anonymous display name.
  - Upon query, calls `getProfileByName`, resolves the recipient's user ID, and opens the direct message thread at `/dm/<recipient_id>`.
  - Inbox threads display the recipient's anonymous name and avatar seed instead of their raw UUID.
- **Conversation Thread Update** in [dm/[userId]/page.tsx](file:///f:/Programming%20Languages/React%20Native/projects/undertone/web/app/dm/[userId]/page.tsx):
  - Automatically queries the recipient's display name profile to display their username and avatar in the chat header instead of a raw UUID.

---

## Complete Features List

1. **Cognito-Backed Onboarding**: Select interests, generate unique anonymous name/seed, enter email/password, verify using confirmation code, and automatically create DynamoDB user profile.
2. **Dedicated User Login**: Authenticate against Cognito, fetch user profile by Cognito `sub`, and restore session with persistent state redirection.
3. **Reddit-Style Navigation**: Top sticky header layout with Profile Avatar link, real-time Circle Search input with dynamic dropdown suggestions, "Create Circle" shortcut, "Messages" shortcut, and "Log out" button.
4. **Feed Consolidation**: Feeds automatically filter and display posts only from Circles that the active user has joined.
5. **Auto-Join Creator**: Creating a new Circle automatically joins the creator to its subscription list so that new posts are instantly visible on their Home Feed.
6. **Hierarchical Comments & Thread Collapsing**: Fully responsive, nested Reddit-style comment threads with custom depth visual collapsers and direct reply tools.
7. **Nod/Pass Voting System**: Dynamic voting system on both posts and comments, preventing self-voting.
8. **Circle Moderation Queue**: Flag inappropriate content. Circle moderators can inspect reported items, dismiss reports, and remove posts or comments.
9. **Private Direct Messages**: Chat interface with user lookup by anonymous name. Short-polling fallback ensures 100% usability offline or locally.
