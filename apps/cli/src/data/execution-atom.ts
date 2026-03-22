import { Effect, Option, Stream } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { ExecutedTestPlan, Executor, Git, Reporter } from "@browser-tester/supervisor";
import type { TestPlan, TestReport } from "@browser-tester/shared/models";
import { getCliAtomRuntime } from "./runtime.js";

interface ExecutePlanInput {
  readonly testPlan: TestPlan;
  readonly onUpdate: (executed: ExecutedTestPlan) => void;
}

export interface ExecutionResult {
  readonly executedPlan: ExecutedTestPlan;
  readonly report: TestReport;
}

export const screenshotPathsAtom = Atom.make<readonly string[]>([]);

export const executePlanFn = () =>
  getCliAtomRuntime().fn(
    Effect.fnUntraced(
      function* (input: ExecutePlanInput, _ctx: Atom.FnContext) {
        const reporter = yield* Reporter;
        yield* Effect.logDebug("Starting execution", { title: input.testPlan.title });
        Atom.set(screenshotPathsAtom, []);

        const executor = yield* Executor;

        const finalExecuted = yield* executor.executePlan(input.testPlan).pipe(
          Stream.tap((executed) =>
            Effect.sync(() => {
              input.onUpdate(executed);
              const lastEvent = executed.events.at(-1);
              if (lastEvent?._tag === "ToolResult" && lastEvent.toolName.endsWith("__screenshot")) {
                Atom.update(screenshotPathsAtom, (previous) => [...previous, lastEvent.result]);
              }
            }),
          ),
          Stream.runLast,
          Effect.map(
            Option.getOrElse(() => new ExecutedTestPlan({ ...input.testPlan, events: [] })),
          ),
        );

        yield* Effect.logDebug("Stream complete", { totalEvents: finalExecuted.events.length });

        const report = yield* reporter.report(finalExecuted);
        yield* Effect.logDebug("Report complete", { status: report.status });

        if (report.status === "passed") {
          const git = yield* Git;
          yield* git.saveTestedFingerprint();
        }

        return { executedPlan: finalExecuted, report } satisfies ExecutionResult;
      },
      Effect.annotateLogs({ fn: "executePlanFn" }),
    ),
  );
