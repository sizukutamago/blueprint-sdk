import type { Finding, GateCounts } from "../types.js";

export function countFindings(findings: Finding[]): GateCounts {
  let p0 = 0;
  let p1 = 0;
  let p2 = 0;

  for (const f of findings) {
    switch (f.severity) {
      case "P0":
        p0++;
        break;
      case "P1":
        p1++;
        break;
      case "P2":
        p2++;
        break;
    }
  }

  return { p0, p1, p2 };
}

export interface GatePolicyOptions {
  /** P1 の許容上限（デフォルト: 1） — CLAUDE.md 仕様: P0=0 かつ P1≤1 → PASS */
  maxP1?: number;
}

export function evaluateGatePolicy(
  counts: GateCounts,
  options?: GatePolicyOptions,
): { passed: boolean; reason?: "p0_found" | "p1_exceeded" } {
  const maxP1 = options?.maxP1 ?? 1;
  if (counts.p0 > 0) {
    return { passed: false, reason: "p0_found" };
  }
  if (counts.p1 > maxP1) {
    return { passed: false, reason: "p1_exceeded" };
  }
  return { passed: true };
}
