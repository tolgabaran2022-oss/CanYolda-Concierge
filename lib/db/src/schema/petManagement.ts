import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const petVaccinations = pgTable("pet_vaccinations", {
  id:               text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:            text("pet_id").notNull(),
  userId:           text("user_id").notNull(),
  vaccineName:      text("vaccine_name").notNull(),
  vaccineType:      text("vaccine_type").notNull().default(""),
  administeredDate: text("administered_date").notNull(),
  nextDueDate:      text("next_due_date").notNull().default(""),
  veterinarianName: text("veterinarian_name").notNull().default(""),
  clinicName:       text("clinic_name").notNull().default(""),
  serialNumber:     text("serial_number").notNull().default(""),
  description:      text("description").notNull().default(""),
  status:           text("status").notNull().default("current"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const petAppointments = pgTable("pet_appointments", {
  id:               text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:            text("pet_id").notNull(),
  userId:           text("user_id").notNull(),
  appointmentType:  text("appointment_type").notNull().default("veteriner"),
  title:            text("title").notNull(),
  appointmentDate:  text("appointment_date").notNull(),
  appointmentTime:  text("appointment_time").notNull().default(""),
  location:         text("location").notNull().default(""),
  clinicName:       text("clinic_name").notNull().default(""),
  veterinarianName: text("veterinarian_name").notNull().default(""),
  description:      text("description").notNull().default(""),
  reminderAt:       text("reminder_at").notNull().default(""),
  recurrenceRule:   text("recurrence_rule").notNull().default("never"),
  status:           text("status").notNull().default("upcoming"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const petIdentification = pgTable("pet_identification", {
  id:                   text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:                text("pet_id").notNull().unique(),
  userId:               text("user_id").notNull(),
  microchipNumber:      text("microchip_number").notNull().default(""),
  passportNumber:       text("passport_number").notNull().default(""),
  healthBookNumber:     text("health_book_number").notNull().default(""),
  registrationNumber:   text("registration_number").notNull().default(""),
  insuranceInfo:        text("insurance_info").notNull().default(""),
  veterinarianName:     text("veterinarian_name").notNull().default(""),
  veterinarianPhone:    text("veterinarian_phone").notNull().default(""),
  emergencyContactName: text("emergency_contact_name").notNull().default(""),
  emergencyContactPhone:text("emergency_contact_phone").notNull().default(""),
  createdAt:            timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const petNotes = pgTable("pet_notes", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:     text("pet_id").notNull(),
  userId:    text("user_id").notNull(),
  title:     text("title").notNull(),
  content:   text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const petNutrition = pgTable("pet_nutrition", {
  id:                   text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:                text("pet_id").notNull(),
  userId:               text("user_id").notNull(),
  foodBrand:            text("food_brand").notNull().default(""),
  foodName:             text("food_name").notNull().default(""),
  foodType:             text("food_type").notNull().default("kuru"),
  dailyAmountGrams:     integer("daily_amount_grams").notNull().default(0),
  mealsPerDay:          integer("meals_per_day").notNull().default(2),
  mealTimes:            text("meal_times").notNull().default(""),
  packageAmountGrams:   integer("package_amount_grams").notNull().default(0),
  remainingAmountGrams: integer("remaining_amount_grams").notNull().default(0),
  openedAt:             text("opened_at").notNull().default(""),
  allergies:            text("allergies").notNull().default(""),
  veterinarianNotes:    text("veterinarian_notes").notNull().default(""),
  createdAt:            timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const petReminders = pgTable("pet_reminders", {
  id:          text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  petId:       text("pet_id").notNull(),
  userId:      text("user_id").notNull(),
  title:       text("title").notNull(),
  reminderType:text("reminder_type").notNull().default("general"),
  date:        text("date").notNull(),
  time:        text("time").notNull().default(""),
  repeatRule:  text("repeat_rule").notNull().default("never"),
  isEnabled:   boolean("is_enabled").notNull().default(true),
  relatedId:   text("related_id").notNull().default(""),
  notes:       text("notes").notNull().default(""),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type PetVaccination    = typeof petVaccinations.$inferSelect;
export type PetAppointment    = typeof petAppointments.$inferSelect;
export type PetIdentification = typeof petIdentification.$inferSelect;
export type PetNote           = typeof petNotes.$inferSelect;
export type PetNutrition      = typeof petNutrition.$inferSelect;
export type PetReminder       = typeof petReminders.$inferSelect;
