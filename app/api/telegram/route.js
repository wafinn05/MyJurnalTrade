import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendTelegramMessage, editTelegramMessage, formatIDR } from "@/lib/telegram";

export async function POST(request) {
  try {
    const body = await request.json();

    // ====== HANDLE CALLBACK QUERIES (INLINE BUTTONS) ======
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const data = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id.toString();
      const messageId = callbackQuery.message.message_id;

      if (data === "confirm_reset") {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
        const endOfMonth = new Date(Date.UTC(year, month, 1));

        // Hapus data bulan ini
        await prisma.tradeLog.deleteMany({
          where: { date: { gte: startOfMonth, lt: endOfMonth } }
        });
        await prisma.capital.deleteMany({
          where: { month, year }
        });

        await editTelegramMessage(
          chatId,
          messageId,
          "🗑️ <b>DATA BERHASIL DIRESET</b>\n\nSeluruh riwayat trading dan modal di bulan ini telah dihapus dari sistem. Mari mulai lembaran baru dengan lebih disiplin! 💪✨"
        );
      } else if (data === "cancel_reset") {
        await editTelegramMessage(
          chatId,
          messageId,
          "🛡️ <b>RESET DIBATALKAN</b>\n\nFiuhh! Hampir saja. Data trading Anda tetap aman tersimpan. Lanjutkan profitnya! 🚀"
        );
      }

      // Acknowledge callback ke Telegram
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQuery.id })
      });

      return NextResponse.json({ ok: true });
    }

    // ====== HANDLE NORMAL MESSAGES ======
    const message = body?.message;
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
        `👋 <b>Selamat Datang di Jurnal Trading Pro!</b> 📊\n\n` +
          `Bot ini akan menyinkronkan setiap trading Anda langsung ke Dashboard secara <i>real-time</i>.\n\n` +
          `📝 <b>Cara Pencatatan:</b>\n` +
          `🟢 Kirim angka positif untuk <b>Profit</b>\n` +
          `  <i>Contoh:</i> <code>150000 XAUUSD Buy</code>\n\n` +
          `🔴 Kirim angka negatif untuk <b>Loss</b>\n` +
          `  <i>Contoh:</i> <code>-50000 EURUSD Kena SL</code>\n\n` +
          `🛠️ <b>Menu Perintah Utama:</b>\n` +
          `💰 /modal - Set target/modal bulan ini\n` +
          `📅 /status - Laporan performa hari ini\n` +
          `📈 /bulan - Rekapitulasi bulan ini\n` +
          `⚠️ /reset - Hapus semua data bulan ini\n` +
          `ℹ️ /bantuan - Panduan lengkap`
      );
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /bantuan ======
    if (text === "/bantuan" || text === "/help") {
      await sendTelegramMessage(
        chatId,
        `📚 <b>Panduan Penggunaan Bot</b>\n\n` +
          `Mencatat trade itu mudah! Cukup ketik nominal (angka) beserta catatan opsional.\n\n` +
          `<b>Contoh Input:</b>\n` +
          `✅ <code>150000 TP1 Gold</code> (Mencatat profit)\n` +
          `❌ <code>-25000</code> (Mencatat loss tanpa catatan)\n\n` +
          `<b>Daftar Perintah Lanjutan:</b>\n` +
          `🔹 /status - Lihat ringkasan PnL harian\n` +
          `🔹 /bulan - Lihat PnL, Winrate & Growth bulanan\n` +
          `🔹 /modal - Atur saldo awal bulan\n` +
          `🔹 /reset - Bersihkan seluruh data bulan ini\n\n` +
          `<i>💡 Tips: Selalu catat setiap trade agar statistik dashboard Anda akurat!</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /reset ======
    if (text === "/reset") {
      const resetMsg = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "⚠️ <b>PERINGATAN ZONA BERBAHAYA</b> ⚠️\n\nApakah Anda YAKIN ingin menghapus <b>SELURUH</b> data riwayat trading beserta pengaturan modal untuk bulan ini?\n\n<i>Tindakan ini permanen dan tidak dapat dibatalkan.</i>",
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ YA, HAPUS SEMUA DATA", callback_data: "confirm_reset" }
              ],
              [
                { text: "❌ BATALKAN", callback_data: "cancel_reset" }
              ]
            ]
          }
        })
      });
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /past (Input Trading Masa Lalu) ======
    if (text.startsWith("/past ")) {
      const parts = text.split(/\s+/);
      // Format: /past YYYY-MM-DD NOMINAL [Catatan]
      if (parts.length < 3) {
        await sendTelegramMessage(chatId, `⚠️ Format salah.\nGunakan: <code>/past YYYY-MM-DD NOMINAL [Catatan]</code>\nContoh: <code>/past 2026-04-15 150000 Profit</code>`);
        return NextResponse.json({ ok: true });
      }

      const dateStr = parts[1];
      const amount = parseFloat(parts[2]);
      const note = parts.slice(3).join(" ") || null;

      if (isNaN(amount) || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        await sendTelegramMessage(chatId, `⚠️ Format salah.\nPastikan tanggal pakai format YYYY-MM-DD dan nominal berupa angka.`);
        return NextResponse.json({ ok: true });
      }

      const pastDate = new Date(`${dateStr}T12:00:00Z`); // Jam 12 siang UTC agar aman dari timezone

      await prisma.tradeLog.create({
        data: {
          amount: amount,
          date: pastDate,
          note: note,
          source: "telegram",
        },
      });

      await sendTelegramMessage(chatId, `✅ <b>Data Masa Lalu Tersimpan</b>\n\nTanggal: ${dateStr}\nPnL: <b>${formatIDR(amount)}</b>\nCatatan: ${note || "-"}\n\n<i>Data telah masuk ke dashboard.</i>`);
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /pastmodal (Input Modal Masa Lalu) ======
    if (text.startsWith("/pastmodal ")) {
      const parts = text.split(/\s+/);
      // Format: /pastmodal YYYY-MM NOMINAL
      if (parts.length < 3) {
        await sendTelegramMessage(chatId, `⚠️ Format salah.\nGunakan: <code>/pastmodal YYYY-MM NOMINAL</code>\nContoh: <code>/pastmodal 2026-04 10000000</code>`);
        return NextResponse.json({ ok: true });
      }

      const monthStr = parts[1];
      const amount = parseFloat(parts[2]);

      if (isNaN(amount) || !/^\d{4}-\d{2}$/.test(monthStr)) {
        await sendTelegramMessage(chatId, `⚠️ Format salah.\nPastikan bulan pakai format YYYY-MM dan nominal berupa angka.`);
        return NextResponse.json({ ok: true });
      }

      const [yearStr, mStr] = monthStr.split("-");
      const targetYear = parseInt(yearStr);
      const targetMonth = parseInt(mStr);

      await prisma.capital.upsert({
        where: { month_year: { month: targetMonth, year: targetYear } },
        update: { amount },
        create: { amount, month: targetMonth, year: targetYear },
      });

      await sendTelegramMessage(chatId, `✅ <b>Modal Masa Lalu Tersimpan</b>\n\nPeriode: ${monthStr}\nModal: <b>${formatIDR(amount)}</b>\n\n<i>Dashboard telah diperbarui.</i>`);
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /status ======
    if (text === "/status") {
      const today = new Date();
      const startOfDay = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
      );
      const endOfDay = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      );

      const todayTrades = await prisma.tradeLog.findMany({
        where: { date: { gte: startOfDay, lt: endOfDay } },
        orderBy: { date: "desc" },
      });

      if (todayTrades.length === 0) {
        await sendTelegramMessage(
          chatId,
          `💤 <b>Laporan Harian</b>\n\nBelum ada aktivitas trading yang tercatat hari ini. Semoga market hari ini bersahabat! 📈`
        );
        return NextResponse.json({ ok: true });
      }

      const totalPnl = todayTrades.reduce((sum, t) => sum + t.amount, 0);
      const indicator = totalPnl >= 0 ? "🟢 PROFIT" : "🔴 LOSS";

      let statusText = `📊 <b>Status Trading Hari Ini</b>\n`;
      statusText += `<i>${today.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</i>\n\n`;
      statusText += `Total Entri: <b>${todayTrades.length} Trade</b>\n`;
      statusText += `Net PnL: <b>${formatIDR(totalPnl)}</b> (${indicator})\n\n`;
      statusText += `<b>📝 Riwayat Terakhir:</b>\n`;

      todayTrades.slice(0, 5).forEach((t, index) => {
        const mark = t.amount >= 0 ? "✅" : "❌";
        const prefix = t.amount >= 0 ? "+" : "";
        const catatan = t.note ? ` <i>(${t.note})</i>` : "";
        statusText += `${index + 1}. ${mark} ${prefix}${formatIDR(t.amount)}${catatan}\n`;
      });

      if (todayTrades.length > 5) {
        statusText += `\n<i>...dan ${todayTrades.length - 5} trade lainnya di dashboard.</i>`;
      }

      await sendTelegramMessage(chatId, statusText);
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /bulan ======
    if (text === "/bulan") {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
      const endOfMonth = new Date(Date.UTC(year, month, 1));

      const [trades, capital] = await Promise.all([
        prisma.tradeLog.findMany({
          where: { date: { gte: startOfMonth, lt: endOfMonth } },
        }),
        prisma.capital.findUnique({
          where: { month_year: { month, year } },
        }),
      ]);

      const netPnl = trades.reduce((sum, t) => sum + t.amount, 0);
      const pajak = netPnl > 0 ? netPnl * 0.1 : 0;

      const dailyPnl = {};
      trades.forEach((t) => {
        const dateKey = t.date.toISOString().split("T")[0];
        if (!dailyPnl[dateKey]) dailyPnl[dateKey] = 0;
        dailyPnl[dateKey] += t.amount;
      });

      const tradingDays = Object.keys(dailyPnl).length;
      const winDays = Object.values(dailyPnl).filter((d) => d > 0).length;
      const lossDays = Object.values(dailyPnl).filter((d) => d < 0).length;
      const winrate = tradingDays > 0 ? ((winDays / tradingDays) * 100).toFixed(1) : 0;
      
      const growth = capital && capital.amount > 0
        ? ((netPnl / capital.amount) * 100).toFixed(2)
        : "N/A";

      const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

      let recap = `🏆 <b>Rekapitulasi Bulan ${monthName}</b> 🏆\n\n`;
      recap += `💼 Modal Awal: <b>${capital ? formatIDR(capital.amount) : "Belum diset"}</b>\n`;
      recap += `💵 Net PnL: <b>${formatIDR(netPnl)}</b>\n`;
      recap += `🏢 Est. Pajak (10%): ${formatIDR(pajak)}\n`;
      recap += `📅 Hari Trading: ${tradingDays} hari aktif\n`;
      recap += `🚀 Pertumbuhan: <b>${growth === "N/A" ? growth : growth + "%"}</b>\n`;
      recap += `🎯 Winrate Harian: ${winrate}% (${winDays} Win / ${lossDays} Loss)\n\n`;
      recap += `<i>Cek detail grafik selengkapnya di Dashboard Web!</i>`;

      await sendTelegramMessage(chatId, recap);
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /modal ======
    if (text === "/modal") {
      const now = new Date();
      const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

      await prisma.userConfig.upsert({
        where: { id: "main" },
        update: { telegramChatId: chatId, waitingCapital: true },
        create: { id: "main", telegramChatId: chatId, waitingCapital: true },
      });

      await sendTelegramMessage(
        chatId,
        `🏦 <b>Setup Modal Awal - ${monthName}</b>\n\n` +
          `Berapa target modal trading Anda bulan ini?\n` +
          `Silakan balas dengan angka.\n\n` +
          `<i>Contoh:</i> <code>10000000</code> <i>(Untuk Rp 10.000.000)</i>\n\n` +
          `Ketik /batal jika tidak ingin mengubah.`
      );
      return NextResponse.json({ ok: true });
    }

    // ====== COMMAND: /batal ======
    if (text === "/batal") {
      await prisma.userConfig.update({
        where: { id: "main" },
        data: { waitingCapital: false },
      });

      await sendTelegramMessage(chatId, `🚫 <b>Dibatalkan</b>\n\nProses input modal telah dibatalkan.`);
      return NextResponse.json({ ok: true });
    }

    // ====== CHECK WAITING STATE FOR CAPITAL ======
    const config = await prisma.userConfig.findUnique({ where: { id: "main" } });

    if (config?.waitingCapital) {
      const amount = parseFloat(text.replace(/[^0-9]/g, ""));

      if (isNaN(amount) || amount <= 0) {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Format Tidak Valid</b>\n\nHarap kirimkan angka saja untuk modal Anda.\n<i>Contoh:</i> <code>10000000</code>\n\nAtau ketik /batal untuk membatalkan.`
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

      await prisma.userConfig.update({
        where: { id: "main" },
        data: { waitingCapital: false },
      });

      const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

      await sendTelegramMessage(
        chatId,
        `✅ <b>Modal Berhasil Disimpan!</b>\n\n` +
          `Periode: ${monthName}\n` +
          `Modal Baru: <b>${formatIDR(amount)}</b>\n\n` +
          `Dashboard Anda telah diperbarui. Selamat bertrading! 🚀`
      );
      return NextResponse.json({ ok: true });
    }

    // ====== INPUT PNL (TRADE) ======
    const parts = text.split(/\s+/);
    const amount = parseFloat(parts[0]);

    if (isNaN(amount)) {
      await sendTelegramMessage(
        chatId,
        `🤔 <b>Perintah tidak dikenali</b>\n\n` +
        `Untuk mencatat trading, pastikan Anda memulai pesan dengan <b>angka</b>:\n` +
        `🟢 <code>150000</code> (Jika Profit)\n` +
        `🔴 <code>-50000</code> (Jika Loss)\n\n` +
        `Butuh bantuan? Ketik /bantuan.`
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

    const startOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const endOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));

    const todayTrades = await prisma.tradeLog.findMany({
      where: { date: { gte: startOfDay, lt: endOfDay } },
    });

    const totalToday = todayTrades.reduce((sum, t) => sum + t.amount, 0);
    const isProfit = amount >= 0;
    const isTotalProfit = totalToday >= 0;

    let confirmText = `${isProfit ? "🟢" : "🔴"} <b>Input Berhasil - ${isProfit ? "PROFIT" : "LOSS"}</b>\n\n`;
    confirmText += `PnL: <b>${formatIDR(amount)}</b>\n`;
    if (note) confirmText += `Catatan: <i>${note}</i>\n`;
    confirmText += `Waktu: ${now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour: '2-digit', minute:'2-digit' })}\n\n`;
    confirmText += `──────────────\n`;
    confirmText += `📈 <b>Total Hari Ini:</b>\n`;
    confirmText += `<b>${formatIDR(totalToday)}</b> ${isTotalProfit ? "(✅)" : "(❌)"} dari ${todayTrades.length} trade`;

    await sendTelegramMessage(chatId, confirmText);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL belum diset" }, { status: 500 });
    }

    // Hilangkan slash di akhir jika ada untuk mencegah double slash (//api)
    const cleanAppUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
    const webhookUrl = `${cleanAppUrl}/api/telegram`;

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "callback_query"] }),
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
