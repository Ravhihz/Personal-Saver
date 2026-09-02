"use client";

import { formatRupiah } from "@/lib/calculations";

interface Props {
  totalPendapatan: number;
  totalPengeluaran: number;
  bersih: number;
}

export default function SummaryCard({
  totalPendapatan,
  totalPengeluaran,
  bersih,
}: Props) {
  const isPositive = bersih >= 0;

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
        <p className="text-emerald-100 text-xs font-medium uppercase tracking-widest">
          Ringkasan
        </p>
      </div>

      <div className="bg-white divide-y divide-gray-100">
        {/* Total Pendapatan */}
        <div className="flex justify-between items-center px-5 py-3.5">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <span className="text-emerald-500">📥</span> Total Pendapatan
          </span>
          <span className="text-sm font-semibold text-emerald-600">
            {formatRupiah(totalPendapatan)}
          </span>
        </div>

        {/* Total Pengeluaran */}
        <div className="flex justify-between items-center px-5 py-3.5">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <span className="text-red-400">📤</span> Total Pengeluaran
          </span>
          <span className="text-sm font-semibold text-red-500">
            {formatRupiah(totalPengeluaran)}
          </span>
        </div>

        {/* Bersih */}
        <div
          className={`flex justify-between items-center px-5 py-4 ${
            isPositive ? "bg-emerald-50" : "bg-red-50"
          }`}
        >
          <span
            className={`font-semibold flex items-center gap-2 ${
              isPositive ? "text-emerald-700" : "text-red-700"
            }`}
          >
            <span>{isPositive ? "✅" : "⚠️"}</span> Bersih
          </span>
          <span
            className={`text-lg font-bold ${
              isPositive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatRupiah(bersih)}
          </span>
        </div>
      </div>
    </div>
  );
}
