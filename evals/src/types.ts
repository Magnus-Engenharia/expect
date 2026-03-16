export interface Mutation {
  id: string;
  name: string;
  description: string;
  filePath: string;
  search: string;
  replace: string;
  expectedStatus: "passed" | "failed";
}

export interface EvalResult {
  mutationId: string;
  name: string;
  expectedStatus: "passed" | "failed";
  actualStatus: "passed" | "failed" | "error";
  correct: boolean;
  durationMs: number;
  stdout: string;
  error?: string;
}

export interface EvalSummary {
  total: number;
  correct: number;
  accuracy: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  results: EvalResult[];
  totalDurationMs: number;
}
