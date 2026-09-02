"use client";

import { create } from "zustand";
import type { Transaction, WaStatus } from "./types";

interface AppStore {
  // Transactions
  transactions: Transaction[];
  isLoadingTransactions: boolean;
  setTransactions: (tx: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  setLoadingTransactions: (v: boolean) => void;

  // WhatsApp
  waStatus: WaStatus;
  setWaStatus: (s: WaStatus) => void;

  // UI
  activeTab: "form" | "history";
  setActiveTab: (tab: "form" | "history") => void;
}

export const useAppStore = create<AppStore>((set) => ({
  transactions: [],
  isLoadingTransactions: false,
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (tx) =>
    set((state) => ({ transactions: [tx, ...state.transactions] })),
  setLoadingTransactions: (v) => set({ isLoadingTransactions: v }),

  waStatus: { connected: false },
  setWaStatus: (waStatus) => set({ waStatus }),

  activeTab: "form",
  setActiveTab: (activeTab) => set({ activeTab }),
}));
