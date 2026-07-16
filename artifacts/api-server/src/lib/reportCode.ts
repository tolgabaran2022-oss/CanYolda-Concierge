/**
 * Report Code Generator
 * Format: CY-YYYY-NNNNNN (e.g. CY-2026-000042)
 * CY = CanYoldaşı prefix, ensuring global uniqueness with year partition.
 *
 * Uses MAX(RIGHT(code,6)) to avoid duplicates after deletions.
 * RIGHT(col, 6) avoids the PostgreSQL SUBSTRING(col FROM $n) overload ambiguity
 * that occurs when Drizzle parameterizes the integer position.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function generateReportCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CY-${year}-`;
  const result = await db.execute(sql`
    SELECT COALESCE(
      MAX(CAST(RIGHT(report_code, 6) AS INTEGER)),
      0
    ) + 1 AS seq
    FROM stray_animals
    WHERE report_code LIKE ${prefix + "%"}
      AND LENGTH(report_code) = 14
  `);
  const rows = (result as unknown as { rows: Array<{ seq: number }> }).rows;
  const seq = rows[0]?.seq ?? 1;
  return `${prefix}${String(seq).padStart(6, "0")}`;
}
