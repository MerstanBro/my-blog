/**
 * Quran verse blocks.
 *
 * In a post:
 *
 *   ```quran
 *   2:255
 *   ```
 *
 * The Arabic (Uthmani) text and an English translation are fetched once at build time from
 * api.alquran.cloud (Tanzil text), cached on disk, and rendered as a card. Options and manual
 * text are all optional:
 *
 *   ```quran
 *   18:1-5                      <- surah:ayah or surah:from-to
 *   translation: en.asad        <- none | en | any alquran.cloud edition (default en.sahih)
 *   ```
 *
 *   ```quran
 *   112:1-4
 *   قُلْ هُوَ ٱللَّهُ أَحَدٌ ...  <- Arabic lines you typed yourself replace the fetched text
 *   Say, "He is Allah, [who is] One" <- other lines replace the translation
 *   ```
 */
import fs from "node:fs";
import path from "node:path";

export const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

const REF_RE = /^(?:ref(?:erence)?\s*[:=]\s*)?(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?$/i;
const OPTION_RE = /^(translation|trans|tr)\s*[:=]\s*(.+)$/i;
const API = "https://api.alquran.cloud/v1";
const ARABIC_EDITION = "quran-uthmani";
const DEFAULT_TRANSLATION = "en.sahih";
export const MAX_AYAHS = 40;

const TRANSLATION_NAMES = {
  "en.sahih": "Sahih International",
  "en.asad": "Muhammad Asad",
  "en.yusufali": "Yusuf Ali",
  "en.pickthall": "Pickthall",
  "en.hilali": "Hilali & Khan",
  "en.arberry": "Arberry",
  "en.itani": "Talal Itani",
  "fr.hamidullah": "Hamidullah",
  "ur.jalandhry": "Jalandhry",
  "tr.diyanet": "Diyanet",
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function toArabicDigits(value) {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[digit]);
}

function normalizeEdition(value) {
  const edition = String(value || "").trim().toLowerCase();
  if (!edition || edition === "en" || edition === "english") return DEFAULT_TRANSLATION;
  if (["none", "off", "no", "false", "ar", "arabic"].includes(edition)) return "none";
  return /^[a-z]{2}\.[a-z0-9_]+$/.test(edition) ? edition : DEFAULT_TRANSLATION;
}

/** Parse the body of a ```quran fence. Pure, no network. */
export function parseQuranBlock(raw = "", { rtl = false } = {}) {
  const spec = {
    ref: null,
    translationEdition: rtl ? "none" : DEFAULT_TRANSLATION,
    arabicLines: [],
    translationLines: [],
  };

  for (const line of String(raw).split("\n")) {
    const text = line.trim();
    if (!text) continue;
    const option = OPTION_RE.exec(text);
    if (option) {
      spec.translationEdition = normalizeEdition(option[2]);
      continue;
    }
    const ref = REF_RE.exec(text);
    if (ref && !spec.ref) {
      const surah = Number(ref[1]);
      const from = Number(ref[2]);
      const to = ref[3] ? Number(ref[3]) : from;
      spec.ref = { surah, from, to: Math.max(from, to) };
      continue;
    }
    if (ARABIC_RE.test(text)) spec.arabicLines.push(text);
    else spec.translationLines.push(text);
  }

  if (spec.ref) {
    const { surah, from, to } = spec.ref;
    if (surah < 1 || surah > 114 || from < 1 || to - from + 1 > MAX_AYAHS) spec.ref = null;
  }
  spec.manualArabic = spec.arabicLines.length > 0;
  spec.manualTranslation = spec.translationLines.length > 0;
  return spec;
}

export function ayahKeys(spec) {
  if (!spec.ref) return [];
  const keys = [];
  for (let ayah = spec.ref.from; ayah <= spec.ref.to; ayah += 1) keys.push(`${spec.ref.surah}:${ayah}`);
  return keys;
}

/** Cache key → what the renderer needs. */
export function storeKey(edition, key) {
  return `${edition}|${key}`;
}

// The API prepends the Basmala to verse 1 of every surah except al-Fatiha (where it IS the verse)
// and at-Tawba (which has none). It is not part of that verse, so drop it.
function stripBasmala(text, surah, ayah) {
  if (ayah !== 1 || surah === 1 || surah === 9) return text;
  const words = text.split(" ");
  return words.length > 4 && words[0].startsWith("بِسْمِ") ? words.slice(4).join(" ") : text;
}

async function fetchJson(url, fetchImpl, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, { headers: { accept: "application/json" } });
      if (response.status === 404 || response.status === 400) {
        const error = new Error(`not found (${response.status})`);
        error.permanent = true;
        throw error;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (error.permanent) break;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw lastError;
}

/**
 * Resolves verse text for every ```quran block in a set of posts, ahead of the (synchronous)
 * markdown render. Results live in `store`, a Map the renderer reads from.
 */
export function createQuranResolver({ fetchImpl = fetch, cacheFile = "", strict = false } = {}) {
  const store = new Map();
  const failures = [];

  let disk = {};
  if (cacheFile) {
    try {
      disk = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    } catch {
      disk = {};
    }
  }
  let dirty = false;

  async function fetchAyah(edition, key) {
    const id = storeKey(edition, key);
    if (store.has(id)) return;
    if (disk[id]) {
      store.set(id, disk[id]);
      return;
    }
    const data = await fetchJson(`${API}/ayah/${key}/${edition}`, fetchImpl);
    const ayah = data?.data;
    if (!ayah?.text || !ayah.surah) throw new Error("unexpected response");
    const entry = {
      text: edition === ARABIC_EDITION
        ? stripBasmala(ayah.text, ayah.surah.number, ayah.numberInSurah)
        : ayah.text,
      surahNumber: ayah.surah.number,
      surahName: ayah.surah.name,
      surahEnglish: ayah.surah.englishName,
      surahMeaning: ayah.surah.englishNameTranslation,
      ayah: ayah.numberInSurah,
    };
    store.set(id, entry);
    disk[id] = entry;
    dirty = true;
  }

  async function prepare(markdowns) {
    const wanted = [];
    for (const { markdown, rtl } of markdowns) {
      for (const match of String(markdown).matchAll(/^```quran[^\n]*\n([\s\S]*?)^```/gm)) {
        const spec = parseQuranBlock(match[1], { rtl });
        if (!spec.ref) continue;
        const keys = ayahKeys(spec);
        for (const key of keys) {
          if (!spec.manualArabic) wanted.push([ARABIC_EDITION, key, false]);
          if (!spec.manualTranslation && spec.translationEdition !== "none") {
            wanted.push([spec.translationEdition, key, false]);
          }
        }
        // Hand-typed Arabic still gets the surah name for its reference line (best effort).
        if (spec.manualArabic) wanted.push([ARABIC_EDITION, keys[0], true]);
      }
    }
    const unique = [...new Map(wanted.map((item) => [storeKey(item[0], item[1]), item])).values()];
    // Small pool: be polite to a free public API.
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, unique.length) }, async () => {
        while (cursor < unique.length) {
          const [edition, key, optional] = unique[cursor++];
          try {
            await fetchAyah(edition, key);
          } catch (error) {
            if (!optional) failures.push(`${key} (${edition}): ${error.message}`);
          }
        }
      }),
    );

    if (dirty && cacheFile) {
      try {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(disk));
      } catch {
        // cache is an optimisation only
      }
    }
    if (failures.length) {
      const message = `Could not load Quran text for: ${failures.join("; ")}`;
      if (strict) throw new Error(message);
      console.warn(`[quran] ${message}. Affected verses link to Quran.com instead.`);
    }
    return store;
  }

  return { store, prepare, failures };
}

