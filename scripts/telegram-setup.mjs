/**
 * Telegram setup helper.
 *
 *   npm run telegram:setup            find your chat id (after you message the bot), then send a test
 *   npm run telegram:setup -- --write also save TELEGRAM_CHAT_ID into .env
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendTelegram, telegramConfig } from "../lib/telegram.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
dotenv.config({ path: envPath });

const { token } = telegramConfig();
if (!token) {
  console.log(`No TELEGRAM_BOT_TOKEN found in ${envPath}.

1. In Telegram, open @BotFather → /newbot → copy the token it gives you.
2. Add this line to .env (and to Vercel → Settings → Environment Variables):
     TELEGRAM_BOT_TOKEN=123456:ABC...
3. Send any message (e.g. "hi") to your new bot, then run this command again.`);
  process.exit(1);
}

let chatId = telegramConfig().chatId;
if (!chatId) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    console.error(`Telegram rejected the token (${response.status}). Re-check TELEGRAM_BOT_TOKEN.`);
    process.exit(1);
  }
  const chat = [...(data.result || [])]
    .reverse()
    .map((update) => update.message?.chat || update.my_chat_member?.chat)
    .find(Boolean);
  if (!chat) {
    console.error("No messages yet. Open your bot in Telegram, send it any message, then run this again.");
    process.exit(1);
  }
  chatId = String(chat.id);
  console.log(`Found chat: ${chat.first_name || chat.title || chat.username || "unknown"} (id ${chatId})`);

  if (process.argv.includes("--write")) {
    const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
    const next = /^TELEGRAM_CHAT_ID=.*$/m.test(current)
      ? current.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${chatId}`)
      : `${current.replace(/\s*$/, "\n")}TELEGRAM_CHAT_ID=${chatId}\n`;
    fs.writeFileSync(envPath, next);
    console.log("Saved TELEGRAM_CHAT_ID to .env");
  } else {
    console.log(`Add this to .env and to Vercel:\n  TELEGRAM_CHAT_ID=${chatId}`);
  }
}

const result = await sendTelegram(
  { text: "✅ <b>Blog notifications are connected.</b>\nYou'll get a message for every new like and comment." },
  { env: { ...process.env, TELEGRAM_CHAT_ID: chatId } },
);
console.log(result.ok ? "Test message sent — check Telegram." : `Test message failed: ${result.error}`);
process.exit(result.ok ? 0 : 1);
