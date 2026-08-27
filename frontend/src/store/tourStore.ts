import { create } from 'zustand';

// Steps of the guided "create your first tournament" tour, in order.
// 'add-match' covers both pointing at the "Partite" tab and, once there,
// the Add Match button; 'open-match' likewise covers the "Risultati" tab
// then the first match card — see TourCoachmark usages in tournaments.tsx.
export type TourStepId =
  | 'sport'
  | 'create-form'
  | 'add-team'
  | 'add-player'
  | 'add-match'
  | 'open-match'
  | 'standings';

interface TourState {
  active: boolean;
  step: TourStepId | null;
  start: () => void;
  goTo: (step: TourStepId) => void;
  finish: () => void;
}

export const useTourStore = create<TourState>((set) => ({
  active: false,
  step: null,
  start: () => set({ active: true, step: 'sport' }),
  goTo: (step) => set({ step }),
  finish: () => set({ active: false, step: null }),
}));
