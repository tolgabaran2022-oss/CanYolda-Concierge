import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, pool, listingContacts } from "@workspace/db";

const router = Router();

/* ── Auth helper ─────────────────────────────────────────── */
function requireUser(req: any, res: any): string | null {
  const id = req.headers["x-user-id"] as string;
  if (!id) { res.status(401).json({ error: "x-user-id required" }); return null; }
  return id;
}

/* ── Ensure table exists ─────────────────────────────────── */
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listing_contacts (
      id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      listing_id          TEXT NOT NULL UNIQUE,
      owner_id            TEXT NOT NULL,
      phone_number        TEXT NOT NULL DEFAULT '',
      allow_phone_contact BOOLEAN NOT NULL DEFAULT true,
      allow_messages      BOOLEAN NOT NULL DEFAULT true,
      created_at          TIMESTAMPTZ DEFAULT now(),
      updated_at          TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_listing_contacts_listing ON listing_contacts(listing_id);
    CREATE INDEX IF NOT EXISTS idx_listing_contacts_owner ON listing_contacts(owner_id);
  `);
}
ensureTable().catch(() => {});

/* ── POST /api/listings/contact — upsert contact prefs ──── */
router.post("/listings/contact", async (req, res) => {
  const callerId = requireUser(req, res);
  if (!callerId) return;

  const { listingId, phoneNumber, allowPhoneContact, allowMessages } = req.body as {
    listingId: string;
    phoneNumber: string;
    allowPhoneContact: boolean;
    allowMessages: boolean;
  };

  if (!listingId || typeof listingId !== "string") {
    res.status(400).json({ error: "listingId required" });
    return;
  }

  try {
    /* Check if record exists — if so, verify ownership */
    const existing = await db
      .select()
      .from(listingContacts)
      .where(eq(listingContacts.listingId, listingId))
      .limit(1);

    if (existing.length > 0 && existing[0].ownerId !== callerId) {
      res.status(403).json({ error: "Not the listing owner" });
      return;
    }

    /* Upsert */
    const result = await pool.query<{ id: string }>(
      `INSERT INTO listing_contacts
         (listing_id, owner_id, phone_number, allow_phone_contact, allow_messages, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (listing_id) DO UPDATE SET
         phone_number        = EXCLUDED.phone_number,
         allow_phone_contact = EXCLUDED.allow_phone_contact,
         allow_messages      = EXCLUDED.allow_messages,
         updated_at          = now()
       WHERE listing_contacts.owner_id = EXCLUDED.owner_id
       RETURNING id`,
      [listingId, callerId, phoneNumber ?? "", allowPhoneContact ?? true, allowMessages ?? true]
    );

    if (result.rowCount === 0) {
      res.status(403).json({ error: "Ownership mismatch" });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "listings/contact upsert error");
    res.status(500).json({ error: "Internal error" });
  }
});

/* ── GET /api/listings/:listingId/phone — reveal phone ───── */
router.get("/listings/:listingId/phone", async (req, res) => {
  const callerId = requireUser(req, res);
  if (!callerId) return;

  const { listingId } = req.params;

  try {
    const rows = await db
      .select()
      .from(listingContacts)
      .where(eq(listingContacts.listingId, listingId))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Contact info not found" });
      return;
    }

    const contact = rows[0];

    /* Owner can always see their own phone */
    if (contact.ownerId !== callerId && !contact.allowPhoneContact) {
      res.status(403).json({ error: "İlan sahibi telefon bilgisini paylaşmıyor" });
      return;
    }

    res.json({
      phoneNumber:       contact.phoneNumber,
      allowPhoneContact: contact.allowPhoneContact,
      allowMessages:     contact.allowMessages,
    });
  } catch (err) {
    req.log.error({ err }, "listings/phone fetch error");
    res.status(500).json({ error: "Internal error" });
  }
});

/* ── GET /api/listings/:listingId/contact-prefs — public prefs ── */
router.get("/listings/:listingId/contact-prefs", async (req, res) => {
  const { listingId } = req.params;

  try {
    const rows = await db
      .select({
        allowPhoneContact: listingContacts.allowPhoneContact,
        allowMessages:     listingContacts.allowMessages,
      })
      .from(listingContacts)
      .where(eq(listingContacts.listingId, listingId))
      .limit(1);

    if (rows.length === 0) {
      /* Default: allow both if not set yet */
      res.json({ allowPhoneContact: true, allowMessages: true });
      return;
    }

    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "listings/contact-prefs fetch error");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
