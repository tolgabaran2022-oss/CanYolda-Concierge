import { Router } from "express";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db, pool, conversations, messages } from "@workspace/db";
import { sendPushNotification } from "../lib/pushService.js";

import { extractUserId } from "../lib/jwtAuth.js";

const router = Router();

/* ── Auth guard helper ──────────────────────────────────────── */
function requireUser(req: any, res: any): string | null {
  const id = extractUserId(req);
  if (!id) { res.status(401).json({ error: "Giriş yapılmamış" }); return null; }
  return id;
}

/* ── GET /api/messages/conversations ── list my conversations ── */
router.get("/conversations", async (req, res) => {
  const myId = requireUser(req, res);
  if (!myId) return;

  try {
    const rows = await db
      .select()
      .from(conversations)
      .where(or(eq(conversations.userOne, myId), eq(conversations.userTwo, myId)))
      .orderBy(desc(conversations.lastMessageAt));

    /* For each conversation, count unread messages sent by the other user */
    const withUnread = await Promise.all(
      rows.map(async (conv) => {
        const otherId = conv.userOne === myId ? conv.userTwo : conv.userOne;
        const [{ count }] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              eq(messages.senderId, otherId),
              eq(messages.isRead, false)
            )
          );

        return {
          id:             conv.id,
          userOne:        conv.userOne,
          userTwo:        conv.userTwo,
          otherUserId:    otherId,
          otherUsername:  "",          // filled from local_users below
          otherAvatarUrl: "",
          listingId:      conv.listingId ?? undefined,
          listingTitle:   conv.listingTitle ?? undefined,
          listingImage:   conv.listingImage ?? undefined,
          lastMessage:    conv.lastMessage,
          lastMessageAt:  conv.lastMessageAt?.toISOString() ?? new Date().toISOString(),
          unreadCount:    count ?? 0,
        };
      })
    );

    /* Hydrate other-user info from local_users */
    const otherIds = [...new Set(withUnread.map((c) => c.otherUserId))];
    const userRows = otherIds.length
      ? await pool.query<{ id: string; name: string; avatar_url: string }>(
          "SELECT id, name, avatar_url FROM local_users WHERE id = ANY($1::text[])",
          [otherIds]
        )
      : { rows: [] };

    const userMap: Record<string, { name: string; avatarUrl: string }> = {};
    for (const row of userRows.rows) {
      userMap[row.id] = { name: row.name ?? row.id, avatarUrl: row.avatar_url ?? "" };
    }

    const hydrated = withUnread.map((c) => ({
      ...c,
      otherUsername:  userMap[c.otherUserId]?.name  ?? c.otherUserId,
      otherAvatarUrl: userMap[c.otherUserId]?.avatarUrl ?? "",
    }));

    res.json(hydrated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "server error" });
  }
});

/* ── POST /api/messages/conversations ── get or create ── */
router.post("/conversations", async (req, res) => {
  const myId = requireUser(req, res);
  if (!myId) return;

  const { otherId, listing } = req.body as {
    otherId: string;
    listing?: { id: string; title: string; imageUrl: string };
  };

  if (!otherId) { res.status(400).json({ error: "otherId required" }); return; }
  if (otherId === myId) { res.status(400).json({ error: "Cannot message yourself" }); return; }

  /* canonical ordering to guarantee unique constraint works */
  const userOne     = myId < otherId ? myId : otherId;
  const userTwo     = myId < otherId ? otherId : myId;
  const listingIdVal = listing?.id ?? null;

  try {
    /* Try to find existing conversation — listing-aware lookup */
    const existingRows = listingIdVal
      ? await db
          .select()
          .from(conversations)
          .where(and(
            eq(conversations.userOne, userOne),
            eq(conversations.userTwo, userTwo),
            eq(conversations.listingId, listingIdVal),
          ))
          .limit(1)
      : await db
          .select()
          .from(conversations)
          .where(and(
            eq(conversations.userOne, userOne),
            eq(conversations.userTwo, userTwo),
            isNull(conversations.listingId),
          ))
          .limit(1);

    let conv = existingRows[0];

    if (!conv) {
      try {
        const [inserted] = await db
          .insert(conversations)
          .values({
            userOne,
            userTwo,
            listingId:    listing?.id ?? null,
            listingTitle: listing?.title ?? null,
            listingImage: listing?.imageUrl ?? null,
            lastMessage:  "",
          })
          .returning();
        conv = inserted;
      } catch {
        /* unique constraint race condition — re-fetch with same listing-aware query */
        const retryRows = listingIdVal
          ? await db
              .select()
              .from(conversations)
              .where(and(
                eq(conversations.userOne, userOne),
                eq(conversations.userTwo, userTwo),
                eq(conversations.listingId, listingIdVal),
              ))
              .limit(1)
          : await db
              .select()
              .from(conversations)
              .where(and(
                eq(conversations.userOne, userOne),
                eq(conversations.userTwo, userTwo),
                isNull(conversations.listingId),
              ))
              .limit(1);
        conv = retryRows[0];
      }
    }

    /* Hydrate other user info */
    const othUId = conv.userOne === myId ? conv.userTwo : conv.userOne;
    const userRow = await pool.query<{ id: string; name: string; avatar_url: string }>(
      "SELECT id, name, avatar_url FROM local_users WHERE id = $1 LIMIT 1",
      [othUId]
    );
    const uRow = userRow.rows[0] ?? {};

    res.json({
      id:             conv.id,
      userOne:        conv.userOne,
      userTwo:        conv.userTwo,
      otherUserId:    othUId,
      otherUsername:  uRow.name ?? othUId,
      otherAvatarUrl: uRow.avatar_url ?? "",
      listingId:      conv.listingId ?? undefined,
      listingTitle:   conv.listingTitle ?? undefined,
      listingImage:   conv.listingImage ?? undefined,
      lastMessage:    conv.lastMessage,
      lastMessageAt:  conv.lastMessageAt?.toISOString() ?? new Date().toISOString(),
      unreadCount:    0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "server error" });
  }
});

