import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import commentsHandler from "../api/comments.js";
import likesHandler from "../api/likes.js";

const ENV = {
  GITLAB_PROJECT_ID: "1",
  GITLAB_TOKEN: "glpat-test",
  TELEGRAM_BOT_TOKEN: "123:abc",
  TELEGRAM_CHAT_ID: "42",
  SITE_URL: "https://example.com",
};

let saved;
let calls;
let telegramStatus;

beforeEach(() => {
  saved = { fetch: globalThis.fetch, env: {} };
  for (const key of Object.keys(ENV)) {
    saved.env[key] = process.env[key];
    process.env[key] = ENV[key];
  }
  calls = [];
  telegramStatus = 200;
  globalThis.fetch = async (url, init = {}) => {
    const entry = { url: String(url), method: init.method || "GET", body: init.body ? JSON.parse(init.body) : null };
    calls.push(entry);
    if (entry.url.startsWith("https://api.telegram.org/")) {
      return { ok: telegramStatus === 200, status: telegramStatus, text: async () => "nope", json: async () => ({}) };
    }
    if (entry.method === "GET") return { ok: false, status: 404, text: async () => "", json: async () => [] };
    return { ok: true, status: 201, text: async () => "{}", json: async () => ({}) };
  };
});

afterEach(async () => {
  // Let the fire-and-forget Review/Likes refresh settle before restoring fetch.
  await new Promise((resolve) => setTimeout(resolve, 20));
  globalThis.fetch = saved.fetch;
  for (const [key, value] of Object.entries(saved.env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function fakeResponse() {
  const res = { statusCode: 200, headers: {}, payload: null };
  res.setHeader = (name, value) => {
    res.headers[name] = value;
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.payload = payload;
    return res;
  };
  return res;
}

const telegramCalls = () => calls.filter((call) => call.url.startsWith("https://api.telegram.org/"));

describe("Telegram notifications from the API", () => {
  it("pings Telegram when a comment arrives", async () => {
    const res = fakeResponse();
    await commentsHandler(
      {
        method: "POST",
        headers: {},
        body: { postSlug: "words", postPath: "words.md", author: "Sara <3", body: "Lovely piece", pagePath: "/blog/words.md/" },
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.ok, true);
    const [message] = telegramCalls();
    assert.ok(message, "a Telegram message was sent before the handler returned");
    assert.match(message.body.text, /New comment/);
    assert.match(message.body.text, /Sara &lt;3/);
    assert.match(message.body.text, /Lovely piece/);
    assert.equal(message.body.reply_markup.inline_keyboard[0][0].url, "https://example.com/blog/words.md/");
  });

  it("pings Telegram on a new like, with the running total", async () => {
    const res = fakeResponse();
    await likesHandler(
      {
        method: "POST",
        headers: {},
        body: { slug: "words", deviceId: "11111111-1111-4111-8111-111111111111", pagePath: "/blog/words.md/" },
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.count, 1);
    const [message] = telegramCalls();
    assert.match(message.body.text, /New like/);
    assert.match(message.body.text, /1 total/);
  });

  it("does not notify for rejected comments", async () => {
    const res = fakeResponse();
    await commentsHandler({ method: "POST", headers: {}, body: { postSlug: "words", author: "", body: "x" } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(telegramCalls().length, 0);
  });

  it("still saves the comment when Telegram is down", async () => {
    telegramStatus = 500;
    const originalWarn = console.warn;
    console.warn = () => {};
    const res = fakeResponse();
    try {
      await commentsHandler(
        { method: "POST", headers: {}, body: { postSlug: "words", author: "Sara", body: "Hello there" } },
        res,
      );
    } finally {
      console.warn = originalWarn;
    }
    assert.equal(res.statusCode, 200);
    assert.ok(calls.some((call) => call.method !== "GET" && call.url.includes("repository/files")));
  });
});
