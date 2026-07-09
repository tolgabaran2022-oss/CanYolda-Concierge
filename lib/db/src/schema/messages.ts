import { boolean, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const conversations = pgTable("conversations", {
  id:            text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userOne:       text("user_one").notNull(),
  userTwo:       text("user_two").notNull(),
  listingId:     text("listing_id"),
  listingTitle:  text("listing_title"),
  listingImage:  text("listing_image"),
  lastMessage:   text("last_message").notNull().default(""),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow(),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [unique("conversations_users_unique").on(t.userOne, t.userTwo)]);

export const messages = pgTable("messages", {
  id:             text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId:       text("sender_id").notNull(),
  message:        text("message").notNull().default(""),
  imageUrl:       text("image_url"),
  isRead:         boolean("is_read").notNull().default(false),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Conversation    = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message         = typeof messages.$inferSelect;
export type InsertMessage   = typeof messages.$inferInsert;
