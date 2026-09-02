"use client";

import type { ExpenseItem } from "@/lib/types";

interface Props {
  items: ExpenseItem[];
  onChange: (items: ExpenseItem[]) => void;
}

const DEFAULT_CATEGORIES = ["Makan", "Bensin", "Toll", "Parkir", "Lainnya"];

function generateId(): string {
  return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function ExpenseForm({ items, onChange }: Props) {
  function addItem() {
    onChange([
      ...items,
      { id: generateId(), kategori: "Makan", nominal: 0 },
    ]);
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function updateItem(id: string, field: keyof ExpenseItem, val: string) {
    onChange(
      items.map((i) => {
        if (i.id !== id) return i;
        if (field === "nominal") {
          return { ...i, nominal: val === "" ? 0 : Number(val.replace(/\D/g, "")) };
        }
        return { ...i, [field]: val };
      })
    );
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
          Belum ada pengeluaran. Klik tombol di bawah untuk menambah.
        </p>
      )}

      {items.map((item, idx) => (
        <div
          key={item.id}
          className="flex gap-2 items-start bg-gray-50 rounded-lg p-3"
        >
          <span className="text-xs font-semibold text-gray-400 mt-3 w-4 shrink-0">
            {idx + 1}
          </span>

          {/* Category */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-gray-500 mb-1">Kategori</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 transition bg-white"
              value={item.kategori}
              onChange={(e) => updateItem(item.id, "kategori", e.target.value)}
            >
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-gray-500 mb-1">Nominal</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 transition"
                placeholder="0"
                value={item.nominal === 0 ? "" : item.nominal.toLocaleString("id-ID")}
                onChange={(e) => updateItem(item.id, "nominal", e.target.value)}
              />
            </div>
          </div>

          {/* Remove */}
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="mt-6 text-red-400 hover:text-red-600 transition text-lg leading-none shrink-0"
            aria-label="Hapus item"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition font-medium"
      >
        + Tambah Pengeluaran
      </button>
    </div>
  );
}
