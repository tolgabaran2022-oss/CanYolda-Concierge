import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const petProfiles = pgTable("pet_profiles", {
  id:         text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  ownerId:    text("owner_id").notNull(),
  name:       text("name").notNull(),
  type:       text("type").notNull().default("cat"),
  breed:      text("breed").notNull().default(""),
  gender:     text("gender").notNull().default(""),
  birthDate:  text("birth_date").notNull().default(""),
  weight:     text("weight").notNull().default(""),
  color:      text("color").notNull().default(""),
  avatarUrl:  text("avatar_url").notNull().default(""),
  bio:        text("bio").notNull().default(""),
  location:   text("location").notNull().default(""),
  postsCount:     integer("posts_count").notNull().default(0),
  followersCount: integer("followers_count").notNull().default(0),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).defaultNow(),
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
