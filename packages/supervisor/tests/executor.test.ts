import { describe, it, expect } from "vitest";
import { Option } from "effect";
import {
  ExecutedTestPlan,
  TestPlan,
  TestPlanStep,
  StepId,
  PlanId,
  ChangesFor,
  AgentText,
  AgentThinking,
  ToolCall,
  ToolResult,
  type ExecutionEvent,
} from "@browser-tester/shared/models";

const makeTestPlan = (): TestPlan =>
  new TestPlan({
    id: PlanId.makeUnsafe("plan-01"),
    title: "Test plan",
    rationale: "Testing",
    steps: [
      new TestPlanStep({
        id: StepId.makeUnsafe("step-01"),
        title: "CLI Application Startup",
        instruction: "Start the CLI",
        expectedOutcome: "CLI starts",
        routeHint: Option.none(),
        status: "pending",
        summary: Option.none(),
      }),
    ],
    changesFor: ChangesFor.makeUnsafe({ _tag: "WorkingTree" }),
    currentBranch: "main",
    diffPreview: "",
    fileStats: [],
    instruction: "test",
    baseUrl: Option.none(),
    isHeadless: false,
    requiresCookies: false,
  } as any);

const sampleEvents: ExecutionEvent[] = [
  new AgentThinking({ text: "Let me analyze the code..." }),
  new AgentText({
    text: "I'll start by checking the CLI.\nSTEP_START|step-01|CLI Application Startup",
  }),
  new ToolCall({ toolName: "browser__open", input: { url: "http://localhost:3000" } }),
  new ToolResult({ toolName: "browser__open", result: "Browser opened", isError: false }),
  new ToolCall({ toolName: "browser__screenshot", input: { mode: "snapshot" } }),
  new ToolResult({
    toolName: "browser__screenshot",
    result: "/tmp/screenshot.png",
    isError: false,
  }),
  new AgentText({
    text: "The CLI started successfully.\nSTEP_DONE|step-01|CLI started and rendered correctly",
  }),
  new AgentText({ text: "RUN_COMPLETED|passed|All steps passed" }),
];

describe("reducer", () => {
  it("reduces ExecutionEvents into ExecutedTestPlan", () => {
    let executed = new ExecutedTestPlan({ ...makeTestPlan(), events: [] });

    for (const event of sampleEvents) {
      executed = executed.addEvent(event);
    }

    expect(executed.events.length).toBeGreaterThan(0);

    const hasToolCalls = executed.events.some((event) => event._tag === "ToolCall");
    const hasToolResults = executed.events.some((event) => event._tag === "ToolResult");
    const hasThinking = executed.events.some((event) => event._tag === "AgentThinking");

    expect(hasToolCalls).toBe(true);
    expect(hasToolResults).toBe(true);
    expect(hasThinking).toBe(true);
  });

  it("parses markers from AgentText and applies step status", () => {
    let executed = new ExecutedTestPlan({ ...makeTestPlan(), events: [] });

    executed = executed.addEvent(
      new AgentText({ text: "Starting step.\nSTEP_START|step-01|CLI Application Startup" }),
    );
    expect(executed.steps[0].status).toBe("active");

    executed = executed.addEvent(new AgentText({ text: "Done.\nSTEP_DONE|step-01|CLI started" }));
    expect(executed.steps[0].status).toBe("passed");
  });

  it("handles step failure markers", () => {
    let executed = new ExecutedTestPlan({ ...makeTestPlan(), events: [] });

    executed = executed.addEvent(
      new AgentText({ text: "STEP_START|step-01|CLI Application Startup" }),
    );
    executed = executed.addEvent(
      new AgentText({ text: "ASSERTION_FAILED|step-01|Page did not load" }),
    );
    expect(executed.steps[0].status).toBe("failed");
  });

  it("each addEvent returns a new instance", () => {
    const initial = new ExecutedTestPlan({ ...makeTestPlan(), events: [] });

    let previous = initial;
    for (const event of sampleEvents.slice(0, 4)) {
      const next = previous.addEvent(event);
      expect(next).not.toBe(previous);
      previous = next;
    }

    expect(previous.events.length).toBeGreaterThan(0);
  });

  it("exposes activeStep and completedStepCount getters", () => {
    let executed = new ExecutedTestPlan({ ...makeTestPlan(), events: [] });

    expect(executed.activeStep).toBeUndefined();
    expect(executed.completedStepCount).toBe(0);

    executed = executed.addEvent(
      new AgentText({ text: "STEP_START|step-01|CLI Application Startup" }),
    );
    expect(executed.activeStep?.id).toBe("step-01");
    expect(executed.completedStepCount).toBe(0);

    executed = executed.addEvent(new AgentText({ text: "STEP_DONE|step-01|Done" }));
    expect(executed.activeStep).toBeUndefined();
    expect(executed.completedStepCount).toBe(1);
  });
});
