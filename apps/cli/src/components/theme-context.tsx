export interface Colors {
  TEXT: string;
  DIM: string;
  GREEN: string;
  PRIMARY: string;
  SELECTION: string;
  RED: string;
  BORDER: string;
  DIVIDER: string;
  YELLOW: string;
  PURPLE: string;
  CYAN: string;
}

export const theme = {
  primary: "#ffffff",
  secondary: "gray",
  accent: "#ffffff",
  error: "red",
  warning: "yellow",
  success: "green",
  info: "gray",
  text: "#ffffff",
  textMuted: "#808080",
  border: "#808080",
  borderActive: "#ffffff",
  borderSubtle: "#555555",
};

export const COLORS: Colors = {
  TEXT: theme.text,
  DIM: theme.textMuted,
  GREEN: theme.success,
  PRIMARY: theme.primary,
  SELECTION: theme.accent,
  RED: theme.error,
  BORDER: theme.border,
  DIVIDER: theme.borderSubtle,
  YELLOW: theme.warning,
  PURPLE: theme.secondary,
  CYAN: theme.info,
};

export const useColors = (): Colors => COLORS;
