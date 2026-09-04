"use client";

import { useEffect, useRef, useState } from "react";
import type { WaStatus } from "@/lib/types";

export default function WaStatusBar() {
  const [status, setStatus] = useState<WaStatus>({ connected: false });
  const [showModal, setShowModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [method, setMethod] = useState<"qr" | "phone">("phone");

  // Pairing code state
  const [phoneInput, setPhoneInput] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

  const modalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [qrCountdown, setQrCountdown] = useState(20);

  // ─── Fetch status ─────────────────────────────────────────
  async function fetchStatus(): Promise<WaStatus> {
    try {
      const res = await fetch("/api/whatsapp/status");
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
        return json.data as WaStatus;
      }
    } catch { /* silent */ }
    return { connected: false };
  }

  // ─── Background poll ──────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    const interval = status.connected ? 30000 : 5000;
    const id = setInterval(fetchStatus, interval);
    return () => clearInterval(id);
  }, [status.connected]);

  // ─── Modal poll (1.5s) — auto-tutup saat connected ────────
  useEffect(() => {
    if (showModal) {
      modalPollRef.current = setInterval(async () => {
        const latest = await fetchStatus();
        if (latest.connected) setShowModal(false);
      }, 1500);
    } else {
      if (modalPollRef.current) {
        clearInterval(modalPollRef.current);
        modalPollRef.current = null;
      }
      // Reset pairing state saat modal ditutup
      setPairingCode(null);
      setPairingError(null);
      setPairingLoading(false);
    }
    return () => {
      if (modalPollRef.current) clearInterval(modalPollRef.current);
    };
  }, [showModal]);

  // ─── QR auto-refresh setiap 18 detik (QR expire ~20 detik) ──
  useEffect(() => {
    if (showModal && method === "qr") {
      setQrCountdown(20);
      // Countdown ticker
      const ticker = setInterval(() => {
        setQrCountdown((c) => (c <= 1 ? 20 : c - 1));
      }, 1000);
      // Force refresh QR dari server setiap 18 detik
      qrRefreshRef.current = setInterval(() => {
        fetchStatus();
        setQrCountdown(20);
      }, 18000);
      return () => {
        clearInterval(ticker);
        if (qrRefreshRef.current) clearInterval(qrRefreshRef.current);
      };
    } else {
      if (qrRefreshRef.current) {
        clearInterval(qrRefreshRef.current);
        qrRefreshRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, method]);
  async function handleConnect() {
    setConnecting(true);
    await fetchStatus();
    await new Promise((r) => setTimeout(r, 2000));
    await fetchStatus();
    setShowModal(true);
    setConnecting(false);
  }

  // ─── Request pairing code ─────────────────────────────────
  async function handleRequestPairing() {
    if (!phoneInput) return;
    setPairingLoading(true);
    setPairingError(null);
    setPairingCode(null);

    try {
      const res = await fetch("/api/whatsapp/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneInput }),
      });
      const json = await res.json();
      if (json.success) {
        setPairingCode(json.data.code);
      } else {
        setPairingError(json.error || "Gagal mendapatkan kode");
      }
    } catch {
      setPairingError("Koneksi gagal, coba lagi");
    } finally {
      setPairingLoading(false);
    }
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
            ) : "Hubungkan"}
          </button>
        )}
      </div>

      {/* ─── Modal ──────────────────────────────────────── */}
      {showModal && !status.connected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center font-bold text-gray-800 mb-4">
              Hubungkan WhatsApp
            </h2>

            {/* Tab switch */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
              <button
                onClick={() => setMethod("phone")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                  method === "phone"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                📱 Kode Telepon
              </button>
              <button
                onClick={() => setMethod("qr")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                  method === "qr"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                📷 Scan QR
              </button>
            </div>

            {/* ── Tab: Kode Telepon ── */}
            {method === "phone" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 text-center">
                  Masukkan nomor WA kamu, lalu masukkan kode 8 digit yang muncul ke WhatsApp
                </p>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">+</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="628xxxxxxxxxx"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  />
                </div>

                <button
                  onClick={handleRequestPairing}
                  disabled={pairingLoading || !phoneInput}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  {pairingLoading ? "Meminta kode..." : "Minta Kode"}
                </button>

                {pairingError && (
                  <p className="text-xs text-red-500 text-center">{pairingError}</p>
                )}

                {pairingCode && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-emerald-600 mb-2 font-medium">
                      Masukkan kode ini di WhatsApp
                    </p>
                    <p className="text-3xl font-bold text-emerald-700 tracking-[0.3em]">
                      {pairingCode}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Perangkat Tertaut → Tautkan dengan Nomor Telepon
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Scan QR ── */}
            {method === "qr" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 text-center">
                  Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat → Scan QR
                </p>

                {status.qrCode ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={status.qrCode}
                      alt="WhatsApp QR Code"
                      className="w-full rounded-lg border border-gray-100"
                    />
                    {/* Countdown bar */}
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        QR refresh dalam{" "}
                        <span className={qrCountdown <= 5 ? "text-red-400 font-bold" : "text-gray-500 font-medium"}>
                          {qrCountdown}s
                        </span>
                      </p>
                      <button
                        onClick={() => { fetchStatus(); setQrCountdown(20); }}
                        className="text-xs text-emerald-500 hover:text-emerald-700 font-medium transition"
                      >
                        🔄 Refresh
                      </button>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                      <div
                        className="bg-emerald-400 h-1 rounded-full transition-all duration-1000"
                        style={{ width: `${(qrCountdown / 20) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-3 animate-pulse">📱</div>
                      <p className="text-sm font-medium">Memuat QR Code...</p>
                      <p className="text-xs mt-1 text-gray-300">Tunggu beberapa detik</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-xs text-gray-300 mt-4">
              Modal tertutup otomatis saat terhubung
            </p>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
