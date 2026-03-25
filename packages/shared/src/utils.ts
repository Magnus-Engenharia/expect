import { Predicate } from "effect";

export const hasStringMessage = Predicate.compose(
  Predicate.isObject,
  Predicate.compose(
    Predicate.hasProperty("message"),
    Predicate.Struct({ message: Predicate.isString }),
  ),
);
