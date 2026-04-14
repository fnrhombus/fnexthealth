import * as vscode from "vscode";
import { fetchMarketplaceData } from "./marketplace.js";
import { scoreExtension, computeAudit } from "./scoring.js";
import type { ExtensionInfo, AuditResult } from "./types.js";

/** Gather local extension data from VS Code. */
function getLocalExtensions(): ExtensionInfo[] {
  return vscode.extensions.all
    .filter((ext) => !ext.id.startsWith("vscode."))
    .map((ext) => ({
      id: ext.id,
      displayName:
        ext.packageJSON?.displayName ?? ext.id.split(".").pop() ?? ext.id,
      version: ext.packageJSON?.version ?? "unknown",
      description: ext.packageJSON?.description ?? "",
      isBuiltIn: ext.packageJSON?.isBuiltin === true,
      marketplace: null,
    }));
}

/**
 * Run a full health audit of all installed extensions.
 * Queries the marketplace API for supplemental data,
 * then scores each extension.
 */
export async function runAudit(
  progress?: vscode.Progress<{ message?: string; increment?: number }>
): Promise<AuditResult> {
  progress?.report({ message: "Gathering installed extensions..." });
  const localExtensions = getLocalExtensions();

  progress?.report({
    message: `Querying marketplace for ${localExtensions.length} extensions...`,
    increment: 20,
  });

  const extensionIds = localExtensions.map((e) => e.id);
  const marketplaceData = await fetchMarketplaceData(extensionIds);

  progress?.report({ message: "Computing health scores...", increment: 60 });

  // Merge marketplace data into local extension info
  const enriched: ExtensionInfo[] = localExtensions.map((ext) => ({
    ...ext,
    marketplace: marketplaceData.get(ext.id.toLowerCase()) ?? null,
  }));

  // Score each extension
  const healthResults = enriched.map((ext) => scoreExtension(ext));

  progress?.report({ message: "Building report...", increment: 90 });

  return computeAudit(healthResults);
}
