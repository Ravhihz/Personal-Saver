import { google } from "googleapis";
import type { Transaction } from "@/lib/types";

// ─── Auth ─────────────────────────────────────────────────────

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL atau GOOGLE_PRIVATE_KEY belum dikonfigurasi di .env.local"
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getConfig() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || "Transaksi";

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SPREADSHEET_ID belum dikonfigurasi di .env.local");
  }

  return { spreadsheetId, sheetName, sheetDetail: `${sheetName} Detail` };
}

// ─── Headers ──────────────────────────────────────────────────

// Sheet "Transaksi" — 1 baris per hari, cocok untuk buku besar
const HEADERS_SUMMARY = [
  "ID",                     // A
  "Tanggal",                // B
  "Pendapatan Aplikasi",    // C — total
  "Dompet Digital",         // D — total
  "Tunai",                  // E — total
  "Tip",                    // F — total
  "Insentif",               // G
  "Uang Pengganti",         // H — total
  "Total Pengeluaran",      // I
  "Bersih",                 // J
  "Dibuat Pada",            // K
];

// Sheet "Transaksi Detail" — multi-row per transaksi, breakdown per item
const HEADERS_DETAIL = [
  "ID Transaksi",           // A — referensi ke sheet Transaksi
  "Tanggal",                // B
  "Tipe",                   // C — Dompet Digital / Tunai / Tip / Uang Pengganti / Pengeluaran
  "Keterangan",             // D — nama kategori pengeluaran, atau "-" untuk pendapatan
  "Nominal",                // E
];

// ─── Ensure sheet & header ────────────────────────────────────

