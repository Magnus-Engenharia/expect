import { create } from "zustand";

interface DemoPlaybackState {
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

export const useDemoPlaybackStore = create<DemoPlaybackState>((set) => ({
  isPlaying: true,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));
