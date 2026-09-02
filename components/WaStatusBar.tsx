"use client";

import { useEffect, useRef, useState } from "react";
import type { WaStatus } from "@/lib/types";

export default function WaStatusBar() {
  const [status, setStatus] = useState<WaStatus>({ connected: false });
  const [showQr, setShowQr] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const modalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch status helper ──────────────────────────────────
  async function fetchStatus(): Promise<WaStatus> {
    const res = await fetch("/api/whatsapp/status");
    const json = await res.json();
    if (json.success) {
      setStatus(json.data);
      return json.data as WaStatus;
    }
    return { connected: false };
  }

  // ─── Background poll — lambat kalau connected, cepat kalau belum
  useEffect(() => {
    fetchStatus();
    const interval = status.connected ? 30000 : 5000;
    const id = setInterval(fetchStatus, interval);
    return () => clearInterval(id);
  }, [status.connected]);

  // ─── Ketika modal terbuka, poll lebih cepat (1.5s) ─────────
  useEffect(() => {
    if (showQr) {
      modalPollRef.current = setInterval(async () => {
        const latest = await fetchStatus();
        // Auto-tutup modal begitu WA berhasil connected
        if (latest.connected) {
          setShowQr(false);
        }
      }, 1500);
    } else {
      if (modalPollRef.current) {
        clearInterval(modalPollRef.current);
        modalPollRef.current = null;
      }
    }
    return () => {
      if (modalPollRef.current) clearInterval(modalPollRef.current);
    };
  }, [showQr]);

  // ─── Klik tombol Hubungkan ───────────────────────────────
  async function handleConnect() {
    setConnecting(true);
    // Panggil status untuk trigger inisialisasi Baileys di server
    await fetchStatus();
    // Tunggu sebentar biar Baileys sempat generate QR
    await new Promise((r) => setTimeout(r, 2000));
    await fetchStatus();
    setShowQr(true);
    setConnecting(false);
  }

  return (
    <>
      {/* ─── Status bar ─────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="text-sm font-medium text-gray-700">WhatsApp</span>
        </div>

        {status.connected ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-600 font-medium">
              Terhubung{status.phoneNumber ? ` · ${status.phoneNumber}` : ""}
            </span>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {connecting ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                </svg>
                Menyiapkan...
              </>
            ) : (
              "Hubungkan"
            )}
          </button>
        )}
      </div>

      {/* ─── QR Modal ───────────────────────────────────── */}
      {showQr && !status.connected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center font-bold text-gray-800 mb-1">
              Scan QR Code
            </h2>
            <p className="text-center text-xs text-gray-400 mb-4">
              Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat
            </p>

            {status.qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={status.qrCode}
                alt="WhatsApp QR Code"
                className="w-full rounded-lg border border-gray-100"
              />
            ) : (
              <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-3 animate-pulse">📱</div>
                  <p className="text-sm font-medium">Memuat QR Code...</p>
                  <p className="text-xs mt-1 text-gray-300">Tunggu beberapa detik</p>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-gray-300 mt-3">
              QR otomatis refresh · modal tertutup saat terhubung
            </p>

            <button
              onClick={() => setShowQr(false)}
              className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
