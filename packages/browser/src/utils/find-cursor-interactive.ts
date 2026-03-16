import { Effect } from "effect";
import { INTERACTIVE_ROLES, MAX_ELEMENT_TEXT_LENGTH } from "../constants";
import type { Page } from "playwright";

interface CursorInteractiveElement {
  selector: string;
  text: string;
  reason: string;
}

const INTERACTIVE_HTML_TAGS = ["a", "button", "input", "select", "textarea", "details", "summary"];

export const findCursorInteractive = Effect.fn("findCursorInteractive")(function* (
  page: Page,
  rootSelector?: string,
) {
  return (yield* Effect.tryPromise(() =>
    page.evaluate(
      ({
        rootSel,
        maxLen,
        roles,
        tags,
      }: {
        rootSel: string;
        maxLen: number;
        roles: string[];
        tags: string[];
      }) => {
        const interactiveRoleSet = new Set(roles);
        const interactiveTagSet = new Set(tags);
        const root = document.querySelector(rootSel) || document.body;
        const elements = root.querySelectorAll("*");
        const results: Array<{ selector: string; text: string; reason: string }> = [];

        const buildUniqueSelector = (element: Element): string => {
          const testId = element.getAttribute("data-testid");
          if (testId) return `[data-testid="${testId}"]`;
          if (element.id) return `#${CSS.escape(element.id)}`;

          const parts: string[] = [];
          let current: Element | null = element;

          while (current && current !== document.body) {
            let segment = current.tagName.toLowerCase();
            const firstClass = current.classList[0];
            if (firstClass) segment += `.${CSS.escape(firstClass)}`;

            const parent = current.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter((sibling) => {
                if (sibling.tagName !== current!.tagName) return false;
                return !firstClass || sibling.classList.contains(firstClass);
              });
              if (siblings.length > 1) {
                segment += `:nth-of-type(${siblings.indexOf(current) + 1})`;
              }
            }

            parts.unshift(segment);
            current = current.parentElement;

            if (parts.length >= 1) {
              try {
                const candidate = parts.join(" > ");
                if (document.querySelectorAll(candidate).length === 1) break;
              } catch {
                /* selector may be invalid, keep building */
              }
            }
            if (parts.length >= 10) break;
          }

          return parts.join(" > ");
        };

        for (const element of elements) {
          const tagName = element.tagName.toLowerCase();
          if (interactiveTagSet.has(tagName)) continue;

          const role = element.getAttribute("role");
          if (role && interactiveRoleSet.has(role.toLowerCase())) continue;

          const computedStyle = getComputedStyle(element);
          const hasCursorPointer = computedStyle.cursor === "pointer";
          const hasOnClick =
            element.hasAttribute("onclick") || (element as HTMLElement).onclick !== null;
          const tabIndexAttr = element.getAttribute("tabindex");
          const hasTabIndex = tabIndexAttr !== null && tabIndexAttr !== "-1";

          if (!hasCursorPointer && !hasOnClick && !hasTabIndex) continue;

          if (hasCursorPointer && !hasOnClick && !hasTabIndex) {
            const parent = element.parentElement;
            if (parent && getComputedStyle(parent).cursor === "pointer") continue;
          }

          const text = (element.textContent || "").trim().slice(0, maxLen);
          if (!text) continue;

          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const reasons: string[] = [];
          if (hasCursorPointer) reasons.push("cursor:pointer");
          if (hasOnClick) reasons.push("onclick");
          if (hasTabIndex) reasons.push("tabindex");

          results.push({
            selector: buildUniqueSelector(element),
            text,
            reason: reasons.join(", "),
          });
        }

        return results;
      },
      {
        rootSel: rootSelector || "body",
        maxLen: MAX_ELEMENT_TEXT_LENGTH,
        roles: [...INTERACTIVE_ROLES],
        tags: INTERACTIVE_HTML_TAGS,
      },
    ),
  ).pipe(Effect.orDie)) as CursorInteractiveElement[];
});
