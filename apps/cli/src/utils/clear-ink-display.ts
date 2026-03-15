import type { render } from "ink";

let inkInstance: ReturnType<typeof render> | null = null;

export const setInkInstance = (instance: ReturnType<typeof render>) => {
  inkInstance = instance;
};

export const clearInkDisplay = () => inkInstance?.clear();
