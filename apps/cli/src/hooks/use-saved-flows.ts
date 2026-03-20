import { useQuery } from "@tanstack/react-query";
import { listFlows, type SavedFlowSummary } from "@browser-tester/supervisor";

export const EMPTY_SAVED_FLOWS: SavedFlowSummary[] = [];

export const useSavedFlows = () =>
  useQuery({
    queryKey: ["saved-flows"],
    queryFn: () => listFlows(),
  });
