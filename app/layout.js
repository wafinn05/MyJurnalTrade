import "./globals.css";

export const metadata = {
  title: "Trading Dashboard — Jurnal Trading Harian",
  description:
    "Dashboard pencatatan trading harian terintegrasi Telegram Bot. Pantau Profit/Loss, Winrate, dan pertumbuhan modal Anda secara real-time.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
