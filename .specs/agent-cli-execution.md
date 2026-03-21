# Agent CLI Execution — Design Spec

How Cursor background agents (and other AI coding agents) discover and run testie end-to-end.

---

## Problem

Today, a Cursor background agent lands in a repo and reads `AGENTS.md`. That file has code style and Effect patterns — nothing about testie. The `testie-skill` package exists but isn't wired into any agent discovery mechanism. An agent has no way to know:

1. That testie exists and what it does
2. How to install and invoke it
3. What environment setup is needed (browser, dev server, API keys)
4. How to interpret the output
5. How to feed results back into its workflow

The goal: an agent reads a file, follows the instructions, and runs a full browser test cycle — plan, execute, report — without human intervention.

---

## Current State

| Piece | Status |
|---|---|
| `AGENTS.md` / `CLAUDE.md` | Code style + Effect patterns only. No testie mention. |
| `packages/testie-skill/SKILL.md` | Good headless docs. Not wired to any agent discovery. |
| Headless mode | Works. Auto-detects non-TTY + agent env vars. |
| Structured output | Streams to stderr with `→`, `✓`, `✗` prefixes. |
| Exit codes | `0` = pass, `1` = fail. |
| `--base-url`, `-m`, `-y` flags | All work in headless mode. |
| Browser install | Must be done separately (`npx playwright install chromium`). |
| Agent API key | Required for planning (Claude/Codex). Not documented for agents. |

---

## Design Options

### Option 1: `testie setup` + Enhanced Skill File

Add a `testie setup` command that handles all prerequisites, and surface the skill file so agents find it.

**New CLI command: `testie setup`**

```bash
testie setup
```

Does:
- Checks if Playwright browsers are installed → installs chromium if missing
- Validates that `ANTHROPIC_API_KEY` (or equivalent) is available
- Detects running dev server or suggests `BROWSER_TESTER_BASE_URL`
- Prints a JSON status object to stdout:

```json
{
  "ready": true,
  "browser": "chromium",
  "baseUrl": "http://localhost:3000",
  "apiKeyPresent": true
}
```

**Wire the skill into `.cursor/rules`**