function quranLink(surah, from, to) {
  return `https://quran.com/${surah}/${from}${to > from ? `-${to}` : ""}`;
}

/**
 * Render a ```quran block to a card. `store` comes from createQuranResolver.
 * Always returns HTML (never throws) so one bad reference can't break a post.
 */
export function renderQuranBlock(raw, { store = new Map(), rtl = false } = {}) {
  const spec = parseQuranBlock(raw, { rtl });
  const { ref } = spec;

  if (!ref && !spec.manualArabic) {
    return {
      ok: false,
      html: `<div class="quran-card is-unresolved"><p>Could not read this Quran reference. Use <code>surah:ayah</code>, for example <code>2:255</code> or <code>18:1-5</code>.</p></div>`,
    };
  }

  const keys = ayahKeys(spec);
  const arabic = keys.map((key) => store.get(storeKey(ARABIC_EDITION, key)));
  const first = arabic.find(Boolean);
  const translations = spec.translationEdition === "none"
    ? []
    : keys.map((key) => store.get(storeKey(spec.translationEdition, key)));

  const needsFetch = !spec.manualArabic;
  const missing = needsFetch && arabic.some((entry) => !entry);
  if (missing) {
    const label = `${ref.surah}:${ref.from}${ref.to > ref.from ? `-${ref.to}` : ""}`;
    return {
      ok: false,
      html: `<figure class="quran-card is-unresolved"><figcaption class="quran-ref"><a href="${quranLink(ref.surah, ref.from, ref.to)}" target="_blank" rel="noreferrer">Read ${escapeHtml(label)} on Quran.com</a></figcaption></figure>`,
    };
  }

  const verseHtml = spec.manualArabic
    ? spec.arabicLines.map((line) => `<span class="ayah">${escapeHtml(line)}</span>`).join(" ")
    : arabic
        .map((entry) => `<span class="ayah">${escapeHtml(entry.text)} <span class="ayah-no" aria-label="verse ${entry.ayah}">${toArabicDigits(entry.ayah)}</span></span>`)
        .join(" ");

  let translationHtml = "";
  if (spec.manualTranslation) {
    translationHtml = `<p class="quran-translation">${spec.translationLines.map(escapeHtml).join(" ")}</p>`;
  } else if (translations.length && translations.every(Boolean)) {
    const text = keys.length > 1
      ? translations.map((entry) => `<span class="tr-no">${entry.ayah}</span> ${escapeHtml(entry.text)}`).join(" ")
      : escapeHtml(translations[0].text);
    translationHtml = `<p class="quran-translation" lang="${spec.translationEdition.slice(0, 2)}">${text}</p>`;
  }

  const attribution = !spec.manualTranslation && translationHtml
    ? TRANSLATION_NAMES[spec.translationEdition] || spec.translationEdition
    : "";

  let refHtml = "";
  if (ref) {
    const label = `${first ? first.surahEnglish : `Surah ${ref.surah}`} ${ref.surah}:${ref.from}${ref.to > ref.from ? `–${ref.to}` : ""}`;
    refHtml = `<figcaption class="quran-ref">
      ${first ? `<span class="quran-surah" lang="ar" dir="rtl">${escapeHtml(first.surahName)}</span>` : ""}
      <a href="${quranLink(ref.surah, ref.from, ref.to)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>
      ${attribution ? `<span class="quran-source">${escapeHtml(attribution)}</span>` : ""}
    </figcaption>`;
  }

  const html = `<figure class="quran-card" data-quran-card>
    <button type="button" class="quran-copy" data-copy-quran aria-label="Copy verse">Copy</button>
    <blockquote class="quran-text" lang="ar" dir="rtl">${verseHtml}</blockquote>
    ${translationHtml}
    ${refHtml}
  </figure>`;
  return { ok: true, html };
}
