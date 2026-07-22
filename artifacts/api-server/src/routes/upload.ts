import { Router, type Request, type Response, type NextFunction } from "express";
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
      cb(new Error("INVALID_MIME"));
    }
  },
});

router.post(
  "/upload",
  (req: Request, res: Response, next: NextFunction) => {
    /* Require JWT auth before accepting the file */
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Giriş yapılmamış" });
      return;
    }
    next();
  },
  upload.single("image"),
  /* Multer error handler — converts library errors to correct HTTP status codes */
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "Dosya çok büyük. Maksimum 10 MB yüklenebilir." });
        return;
      }
      res.status(400).json({ error: `Yükleme hatası: ${err.message}` });
      return;
    }
    if (err instanceof Error && err.message === "INVALID_MIME") {
      res.status(415).json({ error: "Desteklenmeyen dosya türü. Yalnızca JPEG, PNG, WebP ve HEIC kabul edilir." });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  },
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No image provided" });
      return;
    }
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "";
    const baseUrl = domain ? `https://${domain}` : "";
    const url = `${baseUrl}/api/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  }
);

export default router;
