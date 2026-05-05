import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendTelegramMessage, formatIDR } from "@/lib/telegram";

/**
 * POST /api/telegram
 * Webhook handler untuk menerima pesan dari Telegram Bot
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const message = body?.message;

    // Validasi: pastikan ada pesan masuk
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    // ====== COMMAND: /start ======
    if (text === "/start") {
      await prisma.userConfig.upsert({
        where: { id: "main" },
        update: { telegramChatId: chatId },
        create: { id: "main", telegramChatId: chatId },
      });

      await sendTelegramMessage(
        chatId,
        `<b>Trading Dashboard Bot Aktif!</b>\n\n` +
          `Chat ID Anda: <code>${chatId}</code>\n\n` +
          `<b>Cara Penggunaan:</b>\n` +
          `- Kirim angka positif untuk <b>Profit</b>\n` +
          `  Contoh: <code>150000</code> = Profit Rp150.000\n\n` +
          `- Kirim angka negatif untuk <b>Loss</b>\n` +
          `  Contoh: <code>-50000</code> = Loss Rp50.000\n\n` +
          `- Tambahkan catatan setelah angka (opsional)\n` +
          `  Contoh: <code>200000 XAUUSD buy</code>\n\n` +
          `<b>Perintah:</b>\n` +
          `/status - Ringkasan hari ini\n` +
          `/bulan - Ringkasan bulan ini\n` +
          `/modal - Set modal bulan ini\n` +
          `/bantuan - Tampilkan bantuan`
      );

      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /bantuan ======
    if (text === "/bantuan" || text === "/help") {
      await sendTelegramMessage(
        chatId,
        `<b>Panduan Trading Dashboard Bot</b>\n\n` +
          `<b>Input Profit/Loss:</b>\n` +
          `- <code>150000</code> = Profit Rp150.000\n` +
          `- <code>-50000</code> = Loss Rp50.000\n` +
          `- <code>200000 XAUUSD long</code> = Dengan catatan\n\n` +
          `<b>Perintah:</b>\n` +
          `/status - Ringkasan hari ini\n` +
          `/bulan - Ringkasan bulan ini\n` +
          `/modal - Set modal bulan ini\n` +
          `/bantuan - Tampilkan pesan ini`
      );
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /status ======
    if (text === "/status") {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      const todayTrades = await prisma.tradeLog.findMany({
        where: { date: { gte: startOfDay, lt: endOfDay } },
        orderBy: { date: "desc" },
      });

      if (todayTrades.length === 0) {
        await sendTelegramMessage(
          chatId,
          `<b>Status Hari Ini</b>\n\nBelum ada input trading hari ini.`
        );
        return NextResponse.json({ ok: true });
      }

      const totalPnl = todayTrades.reduce((sum, t) => sum + t.amount, 0);
      const indicator = totalPnl >= 0 ? "PROFIT" : "LOSS";

      let statusText = `<b>Status Hari Ini</b>\n`;
      statusText += `${today.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n\n`;
      statusText += `<b>Total PnL: ${formatIDR(totalPnl)}</b> (${indicator})\n`;
      statusText += `Jumlah Input: ${todayTrades.length}\n\n`;

      todayTrades.forEach((trade) => {
        const sign = trade.amount >= 0 ? "+" : "";
        statusText += `${sign}${formatIDR(trade.amount)}`;
        if (trade.note) statusText += ` - ${trade.note}`;
        statusText += "\n";
      });

      await sendTelegramMessage(chatId, statusText);
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /bulan ======
    if (text === "/bulan") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const monthTrades = await prisma.tradeLog.findMany({
        where: { date: { gte: startOfMonth, lt: endOfMonth } },
      });

      const capital = await prisma.capital.findUnique({
        where: {
          month_year: {
            month: now.getMonth() + 1,
            year: now.getFullYear(),
          },
        },
      });

      const netPnl = monthTrades.reduce((sum, t) => sum + t.amount, 0);
      const pajak = netPnl > 0 ? netPnl * 0.1 : 0;

      const tradingDays = new Set(
        monthTrades.map((t) => t.date.toISOString().split("T")[0])
      );

      const dailyPnl = {};
      monthTrades.forEach((t) => {
        const key = t.date.toISOString().split("T")[0];
        dailyPnl[key] = (dailyPnl[key] || 0) + t.amount;
      });
      const winDays = Object.values(dailyPnl).filter((v) => v > 0).length;
      const lossDays = Object.values(dailyPnl).filter((v) => v < 0).length;
      const winrate =
        tradingDays.size > 0
          ? ((winDays / tradingDays.size) * 100).toFixed(1)
          : 0;

      const growth =
        capital && capital.amount > 0
          ? ((netPnl / capital.amount) * 100).toFixed(2)
          : "N/A";

      const monthName = now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });

      let recap = `<b>Ringkasan Bulan ${monthName}</b>\n\n`;
      recap += `Modal: ${capital ? formatIDR(capital.amount) : "Belum diset"}\n`;
      recap += `Net PnL: <b>${formatIDR(netPnl)}</b>\n`;
      recap += `Pajak (10%): ${formatIDR(pajak)}\n`;
      recap += `Hari Trading: ${tradingDays.size} hari\n`;
      recap += `Pertumbuhan Modal: ${growth === "N/A" ? growth : growth + "%"}\n`;
      recap += `Winrate Harian: ${winrate}% (${winDays}W / ${lossDays}L)\n`;

      await sendTelegramMessage(chatId, recap);
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /modal ======
    if (text === "/modal") {
      const now = new Date();
      const monthName = now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });

      // Set waiting state
      await prisma.userConfig.upsert({
        where: { id: "main" },
        update: { telegramChatId: chatId, waitingCapital: true },
        create: { id: "main", telegramChatId: chatId, waitingCapital: true },
      });

      await sendTelegramMessage(
        chatId,
        `<b>Set Modal - ${monthName}</b>\n\n` +
          `Kirim jumlah modal trading Anda untuk bulan ini.\n` +
          `Contoh: <code>10000000</code> untuk Rp10.000.000\n\n` +
          `Ketik /batal untuk membatalkan.`
      );
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /batal ======
    if (text === "/batal") {
      await prisma.userConfig.update({
        where: { id: "main" },
        data: { waitingCapital: false },
      });

      await sendTelegramMessage(
        chatId,
        `Input modal dibatalkan.`
      );
      return NextResponse.json({ ok: true });
    }

    // ====== CHECK WAITING STATE ======
    const config = await prisma.userConfig.findUnique({ where: { id: "main" } });

    // ====== WAITING FOR CAPITAL INPUT ======
    if (config?.waitingCapital) {
      const amount = parseFloat(text.replace(/[^0-9]/g, ""));

      if (isNaN(amount) || amount <= 0) {
        await sendTelegramMessage(
          chatId,
          `Format tidak valid. Kirim angka modal Anda.\nContoh: <code>10000000</code>\n\nKetik /batal untuk membatalkan.`
        );
        return NextResponse.json({ ok: true });
      }

      const now = new Date();
      const targetMonth = now.getMonth() + 1;
      const targetYear = now.getFullYear();

      await prisma.capital.upsert({
        where: { month_year: { month: targetMonth, year: targetYear } },
        update: { amount },
        create: { amount, month: targetMonth, year: targetYear },
      });

      // Reset waiting state
      await prisma.userConfig.update({
        where: { id: "main" },
        data: { waitingCapital: false },
      });

      const monthName = now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });

      await sendTelegramMessage(
        chatId,
        `<b>Modal Berhasil Disimpan</b>\n\n` +
          `Periode: ${monthName}\n` +
          `Modal: <b>${formatIDR(amount)}</b>\n\n` +
          `Dashboard telah diperbarui.`
      );
      return NextResponse.json({ ok: true });
    }

    // ====== INPUT PNL (Angka) ======
    const parts = text.split(/\s+/);
    const amount = parseFloat(parts[0]);

    if (isNaN(amount)) {
      await sendTelegramMessage(
        chatId,
        `Format tidak dikenali.\n\nKirim angka untuk input PnL:\n- <code>150000</code> = Profit\n- <code>-50000</code> = Loss\n\nKetik /bantuan untuk info lebih lanjut.`
      );
      return NextResponse.json({ ok: true });
    }

    const note = parts.slice(1).join(" ") || null;
    const now = new Date();

    await prisma.tradeLog.create({
      data: {
        amount: amount,
        date: now,
        note: note,
        source: "telegram",
      },
    });

    // Hitung total hari ini
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const todayTrades = await prisma.tradeLog.findMany({
      where: { date: { gte: startOfDay, lt: endOfDay } },
    });

    const totalToday = todayTrades.reduce((sum, t) => sum + t.amount, 0);
    const pnlLabel = amount >= 0 ? "Profit" : "Loss";
    const totalLabel = totalToday >= 0 ? "PROFIT" : "LOSS";

    let confirmText = `<b>Input Berhasil - ${pnlLabel}</b>\n\n`;
    confirmText += `PnL: <b>${formatIDR(amount)}</b>\n`;
    if (note) confirmText += `Catatan: ${note}\n`;
    confirmText += `Waktu: ${now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}\n\n`;
    confirmText += `Total Hari Ini: <b>${formatIDR(totalToday)}</b> (${totalLabel}, ${todayTrades.length} input)`;

    await sendTelegramMessage(chatId, confirmText);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint untuk setup webhook
export async function GET(request) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL belum diset" },
        { status: 500 }
      );
    }

    const cleanAppUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
    const webhookUrl = `${cleanAppUrl}/api/telegram`;

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message"],
        }),
      }
    );

    const result = await response.json();
    return NextResponse.json({
      message: "Webhook berhasil diset!",
      webhookUrl,
      telegramResponse: result,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
