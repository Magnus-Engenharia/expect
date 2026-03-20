import { ManagedRuntime } from "effect";
import { DevTools } from "effect/unstable/devtools";

export const CliRuntime = ManagedRuntime.make(DevTools.layer());
