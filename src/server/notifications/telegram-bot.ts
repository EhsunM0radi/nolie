/**
 * Telegram Bot Direct Notification Service
 * Dispatches real-time alerts to users on Telegram when a breakup or invite occurs
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramBotMessage(
  telegramUserId: number,
  text: string
): Promise<{ success: boolean; messageId?: number }> {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'REPLACE_WITH_SECRET' || TELEGRAM_BOT_TOKEN.startsWith('mock_')) {
    console.log(`[Telegram Bot Sandbox Message] To: ${telegramUserId} | Text: ${text.slice(0, 80)}...`);
    return { success: true, messageId: Math.floor(Math.random() * 100000) };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramUserId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json() as { ok: boolean; result?: { message_id: number } };
    return { success: data.ok, messageId: data.result?.message_id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Telegram Bot error';
    console.error(`[Telegram Bot Error]: ${msg}`);
    return { success: false };
  }
}
