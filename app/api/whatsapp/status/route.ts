import { NextResponse } from "next/server";
import { getWhatsAppStatus, connectWhatsApp } from "@/services/whatsapp";

// ─── GET /api/whatsapp/status ─────────────────────────────────
// Returns current WA connection state.
// Also kicks off connection if not yet started.

export async function GET() {
  try {
    // Trigger connection (idempotent — safe to call multiple times)
    await connectWhatsApp();

    const status = getWhatsAppStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal cek status WA";
    console.error("[GET /api/whatsapp/status]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
