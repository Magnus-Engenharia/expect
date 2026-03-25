# Workflow Integration Brainstorm

How to make Expect native to a developer's workflow — not a separate step, but an embedded part of how code gets written, verified, and shipped.

## Integration Points

### Git Subcommand — `git expect`

Custom git subcommand that feels native to existing muscle memory.

- `git expect` — run against current unstaged diff
- `git expect main..HEAD` — run against branch diff
- `git expect --stake` — auto-push if passes, abort if fails

### Git Hooks

- **post-commit**: diff and suggest a test plan after every commit. User accepts/dismisses inline.
- **pre-push**: hard gate. "You changed auth flow, Expect found a regression, blocking push."
- Downside: hooks are local-only, fragile, users disable them.

### MCP Server

Expect as an MCP tool any agent (Claude Code, Cursor, Codex) can call:

```
expect.verify({ description: "login flow works after password validation change" })
```

Agents can call Expect mid-task, not just at the end. "Let me check if this works before I move on to the next file." Highest leverage because it works across all agents.

### Claude Code Skill / Slash Command

`/expect` that agents invoke naturally. Agent already knows what it changed and why — can generate a targeted test plan without diffing.

### Cursor/Windsurf Rules Injection

Ship `.cursor/rules` and `.windsurfrules` files that tell those agents: "After making browser-facing changes, call Expect MCP to verify." Agents start using Expect without the developer configuring anything. Same for `.claude/settings.json` — Expect auto-registers itself.

### GitHub PR Check + Reviewer Persona

Not just a CI check — Expect leaves review comments on the PR as a GitHub user. "I clicked through the signup flow and the confirmation email link 404s. Here's the recording." Feels like a team member, not a bot. Can request changes, blocking merge.

### Slack/Discord Bot

Lurks in deploy channels. When someone posts a deploy or PR link, Expect bot picks it up, runs tests against the preview URL, replies in-thread with results + recording GIF. Zero developer setup.

### Preview URL Auto-Detection

Detect Vercel/Netlify preview deploys from git metadata or CI env vars. Every preview deploy auto-gets a Expect run. No config — `expect.config.ts` just has `previewUrl: "auto"` and it figures it out from the Vercel API.

### `package.json` Test Script Replacement

`"test": "expect"` — when someone runs `pnpm test` or CI runs the test step, Expect executes. Replaces the concept of a test suite with "describe what should work and Expect verifies it live."

## Adversarial Positioning Against Browser-Use Tools

Core insight: agents currently use generic browser tools (Playwright MCP, chrome tools) to verify work. Expect should replace that default.

### Why Expect > Raw Browser Use

- Raw browser use is exploratory and unstructured — agent clicks around hoping things work
- Expect is adversarial and plan-driven — tries to break things, not just confirm they render
- Expect has session recordings (proof)
- Expect has cookies/auth state (tests the real app, not a logged-out shell)

### Expect as the Agent's Browser

Instead of competing with browser-use tools, BE the browser tool. Agents that need to look at a webpage route through Expect. Expect adds adversarial assertions on top of every navigation. The agent thinks it's just browsing; Expect is silently building a regression suite from the agent's actions.

### Agent Self-Doubt Hook

Hook into the agent's "I'm done" moment. When an agent says "I've completed the task," Expect intercepts and says "prove it." The agent can't mark done until Expect passes.

Implementation: a Claude Code hook on `assistant_response` that detects task-completion language and injects a Expect run before the response reaches the user.

### Reverse Integration — Expect Calls the Agent

Expect finds a bug → opens an issue or sends a message back to the coding agent: "The change you made broke X, here's the recording, fix it." Closes the loop without the human.

Agent writes code → Expect finds regression → Expect tells agent → agent fixes → Expect re-verifies. Human only sees the final result.

## Passive/Ambient Modes

### `expect watch` — Continuous Background Daemon

Runs like `tsc --watch`. Every time the dev server hot-reloads, Expect re-runs the relevant subset of its last test plan against the running app. Persistent terminal pane showing green/red.

### Editor Gutter Annotations

Expect watches the git diff and shows ghost text in the gutter: "this change affects the checkout flow — untested." Disappears once Expect has verified it. Like a type error but for behavioral coverage.

## Spec-Driven Testing

### `expect init` — Living Spec Generation

Scans the app, generates `expect.plan.md` describing all flows it can detect. Lives in the repo. Developers edit it like a spec doc. Expect executes it. The spec IS the test suite. Agents can also edit the spec when they add features.

## Social / Adoption Mechanics

### Expect Badge on PRs

Like a coverage badge but for browser verification. PRs without a Expect run show "unverified." Teams start requiring it culturally before it's enforced technically.

```
[![Expect](https://expect.dev/badge/repo/pr/123)](link-to-recording)
```

### Free Local, Metered CI

Free locally (drives bottom-up adoption), metered "Expect minutes" in CI (monetization). Developers adopt individually, teams pay when it becomes infrastructure.

---

## Trojan Horse Integrations

### `expect proxy` — Local Reverse Proxy With Built-In Verification

Run `expect proxy 3000` and it sits in front of your dev server on port 3001. Every page you visit manually gets recorded. When you're done, Expect says "I saw you test these 4 flows — want me to replay them after your next change?" Turns manual QA into automated regression for free. Developer doesn't change behavior at all.

### Browser Extension That Learns

Chrome extension that watches you QA your own app manually. Records your clicks, scrolls, assertions (did you inspect an element? check a value?). Exports a Expect plan from your real behavior. "I noticed you always check the cart total after adding an item — want me to keep checking that?"

### `expect adopt` — Wrap Existing Playwright/Cypress Tests

