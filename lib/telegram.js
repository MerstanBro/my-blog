/**
 * Telegram notifications for new comments and likes.
 *
 * Env (server-only):
 *   TELEGRAM_BOT_TOKEN  — from @BotFather
 *   TELEGRAM_CHAT_ID    — your chat id (run `npm run telegram:setup` to find it)
 *
 * Notifications are best-effort: they never throw and never block a like/comment from being saved.
 */

const API = "https://api.telegram.org";
const MAX_TEXT = 3800; // Telegram caps messages at 4096 chars; leave room for markup.

// Per-instance flood guard: scripted likes/comments must not be able to bury your phone.
const sentAt = [];
function allowSend(limitPerMinute, now = Date.now()) {
  while (sentAt.length && now - sentAt[0] > 60_000) sentAt.shift();
  if (sentAt.length >= limitPerMinute) return false;
  sentAt.push(now);
  return true;
}

export function telegramConfig(env = process.env) {
  return {
    token: String(env.TELEGRAM_BOT_TOKEN || "").trim(),
    chatId: String(env.TELEGRAM_CHAT_ID || "").trim(),
    siteUrl: String(env.SITE_URL || "https://anasmerstani.com").replace(/\/$/, ""),
  };
}

export function isTelegramConfigured(env = process.env) {
  const { token, chatId } = telegramConfig(env);
  return Boolean(token && chatId);
}

export function escapeTelegramHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function clip(value, max) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Same-origin post URL. Only accepts a /blog/... path so a client can't smuggle in another host. */
export function postUrl({ siteUrl, path, slug }) {
  const safePath = typeof path === "string" && /^\/blog\/[^\s?#]*$/.test(path) && !path.includes("//") ? path : "";
  return `${siteUrl}${safePath || `/blog/${encodeURIComponent(slug || "")}/`}`;
}

export function formatLikeMessage({ slug, count, siteUrl, path }) {
  const total = Number.isFinite(count) ? ` · ${count} total` : "";
  return {
    text: `❤️ <b>New like</b>\n<code>${escapeTelegramHtml(slug)}</code>${total}`,
    buttons: [[{ text: "Open post", url: postUrl({ siteUrl, path, slug }) }]],
  };
}

export function formatCommentMessage({ slug, author, body, id, siteUrl, path }) {
  const text = [
    "💬 <b>New comment waiting for review</b>",
    `<b>${escapeTelegramHtml(clip(author, 60))}</b> on <code>${escapeTelegramHtml(slug)}</code>`,
    "",
    `<blockquote>${escapeTelegramHtml(clip(body, MAX_TEXT - 400))}</blockquote>`,
    "",
    `Approve or reject it in Obsidian: <code>Review/Pending</code> (id <code>${escapeTelegramHtml(id || "?")}</code>)`,
  ].join("\n");
  return { text, buttons: [[{ text: "Open post", url: postUrl({ siteUrl, path, slug }) }]] };
}

/**
 * Send one message. Resolves to { ok, skipped?, error? } and never rejects.
 * `fetchImpl` is injectable for tests.
 */
export async function sendTelegram(
  { text, buttons } = {},
  { env = process.env, fetchImpl = fetch, timeoutMs = 4000, limitPerMinute = 20 } = {},
) {
  const { token, chatId } = telegramConfig(env);
  if (!token || !chatId) return { ok: false, skipped: true };
  if (!text) return { ok: false, error: "empty message" };
  if (!allowSend(limitPerMinute)) {
    console.warn("Telegram notification dropped: rate limit reached.");
    return { ok: false, skipped: true, error: "rate-limited" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const payload = {
      chat_id: chatId,
      text: clip(text, 4000),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (buttons?.length) payload.reply_markup = { inline_keyboard: buttons };

    const response = await fetchImpl(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // Never include the URL (it contains the bot token) in logs.
      console.warn(`Telegram ${response.status}: ${detail.slice(0, 200)}`);
      return { ok: false, error: `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    console.warn("Telegram send failed:", error?.name === "AbortError" ? "timeout" : error?.message);
    return { ok: false, error: error?.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

export function notifyLike(details, options) {
  const { siteUrl } = telegramConfig(options?.env);
  return sendTelegram(formatLikeMessage({ siteUrl, ...details }), options);
}

export function notifyComment(details, options) {
  const { siteUrl } = telegramConfig(options?.env);
  return sendTelegram(formatCommentMessage({ siteUrl, ...details }), options);
}
