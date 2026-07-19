import { Router } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  helperPointTransactions,
  socialProfiles,
} from "@workspace/db";
import { extractUserId } from "../lib/jwtAuth.js";

const router = Router();

/* ── Shared point system ─────────────────────────────────────────
   Source of truth for point values — never trust client-supplied values.
   ──────────────────────────────────────────────────────────────── */
/* Keys match the enum values sent by the client (HELP_STATUSES[].key) */
export const POINT_MAP: Record<string, number> = {
  "same_location": 1,   // Aynı Bölgede
  "injured":       2,   // Yaralı
  "emergency":     2,   // Acil Yardım Gerekli
  "watered":       3,   // Su Verildi
  "fed":           3,   // Beslendi
  "safe":          5,   // Güvende
  "at_vet":        7,   // Veteriner Kontrolünde
  "taken_to_vet":  10,  // Tedaviye Götürüldü
  /* Legacy/alternative spellings — keep for backfill safety */
  "same_area":     1,
  "urgent_help":   2,
  "water_given":   3,
  "vet_check":     7,
  "taken_to_treatment": 10,
};

export function getAchievementLevel(points: number): string {
  if (points >= 100) return "CanYoldaşı Efsanesi";
  if (points >= 60)  return "Umut Elçisi";
  if (points >= 30)  return "Sokak Kahramanı";
  if (points >= 10)  return "Can Dostu";
  return "İyilik Başlangıcı";
}

/* Returns the month key (YYYY-MM) in Europe/Istanbul timezone */
export function getIstanbulMonthKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year:  "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year  = parts.find(p => p.type === "year")?.value  ?? "";
  const month = parts.find(p => p.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

/* ── GET /api/leaderboard?month=YYYY-MM ──────────────────────── */
router.get("/leaderboard", async (req, res) => {
  const userId   = extractUserId(req);
  const rawMonth = typeof req.query["month"] === "string" ? req.query["month"] : undefined;
  const monthKey = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)
    ? rawMonth
    : getIstanbulMonthKey();

  try {
    /* Aggregate valid points for the selected month */
    const rows = await db
      .select({
        userId:         helperPointTransactions.userId,
        totalPoints:    sql<number>`SUM(${helperPointTransactions.points})::int`,
        distinctAnimals:sql<number>`COUNT(DISTINCT ${helperPointTransactions.animalId})::int`,
        firstEarnedAt:  sql<string>`MIN(${helperPointTransactions.earnedAt})::text`,
      })
      .from(helperPointTransactions)
      .where(and(
        eq(helperPointTransactions.monthKey, monthKey),
        eq(helperPointTransactions.isValid,  true),
      ))
      .groupBy(helperPointTransactions.userId)
      .orderBy(
        desc(sql`SUM(${helperPointTransactions.points})`),
        desc(sql`COUNT(DISTINCT ${helperPointTransactions.animalId})`),
        asc(sql`MIN(${helperPointTransactions.earnedAt})`),
        asc(helperPointTransactions.userId),
      );

    /* Batch-fetch profiles — avoids N+1 */
    const profileMap = new Map<string, { name: string | null; avatarUrl: string | null }>();
    if (rows.length > 0) {
      const ids = [...new Set(rows.map(r => r.userId))];
      const profiles = await db
        .select({ id: socialProfiles.id, name: socialProfiles.name, avatarUrl: socialProfiles.avatarUrl })
        .from(socialProfiles)
        .where(inArray(socialProfiles.id, ids));
      for (const p of profiles) profileMap.set(p.id, { name: p.name, avatarUrl: p.avatarUrl });
    }

    /* Also ensure current user profile is loaded even if they have no points */
    if (userId && !profileMap.has(userId)) {
      const [myProfile] = await db
        .select({ id: socialProfiles.id, name: socialProfiles.name, avatarUrl: socialProfiles.avatarUrl })
        .from(socialProfiles)
        .where(eq(socialProfiles.id, userId));
      if (myProfile) profileMap.set(userId, { name: myProfile.name, avatarUrl: myProfile.avatarUrl });
    }

    /* Build ranked list */
    const ranked = rows.map((row, idx) => {
      const profile = profileMap.get(row.userId);
      return {
        rank:           idx + 1,
        userId:         row.userId,
        name:           profile?.name?.trim() || "CanYoldaşı Gönüllüsü",
        avatarUrl:      profile?.avatarUrl ?? null,
        totalPoints:    row.totalPoints,
        distinctAnimals:row.distinctAnimals,
        level:          getAchievementLevel(row.totalPoints),
      };
    });

    const top3    = ranked.slice(0, 3);
    // ranking includes ALL users (1st place onwards) so podium and list share one source
    const ranking = ranked;

    /* Current user summary — always present when authenticated */
    let myRank: object | null = null;
    if (userId) {
      const myEntry = ranked.find(r => r.userId === userId);
      if (myEntry) {
        myRank = myEntry;
      } else {
        const profile = profileMap.get(userId);
        myRank = {
          rank:           null,
          userId,
          name:           profile?.name?.trim() || "CanYoldaşı Gönüllüsü",
          avatarUrl:      profile?.avatarUrl ?? null,
          totalPoints:    0,
          distinctAnimals:0,
          level:          "İyilik Başlangıcı",
        };
      }
    }

    res.json({ monthKey, top3, ranking, myRank });
  } catch (err) {
    req.log.error({ err }, "GET /leaderboard failed");
    res.status(500).json({ error: "Sıralama yüklenemedi" });
  }
});

export default router;
