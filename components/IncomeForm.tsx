"use client";

import { formatRupiah } from "@/lib/calculations";
import type { IncomeData } from "@/lib/types";

interface Props {
  value: IncomeData;
  onChange: (data: IncomeData) => void;
}

function parseNum(raw: string): number {
  return raw === "" ? 0 : Number(raw.replace(/\D/g, ""));
}

// ─── Reusable single Rupiah input ────────────────────────────

function RupiahInput({
  val,
  onChange,
}: {
  val: number;
  onChange: (raw: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
        placeholder="0"
        value={val === 0 ? "" : val.toLocaleString("id-ID")}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ─── Multi-entry row list ─────────────────────────────────────

function MultiEntryField({
  label,
  icon,
  items,
  onUpdate,
  onAdd,
  onRemove,
}: {
  label: string;
  icon: string;
  items: number[];
  onUpdate: (idx: number, raw: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  const subtotal = items.reduce((s, v) => s + (v || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {icon} {label}
        </span>
        {items.length > 1 && (
          <span className="text-xs font-semibold text-emerald-600">
            {formatRupiah(subtotal)}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {items.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="flex-1">
              <RupiahInput
                val={val}
                onChange={(raw) => onUpdate(idx, raw)}
              />
            </div>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="text-red-300 hover:text-red-500 transition text-lg leading-none w-7 text-center shrink-0"
                aria-label="Hapus baris"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-2 text-xs text-emerald-500 hover:text-emerald-700 font-medium transition flex items-center gap-1"
      >
        <span className="text-base leading-none">+</span> Tambah baris
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function IncomeForm({ value, onChange }: Props) {
  // Helpers untuk update array fields
  function updateArr(key: "dompetDigital" | "tunai" | "tip" | "uangPengganti", idx: number, raw: string) {
    const arr = [...value[key]];
    arr[idx] = parseNum(raw);
    onChange({ ...value, [key]: arr });
  }

  function addArr(key: "dompetDigital" | "tunai" | "tip" | "uangPengganti") {
    onChange({ ...value, [key]: [...value[key], 0] });
  }

  function removeArr(key: "dompetDigital" | "tunai" | "tip" | "uangPengganti", idx: number) {
    const arr = value[key].filter((_, i) => i !== idx);
    onChange({ ...value, [key]: arr.length > 0 ? arr : [0] });
  }

  // Helper untuk single fields
  function updateSingle(key: "insentif", raw: string) {
    onChange({ ...value, [key]: parseNum(raw) });
  }

  return (
    <div className="space-y-5">

      {/* Dompet Digital — multi */}
      <MultiEntryField
        label="Dompet Digital"
        icon="💳"
        items={value.dompetDigital}
        onUpdate={(idx, raw) => updateArr("dompetDigital", idx, raw)}
        onAdd={() => addArr("dompetDigital")}
        onRemove={(idx) => removeArr("dompetDigital", idx)}
      />

      {/* Tunai — multi */}
      <MultiEntryField
        label="Tunai"
        icon="💵"
        items={value.tunai}
        onUpdate={(idx, raw) => updateArr("tunai", idx, raw)}
        onAdd={() => addArr("tunai")}
        onRemove={(idx) => removeArr("tunai", idx)}
      />

      {/* Tip — multi */}
      <MultiEntryField
        label="Tip dari Customer"
        icon="🎁"
        items={value.tip}
        onUpdate={(idx, raw) => updateArr("tip", idx, raw)}
        onAdd={() => addArr("tip")}
        onRemove={(idx) => removeArr("tip", idx)}
      />

      {/* Insentif — single */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ⭐ Insentif
        </label>
        <RupiahInput
          val={value.insentif}
          onChange={(raw) => updateSingle("insentif", raw)}
        />
      </div>

      {/* Uang Pengganti — multi */}
      <MultiEntryField
        label="Uang Pengganti"
        icon="🔄"
        items={value.uangPengganti}
        onUpdate={(idx, raw) => updateArr("uangPengganti", idx, raw)}
        onAdd={() => addArr("uangPengganti")}
        onRemove={(idx) => removeArr("uangPengganti", idx)}
      />

    </div>
  );
}
