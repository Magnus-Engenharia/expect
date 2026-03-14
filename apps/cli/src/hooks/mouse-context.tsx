import { createContext, useCallback, useContext, useEffect, useRef } from "react";

interface MousePosition {
  x: number;
  y: number;
}

type MouseClickAction = "press" | "release";

interface ClickHandler {
  (position: MousePosition, action: MouseClickAction): void;
}

interface MouseContextValue {
  subscribeClick: (handler: ClickHandler) => () => void;
}

const MouseContext = createContext<MouseContextValue | null>(null);

const MOUSE_ENABLE = "\u001b[?1000h\u001b[?1006h";
const MOUSE_DISABLE = "\u001b[?1000l\u001b[?1006l";
const CLICK_PATTERN = /\[<0;(\d+);(\d+)([Mm])$/;

const parseClickEvent = (
  input: string,
): { x: number; y: number; action: MouseClickAction } | null => {
  const match = CLICK_PATTERN.exec(input);
  if (!match) return null;
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    action: match[3] === "M" ? "press" : "release",
  };
};

export const MouseProvider = ({ children }: { children: React.ReactNode }) => {
  const handlersRef = useRef(new Set<ClickHandler>());

  useEffect(() => {
    process.stdout.write(MOUSE_ENABLE);

    const onData = (data: Buffer | string) => {
      const text = typeof data === "string" ? data : data.toString();
      const result = parseClickEvent(text);
      if (!result) return;

      for (const handler of handlersRef.current) {
        handler({ x: result.x, y: result.y }, result.action);
      }
    };

    process.stdin.on("data", onData);

    return () => {
      process.stdin.off("data", onData);
      process.stdout.write(MOUSE_DISABLE);
    };
  }, []);

  const subscribeClick = useCallback((handler: ClickHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return <MouseContext.Provider value={{ subscribeClick }}>{children}</MouseContext.Provider>;
};

export const useMouse = (): MouseContextValue => {
  const context = useContext(MouseContext);
  if (!context) throw new Error("useMouse must be used within MouseProvider");
  return context;
};

// oxlint-disable-next-line no-control-regex
const SGR_MOUSE_GARBAGE = /\u001b?\[?<?(\d+;)*\d+[Mm]?/g;

export const stripMouseSequences = (value: string): string => value.replace(SGR_MOUSE_GARBAGE, "");
