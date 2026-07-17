---
name: Feed/social cleanup
description: What was removed in the Phase 1 feed cleanup and what deliberately remains
---

## What was removed

**Mobile:**
- `app/(tabs)/feed.tsx`, `app/(tabs)/profile.tsx` (hidden feed-profile tab)
- `app/create-post.tsx`, `app/post-detail/[postId].tsx`, `app/follow-list/[userId].tsx`
- `lib/feedApi.ts`, `lib/storiesApi.ts`
- Components: PostCard, EditPostModal, CommentSheet, StoryBar, StoryViewer, ProfileStoryAvatar, CreateStoryModal
- socialApi.ts: removed apiToggleFollow, apiCheckFollowing, apiGetFollowCounts, apiGetFollowersList, apiGetFollowingList, FollowCounts type, FollowUser type

**API:**
- `routes/feed.ts`, `routes/stories.ts` (deleted)
- `routes/social.ts`: all /api/social/follow/* routes removed
- `routes/users.ts`: feedPosts/follows queries removed (postsCount/followersCount/followingCount now always 0)

**DB tables dropped:** feed_posts, feed_comments, feed_likes, feed_bookmarks, stories, story_views, story_likes, story_replies, follows

## What was kept

- `social_profiles` table — used by auth (POST /users/sync) and settings routes
- `routes/social.ts`: GET/PATCH /api/social/settings (profile privacy), GET /api/social/users (search — rewritten to use socialProfiles), GET /api/social/users/:userId
- `app/user-profile/[userId].tsx` — simplified: shows avatar (plain Image), name/bio/location, pet list, message button; no follow/story UI
- `notifications.tsx` + notification API — untouched; uses x-user-id header still (security deferred)

## Deferred

- `extractUserIdDual` in `jwtAuth.ts` still exists but is now unused (feed.ts/stories.ts that used it are gone). Should be removed in a future security cleanup pass.
- notifications API still uses x-user-id header — should migrate to JWT Bearer.

**Why:** Task scope was feed removal only; security changes were explicitly out of scope.