Don't ask teams to rewrite tests. `expect adopt ./e2e/` reads existing Playwright/Cypress test files, converts them into Expect plans, and runs them through Expect's adversarial engine. Migration cost = one command. Now their existing tests also get session recordings, auth injection, and adversarial coverage.

### LSP Server — Expect as a Language Feature

Expect registers as an LSP. When you hover over a route handler or component, it shows "Last verified: 2 hours ago" or "Never tested." Provides code actions: "Verify this endpoint" directly from your editor. Feels like TypeScript errors but for runtime behavior.

## Agentic Workflow Patterns

### Expect as CI Gatekeeper With Agency

Not a dumb pass/fail check. Expect fails a PR → reads the diff → writes a comment explaining exactly what broke and why → suggests a fix → optionally opens a follow-up PR with the fix. The developer's job becomes reviewing Expect's fix, not debugging the failure.

### Bouncer Mode — Agent Can't Deploy Without Expect

Integration with deployment tools (Vercel, Railway, Fly). Expect registers as a deployment check. The agent or developer triggers a deploy → Expect runs against the preview → blocks or allows promotion to production. Deploy button is grayed out until Expect says go.

### `expect bisect` — Automated Bug Bisection

Like `git bisect` but with browser verification. "This flow is broken." Expect binary-searches through recent commits, running browser tests at each one, finds the exact commit that broke it. Returns: "Commit abc123 broke checkout — here's the recording of before and after."

### Pair Programming Mode

Expect runs alongside an agent session in real-time. As the agent writes code, Expect continuously pokes at the running app in a second browser. If something breaks mid-session, Expect interrupts: "Hey, that last change broke the sidebar nav." The agent gets feedback before it finishes, not after.

### Multi-Agent Review Panel

Expect spawns multiple adversarial agents with different personas: "angry user who rage-clicks," "user on slow 3G," "user who opens 50 tabs," "user who navigates only with keyboard." Each persona generates a different test plan. PR gets a panel of reviews from different simulated users.

## Developer Experience Tricks

### `expect demo` — Generate Shareable GIFs/Videos From Plans

Run `expect demo signup-flow` and it executes the test plan while recording a polished screen recording. Output: a GIF or MP4 you can paste into a PR description, Slack message, or docs page. Testing becomes documentation. "Here's proof the feature works" is also "here's what the feature looks like."

### `expect story` — Storybook but Live

Instead of static component stories, Expect plans describe user journeys through real pages. `expect story` serves a local gallery where each "story" is a playable recording of a verified flow. Product managers browse these instead of reading test output.

### `expect diff` — Visual Diff Between Branches

Run `expect diff main` and Expect executes the same plan against both branches, then generates a visual side-by-side diff of the recordings. See exactly what changed in the UI — not in the code, in the actual rendered experience.

### Error Replay as Bug Reports

When Expect finds a failure, it exports a self-contained replay file (rrweb recording + network log + console output + DOM snapshot). Attach to a GitHub issue. The developer opens it and sees exactly what happened — no "steps to reproduce" needed.

## Unconventional Triggers

### Cron-Based Smoke Tests

`expect cron "0 */6 * * *" --plan smoke.md` — run your smoke test plan every 6 hours against production. Not CI-triggered, time-triggered. Catches regressions from config changes, third-party API breakage, expired tokens, CDN issues — things no commit triggers.

### Webhook Receiver

`expect listen --port 9999` — accepts webhooks from anywhere. Stripe sends a webhook when a payment config changes? Expect runs the checkout flow. LaunchDarkly flips a flag? Expect runs the affected flows. Database migration completes? Expect verifies the app still works.

### On Dependency Update

Hook into Renovate/Dependabot. When a dependency PR is opened, Expect runs against it. "React 19.1 just got bumped — does your app still work?" Most dependency breakage is visual or behavioral, not type-level. Expect catches what `tsc` misses.

### On Error Spike (Observability Integration)

Connect to Sentry/Datadog. When error rate spikes on a specific page, Expect auto-runs verification against that page. "Sentry reports 50 errors on /checkout in the last 10 minutes — running Expect now." Bridges observability and testing.

## Network Effect / Viral Ideas

### Expect Plans as a Community Registry

`expect install @expect-run/stripe-checkout` — community-contributed test plans for common integrations. Someone already wrote the adversarial plan for Stripe Checkout, Auth0 login, Twilio SMS verification. You install it and Expect adapts it to your app's selectors.

### `expect challenge` — Competitive QA

Developer A writes a feature. Developer B writes a Expect plan trying to break it. Gamified: "Your plan found 3 bugs in the checkout rewrite." Leaderboard of who writes the best adversarial plans. Makes QA fun instead of a chore.

### Expect Report as a Customer Artifact

B2B SaaS teams run `expect report` and generate a polished PDF/HTML report: "Here are the 47 flows we verified this sprint, with recordings." Ship to enterprise customers as proof of quality. Testing output becomes a sales tool.

## Stealth/Zero-Config Approaches

### `npx expect` — Zero Install

No `npm install`, no config file, no setup. `npx expect` in any repo and it works. Detects the framework (Next.js, Vite, Remix), finds the dev server command, starts it, scans the app, generates a plan, runs it. One command, zero config, first run in under 30 seconds.

### Git Clone Hook

`expect clone https://github.com/org/repo` — clones a repo, installs deps, starts the dev server, runs Expect. Used for: onboarding ("does this repo even work?"), evaluating open source projects, auditing vendor code. First experience with a codebase is Expect telling you whether it works.

### `expect monitor <url>` — Production Canary

Point Expect at a production URL. No repo needed. It crawls, builds a plan from what it discovers, runs it periodically. Catch production issues for apps you don't own or have source access to. Monitor competitor features, vendor dashboards, internal tools nobody maintains.
