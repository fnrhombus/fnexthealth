import type { MarketplaceExtensionData } from "./types.js";

const MARKETPLACE_URL =
  "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";

/** Maximum extensions per batch request. */
const BATCH_SIZE = 100;

interface MarketplaceResponse {
  results: Array<{
    extensions: Array<{
      extensionId: string;
      extensionName: string;
      publisher: { publisherName: string };
      displayName: string;
      versions: Array<{ lastUpdated: string }>;
      publishedDate: string;
      statistics: Array<{ statisticName: string; value: number }>;
      tags?: string[];
    }>;
  }>;
}

function extractStat(
  stats: Array<{ statisticName: string; value: number }>,
  name: string
): number {
  return stats.find((s) => s.statisticName === name)?.value ?? 0;
}

function parseExtension(
  raw: MarketplaceResponse["results"][0]["extensions"][0]
): MarketplaceExtensionData {
  const stats = raw.statistics ?? [];
  const tags = raw.tags ?? [];

  return {
    extensionId: raw.extensionId,
    extensionName: raw.extensionName,
    publisherName: raw.publisher.publisherName,
    displayName: raw.displayName,
    lastUpdated: raw.versions?.[0]?.lastUpdated ?? raw.publishedDate,
    publishedDate: raw.publishedDate,
    installCount: extractStat(stats, "install"),
    averageRating: extractStat(stats, "averagerating"),
    ratingCount: extractStat(stats, "ratingcount"),
    isDeprecated: tags.includes("__ext_deprecated"),
  };
}

/**
 * Fetch marketplace data for a batch of extension IDs.
 * IDs must be in `publisher.extensionName` format.
 */
async function fetchBatch(
  extensionIds: readonly string[]
): Promise<Map<string, MarketplaceExtensionData>> {
  const criteria = extensionIds.map((id) => ({
    filterType: 7,
    value: id,
  }));

  const body = {
    filters: [{ criteria }],
    flags: 950,
  };

  const response = await fetch(MARKETPLACE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json;api-version=6.0-preview.1",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Marketplace API returned ${response.status}: ${response.statusText}`
    );
  }

  const data = (await response.json()) as MarketplaceResponse;
  const result = new Map<string, MarketplaceExtensionData>();

  for (const group of data.results ?? []) {
    for (const ext of group.extensions ?? []) {
      const key =
        `${ext.publisher.publisherName}.${ext.extensionName}`.toLowerCase();
      result.set(key, parseExtension(ext));
    }
  }

  return result;
}

/**
 * Query the VS Code Marketplace for data on multiple extensions.
 * Automatically batches requests to stay within API limits.
 */
export async function fetchMarketplaceData(
  extensionIds: readonly string[]
): Promise<Map<string, MarketplaceExtensionData>> {
  const allResults = new Map<string, MarketplaceExtensionData>();

  // Process in batches
  for (let i = 0; i < extensionIds.length; i += BATCH_SIZE) {
    const batch = extensionIds.slice(i, i + BATCH_SIZE);
    const batchResults = await fetchBatch(batch);

    for (const [key, value] of batchResults) {
      allResults.set(key, value);
    }
  }

  return allResults;
}

/**
 * Parse a raw marketplace API response into structured data.
 * Exported for testing.
 */
export function parseMarketplaceResponse(
  data: MarketplaceResponse
): MarketplaceExtensionData[] {
  const results: MarketplaceExtensionData[] = [];

  for (const group of data.results ?? []) {
    for (const ext of group.extensions ?? []) {
      results.push(parseExtension(ext));
    }
  }

  return results;
}
