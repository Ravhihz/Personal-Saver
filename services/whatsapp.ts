import path from "path";
import fs from "fs";
import qrcode from "qrcode";
import type { Transaction } from "@/lib/types";
import { formatRupiah } from "@/lib/calculations";
import { isRedisConfigured, useRedisAuthState } from "@/services/waSession";

// ─── Suppress Baileys internal unhandled rejections ──────────
// Baileys throws timeout/connection errors as unhandledRejection
// which spam the Next.js terminal. We catch and log them quietly.
if (typeof process !== "undefined") {
  const _originalListeners = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", (reason: unknown) => {
    // Silently ignore known Baileys timeout/boom errors
    if (
      reason &&
      typeof reason === "object" &&
      "isBoom" in reason &&
      (reason as { output?: { statusCode?: number } }).output?.statusCode === 408
    ) {
      return; // suppress WA timeout spam
    }
    // Re-emit for everything else
    for (const listener of _originalListeners) {
      (listener as (r: unknown) => void)(reason);
    }
  });
}

// Dynamic import Baileys to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let baileys: any = null;

async function getBaileys() {
  if (!baileys) {
    baileys = await import("@whiskeysockets/baileys");
  }
  return baileys;
}

// ─── Singleton socket state ────────────────────────────────────

interface WaState {
  sock: ReturnType<typeof import("@whiskeysockets/baileys").makeWASocket> | null;
  isConnected: boolean;
  isConnecting: boolean;
  qrCodeDataUrl: string | null;
  pairingCode: string | null;
  phoneNumber: string | null;
}

const state: WaState = {
  sock: null,
  isConnected: false,
  isConnecting: false,
  qrCodeDataUrl: null,
  pairingCode: null,
  phoneNumber: null,
};

// ─── Session directory ────────────────────────────────────────

function getSessionDir(): string {
  const dir = path.resolve(process.env.WA_SESSION_DIR || "./wa-session");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Connect ─────────────────────────────────────────────────

export async function connectWhatsApp(): Promise<void> {
  // Sudah connecting atau connected — skip
  if (state.isConnecting || (state.isConnected && state.sock)) return;
  state.isConnecting = true;

  const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
  } = await getBaileys();

  // ─── Auth state: Redis (persistent) atau file (lokal/fallback) ──
  let authState: Awaited<ReturnType<typeof useMultiFileAuthState>>["state"];
  let saveCreds: () => Promise<void>;

  if (isRedisConfigured()) {
    console.log("[WA] Menggunakan Upstash Redis untuk session storage");
    const redisAuth = await useRedisAuthState(await getBaileys());
    authState = redisAuth.state as typeof authState;
    saveCreds = redisAuth.saveCreds;
  } else {
    console.log("[WA] Menggunakan file system untuk session storage");
    const sessionDir = getSessionDir();
    const fileAuth = await useMultiFileAuthState(sessionDir);
    authState = fileAuth.state;
    saveCreds = fileAuth.saveCreds;
  }

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: authState,
    logger: (await import("pino")).default({ level: "silent" }),
  });

  state.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update: Record<string, unknown>) => {
    const { connection, lastDisconnect, qr } = update as {
      connection?: string;
      lastDisconnect?: { error?: { output?: { statusCode?: number } } };
      qr?: string;
    };

    if (qr) {
      state.qrCodeDataUrl = await qrcode.toDataURL(qr);
      state.isConnected = false;
      state.isConnecting = false;
    }

    if (connection === "open") {
      state.isConnected = true;
      state.isConnecting = false;
      state.qrCodeDataUrl = null;
      state.pairingCode = null;
      const jid = sock.user?.id ?? "";
      state.phoneNumber = jid.split(":")[0].split("@")[0];
    }

    if (connection === "close") {
      state.isConnected = false;
      state.isConnecting = false;
      state.pairingCode = null;
      state.sock = null;

      const statusCode = lastDisconnect?.error?.output?.statusCode;
      // Reconnect unless logged out (401)
      if (statusCode !== DisconnectReason.loggedOut) {
        setTimeout(() => connectWhatsApp(), 3000);
      }
    }
  });
}

