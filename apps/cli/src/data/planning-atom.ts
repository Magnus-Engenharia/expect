import { Effect, Option } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { Agent } from "@browser-tester/agent";
import {
  Git,
  Planner,
  TestPlanDraft,
  TestPlan,
  TestPlanStep,
  DraftId,
} from "@browser-tester/supervisor";
import type { AgentBackend } from "@browser-tester/agent";
import { type ChangesFor, PlanId, StepId } from "@browser-tester/shared/models";
import { cliAtomRuntime } from "./runtime.js";

interface CreatePlanInput {
  readonly changesFor: ChangesFor;
  readonly flowInstruction: string;
  readonly agentBackend: AgentBackend;
  readonly skipPlanning: boolean;
}

export const createPlanFn = cliAtomRuntime.fn(
  Effect.fnUntraced(
    function* (input: CreatePlanInput, _ctx: Atom.FnContext) {
      const git = yield* Git;

      const currentBranch = yield* git.getCurrentBranch;
      const fileStats = yield* git.getFileStats(input.changesFor);
      const diffPreview = yield* git.getDiffPreview(input.changesFor);

      console.error("[planning-atom] fileStats:", fileStats.length, "diff:", diffPreview.length);

      const draft = new TestPlanDraft({
        id: DraftId.makeUnsafe(crypto.randomUUID()),
        changesFor: input.changesFor,
        currentBranch,
        diffPreview,
        fileStats: [...fileStats],
        instruction: input.flowInstruction,
        baseUrl: Option.none(),
        isHeadless: false,
        requiresCookies: false,
      });

      if (input.skipPlanning) {
        console.error("[planning-atom] skipping AI planner, creating single-step plan");
        return new TestPlan({
          ...draft,
          id: PlanId.makeUnsafe(crypto.randomUUID()),
          title: input.flowInstruction,
          rationale: "",
          steps: [
            new TestPlanStep({
              id: StepId.makeUnsafe("step-01"),
              title: input.flowInstruction,
              instruction: input.flowInstruction,
              expectedOutcome: "The instruction is completed successfully",
              routeHint: Option.none(),
              status: "pending",
              summary: Option.none(),
            }),
          ],
        });
      }

      console.error("[planning-atom] prompt length:", draft.prompt.length);

      const planner = yield* Planner;
      const testPlan = yield* planner
        .plan(draft)
        .pipe(Effect.provide(Agent.layerFor(input.agentBackend)));

      console.error(
        "[planning-atom] result:",
        JSON.stringify({
          id: testPlan.id,
          title: testPlan.title,
          stepCount: testPlan.steps.length,
          steps: testPlan.steps.map((step) => ({
            id: step.id,
            title: step.title,
          })),
        }),
      );

      return testPlan;
    },
    Effect.annotateLogs({ fn: "createPlanFn" }),
  ),
);
