/**
 * Emergency Priority Score Service
 * Backend-only. Client cannot submit or modify scores.
 *
 * Abstraction layer ready for future AI provider integration:
 *   - OpenAI Vision API
 *   - Google Cloud Vision
 *   - AWS Rekognition
 * Current implementation: deterministic keyword + condition scoring.
 */

export type PriorityLevel = "critical" | "high" | "medium" | "low";

export interface PriorityResult {
  score: number;        // 0-100
  level: PriorityLevel;
  signals: string[];    // debug/audit trace
}

interface ScoringInput {
  status: string;
  animalType: string;
  notes: string;
  confirmationCount?: number;
  imageUrl?: string;    // reserved for future AI image analysis
}

/* ── Keyword dictionaries ────────────────────────────────────────────────── */
const CRITICAL_KEYWORDS = [
  "kanıyor", "kan ", "yoğun kanama", "kaza", "trafik", "ezilmiş", "ezildi",
  "bilinçsiz", "hareket edemiyor", "nefes alamıyor", "nöbet", "kasılma",
  "ölüyor", "ölmek üzere", "acil", "ambulans", "hızla", "yanıyor",
  "zehirlendi", "zehir",
];

const HIGH_KEYWORDS = [
  "yaralı", "yara", "kırık", "kırılmış", "topallıyor", "topallıyor",
  "yürüyemiyor", "ayağını kaldırıyor", "bacak", "kanat kırık",
  "aç", "açlık", "susuz", "dehidre", "çok zayıf", "iskelet gibi",
  "terk edilmiş yavru", "terk edilmiş küçük", "küçük yavru",
  "gözleri açılmıyor", "göz akıntı", "burun akıntı", "öksürüyor",
  "ishal", "kusma", "ateşi var", "ateşli",
];

const MEDIUM_KEYWORDS = [
  "zayıf", "ince", "hasta", "hasta görünüyor", "mama lazım", "yiyecek yok",
  "bakımsız", "kirli", "tüyleri dökülüyor", "uyuz", "bit", "pire",
  "korkunç görünüyor", "ürkek", "titriyor",
];

/* ── Scoring rules ────────────────────────────────────────────────────────── */
function matchKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

