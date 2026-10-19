import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  escapeTelegramHtml,
  formatCommentMessage,
  formatLikeMessage,
  isTelegramConfigured,
  postUrl,
  sendTelegram,
} from "../lib/telegram.js";

const env = { TELEGRAM_BOT_TOKEN: "123:abc", TELEGRAM_CHAT_ID: "42", SITE_URL: "https://example.com" };

function recorder(response = { ok: true, status: 200 }) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: response.ok, status: response.status, text: async () => "bad" };
  };
  return { calls, fetchImpl };
}

describe("telegram", () => {
  it("skips quietly when not configured", async () => {
    const { calls, fetchImpl } = recorder();
    const result = await sendTelegram({ text: "hi" }, { env: {}, fetchImpl });
    assert.deepEqual(result, { ok: false, skipped: true });
    assert.equal(calls.length, 0);
    assert.equal(isTelegramConfigured({}), false);
    assert.equal(isTelegramConfigured(env), true);
  });

  it("posts an HTML message with buttons to the bot API", async () => {
    const { calls, fetchImpl } = recorder();
    const message = formatLikeMessage({ slug: "words", count: 3, siteUrl: "https://example.com", path: "/blog/words.md/" });
    const result = await sendTelegram(message, { env, fetchImpl });
    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "https://api.telegram.org/bot123:abc/sendMessage");
    assert.equal(calls[0].body.chat_id, "42");
    assert.equal(calls[0].body.parse_mode, "HTML");
    assert.match(calls[0].body.text, /New like/);
    assert.match(calls[0].body.text, /3 total/);
    assert.equal(calls[0].body.reply_markup.inline_keyboard[0][0].url, "https://example.com/blog/words.md/");
  });

  it("escapes user-controlled comment text", () => {
    const { text } = formatCommentMessage({
      slug: "ali",
      author: "<b>Eve</b>",
      body: "<script>alert(1)</script> & more",
      id: "20260101-abcd",
      siteUrl: "https://example.com",
    });
    assert.ok(!text.includes("<script>"));
    assert.match(text, /&lt;script&gt;/);
    assert.match(text, /&lt;b&gt;Eve&lt;\/b&gt;/);
    assert.equal(escapeTelegramHtml("a&b<c>"), "a&amp;b&lt;c&gt;");
  });

  it("truncates very long comments below Telegram's limit", () => {
    const { text } = formatCommentMessage({
      slug: "ali",
      author: "A",
      body: "x".repeat(4000),
      id: "1",
      siteUrl: "https://example.com",
    });
    assert.ok(text.length < 4096);
  });

  it("only links to same-site /blog paths", () => {
    const siteUrl = "https://example.com";
    assert.equal(postUrl({ siteUrl, path: "https://evil.test/x", slug: "a b" }), "https://example.com/blog/a%20b/");
    assert.equal(postUrl({ siteUrl, path: "//evil.test", slug: "a" }), "https://example.com/blog/a/");
    assert.equal(postUrl({ siteUrl, path: "/blog/ok/", slug: "a" }), "https://example.com/blog/ok/");
  });

  it("stops sending once the per-minute cap is hit", async () => {
    const { calls, fetchImpl } = recorder();
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      const results = [];
      for (let i = 0; i < 5; i += 1) {
        results.push(await sendTelegram({ text: `n${i}` }, { env, fetchImpl, limitPerMinute: 2 }));
      }
      // Earlier tests in this file already used part of the window, so only assert the cap itself.
      assert.ok(results.some((result) => result.error === "rate-limited"));
      assert.ok(calls.length < 5);
    } finally {
      console.warn = originalWarn;
    }
  });

  it("never throws on API or network errors", async () => {
    const failing = recorder({ ok: false, status: 401 });
    const result = await sendTelegram({ text: "hi" }, { env, fetchImpl: failing.fetchImpl });
    assert.equal(result.ok, false);

    const boom = await sendTelegram(
      { text: "hi" },
      { env, fetchImpl: async () => { throw new Error("offline"); } },
    );
    assert.deepEqual(boom, { ok: false, error: "network" });
  });
});
