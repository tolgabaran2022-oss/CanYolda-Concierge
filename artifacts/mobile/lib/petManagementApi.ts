const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

function hdrs(userId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["x-user-id"] = userId;
  return h;
}

/* ── Types ─────────────────────────────────────────────────────────────── */

export type ApiVaccination = {
  id: string;
  petId: string;
  userId: string;
  vaccineName: string;
  vaccineType: string;
  administeredDate: string;
  nextDueDate: string;
  veterinarianName: string;
  clinicName: string;
  serialNumber: string;
  description: string;
  status: "current" | "upcoming" | "overdue" | "scheduled";
  createdAt: string;
  updatedAt: string;
};

export type ApiAppointment = {
  id: string;
  petId: string;
  userId: string;
  appointmentType: string;
  title: string;
  appointmentDate: string;
  appointmentTime: string;
  location: string;
  clinicName: string;
  veterinarianName: string;
  description: string;
  reminderAt: string;
  recurrenceRule: string;
  status: "upcoming" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export type ApiIdentification = {
  id: string;
  petId: string;
  userId: string;
  microchipNumber: string;
  passportNumber: string;
  healthBookNumber: string;
  registrationNumber: string;
  insuranceInfo: string;
  veterinarianName: string;
  veterinarianPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiPetNote = {
  id: string;
  petId: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiNutrition = {
  id: string;
  petId: string;
  userId: string;
  foodBrand: string;
  foodName: string;
  foodType: string;
  dailyAmountGrams: number;
  mealsPerDay: number;
  mealTimes: string;
  packageAmountGrams: number;
  remainingAmountGrams: number;
  openedAt: string;
  allergies: string;
  veterinarianNotes: string;
  createdAt: string;
  updatedAt: string;
};

/* ── Vaccinations ────────────────────────────────────────────────────── */

export async function apiGetVaccinations(petId: string, userId: string): Promise<ApiVaccination[]> {
  const res = await fetch(`${API_BASE}/pets/${petId}/vaccinations`, { headers: hdrs(userId) });
  if (!res.ok) return [];
  return res.json() as Promise<ApiVaccination[]>;
}

export async function apiCreateVaccination(
  petId: string,
  userId: string,
  data: Omit<ApiVaccination, "id" | "petId" | "userId" | "createdAt" | "updatedAt">
): Promise<ApiVaccination> {
  const res = await fetch(`${API_BASE}/pets/${petId}/vaccinations`, {
    method: "POST",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("create vaccination failed");
  return res.json() as Promise<ApiVaccination>;
}

export async function apiUpdateVaccination(
  petId: string,
  vaccinationId: string,
  userId: string,
  data: Partial<Omit<ApiVaccination, "id" | "petId" | "userId" | "createdAt" | "updatedAt">>
): Promise<ApiVaccination> {
  const res = await fetch(`${API_BASE}/pets/${petId}/vaccinations/${vaccinationId}`, {
    method: "PATCH",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("update vaccination failed");
  return res.json() as Promise<ApiVaccination>;
}

export async function apiDeleteVaccination(petId: string, vaccinationId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/pets/${petId}/vaccinations/${vaccinationId}`, {
    method: "DELETE",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("delete vaccination failed");
}

/* ── Appointments ────────────────────────────────────────────────────── */

export async function apiGetAppointments(petId: string, userId: string): Promise<ApiAppointment[]> {
  const res = await fetch(`${API_BASE}/pets/${petId}/appointments`, { headers: hdrs(userId) });
  if (!res.ok) return [];
  return res.json() as Promise<ApiAppointment[]>;
}

export async function apiCreateAppointment(
  petId: string,
  userId: string,
  data: Omit<ApiAppointment, "id" | "petId" | "userId" | "createdAt" | "updatedAt">
): Promise<ApiAppointment> {
  const res = await fetch(`${API_BASE}/pets/${petId}/appointments`, {
    method: "POST",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("create appointment failed");
  return res.json() as Promise<ApiAppointment>;
}

export async function apiUpdateAppointment(
  petId: string,
  appointmentId: string,
  userId: string,
  data: Partial<Omit<ApiAppointment, "id" | "petId" | "userId" | "createdAt" | "updatedAt">>
): Promise<ApiAppointment> {
  const res = await fetch(`${API_BASE}/pets/${petId}/appointments/${appointmentId}`, {
    method: "PATCH",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("update appointment failed");
  return res.json() as Promise<ApiAppointment>;
}

export async function apiDeleteAppointment(petId: string, appointmentId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/pets/${petId}/appointments/${appointmentId}`, {
    method: "DELETE",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("delete appointment failed");
}

/* ── Identification ──────────────────────────────────────────────────── */

export async function apiGetIdentification(petId: string, userId: string): Promise<ApiIdentification | null> {
  const res = await fetch(`${API_BASE}/pets/${petId}/identification`, { headers: hdrs(userId) });
  if (!res.ok) return null;
  return res.json() as Promise<ApiIdentification>;
}

export async function apiUpsertIdentification(
  petId: string,
  userId: string,
  data: Omit<ApiIdentification, "id" | "petId" | "userId" | "createdAt" | "updatedAt">
): Promise<ApiIdentification> {
  const res = await fetch(`${API_BASE}/pets/${petId}/identification`, {
    method: "PUT",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("upsert identification failed");
  return res.json() as Promise<ApiIdentification>;
}

/* ── Notes ───────────────────────────────────────────────────────────── */

export async function apiGetNotes(petId: string, userId: string): Promise<ApiPetNote[]> {
  const res = await fetch(`${API_BASE}/pets/${petId}/notes`, { headers: hdrs(userId) });
  if (!res.ok) return [];
  return res.json() as Promise<ApiPetNote[]>;
}

export async function apiCreateNote(
  petId: string,
  userId: string,
  data: { title: string; content: string }
): Promise<ApiPetNote> {
  const res = await fetch(`${API_BASE}/pets/${petId}/notes`, {
    method: "POST",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("create note failed");
  return res.json() as Promise<ApiPetNote>;
}

export async function apiUpdateNote(
  petId: string,
  noteId: string,
  userId: string,
  data: { title?: string; content?: string }
): Promise<ApiPetNote> {
  const res = await fetch(`${API_BASE}/pets/${petId}/notes/${noteId}`, {
    method: "PATCH",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("update note failed");
  return res.json() as Promise<ApiPetNote>;
}

export async function apiDeleteNote(petId: string, noteId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/pets/${petId}/notes/${noteId}`, {
    method: "DELETE",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("delete note failed");
}

/* ── Nutrition ───────────────────────────────────────────────────────── */

export async function apiGetNutrition(petId: string, userId: string): Promise<ApiNutrition | null> {
  const res = await fetch(`${API_BASE}/pets/${petId}/nutrition`, { headers: hdrs(userId) });
  if (!res.ok) return null;
  return res.json() as Promise<ApiNutrition>;
}

export async function apiUpsertNutrition(
  petId: string,
  userId: string,
  data: Omit<ApiNutrition, "id" | "petId" | "userId" | "createdAt" | "updatedAt">
): Promise<ApiNutrition> {
  const res = await fetch(`${API_BASE}/pets/${petId}/nutrition`, {
    method: "PUT",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("upsert nutrition failed");
  return res.json() as Promise<ApiNutrition>;
}

/* ── Reminders (derived from appointments + vaccinations) ────────────── */
export type ApiReminder = {
  id: string;
  type: "vaccination" | "appointment" | "nutrition";
  title: string;
  date: string;
  time?: string;
  status: string;
  icon: string;
  color: string;
};

export function buildReminders(
  vaccinations: ApiVaccination[],
  appointments: ApiAppointment[],
  nutrition: ApiNutrition | null
): ApiReminder[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reminders: ApiReminder[] = [];

  vaccinations
    .filter((v) => v.nextDueDate && new Date(v.nextDueDate) >= today)
    .forEach((v) => {
      reminders.push({
        id: `vacc-${v.id}`,
        type: "vaccination",
        title: v.vaccineName,
        date: v.nextDueDate,
        status: v.status,
        icon: "shield-checkmark-outline",
        color: "#FF9500",
      });
    });

  appointments
    .filter((a) => a.status === "upcoming" && new Date(a.appointmentDate) >= today)
    .forEach((a) => {
      reminders.push({
        id: `appt-${a.id}`,
        type: "appointment",
        title: a.title,
        date: a.appointmentDate,
        time: a.appointmentTime,
        status: a.status,
        icon: "calendar-outline",
        color: "#7B5EA7",
      });
    });

  if (nutrition && nutrition.dailyAmountGrams > 0 && nutrition.remainingAmountGrams > 0) {
    const daysLeft = Math.floor(nutrition.remainingAmountGrams / nutrition.dailyAmountGrams);
    if (daysLeft <= 10) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysLeft);
      reminders.push({
        id: `nutr-${nutrition.id}`,
        type: "nutrition",
        title: "Mama Satın Al",
        date: targetDate.toISOString().split("T")[0]!,
        status: daysLeft <= 3 ? "overdue" : "upcoming",
        icon: "bag-handle-outline",
        color: "#34C759",
      });
    }
  }

  return reminders.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
}
