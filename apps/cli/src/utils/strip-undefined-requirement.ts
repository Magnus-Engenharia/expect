import { Effect } from "effect";

// HACK: Effect v4 beta ServiceMap inference can leave `undefined` or `any` in R even
// after layers have fully satisfied the environment.
export const stripUndefinedRequirement = <A, E>(effect: Effect.Effect<A, E, any>) =>
  effect as Effect.Effect<A, E, never>;
