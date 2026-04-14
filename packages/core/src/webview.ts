import * as vscode from "vscode";
import type { AuditResult, ExtensionHealth } from "./types.js";

function severityIcon(score: number): string {
  if (score < 50) return "\u{1F534}";
  if (score < 80) return "\u{1F7E1}";
  return "\u2705";
}

function severityClass(score: number): string {
  if (score < 50) return "critical";
  if (score < 80) return "warning";
  return "healthy";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  return remainingMonths > 0
    ? `${years}y ${remainingMonths}mo ago`
    : `${years} years ago`;
}

function renderExtensionCard(health: ExtensionHealth): string {
  const { extension: ext, score, penalties } = health;
  const mp = ext.marketplace;
  const cls = severityClass(score);
  const icon = severityIcon(score);

  const penaltyList = penalties
    .map((p) => `<span class="penalty">-${p.points}: ${p.reason}</span>`)
    .join("");

  const marketplaceInfo = mp
    ? `<div class="meta">
        Last updated: ${formatDate(mp.lastUpdated)} (${timeAgo(mp.lastUpdated)})
        &middot; Rating: ${mp.averageRating > 0 ? `${mp.averageRating.toFixed(1)}/5 (${mp.ratingCount} reviews)` : "No ratings"}
        &middot; ${mp.installCount.toLocaleString()} installs
      </div>`
    : `<div class="meta">No marketplace data (built-in or side-loaded)</div>`;

  return `
    <div class="ext-card ${cls}">
      <div class="ext-header">
        <span class="icon">${icon}</span>
        <strong>${ext.displayName}</strong>
        <span class="version">v${ext.version}</span>
        <span class="score">${score}/100</span>
      </div>
      ${marketplaceInfo}
      ${penaltyList ? `<div class="penalties">${penaltyList}</div>` : ""}
      <div class="actions">
        <button onclick="postMessage('disable', '${ext.id}')">Disable</button>
        <button onclick="postMessage('uninstall', '${ext.id}')">Uninstall</button>
      </div>
    </div>`;
}

function getHtml(audit: AuditResult, nonce: string): string {
  const issueCount = audit.critical.length + audit.warnings.length;

  const criticalCards = [...audit.critical]
    .sort((a, b) => a.score - b.score)
    .map(renderExtensionCard)
    .join("");

  const warningCards = [...audit.warnings]
    .sort((a, b) => a.score - b.score)
    .map(renderExtensionCard)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extension Health Audit</title>
  <style nonce="${nonce}">
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --border: var(--vscode-panel-border);
      --red: #e74c3c;
      --yellow: #f39c12;
      --green: #27ae60;
    }
    body {
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      color: var(--fg);
      background: var(--bg);
      padding: 20px;
      line-height: 1.6;
    }
    h1 { margin: 0 0 4px; font-size: 1.5em; }
    .summary { font-size: 1.1em; margin-bottom: 20px; opacity: 0.8; }
    .score-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-weight: bold;
    }
    .score-badge.critical { background: var(--red); color: white; }
    .score-badge.warning { background: var(--yellow); color: black; }
    .score-badge.healthy { background: var(--green); color: white; }
    .ext-card {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 10px;
      border-left: 4px solid transparent;
    }
    .ext-card.critical { border-left-color: var(--red); }
    .ext-card.warning { border-left-color: var(--yellow); }
    .ext-card.healthy { border-left-color: var(--green); }
    .ext-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .ext-header .icon { font-size: 1.2em; }
    .ext-header .version { opacity: 0.6; font-size: 0.9em; }
    .ext-header .score { margin-left: auto; font-weight: bold; opacity: 0.7; }
    .meta { font-size: 0.85em; opacity: 0.7; margin-top: 4px; }
    .penalties { margin-top: 6px; }
    .penalty {
      display: inline-block;
      font-size: 0.8em;
      background: rgba(231, 76, 60, 0.15);
      color: var(--red);
      padding: 2px 8px;
      border-radius: 3px;
      margin: 2px 4px 2px 0;
    }
    .actions { margin-top: 8px; }
    .actions button {
      background: transparent;
      color: var(--vscode-button-foreground, var(--fg));
      border: 1px solid var(--border);
      padding: 4px 12px;
      border-radius: 3px;
      cursor: pointer;
      margin-right: 6px;
      font-size: 0.85em;
    }
    .actions button:hover {
      background: var(--vscode-button-hoverBackground, rgba(255,255,255,0.1));
    }
    .section-title {
      font-size: 1.1em;
      font-weight: 600;
      margin: 20px 0 10px;
    }
    .healthy-summary {
      padding: 12px 16px;
      border: 1px solid var(--border);
      border-left: 4px solid var(--green);
      border-radius: 6px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <h1>Extension Health Audit &mdash;
    <span class="score-badge ${severityClass(audit.overallScore)}">
      Score: ${audit.overallScore}/100
    </span>
  </h1>
  <div class="summary">
    ${issueCount > 0 ? `\u26A0\uFE0F ${issueCount} issue${issueCount === 1 ? "" : "s"} found` : "\u2705 All extensions are healthy"}
    &middot; ${audit.extensions.length} extensions scanned
  </div>

  ${audit.critical.length > 0 ? `<div class="section-title">\u{1F534} Critical (${audit.critical.length})</div>${criticalCards}` : ""}
  ${audit.warnings.length > 0 ? `<div class="section-title">\u{1F7E1} Warnings (${audit.warnings.length})</div>${warningCards}` : ""}

  <div class="healthy-summary">
    \u2705 ${audit.healthy.length} extension${audit.healthy.length === 1 ? " is" : "s are"} healthy
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    function postMessage(action, extensionId) {
      vscode.postMessage({ command: action, extensionId });
    }
  </script>
</body>
</html>`;
}

function generateNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Create and show the audit dashboard webview. */
export function showDashboard(
  context: vscode.ExtensionContext,
  audit: AuditResult
): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    "fnexthealth.dashboard",
    `Extension Health: ${audit.overallScore}/100`,
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  const nonce = generateNonce();
  panel.webview.html = getHtml(audit, nonce);

  panel.webview.onDidReceiveMessage(
    async (message: { command: string; extensionId: string }) => {
      switch (message.command) {
        case "disable":
          await vscode.commands.executeCommand(
            "workbench.extensions.disableExtension",
            message.extensionId
          );
          vscode.window.showInformationMessage(
            `Disabled: ${message.extensionId}`
          );
          break;
        case "uninstall":
          await vscode.commands.executeCommand(
            "workbench.extensions.uninstallExtension",
            message.extensionId
          );
          vscode.window.showInformationMessage(
            `Uninstalled: ${message.extensionId}`
          );
          break;
      }
    },
    undefined,
    context.subscriptions
  );

  return panel;
}