/* ── GET /api/messages/conversations/:id/messages ── */
router.get("/conversations/:id/messages", async (req, res) => {
  const myId = requireUser(req, res);
  if (!myId) return;

  try {
    /* Verify membership */
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, req.params.id))
      .limit(1);

    if (!conv || (conv.userOne !== myId && conv.userTwo !== myId)) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const after = req.query.after as string | undefined;
    const rows = await db
      .select()
      .from(messages)
      .where(
        after
          ? and(eq(messages.conversationId, req.params.id), gt(messages.createdAt, new Date(after)))
          : eq(messages.conversationId, req.params.id)
      )
      .orderBy(desc(messages.createdAt))
      .limit(60);

    res.json(
      rows.reverse().map((m) => ({
        id:             m.id,
        conversationId: m.conversationId,
        senderId:       m.senderId,
        message:        m.message,
        imageUrl:       m.imageUrl ?? undefined,
        isRead:         m.isRead,
        createdAt:      m.createdAt?.toISOString() ?? new Date().toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "server error" });
  }
});

/* ── POST /api/messages/conversations/:id/messages ── send ── */
router.post("/conversations/:id/messages", async (req, res) => {
  const myId = requireUser(req, res);
  if (!myId) return;

  const { message, imageUrl } = req.body as { message: string; imageUrl?: string };
  if (!message?.trim() && !imageUrl) {
    res.status(400).json({ error: "message or imageUrl required" }); return;
  }

  try {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, req.params.id))
      .limit(1);

    if (!conv || (conv.userOne !== myId && conv.userTwo !== myId)) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const [inserted] = await db
      .insert(messages)
      .values({
        conversationId: req.params.id,
        senderId:       myId,
        message:        message?.trim() ?? "",
        imageUrl:       imageUrl ?? null,
        isRead:         false,
      })
      .returning();

    /* Update conversation last_message */
    await db
      .update(conversations)
      .set({ lastMessage: message?.trim() ?? "📷 Fotoğraf", lastMessageAt: new Date() })
      .where(eq(conversations.id, req.params.id));

    res.status(201).json({
      id:             inserted.id,
      conversationId: inserted.conversationId,
      senderId:       inserted.senderId,
      message:        inserted.message,
      imageUrl:       inserted.imageUrl ?? undefined,
      isRead:         inserted.isRead,
      createdAt:      inserted.createdAt?.toISOString() ?? new Date().toISOString(),
    });

    /* ── Push notification to the other participant (fire-and-forget) ── */
    const receiverId = conv.userOne === myId ? conv.userTwo : conv.userOne;
    const preview    = inserted.imageUrl ? "📷 Fotoğraf" : (message?.trim().slice(0, 80) ?? "");
    sendPushNotification(receiverId, {
      type:     "message",
      entityId: req.params.id,
      title:    "Yeni mesaj",
      body:     preview || "Yeni bir mesaj aldınız.",
    }).catch(() => {/* non-fatal */});
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "server error" });
  }
});

/* ── POST /api/messages/conversations/:id/read ── mark read ── */
router.post("/conversations/:id/read", async (req, res) => {
  const myId = requireUser(req, res);
  if (!myId) return;

  try {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, req.params.id))
      .limit(1);

    if (!conv || (conv.userOne !== myId && conv.userTwo !== myId)) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const otherId = conv.userOne === myId ? conv.userTwo : conv.userOne;
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.conversationId, req.params.id), eq(messages.senderId, otherId)));

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "server error" });
  }
});

export default router;
