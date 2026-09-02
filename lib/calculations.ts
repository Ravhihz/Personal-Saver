import type { IncomeData, ExpenseItem } from "./types";

function sumArr(arr: number[]): number {
  return arr.reduce((s, v) => s + (v || 0), 0);
}

/**
 * Total Pendapatan Aplikasi =
 *   sum(Dompet Digital) + sum(Tunai) + sum(Tip) + Insentif + sum(Uang Pengganti)
 */
export function hitungTotalPendapatan(income: IncomeData): number {
  return (
    sumArr(income.dompetDigital) +
    sumArr(income.tunai) +
    sumArr(income.tip) +
    (income.insentif || 0) +
    sumArr(income.uangPengganti)
  );
}

/**
 * Total Pengeluaran = jumlah seluruh expense items
 */
export function hitungTotalPengeluaran(expenses: ExpenseItem[]): number {
  return expenses.reduce((sum, e) => sum + (e.nominal || 0), 0);
}

/**
 * Bersih = Total Pendapatan - Total Pengeluaran
 */
export function hitungBersih(
  totalPendapatan: number,
  totalPengeluaran: number
): number {
  return totalPendapatan - totalPengeluaran;
}

/**
 * Format angka ke Rupiah — 125000 → "Rp 125.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
