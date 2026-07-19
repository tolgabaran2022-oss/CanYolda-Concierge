import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const petProfiles = pgTable("pet_profiles", {
  id:              text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  ownerId:         text("owner_id").notNull(),
  name:            text("name").notNull(),
  type:            text("type").notNull().default("cat"),
  breed:           text("breed").notNull().default(""),
  age:             text("age").notNull().default(""),
  gender:          text("gender").notNull().default(""),
  birthDate:       text("birth_date").notNull().default(""),
  weight:          text("weight").notNull().default(""),
  color:           text("color").notNull().default(""),
  avatarUrl:       text("avatar_url").notNull().default(""),
  bio:             text("bio").notNull().default(""),
  location:        text("location").notNull().default(""),
  vaccinationInfo: text("vaccination_info").notNull().default(""),
  feedingNotes:    text("feeding_notes").notNull().default(""),
  postsCount:      integer("posts_count").notNull().default(0),
  followersCount:  integer("followers_count").notNull().default(0),
  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const petPosts = pgTable("pet_posts", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:     text("pet_id").notNull(),
  ownerId:   text("owner_id").notNull(),
  imageUrl:  text("image_url").notNull(),
  caption:   text("caption").notNull().default(""),
  location:  text("location").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const petHealth = pgTable("pet_health", {
  id:          text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:       text("pet_id").notNull(),
  vaccineName: text("vaccine_name").notNull(),
  date:        text("date").notNull(),
  nextDate:    text("next_date").notNull().default(""),
  note:        text("note").notNull().default(""),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const petFollowers = pgTable("pet_followers", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:     text("pet_id").notNull(),
  userId:    text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type PetProfile    = typeof petProfiles.$inferSelect;
export type PetPost       = typeof petPosts.$inferSelect;
export type PetHealthRow  = typeof petHealth.$inferSelect;
export type PetFollower   = typeof petFollowers.$inferSelect;

export const petPremiumAccess = pgTable("pet_premium_access", {
  id:                   text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId:               text("user_id").notNull().unique(),
  status:               text("status").notNull().default("inactive"),
  productId:            text("product_id").notNull().default(""),
  entitlementId:        text("entitlement_id").notNull().default("evcilim_premium"),
  expiresAt:            timestamp("expires_at", { withTimezone: true }),
  originalPurchaseAt:   timestamp("original_purchase_at", { withTimezone: true }),
  lastVerifiedAt:       timestamp("last_verified_at", { withTimezone: true }).defaultNow(),
  grandfatheredPetLimit:integer("grandfathered_pet_limit").notNull().default(1),
  createdAt:            timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const petMedications = pgTable("pet_medications", {
  id:              text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:           text("pet_id").notNull(),
  userId:          text("user_id").notNull(),
  name:            text("name").notNull(),
  dosage:          text("dosage").notNull().default(""),
  instructions:    text("instructions").notNull().default(""),
  startDate:       text("start_date").notNull().default(""),
  endDate:         text("end_date").notNull().default(""),
  scheduleTimes:   text("schedule_times").notNull().default("[]"),
  recurrenceRule:  text("recurrence_rule").notNull().default("daily"),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const petDocuments = pgTable("pet_documents", {
  id:           text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:        text("pet_id").notNull(),
  userId:       text("user_id").notNull(),
  title:        text("title").notNull(),
  category:     text("category").notNull().default("other"),
  fileUrl:      text("file_url").notNull(),
  fileName:     text("file_name").notNull().default(""),
  mimeType:     text("mime_type").notNull().default("application/octet-stream"),
  fileSize:     integer("file_size").notNull().default(0),
  documentDate: text("document_date").notNull().default(""),
  notes:        text("notes").notNull().default(""),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const petCareMembers = pgTable("pet_care_members", {
  id:          text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:       text("pet_id").notNull(),
  ownerId:     text("owner_id").notNull(),
  memberId:    text("member_id"),
  inviteEmail: text("invite_email").notNull().default(""),
  role:        text("role").notNull().default("caregiver"),
  status:      text("status").notNull().default("pending"),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type PetPremiumAccess = typeof petPremiumAccess.$inferSelect;
export type PetMedication    = typeof petMedications.$inferSelect;
export type PetDocument      = typeof petDocuments.$inferSelect;
export type PetCareMember    = typeof petCareMembers.$inferSelect;
