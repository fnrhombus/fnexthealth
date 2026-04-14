import type {
  ExtensionInfo,
  ExtensionHealth,
  Penalty,
  AuditResult,
} from "./types.js";

const TWO_YEARS_MS = 2 * 365.25 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Compute the health score for a single extension.
 * Pure function -- no VS Code dependency.
 */
export function scoreExtension(
  ext: ExtensionInfo,
  now: Date = new Date()
): ExtensionHealth {
  const penalties: Penalty[] = [];
  const mp = ext.marketplace;

  if (mp === null) {
    // Built-in or side-loaded extensions with no marketplace data get a perfect score
    return { extension: ext, score: 100, penalties: [] };
  }

  // --- Staleness ---
  const lastUpdated = new Date(mp.lastUpdated);
  const ageMs = now.getTime() - lastUpdated.getTime();

  if (ageMs > TWO_YEARS_MS) {
    penalties.push({ reason: "Not updated in over 2 years", points: 30 });
  } else if (ageMs > ONE_YEAR_MS) {
    penalties.push({ reason: "Not updated in over 1 year", points: 15 });
  }

  // --- Rating ---
  if (mp.averageRating > 0 && mp.averageRating < 3.0) {
    penalties.push({
      reason: `Low average rating (${mp.averageRating.toFixed(1)}/5)`,
      points: 20,
    });
  } else if (mp.averageRating > 0 && mp.averageRating < 3.5) {
    penalties.push({
      reason: `Below-average rating (${mp.averageRating.toFixed(1)}/5)`,
      points: 10,
    });
  }

  // --- Few reviews ---
  if (mp.ratingCount < 5) {
    penalties.push({
      reason: `Few reviews (${mp.ratingCount})`,
      points: 10,
    });
  }

  // --- Deprecated ---
  if (mp.isDeprecated) {
    penalties.push({ reason: "Marked as deprecated", points: 50 });
  }

  // --- Low installs ---
  if (mp.installCount < 1000) {
    penalties.push({
      reason: `Low install count (${mp.installCount.toLocaleString()})`,
      points: 5,
    });
  }

  const totalPenalty = penalties.reduce((sum, p) => sum + p.points, 0);
  const score = Math.max(0, 100 - totalPenalty);

  return { extension: ext, score, penalties };
}

/** Compute the overall audit from a list of extension health scores. */
export function computeAudit(
  healthResults: readonly ExtensionHealth[]
): AuditResult {
  const overallScore =
    healthResults.length > 0
      ? Math.round(
          healthResults.reduce((sum, h) => sum + h.score, 0) /
            healthResults.length
        )
      : 100;

  const critical = healthResults.filter((h) => h.score < 50);
  const warnings = healthResults.filter(
    (h) => h.score >= 50 && h.score < 80
  );
  const healthy = healthResults.filter((h) => h.score >= 80);

  return {
    overallScore,
    extensions: healthResults,
    healthy,
    warnings,
    critical,
    timestamp: new Date(),
  };
}