export function calculatePriorityScore(input: ScoringInput): PriorityResult {
  const signals: string[] = [];
  let score = 0;

  const notes = input.notes?.toLowerCase() ?? "";

  // 1. Base score from reported condition (status)
  switch (input.status) {
    case "injured":
      score += 60;
      signals.push("status:injured(+60)");
      break;
    case "hungry":
      score += 45;
      signals.push("status:hungry(+45)");
      break;
    case "unknown":
      score += 25;
      signals.push("status:unknown(+25)");
      break;
    case "healthy":
      score += 5;
      signals.push("status:healthy(+5)");
      break;
    default:
      score += 20;
      signals.push("status:other(+20)");
  }

  // 2. Critical keyword matches (each +8, max +30)
  const critMatches = matchKeywords(notes, CRITICAL_KEYWORDS);
  if (critMatches.length > 0) {
    const add = Math.min(critMatches.length * 8, 30);
    score += add;
    signals.push(`critical_keywords:${critMatches.join(",")}(+${add})`);
  }

  // 3. High-severity keyword matches (each +4, max +20)
  const highMatches = matchKeywords(notes, HIGH_KEYWORDS);
  if (highMatches.length > 0) {
    const add = Math.min(highMatches.length * 4, 20);
    score += add;
    signals.push(`high_keywords:${highMatches.join(",")}(+${add})`);
  }

  // 4. Medium keyword matches (each +2, max +10)
  const medMatches = matchKeywords(notes, MEDIUM_KEYWORDS);
  if (medMatches.length > 0) {
    const add = Math.min(medMatches.length * 2, 10);
    score += add;
    signals.push(`medium_keywords:${medMatches.join(",")}(+${add})`);
  }

  // 5. Community confirmations boost (each +2, max +10)
  const confirmations = input.confirmationCount ?? 0;
  if (confirmations > 0) {
    const add = Math.min(confirmations * 2, 10);
    score += add;
    signals.push(`confirmations:${confirmations}(+${add})`);
  }

  // 6. Animal type modifier
  if (["yavru", "küçük"].some((kw) => notes.includes(kw))) {
    score += 8;
    signals.push("young_animal(+8)");
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Map to level per spec §19
  let level: PriorityLevel;
  if (score >= 90) level = "critical";
  else if (score >= 70) level = "high";
  else if (score >= 40) level = "medium";
  else level = "low";

  return { score, level, signals };
}

/**
 * AnimalImageValidationService — abstraction layer for AI vision providers.
 *
 * CONFIGURATION (optional env vars):
 *   ANIMAL_CONFIDENCE_ACCEPT_THRESHOLD  (default 0.70)  >= → approved
 *   ANIMAL_CONFIDENCE_REVIEW_THRESHOLD  (default 0.30)  between → pending_review
 *                                                        <  → rejected
 *
 * REAL PROVIDER INTEGRATION:
 *   When a real provider is configured (e.g. OpenAI Vision, Google Cloud Vision,
 *   AWS Rekognition), instantiate it in the AnimalImageValidationService constructor
 *   by checking the relevant env var (e.g. OPENAI_API_KEY, GOOGLE_VISION_KEY).
 *   The provider must implement ImageValidationProvider and return a real
 *   AnimalImageValidationResult with meaningful confidence values.
 *
 * CURRENT STATE: no real provider configured.
 *   → StubValidationProvider returns requiresReview=true for all uploads.
 *   → All reports are added to the moderation queue until a provider is wired up.
 */

export const ANIMAL_CONFIDENCE_ACCEPT_THRESHOLD =
  parseFloat(process.env["ANIMAL_CONFIDENCE_ACCEPT_THRESHOLD"] ?? "0.70");
export const ANIMAL_CONFIDENCE_REVIEW_THRESHOLD =
  parseFloat(process.env["ANIMAL_CONFIDENCE_REVIEW_THRESHOLD"] ?? "0.30");

export type AnimalImageValidationResult = {
  isAnimalDetected: boolean;
  confidence: number;              // 0.0 – 1.0
  detectedAnimalTypes: string[];   // normalised: "cat" | "dog" | "bird" | "other" | …
  isLikelyScreenshot?: boolean;
  isLikelyScreenPhoto?: boolean;
  qualityPassed: boolean;
  rejectionReason?: string;
  requiresReview: boolean;         // true → pending_review; false + high confidence → approved/rejected
};

/** Legacy alias — kept for backward compat with existing animals.ts usage */
export type ImageValidationResult = AnimalImageValidationResult;

export interface ImageValidationProvider {
  validate(imageUrl: string): Promise<AnimalImageValidationResult>;
}

/**
 * StubValidationProvider — no real AI configured.
 * Returns requiresReview=true so every uploaded photo goes to pending_review.
 * Does NOT silently approve images.
 */
class StubValidationProvider implements ImageValidationProvider {
  async validate(_imageUrl: string): Promise<AnimalImageValidationResult> {
    return {
      isAnimalDetected: false,
      confidence: 0,
      detectedAnimalTypes: [],
      qualityPassed: true,
      requiresReview: true,
    };
  }
}

export class AnimalImageValidationService {
  private provider: ImageValidationProvider;

  constructor(provider?: ImageValidationProvider) {
    this.provider = provider ?? new StubValidationProvider();
  }

  async validate(imageUrl: string): Promise<AnimalImageValidationResult> {
    if (!imageUrl) {
      return {
        isAnimalDetected: false,
        confidence: 0,
        detectedAnimalTypes: [],
        qualityPassed: false,
        rejectionReason: "Fotoğraf URL'si boş",
        requiresReview: false,
      };
    }
    return this.provider.validate(imageUrl);
  }
}

export const imageValidationService = new AnimalImageValidationService();
