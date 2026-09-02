import { NextResponse } from "next/server";
import { getWhatsAppStatus } from "@/services/whatsapp";

// ─── GET /api/whatsapp/qr ─────────────────────────────────────
// Returns the current QR code data URL for scanning.
// Returns 404 if WA is already connected or QR not yet generated.

export async function GET() {
  const status = getWhatsAppStatus();

  if (status.connected) {
    return NextResponse.json(
      { success: false, error: "WhatsApp sudah terhubung" },
      { status: 200 }
    );
  }

  if (!status.qrCode) {
    return NextResponse.json(
      { success: false, error: "QR Code belum tersedia, tunggu sebentar..." },
      { status: 202 }
    );
  }

  return NextResponse.json({ success: true, data: { qrCode: status.qrCode } });
}
