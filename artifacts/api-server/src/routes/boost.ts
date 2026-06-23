import { Router, type IRouter } from "express";
import { storage } from "../storage.js";
import { getUncachableStripeClient } from "../stripeClient.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/boost/packages", async (_req, res): Promise<void> => {
  try {
    const packages = await storage.getBoostPackages();
    res.json({ data: packages });
  } catch (err: unknown) {
    logger.error({ err }, "Failed to fetch boost packages");
    res.status(500).json({ error: "Failed to fetch packages" });
  }
});

router.post("/boost/checkout", async (req, res): Promise<void> => {
  try {
    const { listingId, userEmail, priceId, packageHours, petName } = req.body as {
      listingId: string;
      userEmail: string;
      priceId: string;
      packageHours: number;
      petName?: string;
    };

    if (!listingId || !userEmail || !priceId || !packageHours) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId =
      customers.data.length > 0 ? customers.data[0].id : undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: userEmail });
      customerId = customer.id;
    }

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}/api/boost/success?session_id={CHECKOUT_SESSION_ID}&listing_id=${listingId}`,
      cancel_url: `${baseUrl}/api/boost/cancel`,
      metadata: {
        listing_id: listingId,
        user_email: userEmail,
        package_hours: String(packageHours),
        pet_name: petName ?? "",
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create checkout";
    logger.error({ err }, "Failed to create boost checkout session");
    res.status(500).json({ error: msg });
  }
});

router.post("/boost/status", async (req, res): Promise<void> => {
  try {
    const { listingIds } = req.body as { listingIds: string[] };
    if (!Array.isArray(listingIds)) {
      res.status(400).json({ error: "listingIds must be an array" });
      return;
    }
    const status = await storage.getBoostStatus(listingIds);
    res.json({ data: status });
  } catch (err: unknown) {
    logger.error({ err }, "Failed to fetch boost status");
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

router.get("/boost/my-boosts", async (req, res): Promise<void> => {
  try {
    const email = req.query.email as string;
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }
    const boosts = await storage.getMyBoosts(email);
    res.json({ data: boosts });
  } catch (err: unknown) {
    logger.error({ err }, "Failed to fetch user boosts");
    res.status(500).json({ error: "Failed to fetch boosts" });
  }
});

router.get("/boost/success", (_req, res): void => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ödeme Başarılı</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#FAF7F0;}
  .card{background:white;border-radius:20px;padding:40px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.1);}
  .icon{font-size:56px;margin-bottom:16px;}
  h1{color:#E07A35;margin:0 0 8px;}p{color:#666;margin:0 0 24px;}
  a{display:inline-block;background:#E07A35;color:white;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600;}
  </style></head><body>
  <div class="card"><div class="icon">🎉</div>
  <h1>Ödeme Başarılı!</h1>
  <p>İlanınız öne çıkarıldı. Birkaç saniye içinde aktif olacak.</p>
  <a href="javascript:window.close()">Kapat</a></div></body></html>`);
});

router.get("/boost/cancel", (_req, res): void => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>İptal Edildi</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#FAF7F0;}
  .card{background:white;border-radius:20px;padding:40px;text-align:center;}
  h1{color:#888;}a{color:#E07A35;}
  </style></head><body>
  <div class="card"><h1>Ödeme iptal edildi.</h1>
  <p><a href="javascript:window.close()">Kapat</a></p></div></body></html>`);
});

export default router;
