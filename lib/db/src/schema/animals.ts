import { boolean, integer, pgTable, real, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const strayAnimals = pgTable("stray_animals", {
  id:             text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  imageUrl:       text("image_url").notNull().default(""),
  animalType:     text("animal_type").notNull().default(""),
  locationName:   text("location_name").notNull().default(""),
  latitude:       real("latitude").notNull(),
  longitude:      real("longitude").notNull(),
  status:         text("status").notNull().default("unknown"),
  notes:          text("notes").notNull().default(""),
  userId:         text("user_id").notNull(),
  userName:       text("user_name").notNull().default(""),
  fedCount:       integer("fed_count").notNull().default(0),
  needsHelpCount: integer("needs_help_count").notNull().default(0),
  commentsCount:  integer("comments_count").notNull().default(0),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const animalInteractions = pgTable("animal_interactions", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  animalId:  text("animal_id").notNull().references(() => strayAnimals.id, { onDelete: "cascade" }),
  userId:    text("user_id").notNull(),
  type:      text("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [unique("animal_interactions_unique").on(t.animalId, t.userId, t.type)]);

export const animalComments = pgTable("animal_comments", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  animalId:  text("animal_id").notNull().references(() => strayAnimals.id, { onDelete: "cascade" }),
  userId:    text("user_id").notNull(),
  userName:  text("user_name").notNull().default(""),
  text:      text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const adoptionListings = pgTable("adoption_listings", {
  id:                 text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petName:            text("pet_name").notNull(),
  petType:            text("pet_type").notNull().default(""),
  petAge:             text("pet_age").notNull().default(""),
  breed:              text("breed").notNull().default(""),
  gender:             text("gender").notNull().default(""),
  vaccinated:         boolean("vaccinated").notNull().default(false),
  photoUrl:           text("photo_url").notNull().default(""),
  location:           text("location").notNull().default(""),
  description:        text("description").notNull().default(""),
  userId:             text("user_id").notNull(),
  userName:           text("user_name").notNull().default(""),
  contactInfo:        text("contact_info").notNull().default(""),
  allowPhoneContact:  boolean("allow_phone_contact").notNull().default(false),
  allowMessages:      boolean("allow_messages").notNull().default(true),
  status:             text("status").notNull().default("Aktif"),
  viewsCount:         integer("views_count").notNull().default(0),
  favoriteCount:      integer("favorite_count").notNull().default(0),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type StrayAnimal         = typeof strayAnimals.$inferSelect;
export type InsertStrayAnimal   = typeof strayAnimals.$inferInsert;
export type AnimalInteraction   = typeof animalInteractions.$inferSelect;
export type AnimalComment       = typeof animalComments.$inferSelect;
export type AdoptionListing     = typeof adoptionListings.$inferSelect;
export type InsertAdoptionListing = typeof adoptionListings.$inferInsert;
