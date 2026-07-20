import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export * from "./social.js";
export * from "./pets.js";
export * from "./petManagement.js";
export * from "./messages.js";
export * from "./animals.js";

export const featuredListings = pgTable("featured_listings", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  listingId: text("listing_id").notNull(),
  userEmail: text("user_email").notNull(),
  stripeSessionId: text("stripe_session_id"),
  packageHours: integer("package_hours").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const oauthUsers = pgTable("oauth_users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  provider: text("provider").notNull(),        // 'google' | 'apple' | 'facebook'
  providerId: text("provider_id").notNull(),   // provider's user ID
  email: text("email"),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

import { uniqueIndex } from "drizzle-orm/pg-core";

export const localUsers = pgTable("local_users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  email:        text("email").notNull(),
  name:         text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  phoneNumber:  text("phone_number"),
  avatarUrl:    text("avatar_url"),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex("local_users_email_unique").on(t.email),
  uniqueIndex("local_users_phone_unique").on(t.phoneNumber),
]);

export type FeaturedListing = typeof featuredListings.$inferSelect;
export type InsertFeaturedListing = typeof featuredListings.$inferInsert;
export type OAuthUser = typeof oauthUsers.$inferSelect;
export type InsertOAuthUser = typeof oauthUsers.$inferInsert;
export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

export const pushTokens = pgTable("push_tokens", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId:         text("user_id").notNull(),
  expoPushToken:  text("expo_push_token").notNull(),
  platform:       text("platform").notNull(),
  installationId: text("installation_id"),
  appVersion:     text("app_version"),
  enabled:        boolean("enabled").notNull().default(true),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
  lastSeenAt:     timestamp("last_seen_at",  { withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex("push_tokens_token_unique").on(t.expoPushToken),
]);

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;

export const notificationPreferences = pgTable("notification_preferences", {
  id:              text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId:          text("user_id").notNull().unique(),
  generalEnabled:  boolean("general_enabled").notNull().default(true),
  messagesEnabled: boolean("messages_enabled").notNull().default(true),
  adoptionEnabled: boolean("adoption_enabled").notNull().default(true),
  remindersEnabled: boolean("reminders_enabled").notNull().default(true),
  emergencyEnabled: boolean("emergency_enabled").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = typeof notificationPreferences.$inferInsert;

/* ── notification_events — transactional outbox for push delivery ─── */
export const notificationEvents = pgTable("notification_events", {
  id:              text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  eventKey:        text("event_key").notNull(),        /* idempotency key — UNIQUE enforced by index */
  eventType:       text("event_type").notNull(),
  recipientUserId: text("recipient_user_id").notNull(),
  entityId:        text("entity_id").notNull().default(""),
  payloadJson:     text("payload_json").notNull().default("{}"),
  status:          text("status").notNull().default("pending"), /* pending | processing | sent | failed */
  attempts:        integer("attempts").notNull().default(0),
  maxAttempts:     integer("max_attempts").notNull().default(3),
  nextAttemptAt:   timestamp("next_attempt_at", { withTimezone: true }).defaultNow(),
  lastErrorCode:   text("last_error_code"),
  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow(),
  processedAt:     timestamp("processed_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("notification_events_key_unique").on(t.eventKey),
]);

export type NotificationEvent = typeof notificationEvents.$inferSelect;
export type InsertNotificationEvent = typeof notificationEvents.$inferInsert;
