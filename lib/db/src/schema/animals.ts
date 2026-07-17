import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ═══════════════════════════════════════════════════════════════════════════
   STRAY ANIMAL REPORTS
═══════════════════════════════════════════════════════════════════════════ */
export const strayAnimals = pgTable("stray_animals", {
  id:             text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  reportCode:     text("report_code").unique(),
  imageUrl:       text("image_url").notNull().default(""),
  animalType:     text("animal_type").notNull().default(""),
  locationName:   text("location_name").notNull().default(""),
  latitude:       real("latitude").notNull(),
  longitude:      real("longitude").notNull(),
  status:         text("status").notNull().default("unknown"),
  notes:          text("notes").notNull().default(""),
  userId:         text("user_id"),
  userName:       text("user_name").notNull().default(""),
  fedCount:            integer("fed_count").notNull().default(0),
  needsHelpCount:      integer("needs_help_count").notNull().default(0),
  commentsCount:       integer("comments_count").notNull().default(0),
  locationOpenCount:   integer("location_open_count").notNull().default(0),
  confirmationCount:   integer("confirmation_count").notNull().default(0),
  priorityScore:  integer("priority_score").notNull().default(0),
  priorityLevel:  text("priority_level").notNull().default("low"),
  helpStatus:     text("help_status").notNull().default("OPEN"),
  photoCapturedAt: timestamp("photo_captured_at", { withTimezone: true }),
  photoUploadedAt: timestamp("photo_uploaded_at", { withTimezone: true }),
  editLockedAt:   timestamp("edit_locked_at", { withTimezone: true }),
  isModeratorReviewed: boolean("is_moderator_reviewed").notNull().default(false),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_stray_animals_help_status").on(t.helpStatus),
  index("idx_stray_animals_priority").on(t.priorityLevel, t.priorityScore),
  index("idx_stray_animals_location").on(t.latitude, t.longitude),
  index("idx_stray_animals_created_at").on(t.createdAt),
  index("idx_stray_animals_user_id").on(t.userId),
]);

export const reportConfirmations = pgTable("report_confirmations", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  animalId:  text("animal_id").notNull().references(() => strayAnimals.id, { onDelete: "cascade" }),
  userId:    text("user_id").notNull(),
  userName:  text("user_name").notNull().default(""),
  note:      text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("report_confirmations_unique").on(t.animalId, t.userId),
  index("idx_report_confirmations_animal").on(t.animalId),
]);

export const volunteerClaims = pgTable("volunteer_claims", {
  id:               text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  animalId:         text("animal_id").notNull().references(() => strayAnimals.id, { onDelete: "cascade" }),
  userId:           text("user_id").notNull(),
  userName:         text("user_name").notNull().default(""),
  role:             text("role").notNull().default("assistant"),
  estimatedArrival: text("estimated_arrival"),
  status:           text("status").notNull().default("active"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_volunteer_claims_animal").on(t.animalId, t.status),
]);

export const reportStatusHistory = pgTable("report_status_history", {
  id:         text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  animalId:   text("animal_id").notNull().references(() => strayAnimals.id, { onDelete: "cascade" }),
  fromStatus: text("from_status").notNull(),
  toStatus:   text("to_status").notNull(),
  changedBy:  text("changed_by").notNull(),
  reason:     text("reason").notNull().default(""),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_report_status_history_animal").on(t.animalId),
]);

export const moderationQueue = pgTable("moderation_queue", {
  id:          text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  animalId:    text("animal_id").notNull().references(() => strayAnimals.id, { onDelete: "cascade" }),
  queueType:   text("queue_type").notNull(),
  reason:      text("reason").notNull().default(""),
  reportedBy:  text("reported_by"),
  resolvedBy:  text("resolved_by"),
  resolvedAt:  timestamp("resolved_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_moderation_queue_type").on(t.queueType, t.resolvedAt),
  index("idx_moderation_queue_animal").on(t.animalId),
]);

export const userRiskScores = pgTable("user_risk_scores", {
  userId:             text("user_id").primaryKey(),
  riskScore:          integer("risk_score").notNull().default(0),
  falseReportCount:   integer("false_report_count").notNull().default(0),
  spamReportCount:    integer("spam_report_count").notNull().default(0),
  isReportingBlocked: boolean("is_reporting_blocked").notNull().default(false),
  blockedUntil:       timestamp("blocked_until", { withTimezone: true }),
  lastUpdatedAt:      timestamp("last_updated_at", { withTimezone: true }).defaultNow(),
});

export const animalNotifications = pgTable("animal_notifications", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId:    text("user_id").notNull(),
  animalId:  text("animal_id").notNull().references(() => strayAnimals.id, { onDelete: "cascade" }),
  type:      text("type").notNull(),
  title:     text("title").notNull(),
  body:      text("body").notNull(),
  isRead:    boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_animal_notifications_user").on(t.userId, t.isRead),
  index("idx_animal_notifications_animal").on(t.animalId),
]);

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

