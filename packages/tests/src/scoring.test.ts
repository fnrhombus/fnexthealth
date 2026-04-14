import { describe, it, expect } from "vitest";
// Import the pure scoring functions directly from the core package source.
// Since scoring.ts has no vscode dependency, we can import it directly.
import {
  scoreExtension,
  computeAudit,
} from "../../core/src/scoring.js";
import { parseMarketplaceResponse } from "../../core/src/marketplace.js";
import type {
  ExtensionInfo,
  MarketplaceExtensionData,
  ExtensionHealth,
} from "../../core/src/types.js";

const now = new Date("2026-04-14T00:00:00Z");

function makeExtension(
  overrides: Partial<MarketplaceExtensionData> = {}
): ExtensionInfo {
  return {
    id: "test.extension",
    displayName: "Test Extension",
    version: "1.0.0",
    description: "A test extension",
    isBuiltIn: false,
    marketplace: {
      extensionId: "abc-123",
      extensionName: "extension",
      publisherName: "test",
      displayName: "Test Extension",
      lastUpdated: "2026-03-01T00:00:00Z",
      publishedDate: "2025-01-01T00:00:00Z",
      installCount: 50000,
      averageRating: 4.5,
      ratingCount: 100,
      isDeprecated: false,
      ...overrides,
    },
  };
}

describe("scoreExtension", () => {
  it("fresh extension with good rating scores 100", () => {
    const ext = makeExtension();
    const result = scoreExtension(ext, now);
    expect(result.score).toBe(100);
    expect(result.penalties).toHaveLength(0);
  });

  it("extension not updated in 2+ years gets -30 staleness penalty", () => {
    const ext = makeExtension({
      lastUpdated: "2024-01-01T00:00:00Z", // ~2.3 years ago from our fixed "now"
    });
    const result = scoreExtension(ext, now);
    expect(result.score).toBe(70);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ points: 30, reason: expect.stringContaining("2 years") })
    );
  });

  it("extension not updated in 1-2 years gets -15 staleness penalty", () => {
    const ext = makeExtension({
      lastUpdated: "2025-03-01T00:00:00Z", // ~1.04 years ago
    });
    const result = scoreExtension(ext, now);
    expect(result.score).toBe(85);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ points: 15, reason: expect.stringContaining("1 year") })
    );
  });

  it("low average rating (<3.0) gets -20 penalty", () => {
    const ext = makeExtension({ averageRating: 2.5 });
    const result = scoreExtension(ext, now);
    expect(result.score).toBe(80);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ points: 20 })
    );
  });

  it("below-average rating (3.0-3.5) gets -10 penalty", () => {
    const ext = makeExtension({ averageRating: 3.2 });
    const result = scoreExtension(ext, now);
    expect(result.score).toBe(90);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ points: 10, reason: expect.stringContaining("Below-average") })
    );
  });

  it("few reviews (<5) gets -10 penalty", () => {
    const ext = makeExtension({ ratingCount: 3 });
    const result = scoreExtension(ext, now);
    expect(result.score).toBe(90);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ points: 10, reason: expect.stringContaining("Few reviews") })
    );
  });

  it("deprecated extension gets -50 penalty", () => {
    const ext = makeExtension({ isDeprecated: true });
    const result = scoreExtension(ext, now);
    expect(result.score).toBe(50);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ points: 50, reason: expect.stringContaining("deprecated") })
    );
  });

  it("low install count (<1000) gets -5 penalty", () => {
    const ext = makeExtension({ installCount: 500 });
    const result = scoreExtension(ext, now);
    expect(result.score).toBe(95);
    expect(result.penalties).toContainEqual(
      expect.objectContaining({ points: 5, reason: expect.stringContaining("Low install") })
    );
  });

  it("multiple penalties stack", () => {
    const ext = makeExtension({
      lastUpdated: "2023-01-01T00:00:00Z", // >2 years: -30
      averageRating: 2.0, // <3.0: -20
      ratingCount: 2, // <5: -10
      installCount: 100, // <1000: -5
    });
    const result = scoreExtension(ext, now);
    // 100 - 30 - 20 - 10 - 5 = 35
    expect(result.score).toBe(35);
    expect(result.penalties).toHaveLength(4);
  });

  it("minimum score is 0, not negative", () => {
    const ext = makeExtension({
      lastUpdated: "2023-01-01T00:00:00Z", // -30
      averageRating: 2.0, // -20
      ratingCount: 2, // -10
      installCount: 100, // -5
      isDeprecated: true, // -50
    });
    const result = scoreExtension(ext, now);
    // 100 - 30 - 20 - 10 - 5 - 50 = -15, clamped to 0
    expect(result.score).toBe(0);
  });

  it("extension with no marketplace data (built-in) scores 100", () => {
    const ext: ExtensionInfo = {
      id: "vscode.builtin",
      displayName: "Built-in Extension",
      version: "1.0.0",
      description: "A built-in extension",
      isBuiltIn: true,
      marketplace: null,
    };
    const result = scoreExtension(ext, now);
    expect(result.score).toBe(100);
    expect(result.penalties).toHaveLength(0);
  });
});

