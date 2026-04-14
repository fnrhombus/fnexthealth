/** Raw data returned from the VS Code Marketplace API. */
export interface MarketplaceExtensionData {
  readonly extensionId: string;
  readonly extensionName: string;
  readonly publisherName: string;
  readonly displayName: string;
  readonly lastUpdated: string;
  readonly publishedDate: string;
  readonly installCount: number;
  readonly averageRating: number;
  readonly ratingCount: number;
  readonly isDeprecated: boolean;
}

/** Combined local + marketplace data for a single extension. */
export interface ExtensionInfo {
  readonly id: string;
  readonly displayName: string;
  readonly version: string;
  readonly description: string;
  readonly isBuiltIn: boolean;
  readonly marketplace: MarketplaceExtensionData | null;
}

/** Health assessment for a single extension. */
export interface ExtensionHealth {
  readonly extension: ExtensionInfo;
  readonly score: number;
  readonly penalties: readonly Penalty[];
}

export interface Penalty {
  readonly reason: string;
  readonly points: number;
}

/** Overall audit result. */
export interface AuditResult {
  readonly overallScore: number;
  readonly extensions: readonly ExtensionHealth[];
  readonly healthy: readonly ExtensionHealth[];
  readonly warnings: readonly ExtensionHealth[];
  readonly critical: readonly ExtensionHealth[];
  readonly timestamp: Date;
}
