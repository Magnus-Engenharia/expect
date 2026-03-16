import { spawn, execSync, type ChildProcess } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { Mutation, EvalResult } from "./types.ts";
import {
  MUTATION_TIMEOUT_MS,
  HMR_WAIT_MS,
  HMR_REVERT_WAIT_MS,
  VITE_STARTUP_TIMEOUT_MS,
  VITE_POLL_INTERVAL_MS,
} from "./constants.ts";

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const STATUS_PATTERN = /Run (passed|failed):/;

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "../..");

const parseStatus = (stdout: string): "passed" | "failed" | "error" => {
  const match = stdout.match(STATUS_PATTERN);
  if (!match) return "error";
  return match[1] === "passed" ? "passed" : "failed";
};

const ensureCleanWorkingTree = () => {
  const status = execSync("git status --porcelain", { cwd: repoRoot, encoding: "utf-8" }).trim();
  if (status.length > 0) {
    throw new Error(`Git working tree is dirty. Clean up before running evals:\n${status}`);
  }
};

const applyMutation = (mutation: Mutation) => {
  const absolutePath = resolve(repoRoot, mutation.filePath);
  const content = readFileSync(absolutePath, "utf-8");
  if (!content.includes(mutation.search)) {
    throw new Error(
      `Search string not found in ${mutation.filePath} for mutation "${mutation.id}"`,
    );
  }
  const mutatedContent = content.replace(mutation.search, mutation.replace);
  writeFileSync(absolutePath, mutatedContent, "utf-8");
};

const revertMutation = (mutation: Mutation) => {
  const absolutePath = resolve(repoRoot, mutation.filePath);
  execSync(`git checkout -- "${absolutePath}"`, { cwd: repoRoot });
};

const startViteDevServer = (port: number): ChildProcess => {
  const appDirectory = resolve(repoRoot, "evals/app");
  const viteProcess = spawn("npx", ["vite", "--port", String(port), "--strictPort"], {
    cwd: appDirectory,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  return viteProcess;
};

const waitForViteReady = async (port: number) => {
  const url = `http://localhost:${port}`;
  const startTime = Date.now();
  while (Date.now() - startTime < VITE_STARTUP_TIMEOUT_MS) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(VITE_POLL_INTERVAL_MS);
  }
  throw new Error(`Vite dev server did not start within ${VITE_STARTUP_TIMEOUT_MS}ms`);
};

const runTestie = (
  port: number,
  timeoutMs: number,
): Promise<{ stdout: string; exitCode: number }> =>
  new Promise((resolve) => {
    const testieProcess = spawn(
      "npx",
      ["testie", "unstaged", "-y", "--base-url", `http://localhost:${port}`],
      {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
      },
    );

    let stdout = "";
    let stderr = "";
    testieProcess.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    testieProcess.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      testieProcess.kill("SIGTERM");
      stdout += "\n[TIMEOUT] Process killed after timeout";
    }, timeoutMs);

    testieProcess.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout: stdout + stderr, exitCode: code ?? 1 });
    });
  });

const runSingleMutation = async (
  mutation: Mutation,
  port: number,
  timeoutMs: number,
  verbose: boolean,
): Promise<EvalResult> => {
  const startTime = Date.now();

  try {
    applyMutation(mutation);
    await sleep(HMR_WAIT_MS);

    const { stdout } = await runTestie(port, timeoutMs);
    const actualStatus = parseStatus(stdout);
    const durationMs = Date.now() - startTime;

    if (verbose) {
      console.log(`\n--- stdout for ${mutation.id} ---\n${stdout}\n---\n`);
    }

    return {
      mutationId: mutation.id,
      name: mutation.name,
      expectedStatus: mutation.expectedStatus,
      actualStatus,
      correct: actualStatus === mutation.expectedStatus,
      durationMs,
      stdout,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      mutationId: mutation.id,
      name: mutation.name,
      expectedStatus: mutation.expectedStatus,
      actualStatus: "error",
      correct: false,
      durationMs,
      stdout: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    revertMutation(mutation);
    await sleep(HMR_REVERT_WAIT_MS);
  }
};

interface RunOptions {
  mutations: Mutation[];
  port: number;
  timeoutMs: number;
  verbose: boolean;
  jsonOutput: boolean;
}

export const runEvals = async (options: RunOptions): Promise<EvalResult[]> => {
  const { mutations, port, timeoutMs, verbose, jsonOutput } = options;

  ensureCleanWorkingTree();

  console.log(`Starting Vite dev server on port ${port}...`);
  const viteProcess = startViteDevServer(port);

  try {
    await waitForViteReady(port);
    console.log(`Vite ready. Running ${mutations.length} mutations...\n`);

    const results: EvalResult[] = [];
    for (const mutation of mutations) {
      const index = mutations.indexOf(mutation) + 1;
      process.stdout.write(`[${index}/${mutations.length}] ${mutation.id} ... `);

      const result = await runSingleMutation(mutation, port, timeoutMs, verbose);
      results.push(result);

      const icon = result.correct ? "OK" : "!!";
      const durationSeconds = (result.durationMs / 1000).toFixed(0);
      console.log(`[${icon}] ${result.actualStatus} (${durationSeconds}s)`);
    }

    if (jsonOutput) {
      const resultsDirectory = resolve(repoRoot, "evals/results");
      mkdirSync(resultsDirectory, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const outputPath = resolve(resultsDirectory, `${timestamp}.json`);
      writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf-8");
      console.log(`\nResults written to ${outputPath}`);
    }

    return results;
  } finally {
    viteProcess.kill("SIGTERM");
  }
};
