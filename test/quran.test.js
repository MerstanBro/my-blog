import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { markdownHtml } from "../lib/markdown.js";
import { ayahKeys, createQuranResolver, parseQuranBlock, renderQuranBlock } from "../lib/quran.js";

const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

// Minimal stand-in for api.alquran.cloud.
function fakeApi() {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const match = /\/ayah\/(\d+):(\d+)\/([\w.-]+)$/.exec(url);
    if (!match) return { ok: false, status: 404, json: async () => ({}) };
    const [, surah, ayah, edition] = match;
    if (Number(surah) > 114) return { ok: false, status: 404, json: async () => ({}) };
    const arabic = edition === "quran-uthmani";
    const text = arabic
      ? `${Number(ayah) === 1 && surah !== "1" ? `${BASMALA} ` : ""}نص ${surah}-${ayah}`
      : `Translation ${surah}:${ayah}`;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          text,
          numberInSurah: Number(ayah),
          surah: { number: Number(surah), name: "سُورَةُ الإِخۡلَاصِ", englishName: "Al-Ikhlaas", englishNameTranslation: "Sincerity" },
        },
      }),
    };
  };
  return { calls, fetchImpl };
}

describe("quran block parsing", () => {
  it("reads a single verse and a range", () => {
    assert.deepEqual(parseQuranBlock("2:255").ref, { surah: 2, from: 255, to: 255 });
    assert.deepEqual(parseQuranBlock("ref: 18:1-5").ref, { surah: 18, from: 1, to: 5 });
    assert.deepEqual(ayahKeys(parseQuranBlock("112:1-3")), ["112:1", "112:2", "112:3"]);
  });

  it("rejects impossible references", () => {
    assert.equal(parseQuranBlock("115:1").ref, null);
    assert.equal(parseQuranBlock("2:0").ref, null);
    assert.equal(parseQuranBlock("2:1-200").ref, null);
  });

  it("separates typed Arabic from typed translation and reads options", () => {
    const spec = parseQuranBlock("112:1\nقُلْ هُوَ ٱللَّهُ أَحَدٌ\nSay: He is Allah, One.\ntranslation: en.asad");
    assert.equal(spec.manualArabic, true);
    assert.equal(spec.manualTranslation, true);
    assert.equal(spec.translationEdition, "en.asad");
    assert.deepEqual(spec.translationLines, ["Say: He is Allah, One."]);
  });

  it("defaults: English translation, none for Arabic posts", () => {
    assert.equal(parseQuranBlock("1:1").translationEdition, "en.sahih");
    assert.equal(parseQuranBlock("1:1", { rtl: true }).translationEdition, "none");
    assert.equal(parseQuranBlock("1:1\ntranslation: none").translationEdition, "none");
  });
});

describe("quran resolver + renderer", () => {
  it("fetches once per verse, strips the leading Basmala, and renders a card", async () => {
    const api = fakeApi();
    const resolver = createQuranResolver({ fetchImpl: api.fetchImpl });
    await resolver.prepare([
      { markdown: "Intro\n\n```quran\n112:1-2\n```\n", rtl: false },
      { markdown: "```quran\n112:1\n```\n", rtl: false }, // duplicate verse, no extra fetch
    ]);
    assert.equal(api.calls.length, 4); // 2 verses x (arabic + translation)

    const { html, hasQuran } = markdownHtml("```quran\n112:1-2\n```\n", { quran: resolver.store });
    assert.equal(hasQuran, true);
    assert.match(html, /class="quran-card"/);
    assert.match(html, /نص 112-1/);
    assert.ok(!html.includes("بِسْمِ"), "Basmala must not be shown as part of verse 1");
    assert.match(html, /Translation 112:2/);
    assert.match(html, /href="https:\/\/quran\.com\/112\/1-2"/);
    assert.match(html, /Al-Ikhlaas 112:1–2/);
  });

  it("keeps the Basmala for al-Fatiha, where it is verse 1", async () => {
    const resolver = createQuranResolver({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: { text: BASMALA, numberInSurah: 1, surah: { number: 1, name: "الفاتحة", englishName: "Al-Faatiha" } } }),
      }),
    });
    await resolver.prepare([{ markdown: "```quran\n1:1\ntranslation: none\n```", rtl: false }]);
    const { html } = renderQuranBlock("1:1\ntranslation: none", { store: resolver.store });
    assert.match(html, /بِسْمِ/);
  });

  it("uses hand-typed text without fetching it, and escapes it", () => {
    const { html, ok } = renderQuranBlock("112:1\n<b>قُلْ</b> هُوَ\nSay <i>One</i>");
    assert.equal(ok, true);
    assert.ok(!html.includes("<b>"));
    assert.match(html, /&lt;b&gt;/);
    assert.match(html, /class="quran-translation"/);
  });

  it("skips translation for Arabic posts", async () => {
    const api = fakeApi();
    const resolver = createQuranResolver({ fetchImpl: api.fetchImpl });
    await resolver.prepare([{ markdown: "```quran\n112:1\n```", rtl: true }]);
    assert.equal(api.calls.length, 1);
    const { html } = renderQuranBlock("112:1", { store: resolver.store, rtl: true });
    assert.ok(!html.includes("quran-translation"));
  });

  it("falls back to a Quran.com link when the API is down (lenient)", async () => {
    const resolver = createQuranResolver({
      fetchImpl: async () => {
        throw new Error("offline");
      },
    });
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      await resolver.prepare([{ markdown: "```quran\n2:255\n```", rtl: false }]);
    } finally {
      console.warn = originalWarn;
    }
    const { html, ok } = renderQuranBlock("2:255", { store: resolver.store });
    assert.equal(ok, false);
    assert.match(html, /is-unresolved/);
    assert.match(html, /quran\.com\/2\/255/);
  });

  it("fails the build in strict mode so a broken verse is never published", async () => {
    const resolver = createQuranResolver({
      fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({}) }),
      strict: true,
    });
    await assert.rejects(
      () => resolver.prepare([{ markdown: "```quran\n2:255\n```", rtl: false }]),
      /Could not load Quran text/,
    );
  });

  it("explains bad references instead of throwing", () => {
    const { html, ok } = renderQuranBlock("hello");
    assert.equal(ok, false);
    assert.match(html, /surah:ayah/);
  });
});
