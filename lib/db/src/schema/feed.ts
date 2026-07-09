import { integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const feedPosts = pgTable("feed_posts", {
  id:            text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  username:      text("username").notNull(),
  avatarUrl:     text("avatar_url").notNull().default(""),
  imageUrl:      text("image_url").notNull(),
  caption:       text("caption").notNull().default(""),
  location:      text("location").notNull().default(""),
  timeAgo:       text("time_ago").notNull().default(""),
  likesCount:    integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  sharesCount:   integer("shares_count").notNull().default(0),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const feedComments = pgTable("feed_comments", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  postId:    text("post_id").notNull().references(() => feedPosts.id, { onDelete: "cascade" }),
  username:  text("username").notNull(),
  text:      text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const feedLikes = pgTable("feed_likes", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  postId:    text("post_id").notNull().references(() => feedPosts.id, { onDelete: "cascade" }),
  userId:    text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [unique("feed_likes_post_user").on(t.postId, t.userId)]);

export const feedBookmarks = pgTable("feed_bookmarks", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  postId:    text("post_id").notNull().references(() => feedPosts.id, { onDelete: "cascade" }),
  userId:    text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [unique("feed_bookmarks_post_user").on(t.postId, t.userId)]);

export const stories = pgTable("stories", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId:    text("user_id").notNull(),
  username:  text("username").notNull(),
  avatarUrl: text("avatar_url").notNull().default(""),
  imageUrl:  text("image_url").notNull(),
  caption:   text("caption").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const storyViews = pgTable("story_views", {
  id:       text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  storyId:  text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow(),
}, (t) => [unique("story_views_unique").on(t.storyId, t.viewerId)]);

export type FeedPost     = typeof feedPosts.$inferSelect;
export type FeedComment  = typeof feedComments.$inferSelect;
export type FeedLike     = typeof feedLikes.$inferSelect;
export type FeedBookmark = typeof feedBookmarks.$inferSelect;
export type Story        = typeof stories.$inferSelect;
export type StoryView    = typeof storyViews.$inferSelect;
