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
 * AnimalImageValidationService — abstraction layer for future AI vision providers.
 * Currently returns a stub that approves all images.
 * Replace the provider implementation to plug in OpenAI / Google Vision / Rekognition.
 */
export interface ImageValidationResult {
  isAnimalDetected: boolean;
  confidence: number;
  reason?: string;
}

export interface ImageValidationProvider {
  validate(imageUrl: string): Promise<ImageValidationResult>;
}

class StubValidationProvider implements ImageValidationProvider {
  async validate(_imageUrl: string): Promise<ImageValidationResult> {
    // Stub: always approve. Replace with AI provider when API keys are available.
    return { isAnimalDetected: true, confidence: 1.0 };
  }
}

export class AnimalImageValidationService {
  private provider: ImageValidationProvider;

  constructor(provider?: ImageValidationProvider) {
    this.provider = provider ?? new StubValidationProvider();
  }

  async validate(imageUrl: string): Promise<ImageValidationResult> {
    if (!imageUrl) return { isAnimalDetected: true, confidence: 1.0 };
    return this.provider.validate(imageUrl);
  }
}

export const imageValidationService = new AnimalImageValidationService();
