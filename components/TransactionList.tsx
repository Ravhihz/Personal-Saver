"use client";

import { formatRupiah } from "@/lib/calculations";
import type { Transaction } from "@/lib/types";

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
}

export default function TransactionList({ transactions, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-gray-100 animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-4">📭</div>
        <p className="font-medium">Belum ada data transaksi</p>
        <p className="text-sm mt-1">Data akan muncul setelah kamu submit form</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const isPositive = tx.bersih >= 0;

        return (
          <div
            key={tx.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
          >
            {/* Top bar */}
            <div
              className={`h-1 w-full ${isPositive ? "bg-emerald-400" : "bg-red-400"}`}
            />

            <div className="px-4 py-3">
              {/* Date + Bersih */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    📅{" "}
                    {new Date(tx.tanggal).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{tx.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Bersih</p>
                  <p
                    className={`font-bold text-base ${
                      isPositive ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {formatRupiah(tx.bersih)}
                  </p>
                </div>
              </div>

              {/* Income vs Expense row */}
              <div className="flex gap-3 text-sm">
                <div className="flex-1 bg-emerald-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-500 font-medium">📥 Pendapatan</p>
                  <p className="font-semibold text-emerald-700 mt-0.5">
                    {formatRupiah(tx.totalPendapatanAplikasi)}
                  </p>
                </div>
                <div className="flex-1 bg-red-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-400 font-medium">📤 Pengeluaran</p>
                  <p className="font-semibold text-red-600 mt-0.5">
                    {formatRupiah(tx.totalPengeluaran)}
                  </p>
                </div>
              </div>

              {/* Expense breakdown */}
              {tx.expenses.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tx.expenses.map((e) => (
                    <span
                      key={e.id}
                      className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5"
                    >
                      {e.kategori}: {formatRupiah(e.nominal)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
