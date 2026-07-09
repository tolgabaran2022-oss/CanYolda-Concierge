import { boolean, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ── Social profiles ─────────────────────────────────────── */
export const socialProfiles = pgTable("social_profiles", {
  id:        text("id").primaryKey(),
  email:     text("email").notNull().default(""),
  name:      text("name").notNull().default(""),
  username:  text("username"),
  bio:       text("bio").notNull().default(""),
  location:  text("location").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [unique("social_profiles_username_unique").on(t.username)]);

export type SocialProfile       = typeof socialProfiles.$inferSelect;
export type InsertSocialProfile = typeof socialProfiles.$inferInsert;

export const follows = pgTable("follows", {
  id:          text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  followerId:  text("follower_id").notNull(),
  followingId: text("following_id").notNull(),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [unique("follows_unique").on(t.followerId, t.followingId)]);

export const notifications = pgTable("notifications", {
  id:           text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  receiverId:   text("receiver_id").notNull(),
  senderId:     text("sender_id").notNull(),
  senderName:   text("sender_name").notNull().default(""),
  senderAvatar: text("sender_avatar").notNull().default(""),
  type:         text("type").notNull(),
  postId:       text("post_id"),
  postImage:    text("post_image"),
  message:      text("message").notNull().default(""),
  read:         boolean("read").notNull().default(false),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Follow         = typeof follows.$inferSelect;
export type Notification   = typeof notifications.$inferSelect;
