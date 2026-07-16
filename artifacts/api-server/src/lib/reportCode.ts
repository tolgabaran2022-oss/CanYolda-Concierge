/**
 * Report Code Generator
 * Format: CY-YYYY-NNNNNN (e.g. CY-2026-000042)
 * CY = CanYoldaşı prefix, ensuring global uniqueness with year partition.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function generateReportCode(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM stray_animals
    WHERE report_code LIKE ${"CY-" + year + "-%"}
  `);
  const rows = (result as unknown as { rows: Array<{ cnt: number }> }).rows;
  const seq = (rows[0]?.cnt ?? 0) + 1;
  return `CY-${year}-${String(seq).padStart(6, "0")}`;
}
