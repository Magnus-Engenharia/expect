import { streamText } from "ai";
import { createClaudeModel } from "@browser-tester/agent";
import type { Commit } from "./fetch-commits.js";
import type { GitState } from "./get-git-state.js";

export type TestAction = "test-unstaged" | "test-branch" | "select-commit";

interface AgentStreamOptions {
  action: TestAction;
  gitState: GitState;
  commit?: Commit;
  signal?: AbortSignal;
}

const buildPrompt = (options: AgentStreamOptions): string => {
  const { action, gitState, commit } = options;

  switch (action) {
    case "test-unstaged":
      return `Test the unstaged changes in this repository. There are ${gitState.diffStats?.filesChanged ?? 0} files changed on branch ${gitState.currentBranch}. Run the browser tests and report results.`;
    case "test-branch":
      return `Test all changes on branch ${gitState.currentBranch}. Run the browser tests and report results.`;
    case "select-commit":
      return commit
        ? `Test the changes in commit ${commit.shortHash} ("${commit.subject}"). Run the browser tests and report results.`
        : "Test the selected commit. Run the browser tests and report results.";
  }
};

export const agentStream = async function* (options: AgentStreamOptions): AsyncGenerator<string> {
  const model = createClaudeModel({ cwd: process.cwd() });
  const prompt = buildPrompt(options);

  const result = streamText({
    model,
    prompt,
    abortSignal: options.signal,
  });

  for await (const chunk of result.textStream) {
    yield chunk;
  }
};
