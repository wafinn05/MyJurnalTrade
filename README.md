# 📈 Trading Dashboard

Dashboard pencatatan trading harian yang terintegrasi dengan **Bot Telegram**. Input Profit/Loss langsung dari Telegram, lihat performa di dashboard yang elegan.

## ✨ Fitur

- **Input via Telegram** — Cukup kirim angka ke bot untuk mencatat PnL
- **Input via Dashboard** — Form cepat langsung dari web
- **Statistik Lengkap** — Net PnL, Winrate Harian, Pertumbuhan Modal, Pajak 10%
- **Grafik Interaktif** — Visualisasi PnL harian & kumulatif
- **Rekap Bulanan Otomatis** — Bot mengirim laporan setiap tanggal 1
- **Modal per Bulan** — Lacak modal dan pertumbuhannya
- **Dark Mode Premium** — Desain modern dan responsif
- **Siap Deploy** — Langsung deploy ke Vercel

## 🚀 Cara Setup

### 1. Install Node.js
Download dan install dari [nodejs.org](https://nodejs.org/en/download)

### 2. Install Dependencies
```bash
cd jurnal
npm install
```

### 3. Setup Database PostgreSQL
Buat database gratis di [Supabase](https://supabase.com) atau [Neon](https://neon.tech), lalu salin URL koneksinya.

### 4. Buat Bot Telegram
1. Buka Telegram, cari `@BotFather`
2. Kirim `/newbot`
3. Ikuti instruksi sampai mendapat **token API**
4. Salin token tersebut

### 5. Isi File `.env`
Edit file `.env` dan isi:
```
TELEGRAM_BOT_TOKEN=token_bot_anda
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CRON_SECRET=buat_string_acak_disini
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Setup Database
```bash
npx prisma db push
```

### 7. Jalankan
```bash
npm run dev
```

Buka `http://localhost:3000` di browser.

### 8. Aktifkan Bot
Buka bot Telegram Anda, kirim `/start`, lalu akses:
```
http://localhost:3000/api/telegram (GET)
```
untuk mendaftarkan webhook (hanya perlu sekali saat deploy).

## 📱 Perintah Telegram

| Perintah | Fungsi |
|----------|--------|
| `/start` | Aktivasi bot & daftarkan Chat ID |
| `150000` | Input profit Rp150.000 |
| `-50000` | Input loss Rp50.000 |
| `200000 XAUUSD buy` | Input dengan catatan |
| `/status` | Ringkasan hari ini |
| `/bulan` | Ringkasan bulan ini |
| `/bantuan` | Tampilkan bantuan |

## 🌐 Deploy ke Vercel

1. Push kode ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Isi Environment Variables di Vercel Dashboard
4. Deploy!
5. Setelah deploy, buka `https://domain-anda.vercel.app/api/telegram` sekali untuk setup webhook

## 🛠️ Tech Stack

- **Next.js 15** — Framework React full-stack
- **Prisma** — ORM untuk PostgreSQL
- **Chart.js** — Visualisasi grafik
- **Telegram Bot API** — Webhook-based bot
- **Vercel** — Hosting & Cron Jobs