// ─── Get current status ───────────────────────────────────────

export function getWhatsAppStatus() {
  return {
    connected: state.isConnected,
    qrCode: state.qrCodeDataUrl ?? undefined,
    pairingCode: state.pairingCode ?? undefined,
    phoneNumber: state.phoneNumber ?? undefined,
  };
}

// ─── Request pairing code (tanpa QR) ─────────────────────────

export async function requestPairingCode(phoneNumber: string): Promise<string> {
  if (state.isConnected) {
    throw new Error("WhatsApp sudah terhubung");
  }

  // Pastikan socket ada
  if (!state.sock) {
    await connectWhatsApp();
  }

  // Tunggu socket benar-benar siap (ada qr atau connecting) — max 15 detik
  const waitForSocket = async () => {
    const maxWait = 15000;
    const interval = 500;
    let elapsed = 0;
    while (elapsed < maxWait) {
      // Socket siap jika sudah ada qrCode (WA server terhubung) atau sock tidak null
      if (state.sock && (state.qrCodeDataUrl || state.isConnecting === false)) {
        return;
      }
      await new Promise((r) => setTimeout(r, interval));
      elapsed += interval;
    }
  };
  await waitForSocket();

  if (!state.sock) {
    throw new Error("Socket belum siap, coba lagi dalam beberapa detik");
  }

  if (state.isConnected) {
    throw new Error("WhatsApp sudah terhubung");
  }

  // Format nomor: pastikan tidak ada karakter selain angka
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Retry request pairing code sampai 3x karena kadang connection drop saat pertama kali
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const code = await state.sock.requestPairingCode(cleaned);
      state.pairingCode = code;
      return code;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[WA] Pairing code attempt ${attempt} gagal: ${lastError.message}`);
      if (attempt < 3) {
        // Reset dan reconnect sebelum retry
        state.sock = null;
        state.isConnected = false;
        state.isConnecting = false;
        await connectWhatsApp();
        await new Promise((r) => setTimeout(r, 5000)); // tunggu lebih lama
      }
    }
  }

  throw new Error(`Gagal mendapatkan pairing code setelah 3x percobaan: ${lastError?.message}`);
}

// ─── Send notification ────────────────────────────────────────

export async function sendTransactionNotification(
  tx: Transaction
): Promise<void> {
  const targetNumber = process.env.WA_TARGET_NUMBER;
  if (!targetNumber) {
    console.warn("[WA] WA_TARGET_NUMBER belum dikonfigurasi, notifikasi dilewati.");
    return;
  }

  if (!state.isConnected || !state.sock) {
    console.warn(`[WA] Tidak bisa kirim notifikasi — isConnected: ${state.isConnected}, sock: ${!!state.sock}`);
    return;
  }

  console.log(`[WA] Mengirim notifikasi ke ${targetNumber}...`);

  const jid = `${targetNumber}@s.whatsapp.net`;

  const tanda = tx.bersih >= 0 ? "✅" : "⚠️";

  // Format tanggal: "Selasa, 1 September 2026"
  const tanggalFormatted = new Date(tx.tanggal).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const message = `
💰 *LAPORAN HARIAN*
_Personal Saver_

📅 ${tanggalFormatted}

━━━━━━━━━━━━━━━━━━━━━
📥 Total Pendapatan
*${formatRupiah(tx.totalPendapatanAplikasi)}*

📤 Total Pengeluaran
*${formatRupiah(tx.totalPengeluaran)}*

━━━━━━━━━━━━━━━━━━━━━
${tanda} *Bersih: ${formatRupiah(tx.bersih)}*
━━━━━━━━━━━━━━━━━━━━━
`.trim();

  await state.sock.sendMessage(jid, { text: message });
  console.log(`[WA] ✅ Notifikasi berhasil dikirim ke ${targetNumber}`);
}
