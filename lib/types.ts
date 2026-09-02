// ─── Income ─────────────────────────────────────────────────

export interface IncomeData {
  dompetDigital: number[];  // multi-entry
  tunai: number[];          // multi-entry
  tip: number[];            // multi-entry
  insentif: number;         // single
  uangPengganti: number[];  // multi-entry
}

// ─── Expense ─────────────────────────────────────────────────

export interface ExpenseItem {
  id: string;
  kategori: string;
  nominal: number;
}

// ─── Transaction (full record) ───────────────────────────────

export interface Transaction {
  id: string;
  tanggal: string;
  income: IncomeData;
  expenses: ExpenseItem[];
  totalPendapatanAplikasi: number;
  totalPengeluaran: number;
  bersih: number;
  createdAt: string;
}

// ─── Form state ──────────────────────────────────────────────

export interface TransactionFormData {
  tanggal: string;
  income: IncomeData;
  expenses: ExpenseItem[];
}

// ─── API responses ───────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WaStatus {
  connected: boolean;
  qrCode?: string;
  pairingCode?: string;
  phoneNumber?: string;
}

// ─── Summary stats ───────────────────────────────────────────

export interface DailySummary {
  tanggal: string;
  totalPendapatan: number;
  totalPengeluaran: number;
  bersih: number;
}
