---
name: testie-skill
description: Use the testie CLI to run AI-powered browser tests against code changes without the interactive TUI. Covers all commands, flags, environment variables, saved flows, and common headless usage patterns.
license: MIT
metadata:
  author: millionco
  version: "1.1.0"
---

# Testie CLI (Headless Mode)

Testie is an AI-powered browser testing tool that tests your code changes in a real browser. This skill covers using testie via CLI commands — no interactive TUI required.

## When to Use

Use testie from the command line when:

- Running browser tests from an AI agent (Claude Code, Cursor, Codex, etc.)
- Automating tests in CI/CD pipelines
- Scripting browser test runs in non-interactive environments
- Piping testie output to other tools

## Installation

```bash
npm install -g @browser-tester/cli
```

## Headless Detection

Testie automatically runs in headless (non-TUI) mode when:

- Running inside an AI agent (detected via `CI`, `CLAUDECODE`, `CURSOR_AGENT`, `CODEX_CI`, `OPENCODE`, `AMP_HOME`, or `AMI` environment variables)
- `stdin` is not a TTY (e.g., piped input, CI runners)

No special flags needed — testie detects the environment and skips the TUI.

## Commands

### Test unstaged changes (default)

```bash
testie
```

When run headless with no subcommand, testie auto-detects the best scope:

- If there are unstaged changes → tests those
- If on a feature branch with commits → tests the branch diff
- If on main with no changes → exits

Equivalent explicit command:

```bash
testie unstaged
```

### Test entire branch diff

```bash
testie branch
```

Compares the current branch against `main` (or the detected main branch) and tests all changes.

### Test a specific commit

```bash
testie commit <hash>
```

Tests the changes introduced by a specific commit. The hash can be a full SHA or short hash.

```bash
testie commit abc1234
```

### Check prerequisites

```bash
testie setup
```

Checks that all prerequisites are met: Chromium browser, API key, git repo, and dev server. Outputs JSON in headless mode.

Auto-install missing prerequisites:

```bash
testie setup --install
```

### Agent entry point (recommended for AI agents)

```bash
testie agent -m "Test the signup flow"
```

Single command that combines setup checks + test execution + JSON output. This is the recommended way to run testie from an AI agent.

```bash
testie agent -m "Verify all changes" --install --scope branch
```

Flags specific to `testie agent`:

| Flag | Description |
| --- | --- |
| `--install` | Auto-install missing prerequisites before testing |
| `--scope <scope>` | Test scope: `unstaged`, `branch`, or `changes` (default: `changes`) |

## Options

| Flag                          | Description                                        |
| ----------------------------- | -------------------------------------------------- |
| `-m, --message <instruction>` | Natural language instruction for the browser agent |
| `-f, --flow <slug>`           | Reuse a previously saved flow by its slug          |
| `-y, --yes`                   | Skip plan review and auto-run after planning       |
| `--json`                      | Output structured JSON to stdout                   |
| `--base-url <url>`            | Override the browser base URL                      |
| `--headed`                    | Run browser in headed (visible) mode               |
| `--cookies`                   | Enable cookie sync from your browser               |
| `--no-cookies`                | Disable cookie sync                                |
| `-v, --version`               | Print version                                      |

## Environment Variables

| Variable                  | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| `BROWSER_TESTER_BASE_URL` | Default base URL for the browser (e.g., `http://localhost:3000`) |
| `BROWSER_TESTER_HEADED`   | `true`/`1` to run headed by default                              |
| `BROWSER_TESTER_COOKIES`  | `true`/`1` to enable cookie sync by default                      |
| `ANTHROPIC_API_KEY`       | API key for Claude (used for planning and execution)             |
| `OPENAI_API_KEY`          | API key for Codex (alternative to Claude)                        |

CLI flags override environment variables when both are set.

## Common Patterns

### Quick test with a message

```bash
testie -m "Click the login button and verify the form appears" -y
```

The `-m` flag provides the instruction. The `-y` flag skips plan review so it runs immediately.

### Test with a specific base URL

```bash
testie --base-url http://localhost:5173 -m "Add an item to the cart and check the total updates"
```

### Reuse a saved flow

```bash
testie -f login-flow
```

Saved flows are created in the TUI and stored locally. Reuse them by slug with `-f`.

### Test branch changes end-to-end

```bash
testie branch -m "Verify the new settings page renders correctly" -y
```

### Test a commit in headed mode

```bash
testie commit abc1234 --headed -m "Check the modal animation" -y
```

### Agent one-liner with JSON output

```bash
BROWSER_TESTER_BASE_URL=http://localhost:3000 testie -m "Test the signup flow end-to-end" -y --json
```

### Agent single-command (recommended)

```bash
BROWSER_TESTER_BASE_URL=http://localhost:3000 testie agent -m "Test the signup flow" --install
```

This checks prerequisites, auto-installs Chromium if missing, runs the test, and outputs JSON.

## Output Format

### Human-readable (default)

In headless mode without `--json`, testie streams structured output to stderr:

```
Starting <plan title>
→ step-1 <step title>
  ✓ step-1 <summary>
→ step-2 <step title>
  ✓ step-2 <summary>
Run passed: <summary>
```

Failed assertions appear as:

```
  ✗ step-3 <failure message>
Run failed: <summary>
```

### JSON output (`--json` or `testie agent`)

With `--json`, structured JSON is written to stdout:

```json
{
  "status": "passed",
  "title": "Test signup flow",
  "steps": [
    {
      "id": "step-1",
      "title": "Navigate to signup page",
      "status": "passed",
      "summary": "Page loaded successfully"
    },
    {
      "id": "step-2",
      "title": "Fill in form and submit",
      "status": "failed",
      "summary": "Submit button not found"
    }
  ],
  "summary": "1 of 2 steps passed",
  "screenshotPaths": [],
  "durationMs": 12340
}
```

### Setup check output (`testie setup`)

```json
{
  "ready": true,
  "checks": [
    { "name": "browser", "ok": true, "detail": "Chromium is installed" },
    { "name": "apiKey", "ok": true, "detail": "Found: ANTHROPIC_API_KEY" },
    { "name": "git", "ok": true, "detail": "Inside a git repository" },
    { "name": "devServer", "ok": true, "detail": "Dev server detected on port 3000" }
  ],
  "suggestedBaseUrl": "http://localhost:3000"
}
```

## Exit Codes

- `0` — all tests passed (or setup checks passed)
- `1` — test failure, setup failure, or error

## Tips

- Always pass `-y` when running from an agent to skip the interactive plan review step.
- Always set `BROWSER_TESTER_BASE_URL` or `--base-url` so testie knows where your app is running.
- Use `-m` to give testie a clear, specific instruction about what to test.
- Use `--json` or `testie agent` for machine-readable output that agents can parse.
- Use `testie setup` to check readiness before running tests.
- Combine subcommands with options: `testie branch -m "..." -y --base-url http://localhost:3000`.
- If a flow is reusable across runs, save it in the TUI and invoke it with `-f <slug>` for consistency.
