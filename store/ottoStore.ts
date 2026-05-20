import { create } from "zustand";
import { OttoRequest, OttoResponse } from "../types/otto";

interface OttoLog {
  id: string;
  timestamp: number;
  type: "request" | "response" | "error";
  data: any;
}

interface OttoStore {
  input: OttoRequest | null;
  result: OttoResponse | null;
  logs: OttoLog[];
  loading: boolean;
  setInput: (input: OttoRequest) => void;
  setResult: (result: OttoResponse) => void;
  addLog: (log: Omit<OttoLog, "id" | "timestamp">) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

function generateLogId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export const useOttoStore = create<OttoStore>((set) => ({
  input: null,
  result: null,
  logs: [],
  loading: false,
  setInput: (input) => set({ input }),
  setResult: (result) => set({ result }),
  addLog: (log) =>
    set((state) => ({
      logs: [
        ...state.logs,
        { ...log, id: generateLogId(), timestamp: Date.now() },
      ],
    })),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ input: null, result: null, logs: [], loading: false }),
}));