/* ═══════════════════════════════════════════════════════════════════════════
   ADOPTION
═══════════════════════════════════════════════════════════════════════════ */
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
  userId:             text("user_id"),
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
  promotedUntil:      timestamp("promoted_until", { withTimezone: true }),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_adoption_listings_promo_sort").on(t.promotedUntil, t.createdAt, t.id),
]);

export const adoptionRequests = pgTable("adoption_requests", {
  id:            text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  listingId:     text("listing_id").notNull().references(() => adoptionListings.id, { onDelete: "cascade" }),
  requesterId:   text("requester_id").notNull(),
  requesterName: text("requester_name").notNull().default(""),
  ownerId:       text("owner_id"),
  reason:        text("reason").notNull().default(""),
  hadPetBefore:  boolean("had_pet_before").notNull().default(false),
  livingSpace:   text("living_space").notNull().default(""),
  hasOtherPets:  boolean("has_other_pets").notNull().default(false),
  aloneDuration: text("alone_duration").notNull().default(""),
  note:          text("note").notNull().default(""),
  status:        text("status").notNull().default("pending"),
  acceptedAt:    timestamp("accepted_at", { withTimezone: true }),
  rejectedAt:    timestamp("rejected_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ═══════════════════════════════════════════════════════════════════════════
   BOOST / PROMOTIONS  (column names match storage.ts + routes/promotions.ts)
═══════════════════════════════════════════════════════════════════════════ */
export const promotionPackages = pgTable("promotion_packages", {
  id:               text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  code:             text("code").notNull().unique(),
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
  id:                  text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  listingId:           text("listing_id").notNull().references(() => adoptionListings.id, { onDelete: "cascade" }),
  ownerId:             text("owner_id").notNull(),
  packageId:           text("package_id").notNull(),
  stripeSessionId:     text("stripe_session_id"),
  storeTransactionId:  text("store_transaction_id"),
  revenuecatAppUserId: text("revenuecat_app_user_id"),
  productIdentifier:   text("product_identifier"),
  platform:            text("platform"),
  verifiedAt:          timestamp("verified_at", { withTimezone: true }),
  packageName:         text("package_name").notNull().default(""),
  durationDays:        integer("duration_days").notNull(),
  startsAt:            timestamp("starts_at", { withTimezone: true }),
  expiresAt:           timestamp("expires_at", { withTimezone: true }),
  status:              text("status").notNull().default("pending"),
  createdAt:           timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_listing_promotions_listing").on(t.listingId, t.status),
]);

export const listingPromotionPurchases = pgTable("listing_promotion_purchases", {
  id:                    text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId:                text("user_id").notNull(),
  listingId:             text("listing_id"),
  revenuecatAppUserId:   text("revenuecat_app_user_id").notNull(),
  packageIdentifier:     text("package_identifier").notNull(),
  productIdentifier:     text("product_identifier").notNull(),
  store:                 text("store"),
  transactionIdentifier: text("transaction_identifier").notNull(),
  purchaseStatus:        text("purchase_status").notNull().default("verified"),
  durationDays:          integer("duration_days").notNull(),
  promotionStartedAt:    timestamp("promotion_started_at", { withTimezone: true }),
  promotionExpiresAt:    timestamp("promotion_expires_at", { withTimezone: true }),
  revenuecatEventId:     text("revenuecat_event_id"),
  refundedAt:            timestamp("refunded_at", { withTimezone: true }),
  cancelReason:          text("cancel_reason"),
  verifiedAt:            timestamp("verified_at", { withTimezone: true }).defaultNow(),
  createdAt:             timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:             timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("lpp_transaction_id_unique").on(t.transactionIdentifier),
  index("idx_lpp_user_id").on(t.userId),
  index("idx_lpp_listing_id").on(t.listingId),
  index("idx_lpp_status").on(t.purchaseStatus),
  index("idx_lpp_rc_user").on(t.revenuecatAppUserId),
]);


export const revenuecatWebhookEvents = pgTable("revenuecat_webhook_events", {
  id:                text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  revenuecatEventId: text("revenuecat_event_id").notNull().unique(),
  eventType:         text("event_type").notNull(),
  appUserId:         text("app_user_id").notNull(),
  productId:         text("product_id"),
  transactionId:     text("transaction_id"),
  environment:       text("environment"),
  processingStatus:  text("processing_status").notNull().default("received"),
  failureReason:     text("failure_reason"),
  processedAt:       timestamp("processed_at", { withTimezone: true }),
  payload:           text("payload").notNull().default("{}"),
  createdAt:         timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_rc_webhook_events_user").on(t.appUserId),
  index("idx_rc_webhook_events_type").on(t.eventType, t.createdAt),
]);

/* ═══════════════════════════════════════════════════════════════════════════
   ADOPTION — follows (users saving listings) + ownerId on requests
═══════════════════════════════════════════════════════════════════════════ */
export const adoptionListingFollows = pgTable("adoption_listing_follows", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId:    text("user_id").notNull(),
  listingId: text("listing_id").notNull().references(() => adoptionListings.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("adoption_listing_follows_unique").on(t.userId, t.listingId),
  index("idx_adoption_listing_follows_user").on(t.userId),
  index("idx_adoption_listing_follows_listing").on(t.listingId),
]);
