import { describe, expect, it } from "vite-plus/test";
import type { BrowserFlowPlan, BrowserRunEvent } from "@browser-tester/supervisor";
import { deriveTestingState } from "./derive-testing-state.js";

const plan: BrowserFlowPlan = {
  title: "Regression plan",
  rationale: "Verify the changed flow still works.",
  targetSummary: "Check the browser flow.",
  userInstruction: "Run the flow.",
  assumptions: [],
  riskAreas: [],
  targetUrls: [],
  cookieSync: {
    required: false,
    reason: "No stored session is required.",
  },
  steps: [
    {
      id: "step-1",
      title: "Open the page",
      instruction: "Open the page.",
      expectedOutcome: "The page loads.",
      routeHint: "/",
      changedFileEvidence: [],
    },
    {
      id: "step-2",
      title: "Submit the form",
      instruction: "Submit the form.",
      expectedOutcome: "The form submits.",
      routeHint: "/submit",
      changedFileEvidence: [],
    },
  ],
};

describe("deriveTestingState", () => {
  it("does not mark a pending step active before it starts", () => {
    const state = deriveTestingState(plan, [], "compact");

    expect(state.steps).toEqual([
      {
        stepId: "step-1",
        status: "pending",
        label: "Open the page",
      },
      {
        stepId: "step-2",
        status: "pending",
        label: "Submit the form",
      },
    ]);
    expect(state.activeStepStartedAt).toBeNull();
  });

  it("keeps only the latest started step active", () => {
    const events: BrowserRunEvent[] = [
      {
        type: "step-started",
        timestamp: 1_000,
        stepId: "step-1",
        title: "Open the page",
      },
      {
        type: "step-started",
        timestamp: 2_000,
        stepId: "step-2",
        title: "Submit the form",
      },
    ];

    const state = deriveTestingState(plan, events, "compact");

    expect(state.steps).toEqual([
      {
        stepId: "step-1",
        status: "pending",
        label: "Open the page",
      },
      {
        stepId: "step-2",
        status: "active",
        label: "Submit the form",
      },
    ]);
    expect(state.activeStepStartedAt).toBe(2_000);
  });

  it("clears the active timer when a step finishes", () => {
    const events: BrowserRunEvent[] = [
      {
        type: "step-started",
        timestamp: 1_000,
        stepId: "step-1",
        title: "Open the page",
      },
      {
        type: "step-completed",
        timestamp: 2_000,
        stepId: "step-1",
        summary: "Opened the page",
      },
    ];

    const state = deriveTestingState(plan, events, "compact");

    expect(state.steps).toEqual([
      {
        stepId: "step-1",
        status: "passed",
        label: "Opened the page",
      },
      {
        stepId: "step-2",
        status: "pending",
        label: "Submit the form",
      },
    ]);
    expect(state.activeStepStartedAt).toBeNull();
  });
});
