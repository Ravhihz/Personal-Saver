# 💰 Personal Saver

> Catat penghasilan ojol & usaha harian — otomatis simpan ke Google Sheets dan kirim ringkasan ke WhatsApp.

---

## ✨ Fitur

| Fitur | Keterangan |
|-------|-----------|
| 📥 **Catat Pendapatan** | Dompet Digital, Tunai, Tip, Insentif, Uang Pengganti |
| 📤 **Catat Pengeluaran** | Kategori dinamis: Makan, Bensin, Toll, Parkir, Lainnya |
| 🧮 **Auto-hitung** | Total Pendapatan, Total Pengeluaran, dan Bersih — otomatis |
| 📊 **Google Sheets** | Semua data tersimpan rapi di spreadsheet-mu sendiri |
| 💬 **Notifikasi WhatsApp** | Ringkasan harian dikirim otomatis via Baileys setelah submit |
| 🔐 **Session Persisten** | Sekali scan QR, WA tetap terhubung walau server restart |

---

## 🏗️ Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** — UI mobile-first
- **Google Sheets API** via Service Account
- **Baileys** — WhatsApp Web library (tanpa API berbayar)
- **Zustand** — state management ringan

---

## ⚙️ Konfigurasi

Salin `.env.example` → `.env.local` lalu isi semua variabel:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=   # Email service account
GOOGLE_PRIVATE_KEY=             # Private key dari JSON credential
GOOGLE_SPREADSHEET_ID=          # ID spreadsheet tujuan
GOOGLE_SHEET_NAME=Transaksi     # Nama tab (default: Transaksi)

WA_TARGET_NUMBER=628xxxxxxxxxx  # Nomor WA tujuan notifikasi
WA_SESSION_DIR=./wa-session     # Folder session Baileys
```

### Google Sheets — cara setup
1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project → aktifkan **Google Sheets API**
3. Buat **Service Account** → download JSON key
4. Ambil `client_email` dan `private_key` dari JSON tersebut
5. Share spreadsheet-mu ke email service account sebagai **Editor**

### WhatsApp — cara connect
1. Jalankan app → klik tombol **Hubungkan** di header
2. Scan QR code yang muncul menggunakan WhatsApp di HP
3. Session tersimpan otomatis di folder `wa-session/` — tidak perlu scan ulang

---

## 📱 Tampilan

```
╔════════════════════════╗
   💰 PERSONAL SAVER
   Ringkasan Harian
╚════════════════════════╝

📅 Tanggal: 01/09/2026
💰 Total Pendapatan : Rp 285.000
💸 Total Pengeluaran: Rp 75.000
✅ Bersih           : Rp 210.000
```

---

## 📁 Struktur Proyek

```
personal-saver/
├── app/
│   ├── api/
│   │   ├── transactions/route.ts   # POST & GET transaksi
│   │   └── whatsapp/
│   │       ├── status/route.ts     # Cek status koneksi WA
│   │       └── qr/route.ts         # Ambil QR code
│   ├── layout.tsx
│   └── page.tsx                    # Halaman utama
├── components/
│   ├── IncomeForm.tsx              # Form pendapatan
│   ├── ExpenseForm.tsx             # Form pengeluaran dinamis
│   ├── SummaryCard.tsx             # Kartu ringkasan real-time
│   ├── TransactionList.tsx         # Daftar riwayat
│   └── WaStatusBar.tsx             # Status & QR WhatsApp
├── lib/
│   ├── types.ts                    # Type definitions
│   ├── calculations.ts             # Logika hitung
│   └── store.ts                    # Zustand store
├── services/
│   ├── sheets.ts                   # Google Sheets service
│   └── whatsapp.ts                 # Baileys WA service
└── .env.example                    # Template konfigurasi
```

---

## 🔒 Keamanan

- `.env.local` dan folder `wa-session/` sudah masuk `.gitignore` — **jangan pernah di-commit**
- Notifikasi WhatsApp hanya dikirim ke nomor yang dikonfigurasi di `WA_TARGET_NUMBER`
- Google Sheets diakses via Service Account — tidak butuh OAuth user

---

<p align="center">
  Dibuat dengan ❤️ untuk para pejuang jalanan 🛵
</p>
