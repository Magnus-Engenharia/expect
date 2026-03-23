import type { eventWithTime } from "@rrweb/types";
import type { ViewerRunState } from "@/types";
import { StepPanel } from "@/components/step-panel";
import { ReplayPlayer } from "@/components/replay-player";
import { LiveReplayPlayer } from "@/components/live-replay-player";
import { useLiveData } from "@/hooks/use-live-data";
import { FIXTURE_EVENTS, FIXTURE_STEP_STATE } from "@/fixture";

interface ViewerData {
  readonly events: eventWithTime[];
  readonly stepState: ViewerRunState;
}

declare global {
  interface Window {
    __VIEWER_DATA__?: ViewerData;
  }
}

declare const __LIVE_VIEW__: true | undefined;

const isLiveView = typeof __LIVE_VIEW__ !== "undefined";

const DEV_FIXTURE: ViewerData | undefined =
  import.meta.env.DEV && !isLiveView
    ? { events: FIXTURE_EVENTS, stepState: FIXTURE_STEP_STATE }
    : undefined;

const STATIC_DATA = window.__VIEWER_DATA__ ?? DEV_FIXTURE;

const LiveView = () => {
  const { events, stepState } = useLiveData();

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {stepState ? (
        <StepPanel state={stepState} />
      ) : (
        <div className="text-center text-muted-foreground text-sm py-4">
          Waiting for test execution to start&hellip;
        </div>
      )}
      <LiveReplayPlayer events={events} />
    </div>
  );
};

export const App = () => {
  if (STATIC_DATA) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <StepPanel state={STATIC_DATA.stepState} />
        <ReplayPlayer events={STATIC_DATA.events} />
      </div>
    );
  }

  return <LiveView />;
};
