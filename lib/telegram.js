/**
 * Helper Telegram Bot
 * Mengirim pesan ke chat ID yang terdaftar
 */

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Mengirim pesan teks ke Telegram
 * @param {string} chatId - ID Chat Telegram
 * @param {string} text - Teks pesan yang akan dikirim
 * @param {object} options - Opsi tambahan (parse_mode, dll)
 */
export async function sendTelegramMessage(chatId, text, options = {}) {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Telegram API Error:", error);
    throw new Error(`Gagal mengirim pesan Telegram: ${error.description}`);
  }

  return response.json();
}

/**
 * Mengubah pesan Telegram (biasanya untuk merespon callback button)
 * @param {string} chatId - ID Chat Telegram
 * @param {number} messageId - ID Pesan yang akan diubah
 * @param {string} text - Teks pesan baru
 * @param {object} options - Opsi tambahan
 */
export async function editTelegramMessage(chatId, messageId, text, options = {}) {
  const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "HTML",
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Telegram API Error (editMessage):", error);
    // Kita tidak throw error agar webhook tidak crash 500 jika message sudah terhapus
  }

  return response.json();
}

/**
 * Setup Webhook Telegram
 * @param {string} webhookUrl - URL webhook yang akan diterima oleh Telegram
 */
export async function setTelegramWebhook(webhookUrl) {
  const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message"],
    }),
  });

  return response.json();
}

/**
 * Format angka ke IDR
 * @param {number} amount - Angka yang akan diformat
 * @returns {string} String berformat IDR
 */
export function formatIDR(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format persentase
 * @param {number} value - Nilai persentase
 * @returns {string} String berformat persentase
 */
export function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
