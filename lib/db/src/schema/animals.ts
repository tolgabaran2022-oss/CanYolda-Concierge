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
  fedCount:            integer("fed_count").notNull().default(0),
  needsHelpCount:      integer("needs_help_count").notNull().default(0),
  commentsCount:       integer("comments_count").notNull().default(0),
  locationOpenCount:   integer("location_open_count").notNull().default(0),
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

export const animalHelpUpdates = pgTable("animal_help_updates", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  animalId:  text("animal_id").notNull().references(() => strayAnimals.id, { onDelete: "cascade" }),
  userId:    text("user_id").notNull(),
  userName:  text("user_name").notNull().default(""),
  photoUrl:  text("photo_url").notNull().default(""),
  status:    text("status").notNull(),
  note:      text("note").notNull().default(""),
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
  healthStatus:       text("health_status"),
  vaccinationStatus:  text("vaccination_status"),
  environmentType:    text("environment_type"),
  childCompatibility: text("child_compatibility"),
  catCompatibility:   text("cat_compatibility"),
  dogCompatibility:   text("dog_compatibility"),
  toiletTraining:     text("toilet_training"),
  viewsCount:         integer("views_count").notNull().default(0),
  favoriteCount:      integer("favorite_count").notNull().default(0),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const adoptionRequests = pgTable("adoption_requests", {
  id:             text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  listingId:      text("listing_id").notNull().references(() => adoptionListings.id, { onDelete: "cascade" }),
  requesterId:    text("requester_id").notNull(),
  requesterName:  text("requester_name").notNull().default(""),
  ownerId:        text("owner_id").notNull(),
  reason:         text("reason").notNull(),
  hadPetBefore:   boolean("had_pet_before").notNull(),
  livingSpace:    text("living_space").notNull(),
  hasOtherPets:   boolean("has_other_pets").notNull(),
  aloneDuration:  text("alone_duration").notNull(),
  note:           text("note").notNull().default(""),
  status:         text("status").notNull().default("pending"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
  acceptedAt:     timestamp("accepted_at", { withTimezone: true }),
  rejectedAt:     timestamp("rejected_at", { withTimezone: true }),
}, (t) => [unique("adoption_requests_unique").on(t.listingId, t.requesterId)]);

export type AdoptionRequest       = typeof adoptionRequests.$inferSelect;
export type InsertAdoptionRequest = typeof adoptionRequests.$inferInsert;

export type StrayAnimal           = typeof strayAnimals.$inferSelect;
export type InsertStrayAnimal     = typeof strayAnimals.$inferInsert;
export type AnimalInteraction     = typeof animalInteractions.$inferSelect;
export type AnimalComment         = typeof animalComments.$inferSelect;
export type AnimalHelpUpdate      = typeof animalHelpUpdates.$inferSelect;
export type InsertAnimalHelpUpdate = typeof animalHelpUpdates.$inferInsert;
export type AdoptionListing       = typeof adoptionListings.$inferSelect;
export type InsertAdoptionListing = typeof adoptionListings.$inferInsert;
