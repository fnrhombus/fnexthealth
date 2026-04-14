import * as vscode from "vscode";
import { runAudit } from "./audit.js";
import { showDashboard } from "./webview.js";

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  // Status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "fnexthealth.audit";
  statusBarItem.text = "$(shield) Health: --";
  statusBarItem.tooltip = "Click to audit extension health";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register audit command
  const auditCommand = vscode.commands.registerCommand(
    "fnexthealth.audit",
    async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Extension Health Audit",
          cancellable: false,
        },
        async (progress) => {
          try {
            const audit = await runAudit(progress);
            statusBarItem.text = `$(shield) Health: ${audit.overallScore}/100`;
            showDashboard(context, audit);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Unknown error";
            vscode.window.showErrorMessage(
              `Extension health audit failed: ${message}`
            );
          }
        }
      );
    }
  );
  context.subscriptions.push(auditCommand);

  // Optional: run a background check on startup
  runStartupCheck(context);
}

async function runStartupCheck(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    const audit = await runAudit();
    statusBarItem.text = `$(shield) Health: ${audit.overallScore}/100`;

    if (audit.critical.length > 0) {
      const action = await vscode.window.showWarningMessage(
        `Extension Health: ${audit.critical.length} critical issue${audit.critical.length === 1 ? "" : "s"} found.`,
        "View Dashboard"
      );

      if (action === "View Dashboard") {
        showDashboard(context, audit);
      }
    }
  } catch {
    // Startup check is best-effort -- don't bother the user
  }
}

export function deactivate(): void {
  // Cleanup handled by disposables
}
