import { NextRequest, NextResponse } from "next/server";
import { requestPairingCode } from "@/services/whatsapp";

// ─── POST /api/whatsapp/pair ──────────────────────────────────
// Request pairing code dengan nomor HP (tanpa QR scan)
// Body: { phoneNumber: "628xxxxxxxxxx" }

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "phoneNumber wajib diisi" },
        { status: 400 }
      );
    }

    const code = await requestPairingCode(phoneNumber);
    return NextResponse.json({ success: true, data: { code } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal request pairing code";
    console.error("[POST /api/whatsapp/pair]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
