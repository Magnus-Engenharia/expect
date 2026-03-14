import { Box } from "ink";
import { Spinner } from "./ui/spinner.js";
import { ScreenHeading } from "./ui/screen-heading.js";
import { useAppStore } from "../store.js";

export const PlanningScreen = () => {
  const flowInstruction = useAppStore((state) => state.flowInstruction);

  return (
    <Box flexDirection="column" width="100%" paddingX={1} paddingY={1}>
      <ScreenHeading title="Generating browser plan" subtitle={flowInstruction} />

      <Box marginTop={1}>
        <Spinner message="Planning with scope-aware git context..." />
      </Box>
    </Box>
  );
};