async function ensureSheetWithHeader(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === sheetName
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }

  // Cek apakah header sudah ada
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1`,
  });

  const firstCell = check.data.values?.[0]?.[0] ?? "";
  if (firstCell !== headers[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

// ─── Format timestamp ke WIB ─────────────────────────────────

function formatWIB(isoString: string): string {
  return new Date(isoString).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(",", "") + " WIB";
}

// ─── Write a transaction ──────────────────────────────────────

export async function appendTransaction(tx: Transaction): Promise<void> {
  const auth = getAuth();
  const { spreadsheetId, sheetName, sheetDetail } = getConfig();
  const sheets = google.sheets({ version: "v4", auth });

  // Pastikan kedua sheet ada dengan header yang benar
  await Promise.all([
    ensureSheetWithHeader(sheets, spreadsheetId, sheetName, HEADERS_SUMMARY),
    ensureSheetWithHeader(sheets, spreadsheetId, sheetDetail, HEADERS_DETAIL),
  ]);

  const sumArr = (arr: number[]) => arr.reduce((s, v) => s + (v || 0), 0);

  // ── Sheet Transaksi: 1 baris ringkasan ──────────────────────
  const summaryRow = [
    tx.id,
    tx.tanggal,
    tx.totalPendapatanAplikasi,
    sumArr(tx.income.dompetDigital),
    sumArr(tx.income.tunai),
    sumArr(tx.income.tip),
    tx.income.insentif,
    sumArr(tx.income.uangPengganti),
    tx.totalPengeluaran,
    tx.bersih,
    formatWIB(tx.createdAt),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [summaryRow] },
  });

  // ── Sheet Detail: multi-baris breakdown ─────────────────────
  const detailRows: (string | number)[][] = [];

  for (const v of tx.income.dompetDigital) {
    if (v > 0) detailRows.push([tx.id, tx.tanggal, "Dompet Digital", "-", v]);
  }
  for (const v of tx.income.tunai) {
    if (v > 0) detailRows.push([tx.id, tx.tanggal, "Tunai", "-", v]);
  }
  for (const v of tx.income.tip) {
    if (v > 0) detailRows.push([tx.id, tx.tanggal, "Tip", "-", v]);
  }
  if (tx.income.insentif > 0) {
    detailRows.push([tx.id, tx.tanggal, "Insentif", "-", tx.income.insentif]);
  }
  for (const v of tx.income.uangPengganti) {
    if (v > 0) detailRows.push([tx.id, tx.tanggal, "Uang Pengganti", "-", v]);
  }
  for (const e of tx.expenses) {
    if (e.nominal > 0) detailRows.push([tx.id, tx.tanggal, "Pengeluaran", e.kategori, e.nominal]);
  }

  if (detailRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetDetail}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: detailRows },
    });
  }
}

// ─── Parse angka dari Sheets (handle format lokal/titik ribuan) ──

function parseSheetNumber(val: string | undefined): number {
  if (!val) return 0;
  const s = String(val).trim();

  // Jika ada koma DAN titik, tentukan mana pemisah ribuan vs desimal
  // Format ID: "86.400" atau "1.234.567" (titik = ribuan, tidak ada koma)
  // Format EN: "86,400" atau "1,234,567" (koma = ribuan, tidak ada titik)
  // Format desimal: "86.4" atau "86,4"

  // Cek apakah ini format Indonesia: titik muncul setiap 3 digit dari kanan
  // Contoh: "86.400", "1.234.567"
  const idThousands = /^\d{1,3}(\.\d{3})+$/.test(s);
  if (idThousands) {
    // Hapus semua titik (pemisah ribuan), tidak ada desimal
    return parseInt(s.replace(/\./g, ""), 10);
  }

  // Format EN dengan koma ribuan: "86,400"
  const enThousands = /^\d{1,3}(,\d{3})+$/.test(s);
  if (enThousands) {
    return parseInt(s.replace(/,/g, ""), 10);
  }

  // Angka biasa tanpa pemisah atau dengan desimal
  const num = parseFloat(s.replace(/,/g, "."));
  return isNaN(num) ? 0 : num;
}

// ─── Read all transactions ────────────────────────────────────

export async function getAllTransactions(): Promise<Transaction[]> {
  const auth = getAuth();
  const { spreadsheetId, sheetName, sheetDetail } = getConfig();
  const sheets = google.sheets({ version: "v4", auth });

  await Promise.all([
    ensureSheetWithHeader(sheets, spreadsheetId, sheetName, HEADERS_SUMMARY),
    ensureSheetWithHeader(sheets, spreadsheetId, sheetDetail, HEADERS_DETAIL),
  ]);

  // Baca sheet ringkasan
  const summaryRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:K`,
  });

  // Baca sheet detail
  const detailRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetDetail}!A2:E`,
  });

  const detailRows = detailRes.data.values ?? [];

  // Group detail rows by transaction ID
  const detailMap: Record<string, {
    dompetDigital: number[];
    tunai: number[];
    tip: number[];
    insentif: number;
    uangPengganti: number[];
    expenses: { id: string; kategori: string; nominal: number }[];
  }> = {};

  detailRows.forEach((row, idx) => {
    const id = row[0];
    if (!id) return;
    if (!detailMap[id]) {
      detailMap[id] = {
        dompetDigital: [],
        tunai: [],
        tip: [],
        insentif: 0,
        uangPengganti: [],
        expenses: [],
      };
    }
    const tipe = (row[2] || "").toString().toLowerCase();
    const nominal = parseSheetNumber(row[4]);
    const ket = row[3] || "-";

    if (tipe === "dompet digital") detailMap[id].dompetDigital.push(nominal);
    else if (tipe === "tunai") detailMap[id].tunai.push(nominal);
    else if (tipe === "tip") detailMap[id].tip.push(nominal);
    else if (tipe === "insentif") detailMap[id].insentif += nominal;
    else if (tipe === "uang pengganti") detailMap[id].uangPengganti.push(nominal);
    else if (tipe === "pengeluaran") {
      detailMap[id].expenses.push({
        id: `exp-${idx}`,
        kategori: ket,
        nominal,
      });
    }
  });

  const summaryRows = summaryRes.data.values ?? [];

  return summaryRows
    .filter((row) => row[0])
    .map((row) => {
      const id = row[0];
      const detail = detailMap[id];

      return {
        id,
        tanggal: row[1],
        income: {
          dompetDigital: detail?.dompetDigital.length ? detail.dompetDigital : [parseSheetNumber(row[3])],
          tunai: detail?.tunai.length ? detail.tunai : [parseSheetNumber(row[4])],
          tip: detail?.tip.length ? detail.tip : [parseSheetNumber(row[5])],
          insentif: detail?.insentif ?? parseSheetNumber(row[6]),
          uangPengganti: detail?.uangPengganti.length ? detail.uangPengganti : [parseSheetNumber(row[7])],
        },
        expenses: detail?.expenses ?? [],
        totalPendapatanAplikasi: parseSheetNumber(row[2]),
        totalPengeluaran: parseSheetNumber(row[8]),
        bersih: parseSheetNumber(row[9]),
        createdAt: row[10] || "",
      } satisfies Transaction;
    })
    .sort((a, b) => (b.tanggal > a.tanggal ? 1 : -1));
}
