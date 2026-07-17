import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { extractUserId } from "../lib/jwtAuth.js";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    /* Allow raster images only — SVG is intentionally blocked (stored XSS risk) */
    const ALLOWED_MIMES = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heif",
    ]);
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, GIF, WebP and HEIC images are allowed"));
    }
  },
});

router.post("/upload", (req, res, next) => {
  /* Require JWT auth before accepting the file */
  const userId = extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Giriş yapılmamış" });
    return;
  }
  next();
}, upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image provided" });
    return;
  }
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "";
  const baseUrl = domain ? `https://${domain}` : "";
  const url = `${baseUrl}/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

export default router;
