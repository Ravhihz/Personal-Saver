import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Personal Saver — Catat Keuangan Ojol",
  description:
    "Aplikasi pencatatan keuangan harian untuk driver ojol dan usaha lainnya. Otomatis simpan ke Google Sheets dan kirim ringkasan ke WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={geist.variable}>
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
