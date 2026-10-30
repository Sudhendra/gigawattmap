import { create } from 'zustand';

export const COMPARISON_LIMIT = 3;
type ComparisonState = {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};
export const useComparisonStore = create<ComparisonState>((set) => ({
  ids: [],
  add: (id) =>
    set((s) => ({
      ids: !id || s.ids.includes(id) || s.ids.length >= COMPARISON_LIMIT ? s.ids : [...s.ids, id],
    })),
  remove: (id) => set((s) => ({ ids: s.ids.filter((item) => item !== id) })),
  clear: () => set({ ids: [] }),
}));