describe("computeAudit", () => {
  it("computes average of individual scores", () => {
    const results: ExtensionHealth[] = [
      { extension: makeExtension(), score: 100, penalties: [] },
      { extension: makeExtension(), score: 60, penalties: [] },
      { extension: makeExtension(), score: 80, penalties: [] },
    ];
    const audit = computeAudit(results);
    expect(audit.overallScore).toBe(80); // (100+60+80)/3 = 80
  });

  it("categorizes extensions correctly", () => {
    const results: ExtensionHealth[] = [
      { extension: makeExtension(), score: 95, penalties: [] },
      { extension: makeExtension(), score: 65, penalties: [] },
      { extension: makeExtension(), score: 30, penalties: [] },
    ];
    const audit = computeAudit(results);
    expect(audit.healthy).toHaveLength(1);
    expect(audit.warnings).toHaveLength(1);
    expect(audit.critical).toHaveLength(1);
  });

  it("returns 100 for empty extension list", () => {
    const audit = computeAudit([]);
    expect(audit.overallScore).toBe(100);
    expect(audit.extensions).toHaveLength(0);
  });

  it("rounds overall score to nearest integer", () => {
    const results: ExtensionHealth[] = [
      { extension: makeExtension(), score: 100, penalties: [] },
      { extension: makeExtension(), score: 73, penalties: [] },
    ];
    const audit = computeAudit(results);
    // (100+73)/2 = 86.5 -> 87
    expect(audit.overallScore).toBe(87);
  });
});

describe("parseMarketplaceResponse", () => {
  it("extracts relevant fields from a mock API response", () => {
    const mockResponse = {
      results: [
        {
          extensions: [
            {
              extensionId: "ext-id-1",
              extensionName: "my-extension",
              publisher: { publisherName: "testpub" },
              displayName: "My Extension",
              versions: [{ lastUpdated: "2026-01-15T00:00:00Z" }],
              publishedDate: "2024-06-01T00:00:00Z",
              statistics: [
                { statisticName: "install", value: 25000 },
                { statisticName: "averagerating", value: 4.2 },
                { statisticName: "ratingcount", value: 45 },
              ],
              tags: [],
            },
          ],
        },
      ],
    };

    const result = parseMarketplaceResponse(mockResponse);
    expect(result).toHaveLength(1);

    const ext = result[0];
    expect(ext.extensionId).toBe("ext-id-1");
    expect(ext.extensionName).toBe("my-extension");
    expect(ext.publisherName).toBe("testpub");
    expect(ext.displayName).toBe("My Extension");
    expect(ext.lastUpdated).toBe("2026-01-15T00:00:00Z");
    expect(ext.publishedDate).toBe("2024-06-01T00:00:00Z");
    expect(ext.installCount).toBe(25000);
    expect(ext.averageRating).toBe(4.2);
    expect(ext.ratingCount).toBe(45);
    expect(ext.isDeprecated).toBe(false);
  });

  it("detects deprecated extensions via tags", () => {
    const mockResponse = {
      results: [
        {
          extensions: [
            {
              extensionId: "ext-id-2",
              extensionName: "old-ext",
              publisher: { publisherName: "somepub" },
              displayName: "Old Extension",
              versions: [{ lastUpdated: "2023-01-01T00:00:00Z" }],
              publishedDate: "2020-01-01T00:00:00Z",
              statistics: [],
              tags: ["__ext_deprecated"],
            },
          ],
        },
      ],
    };

    const result = parseMarketplaceResponse(mockResponse);
    expect(result[0].isDeprecated).toBe(true);
  });

  it("handles missing statistics gracefully", () => {
    const mockResponse = {
      results: [
        {
          extensions: [
            {
              extensionId: "ext-id-3",
              extensionName: "bare-ext",
              publisher: { publisherName: "pub" },
              displayName: "Bare Extension",
              versions: [{ lastUpdated: "2025-06-01T00:00:00Z" }],
              publishedDate: "2025-01-01T00:00:00Z",
              statistics: [],
              tags: [],
            },
          ],
        },
      ],
    };

    const result = parseMarketplaceResponse(mockResponse);
    expect(result[0].installCount).toBe(0);
    expect(result[0].averageRating).toBe(0);
    expect(result[0].ratingCount).toBe(0);
  });

  it("handles empty results array", () => {
    const result = parseMarketplaceResponse({ results: [] });
    expect(result).toHaveLength(0);
  });
});
