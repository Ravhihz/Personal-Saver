"use client";

import { useEffect, useState } from "react";
import IncomeForm from "@/components/IncomeForm";
import ExpenseForm from "@/components/ExpenseForm";
import SummaryCard from "@/components/SummaryCard";
import TransactionList from "@/components/TransactionList";
import WaStatusBar from "@/components/WaStatusBar";
import {
  hitungTotalPendapatan,
  hitungTotalPengeluaran,
  hitungBersih,
} from "@/lib/calculations";
import type { ExpenseItem, IncomeData, Transaction } from "@/lib/types";

const EMPTY_INCOME: IncomeData = {
  dompetDigital: [0],
  tunai: [0],
  tip: [0],
  insentif: 0,
  uangPengganti: [0],
};

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export default function HomePage() {
  // ─── Tab ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");

  // ─── Form state ──────────────────────────────────────────────
  const [tanggal, setTanggal] = useState(todayIso());
  const [income, setIncome] = useState<IncomeData>(EMPTY_INCOME);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ─── History state ───────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ─── Derived values ───────────────────────────────────────────
  const totalPendapatan = hitungTotalPendapatan(income);
  const totalPengeluaran = hitungTotalPengeluaran(expenses);
  const bersih = hitungBersih(totalPendapatan, totalPengeluaran);

  // ─── Load history ────────────────────────────────────────────
  async function loadHistory() {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/transactions");
      const json = await res.json();
      if (json.success) setTransactions(json.data);
    } catch {
      // silent fail
    } finally {
      setIsLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab]);

  // ─── Submit ──────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal, income, expenses }),
      });

      const json = await res.json();

      if (json.success) {
        setSubmitResult({
          type: "success",
          message: "✅ Data berhasil disimpan ke Google Sheets & notifikasi WhatsApp dikirim!",
        });
        // Reset form
        setIncome(EMPTY_INCOME);
        setExpenses([]);
        setTanggal(todayIso());
      } else {
        setSubmitResult({
          type: "error",
          message: `❌ ${json.error || "Gagal menyimpan data"}`,
        });
      }
    } catch {
      setSubmitResult({
        type: "error",
        message: "❌ Koneksi gagal, coba lagi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-4 pt-10 pb-6 shadow-lg">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">💰</span>
            <div>
              <h1 className="text-xl font-bold leading-tight">Personal Saver</h1>
              <p className="text-emerald-100 text-xs">
                Catat · Pantau · Kirim ke WA
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 -mt-2 pb-12 space-y-4">
        {/* ─── WA Status ────────────────────────────────────── */}
        <WaStatusBar />

        {/* ─── Tabs ─────────────────────────────────────────── */}
        <div className="flex bg-white rounded-xl border border-gray-100 shadow-sm p-1">
          {(["form", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "form" ? "📝 Catat Harian" : "📋 Riwayat"}
            </button>
          ))}
        </div>

        {/* ─── Form Tab ─────────────────────────────────────── */}
        {activeTab === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tanggal */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📅 Tanggal
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              />
            </div>

            {/* Income */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Pendapatan Aplikasi
              </h2>
              <IncomeForm value={income} onChange={setIncome} />
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-100 text-red-500 text-xs flex items-center justify-center font-bold">
                  2
                </span>
                Pengeluaran
              </h2>
              <ExpenseForm items={expenses} onChange={setExpenses} />
            </div>

            {/* Summary preview */}
            <SummaryCard
              totalPendapatan={totalPendapatan}
              totalPengeluaran={totalPengeluaran}
              bersih={bersih}
            />

            {/* Result message */}
            {submitResult && (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  submitResult.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {submitResult.message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-md hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                  </svg>
                  Menyimpan...
                </span>
              ) : (
                "💾 Simpan & Kirim Notifikasi WA"
              )}
            </button>
          </form>
        )}

        {/* ─── History Tab ──────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-gray-700">
                {transactions.length > 0
                  ? `${transactions.length} transaksi`
                  : "Riwayat Transaksi"}
              </p>
              <button
                onClick={loadHistory}
                className="text-xs text-emerald-600 hover:underline"
              >
                🔄 Refresh
              </button>
            </div>
            <TransactionList
              transactions={transactions}
              isLoading={isLoadingHistory}
            />
          </div>
        )}
      </div>
    </div>
  );
}
