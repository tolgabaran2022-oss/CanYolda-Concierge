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
  images:             text("images").array().notNull().default(sql`'{}'::text[]`),
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

export const adoptionListingFollows = pgTable("adoption_listing_follows", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId:    text("user_id").notNull(),
  listingId: text("listing_id").notNull().references(() => adoptionListings.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [unique("adoption_listing_follows_unique").on(t.userId, t.listingId)]);

export const promotionPackages = pgTable("promotion_packages", {
  id:               text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  code:             text("code").notNull(),
  name:             text("name").notNull(),
  durationDays:     integer("duration_days").notNull(),
  priceAmount:      integer("price_amount").notNull(),
  currency:         text("currency").notNull().default("try"),
  badgeText:        text("badge_text"),
  shortDescription: text("short_description").notNull().default(""),
  isPopular:        boolean("is_popular").notNull().default(false),
  isActive:         boolean("is_active").notNull().default(true),
  displayOrder:     integer("display_order").notNull().default(0),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const listingPromotions = pgTable("listing_promotions", {
  id:                   text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  listingId:            text("listing_id").notNull().references(() => adoptionListings.id, { onDelete: "cascade" }),
  ownerId:              text("owner_id").notNull(),
  packageId:            text("package_id").notNull(),
  stripeSessionId:      text("stripe_session_id"),
  storeTransactionId:   text("store_transaction_id"),
  revenueCatUserId:     text("revenuecat_app_user_id"),
  productIdentifier:    text("product_identifier"),
  platform:             text("platform"),
  verifiedAt:           timestamp("verified_at", { withTimezone: true }),
  packageName:          text("package_name").notNull().default(""),
  durationDays:         integer("duration_days").notNull(),
  startsAt:             timestamp("starts_at", { withTimezone: true }),
  expiresAt:            timestamp("expires_at", { withTimezone: true }),
  status:               text("status").notNull().default("pending"),
  createdAt:            timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const listingPromotionPurchases = pgTable("listing_promotion_purchases", {
  id:                   text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId:               text("user_id").notNull(),
  listingId:            text("listing_id").references(() => adoptionListings.id, { onDelete: "set null" }),
  revenueCatUserId:     text("revenuecat_app_user_id").notNull(),
  packageIdentifier:    text("package_identifier").notNull(),
  productIdentifier:    text("product_identifier").notNull(),
  store:                text("store"),
  transactionIdentifier: text("transaction_identifier").notNull(),
  purchaseStatus:       text("purchase_status").notNull().default("verified"),
  durationDays:         integer("duration_days").notNull(),
  promotionStartedAt:   timestamp("promotion_started_at", { withTimezone: true }),
  promotionExpiresAt:   timestamp("promotion_expires_at", { withTimezone: true }),
  verifiedAt:           timestamp("verified_at", { withTimezone: true }).defaultNow(),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("lpp_transaction_id_unique").on(t.transactionIdentifier)]);

export type PromotionPackage        = typeof promotionPackages.$inferSelect;
export type InsertPromotionPackage  = typeof promotionPackages.$inferInsert;
export type ListingPromotion        = typeof listingPromotions.$inferSelect;
export type InsertListingPromotion  = typeof listingPromotions.$inferInsert;
export type ListingPromotionPurchase       = typeof listingPromotionPurchases.$inferSelect;
export type InsertListingPromotionPurchase = typeof listingPromotionPurchases.$inferInsert;

export type AdoptionListingFollow       = typeof adoptionListingFollows.$inferSelect;
export type InsertAdoptionListingFollow = typeof adoptionListingFollows.$inferInsert;

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
