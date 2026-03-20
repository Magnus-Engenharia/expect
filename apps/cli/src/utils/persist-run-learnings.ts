import {
  generateLearnings,
  loadLearnings,
  saveLearnings,
  type BrowserRunEvent,
  type BrowserRunReport,
} from "@browser-tester/supervisor";

interface PersistRunLearningsOptions {
  cwd: string;
  events: BrowserRunEvent[];
  report: BrowserRunReport;
}

export const persistRunLearnings = async (options: PersistRunLearningsOptions): Promise<void> => {
  try {
    const existingLearnings = await loadLearnings(options.cwd);
    const nextLearnings = await generateLearnings({
      cwd: options.cwd,
      events: options.events,
      report: options.report,
      existingLearnings,
    });
    await saveLearnings(nextLearnings, options.cwd);
  } catch {}
};
