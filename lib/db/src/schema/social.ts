import { boolean, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
