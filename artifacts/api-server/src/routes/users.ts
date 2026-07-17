import { Router } from "express";
import { eq, or, sql } from "drizzle-orm";
import { db, socialProfiles } from "@workspace/db";
import { extractUserId } from "../lib/jwtAuth.js";

const router = Router();

/* ── POST /api/users/sync ─ upsert on login/register ─────── */
router.post("/users/sync", async (req, res) => {
  try {
    const { id, email, name, username, bio, location, avatarUrl } = req.body as {
      id: string; email: string; name?: string; username?: string;
      bio?: string; location?: string; avatarUrl?: string;
    };
    if (!id || !email) { res.status(400).json({ error: "id and email required" }); return; }

    await db
      .insert(socialProfiles)
      .values({
        id,
        email: email.toLowerCase(),
        name:      name      ?? "",
        username:  username  ?? null,
        bio:       bio       ?? "",
        location:  location  ?? "",
        avatarUrl: avatarUrl ?? "",
      })
      .onConflictDoUpdate({
        target: socialProfiles.id,
        set: {
          email:     email.toLowerCase(),
          name:      name      ?? sql`${socialProfiles.name}`,
          username:  username  ?? sql`${socialProfiles.username}`,
          bio:       bio       ?? sql`${socialProfiles.bio}`,
          location:  location  ?? sql`${socialProfiles.location}`,
          avatarUrl: avatarUrl ?? sql`${socialProfiles.avatarUrl}`,
          updatedAt: sql`now()`,
        },
      });

    const row = await db.select().from(socialProfiles).where(eq(socialProfiles.id, id)).limit(1);
    res.json(row[0] ?? { id, email });
  } catch (err) {
    req.log.error({ err }, "POST /users/sync failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/users/:id ─ get profile ────────────────────── */
router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await db
      .select()
      .from(socialProfiles)
      .where(or(eq(socialProfiles.id, id), eq(socialProfiles.username, id)))
      .limit(1);

    if (rows.length === 0) { res.status(404).json({ error: "User not found" }); return; }

    const profile = rows[0];
    res.json({
      ...profile,
      followersCount: 0,
      followingCount: 0,
      postsCount:     0,
    });
  } catch (err) {
    req.log.error({ err }, "GET /users/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PATCH /api/users/:id ─ update profile ───────────────── */
router.patch("/users/:id", async (req, res) => {
  try {
    const callerId = extractUserId(req);
    const { id }   = req.params;
    if (!callerId || callerId !== id) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const { name, username, bio, location, avatarUrl } = req.body as {
      name?: string; username?: string; bio?: string; location?: string; avatarUrl?: string;
    };

    /* Check username uniqueness */
    if (username) {
      const conflict = await db
        .select({ id: socialProfiles.id })
        .from(socialProfiles)
        .where(eq(socialProfiles.username, username))
        .limit(1);
      if (conflict.length > 0 && conflict[0].id !== id) {
        res.status(409).json({ error: "Bu kullanıcı adı zaten alınmış." }); return;
      }
    }

    const updates: Partial<typeof socialProfiles.$inferInsert> = { updatedAt: new Date() };
    if (name      !== undefined) updates.name      = name;
    if (username  !== undefined) updates.username  = username || null;
    if (bio       !== undefined) updates.bio       = bio;
    if (location  !== undefined) updates.location  = location;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const existing = await db.select().from(socialProfiles).where(eq(socialProfiles.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "Profile not found — sync first." }); return;
    }

    await db.update(socialProfiles).set(updates).where(eq(socialProfiles.id, id));
    const updated = await db.select().from(socialProfiles).where(eq(socialProfiles.id, id)).limit(1);
    res.json({ ...updated[0], followersCount: 0, followingCount: 0, postsCount: 0 });
  } catch (err) {
    req.log.error({ err }, "PATCH /users/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
