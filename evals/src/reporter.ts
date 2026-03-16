import type { EvalResult, EvalSummary } from "./types.ts";

export const buildSummary = (results: EvalResult[]): EvalSummary => {
  const total = results.length;
  const correct = results.filter((result) => result.correct).length;

  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const result of results) {
    if (result.expectedStatus === "passed" && result.actualStatus === "passed") truePositives++;
    if (result.expectedStatus === "failed" && result.actualStatus === "failed") trueNegatives++;
    if (result.expectedStatus === "failed" && result.actualStatus !== "failed") falsePositives++;
    if (result.expectedStatus === "passed" && result.actualStatus !== "passed") falseNegatives++;
  }

  return {
    total,
    correct,
    accuracy: total > 0 ? correct / total : 0,
    truePositives,
    trueNegatives,
    falsePositives,
    falseNegatives,
    results,
    totalDurationMs: results.reduce((sum, result) => sum + result.durationMs, 0),
  };
};

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

export const printReport = (summary: EvalSummary) => {
  const breakingResults = summary.results.filter((result) => result.expectedStatus === "failed");
  const benignResults = summary.results.filter((result) => result.expectedStatus === "passed");

  console.log(`\nEval Results (${summary.total} mutations)`);
  console.log("=".repeat(50));

  if (breakingResults.length > 0) {
    console.log("\n  Breaking (should detect):");
    for (const result of breakingResults) {
      const icon = result.correct ? "OK" : "!!";
      const label = result.correct
        ? "detected"
        : result.actualStatus === "error"
          ? "ERROR"
          : "MISSED";
      const duration = formatDuration(result.durationMs);
      console.log(
        `    [${icon}]  ${result.mutationId.padEnd(36)} (${label.padEnd(8)})  ${duration}`,
      );
      if (result.error) console.log(`          Error: ${result.error}`);
    }
  }

  if (benignResults.length > 0) {
    console.log("\n  Benign (should pass):");
    for (const result of benignResults) {
      const icon = result.correct ? "OK" : "!!";
      const label = result.correct
        ? "clean"
        : result.actualStatus === "error"
          ? "ERROR"
          : "FALSE ALARM";
      const duration = formatDuration(result.durationMs);
      console.log(
        `    [${icon}]  ${result.mutationId.padEnd(36)} (${label.padEnd(11)})  ${duration}`,
      );
      if (result.error) console.log(`          Error: ${result.error}`);
    }
  }

  const breakingTotal = breakingResults.length;
  const benignTotal = benignResults.length;

  console.log(
    `\n  Accuracy:         ${summary.correct}/${summary.total} (${formatPercent(summary.accuracy)})`,
  );
  if (breakingTotal > 0) {
    console.log(
      `  Bug detection:    ${summary.trueNegatives}/${breakingTotal} (${formatPercent(breakingTotal > 0 ? summary.trueNegatives / breakingTotal : 0)})`,
    );
  }
  if (benignTotal > 0) {
    console.log(
      `  False alarm rate: ${summary.falseNegatives}/${benignTotal} (${formatPercent(benignTotal > 0 ? summary.falseNegatives / benignTotal : 0)})`,
    );
  }
  console.log(`  Total time:       ${formatDuration(summary.totalDurationMs)}`);
  console.log();
};
