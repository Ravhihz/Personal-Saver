import { NextRequest, NextResponse } from "next/server";
import {
  hitungTotalPendapatan,
  hitungTotalPengeluaran,
  hitungBersih,
} from "@/lib/calculations";
import { appendTransaction, getAllTransactions } from "@/services/sheets";
import { sendTransactionNotification } from "@/services/whatsapp";
import type { Transaction, TransactionFormData } from "@/lib/types";

// ─── GET /api/transactions ────────────────────────────────────

export async function GET() {
  try {
    const transactions = await getAllTransactions();
    return NextResponse.json({ success: true, data: transactions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengambil data";
    console.error("[GET /api/transactions]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── POST /api/transactions ───────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: TransactionFormData = await req.json();

    // Basic validation
    if (!body.tanggal) {
      return NextResponse.json(
        { success: false, error: "Tanggal wajib diisi" },
        { status: 400 }
      );
    }

    // Calculate totals
    const totalPendapatanAplikasi = hitungTotalPendapatan(body.income);
    const totalPengeluaran = hitungTotalPengeluaran(body.expenses);
    const bersih = hitungBersih(totalPendapatanAplikasi, totalPengeluaran);

    // Build transaction record
    const transaction: Transaction = {
      id: `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      tanggal: body.tanggal,
      income: {
        dompetDigital: Array.isArray(body.income.dompetDigital)
          ? body.income.dompetDigital
          : [body.income.dompetDigital || 0],
        tunai: Array.isArray(body.income.tunai)
          ? body.income.tunai
          : [body.income.tunai || 0],
        tip: Array.isArray(body.income.tip)
          ? body.income.tip
          : [body.income.tip || 0],
        insentif: body.income.insentif || 0,
        uangPengganti: Array.isArray(body.income.uangPengganti)
          ? body.income.uangPengganti
          : [body.income.uangPengganti || 0],
      },
      expenses: body.expenses || [],
      totalPendapatanAplikasi,
      totalPengeluaran,
      bersih,
      createdAt: new Date().toISOString(),
    };

    // Save to Google Sheets
    await appendTransaction(transaction);

    // Send WhatsApp notification (non-blocking, don't fail the request if WA fails)
    sendTransactionNotification(transaction).catch((err) => {
      console.warn("[WA notification]", err?.message);
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan data";
    console.error("[POST /api/transactions]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

