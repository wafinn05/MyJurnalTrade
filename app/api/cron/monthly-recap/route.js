import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendTelegramMessage, formatIDR, formatPercent } from "@/lib/telegram";

/**
 * GET /api/cron/monthly-recap
 * Dipanggil oleh Vercel Cron setiap tanggal 1 jam 00:01 WIB
 * Mengirim rekap trading bulan lalu ke Telegram
 * Lalu otomatis meminta input modal untuk bulan baru
 */
export async function GET(request) {
  try {
    // Verifikasi CRON_SECRET untuk keamanan
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil chat ID user
    const config = await prisma.userConfig.findUnique({ where: { id: "main" } });
    if (!config?.telegramChatId) {
      return NextResponse.json({ error: "Chat ID belum diset" }, { status: 400 });
    }

    // Hitung bulan lalu
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const startOfLastMonth = new Date(lastYear, lastMonth - 1, 1);
    const endOfLastMonth = new Date(lastYear, lastMonth, 1);

    // Ambil semua trade bulan lalu
    const trades = await prisma.tradeLog.findMany({
      where: { date: { gte: startOfLastMonth, lt: endOfLastMonth } },
      orderBy: { date: "asc" },
    });

    // Ambil modal bulan lalu
    const capital = await prisma.capital.findUnique({
      where: { month_year: { month: lastMonth, year: lastYear } },
    });

    const capitalAmount = capital?.amount || 0;
    const netPnl = trades.reduce((sum, t) => sum + t.amount, 0);
    const pajak = netPnl > 0 ? netPnl * 0.1 : 0;

    // Hitung statistik per hari
    const dailyPnl = {};
    trades.forEach((t) => {
      const key = t.date.toISOString().split("T")[0];
      dailyPnl[key] = (dailyPnl[key] || 0) + t.amount;
    });

    const tradingDays = Object.keys(dailyPnl).length;
    const winDays = Object.values(dailyPnl).filter((v) => v > 0).length;
    const lossDays = Object.values(dailyPnl).filter((v) => v < 0).length;
    const winrate = tradingDays > 0 ? ((winDays / tradingDays) * 100).toFixed(1) : "0";
    const growth = capitalAmount > 0 ? ((netPnl / capitalAmount) * 100).toFixed(2) : "N/A";

    const monthName = startOfLastMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

    // Susun pesan rekap (tanpa emoji)
    let recap = `<b>REKAP TRADING BULANAN</b>\n`;
    recap += `<b>${monthName}</b>\n\n`;
    recap += `━━━━━━━━━━━━━━━━━━━━\n`;
    recap += `<b>Modal:</b> ${formatIDR(capitalAmount)}\n`;
    recap += `<b>Net PnL:</b> ${formatIDR(netPnl)}\n`;
    recap += `<b>Pajak (10%):</b> ${formatIDR(pajak)}\n`;
    recap += `<b>PnL Setelah Pajak:</b> ${formatIDR(netPnl - pajak)}\n`;
    recap += `━━━━━━━━━━━━━━━━━━━━\n`;
    recap += `<b>Hari Trading:</b> ${tradingDays} hari\n`;
    recap += `<b>Pertumbuhan Modal:</b> ${growth === "N/A" ? growth : growth + "%"}\n`;
    recap += `<b>Winrate Harian:</b> ${winrate}%\n`;
    recap += `   Win: ${winDays} hari | Loss: ${lossDays} hari\n`;
    recap += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    recap += `<i>Tetap konsisten dan jaga manajemen risiko!</i>`;

    await sendTelegramMessage(config.telegramChatId, recap);

    // === OTOMATIS MINTA INPUT MODAL BULAN BARU ===
    const newMonthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

    // Set waiting state supaya bot tahu user sedang input modal
    await prisma.userConfig.update({
      where: { id: "main" },
      data: { waitingCapital: true },
    });

    await sendTelegramMessage(
      config.telegramChatId,
      `<b>Set Modal - ${newMonthName}</b>\n\n` +
        `Bulan baru telah dimulai. Silakan kirim jumlah modal trading Anda untuk bulan ini.\n` +
        `Contoh: <code>10000000</code> untuk Rp10.000.000\n\n` +
        `Ketik /batal untuk melewati.`
    );

    return NextResponse.json({ message: "Rekap bulanan berhasil dikirim", month: monthName });
  } catch (error) {
    console.error("Monthly Recap Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