Create `.cursor/rules/testie.mdc` (Cursor's rule format) that points agents to the skill:

```markdown
---
description: Use testie to run browser tests against code changes
globs: ["**"]
alwaysApply: false
---

When asked to test changes in the browser, or when browser testing would verify your work:

1. Run `testie setup` to ensure prerequisites are met
2. Start the dev server if not already running
3. Run: `BROWSER_TESTER_BASE_URL=<url> testie -m "<what to test>" -y`
4. Parse the exit code: 0 = pass, 1 = fail
5. If tests fail, read the output and fix the issues
```

**Pros**: Minimal code changes. Leverages existing headless mode. Cursor-native discovery.
**Cons**: Agent still needs to parse unstructured stderr output. Setup is a separate step.

---

### Option 2: `testie agent` — Single Entry Point for Agents

A dedicated subcommand that wraps setup + execution + structured JSON output into one call.

```bash
testie agent --base-url http://localhost:3000 -m "Test the signup flow"
```

This command:
1. Auto-installs browser if missing (with a timeout)
2. Runs planning → execution → reporting
3. Outputs **JSON** to stdout (not the human-friendly stderr format)
4. Returns structured exit codes

**Output format:**

```json
{
  "status": "failed",
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
      "summary": "Submit button not found — selector '.btn-submit' matched 0 elements",
      "screenshot": "/tmp/testie-screenshots/step-2.png"
    }
  ],
  "summary": "1 of 2 steps passed. Signup form submit button missing.",
  "durationMs": 12340
}
```

**Pros**: Single command, machine-readable output, agents can parse JSON trivially.
**Cons**: New command to build and maintain. Duplicates some of `runHeadless`.

---

### Option 3: MCP Tool

Expose testie as an MCP tool that agents call directly through the protocol. `@browser-tester/browser` already has MCP infrastructure.

```typescript
server.tool("run-browser-test", {
  description: "Run an AI-powered browser test against code changes",
  parameters: {
    instruction: z.string().describe("What to test in the browser"),
    baseUrl: z.string().optional().describe("Dev server URL"),
    scope: z.enum(["unstaged", "branch"]).optional(),
  },
  handler: async ({ instruction, baseUrl, scope }) => {
    // orchestrate planning → execution → reporting
    // return structured result
  },
});
```

Agent invocation (via Cursor MCP integration):

```
Use the run-browser-test tool to test the signup flow at http://localhost:3000
```

**Pros**: Native agent protocol. No shell parsing. Structured input/output. Discoverable via MCP tool listing.
**Cons**: Requires MCP server to be running. More complex setup. Cursor background agents may not have MCP configured.

---

### Option 4: AGENTS.md Section + `testie --json`

Lightest touch. Add a `## Browser Testing` section to `AGENTS.md` and a `--json` flag to the existing CLI.

**AGENTS.md addition:**

```markdown
## Browser Testing with Testie

After making changes, run browser tests to verify they work:

### Prerequisites (one-time)
npx playwright install chromium

### Run tests
BROWSER_TESTER_BASE_URL=http://localhost:3000 testie -m "description of what to test" -y --json

### Output
JSON object on stdout with status, steps, and summary.
Exit code 0 = pass, 1 = fail.

### Tips
- Always set BROWSER_TESTER_BASE_URL to your dev server
- Use -m to describe what to test in plain English
- Always pass -y to skip interactive plan review
- Start your dev server before running testie
```

**`--json` flag on existing commands:**

Adds `--json` / `--output json` to `testie`, `testie unstaged`, `testie branch`. When set:
- All human output goes to stderr (already does)
- Final JSON report goes to stdout
- Same structured format as Option 2

**Pros**: Smallest change. Works with all existing commands. AGENTS.md is already read by every agent.
**Cons**: Agent still handles setup separately. Less discoverable than a dedicated command.

---

## Recommendation: Option 4 + Option 1 Elements

Combine the lightest approach with the most practical additions:

### Phase 1: Make it work (Option 4 core)

1. **Add `--json` flag** to existing headless mode
   - JSON report to stdout on completion
   - Human output stays on stderr
   - Small change — modify `runHeadless` in `apps/cli/src/utils/run-test.ts`

2. **Add browser testing section to AGENTS.md**
   - Prerequisites, invocation, output parsing
   - Right where agents already look

3. **Move testie-skill into `.cursor/rules/`**
   - Create `.cursor/rules/testie.mdc` so Cursor agents auto-discover it
   - Keep the npm-published skill for other agents

### Phase 2: Make it smooth (Option 1 elements)

4. **Add `testie setup` command**
   - Checks browser, API key, running server
   - Outputs JSON readiness status
   - Agents run this first, bail early if not ready

5. **Add `testie doctor`** (alias for `testie setup --check`)
   - Non-destructive check: just reports what's missing
   - Human-friendly output for debugging

### Phase 3: Make it native (Option 2 / Option 3)

6. **Add `testie agent` command** (or evolve `--json` into this)
   - Auto-setup + execute + JSON output in one call
   - `--auto-install-browser` flag for fully unattended runs

7. **MCP tool** (optional, if demand exists)
   - For agents that support MCP natively
   - Wraps the same orchestration as `testie agent`

---

## Implementation Details

### `--json` Flag (Phase 1)

Modify `runHeadless` to accept a `json` option. When enabled, collect all events into the `ExecutedTestPlan`, run the reporter, and `console.log(JSON.stringify(report))` at the end.

The `TestReport` schema already has the right shape — we just need to serialize it.

```typescript
interface HeadlessRunOptions {
  changesFor: ChangesFor;
  instruction: string;
  agent?: AgentBackend;
  json?: boolean;  // new
}
```

In `runHeadless`, after the executor completes:

```typescript
if (options.json) {
  const jsonReport = {
    status: report.status,
    title: testPlan.title,
    steps: report.steps.map((step) => ({
      id: step.id,
      title: step.title,
      status: step.status,
      summary: step.summary,
    })),
    summary: report.summary,
    durationMs: Date.now() - startTime,
  };
  console.log(JSON.stringify(jsonReport));
}
```

### `testie setup` (Phase 2)

New command in `apps/cli/src/index.tsx`:

```typescript
program
  .command("setup")
  .description("check and install prerequisites for browser testing")
  .action(async () => {
    const checks = await runSetupChecks();
    if (isHeadless()) {
      console.log(JSON.stringify(checks));
    } else {
      printSetupReport(checks);
    }
  });
```

Checks:
- `which chromium` / check Playwright browser registry
- `ANTHROPIC_API_KEY` in env
- Probe common ports (3000, 5173, 8080) for running dev servers
- Git repo detected

### AGENTS.md Section

```markdown
## Browser Testing

Use testie to run AI-powered browser tests against your changes.

### Setup (first time per environment)
npx playwright install chromium

### Environment
Set BROWSER_TESTER_BASE_URL to your dev server URL.
Ensure ANTHROPIC_API_KEY is set for the AI planner.

### Run
BROWSER_TESTER_BASE_URL=http://localhost:3000 testie -m "test description" -y --json

### Interpreting Results
- Exit 0: all steps passed
- Exit 1: one or more steps failed
- JSON output on stdout contains step-by-step results

### Common Patterns
# Test unstaged changes
testie -m "Verify the new button works" -y --json

# Test full branch diff
testie branch -m "Test all changes from this PR" -y --json

# With specific base URL
testie --base-url http://localhost:5173 -m "Check the form validation" -y --json
```

### `.cursor/rules/testie.mdc`

```markdown
---
description: Run browser tests with testie to verify UI changes
globs: ["**/*.tsx", "**/*.jsx", "**/*.css", "**/*.html"]
alwaysApply: false
---

When you have made UI changes and want to verify they work in a real browser:

1. Ensure the dev server is running
2. Run: BROWSER_TESTER_BASE_URL=<dev-server-url> testie -m "<what to test>" -y --json
3. If exit code is 1, read the JSON output to understand what failed
4. Fix issues and re-run
```

---

## Open Questions

1. **Should `--json` be the default in headless mode?** If stdin is not a TTY, agents are the primary consumer. Maybe JSON should be opt-out rather than opt-in.

2. **Should `testie setup` auto-install or just check?** Auto-installing chromium in agent environments is convenient but could be slow (~200MB download). Could default to check-only with `--install` flag.

3. **How should agents discover the base URL?** Options:
   - Agent sets `BROWSER_TESTER_BASE_URL` explicitly
   - `testie setup` probes common ports and suggests one
   - A `.testie.config.json` in the project root specifies it
   - `testie` reads `package.json` scripts to guess the dev server port

4. **Should testie wait for the dev server?** An agent might start the dev server and immediately run testie. A `--wait-for-server` flag (with timeout) could poll until the base URL responds.

5. **Screenshot handling for agents**: Step failures include screenshot paths. Should `testie --json` inline base64 screenshots in the JSON? Or return paths and let the agent read them?

6. **API key management**: Cursor background agents get secrets via environment variables. Should AGENTS.md document which secrets to configure in the Cursor Dashboard?

7. **Concurrency**: If an agent runs testie multiple times (e.g., test unstaged, fix, test again), should there be a lock to prevent concurrent browser sessions?
