import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  timeouts: Map<string, NodeJS.Timeout>;
  addToast: (message: string, type?: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  timeouts: new Map(),
  addToast: (message, type = 'info', duration = 5000) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        get().removeToast(id);
      }, duration);

      set((state) => {
        const newTimeouts = new Map(state.timeouts);
        newTimeouts.set(id, timeoutId);
        return { timeouts: newTimeouts };
      });
    }

    return id;
  },
  removeToast: (id) => {
    const { timeouts } = get();
    const timeoutId = timeouts.get(id);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    set((state) => {
      const newTimeouts = new Map(state.timeouts);
      newTimeouts.delete(id);
      return {
        toasts: state.toasts.filter((t) => t.id !== id),
        timeouts: newTimeouts,
      };
    });
  },
}));
