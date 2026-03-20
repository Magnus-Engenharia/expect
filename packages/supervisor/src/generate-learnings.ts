import { DEFAULT_AGENT_PROVIDER, LEARNINGS_MAX_EVENTS } from "./constants";
import { createAgentModel } from "./create-agent-model";
import type { BrowserRunEvent } from "./events";
import type { AgentProvider, BrowserRunReport } from "./types";

export interface GenerateLearningsOptions {
  cwd: string;
  events: BrowserRunEvent[];
  report: BrowserRunReport;
  existingLearnings?: string;
  provider?: AgentProvider;
  signal?: AbortSignal;
}

const formatEventForLearnings = (event: BrowserRunEvent): string | null => {
  switch (event.type) {
    case "run-started":
      return `run-started: ${event.title}`;
    case "step-started":
      return `step-started: ${event.stepId} ${event.title}`;
    case "step-completed":
      return `step-completed: ${event.stepId} ${event.summary}`;
    case "assertion-failed":
      return `assertion-failed: ${event.stepId} ${event.message}`;
    case "browser-log":
      return `browser-log: ${event.action} ${event.message}`;
    case "run-completed":
      return `run-completed: ${event.status} ${event.summary}`;
    default:
      return null;
  }
};

const buildLearningsPrompt = (options: GenerateLearningsOptions): string => {
  const serializedEvents = options.events
    .slice(-LEARNINGS_MAX_EVENTS)
    .map(formatEventForLearnings)
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const serializedFindings =
    options.report.findings.length > 0
      ? options.report.findings.map((finding) => `- ${finding.title}: ${finding.detail}`).join("\n")
      : "- No blocking findings recorded.";
  const serializedSteps = options.report.stepResults
    .map((stepResult) => `- ${stepResult.status}: ${stepResult.title} -> ${stepResult.summary}`)
    .join("\n");

  return [
    "You maintain durable project learnings for future browser testing agents.",
    "Update the learnings using the latest run.",
    "",
    "Keep only repo-specific guidance that improves future run success, speed, and setup.",
    "Good learnings include:",
    "- Authentication or session setup requirements",
    "- Reliable starting URLs or entry points",
    "- Required seed data or project creation steps",
    "- UI areas where the browser agent commonly gets stuck and how to recover",
    "- Stable navigation shortcuts or interaction patterns",
    "",
    "Do not include:",
    "- One-off assertions from this specific test",
    "- Bug findings or regressions unless they imply a durable setup/navigation constraint",
    "- Step-by-step flows that belong in saved flows instead",
    "- Generic advice that would apply to any repo",
    "",
    "Return markdown only.",
    "Use this exact structure: a heading `# Project Learnings` followed by concise `- ` bullets.",
    "Keep the total list short and deduplicated.",
    "",
    "Existing learnings:",
    options.existingLearnings?.trim() || "No learnings yet.",
    "",
    "Latest run report:",
    `Title: ${options.report.title}`,
    `Status: ${options.report.status}`,
    `Summary: ${options.report.summary}`,
    "",
    "Step results:",
    serializedSteps,
    "",
    "Findings:",
    serializedFindings,
    "",
    "Selected run events:",
    serializedEvents || "No events recorded.",
  ].join("\n");
};

export const generateLearnings = async (options: GenerateLearningsOptions): Promise<string> => {
  const provider = options.provider ?? DEFAULT_AGENT_PROVIDER;
  const model = createAgentModel(provider, {
    cwd: options.cwd,
    effort: "low",
    maxTurns: 1,
    tools: [],
  });

  const response = await model.doGenerate({
    abortSignal: options.signal,
    prompt: [
      {
        role: "user",
        content: [{ type: "text", text: buildLearningsPrompt(options) }],
      },
    ],
  });

  const text = response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text.trim())
    .join("\n")
    .trim();

  return text || "# Project Learnings\n\n- No durable learnings recorded yet.";
};
