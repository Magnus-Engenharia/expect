import { Layer, Logger, References } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { DevTools } from "effect/unstable/devtools";
import { Executor, Git, Planner, Reporter, Updates } from "@browser-tester/supervisor";
import { layerFor, type AgentBackend } from "../acp/index.js";

const stderrLogger = Logger.make(({ logLevel, message, date }) => {
  console.error(`[effect ${logLevel}] ${date.toISOString()} ${message}`);
});

const createRuntime = (agentBackend: AgentBackend) => {
  const agentLayer = layerFor(agentBackend);

  return Atom.runtime(
    Layer.mergeAll(
      Planner.layer.pipe(Layer.provide(agentLayer)),
      Executor.layer.pipe(Layer.provide(agentLayer)),
      Reporter.layer,
      Updates.layer,
      DevTools.layer(),
      Git.withRepoRoot(process.cwd()),
    ).pipe(
      Layer.provideMerge(Logger.layer([stderrLogger])),
      Layer.provideMerge(Layer.succeed(References.MinimumLogLevel, "All")),
    ),
  );
};

type CliAtomRuntime = ReturnType<typeof createRuntime>;

let runtime: CliAtomRuntime | undefined;

export const initCliAtomRuntime = (agentBackend: AgentBackend): CliAtomRuntime => {
  runtime = createRuntime(agentBackend);
  return runtime;
};

export const getCliAtomRuntime = (): CliAtomRuntime => {
  if (!runtime) throw new Error("CLI runtime not initialized — call initCliAtomRuntime first");
  return runtime;
};
