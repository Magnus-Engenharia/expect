import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { projectPreferencesStorage } from "@expect/supervisor";

interface ProjectPreferencesStore {
  cookiesEnabled: boolean;
  setCookiesEnabled: (enabled: boolean) => void;
  toggleCookies: () => void;
}

export const useProjectPreferencesStore = create<ProjectPreferencesStore>()(
  persist(
    (set) => ({
      cookiesEnabled: false,
      setCookiesEnabled: (enabled: boolean) => set({ cookiesEnabled: enabled }),
      toggleCookies: () => set((state) => ({ cookiesEnabled: !state.cookiesEnabled })),
    }),
    {
      name: "project-preferences",
      storage: createJSONStorage(() => projectPreferencesStorage),
    },
  ),
);
