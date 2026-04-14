# fnexthealth

**Audit your extensions before they audit your secrets.**

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/fnrhombus.fnexthealth)](https://marketplace.visualstudio.com/items?itemName=fnrhombus.fnexthealth)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

```
Extension Health Audit -- Score: 73/100

  3 issues found

  old-extension v1.2.3 -- Last updated: Jan 2023 (3 years ago)
     Rating: 2.1/5 (12 reviews) - 4,200 installs
     -30: Not updated in over 2 years  -20: Low average rating (2.1/5)

  some-ext v2.0.0 -- Last updated: Mar 2025 (1 year ago)
     Rating: 3.2/5 (8 reviews) - 15,000 installs
     -15: Not updated in over 1 year  -10: Below-average rating (3.2/5)

  niche-tool v0.9.0 -- Only 3 reviews
     Rating: 4.5/5 (3 reviews) - 800 installs
     -10: Few reviews  -5: Low install count

  47 extensions are healthy
```

## The problem

In 2025-2026, VS Code extension security scandals exposed how vulnerable your editor really is. Over 500 extensions were caught leaking secrets. Malicious AI-themed extensions racked up 1.5 million installs before anyone noticed. Extensions run with the same permissions as VS Code itself -- they can read your files, access your terminal, and phone home to any server.

Meanwhile, you have extensions installed from 3 years ago that you forgot about. Their maintainers moved on. Nobody's reviewing their dependencies. They're still running every time you open your editor.

## What it checks

| Risk factor | What it means |
|---|---|
| **Staleness** | Not updated in over 1 or 2 years -- the maintainer may have abandoned it |
| **Low ratings** | Average rating below 3.5 out of 5 |
| **Few reviews** | Fewer than 5 ratings -- not enough community signal |
| **Deprecation** | Marked as deprecated by the publisher |
| **Low installs** | Fewer than 1,000 installs -- niche extension with less scrutiny |

## How to use

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **"Audit Extension Health"**
3. Review the dashboard

The status bar shows your current score. Click it to re-run the audit.

On startup, the extension quietly checks your extensions and shows a notification only if critical issues are found.

## The score

Each extension starts at 100 and loses points for each risk factor. Your overall score is the average across all extensions.

> **My extension health score is 73/100**

Share it. Compare it. Fix it.

## Support

If this extension saved you from a sketchy extension, consider supporting development:

- [GitHub Sponsors](https://github.com/sponsors/fnrhombus)
- [Buy Me a Coffee](https://buymeacoffee.com/fnrhombus)

## License

[MIT](LICENSE)
