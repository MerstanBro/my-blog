import hljs from "highlight.js";
import { Marked } from "marked";
import { ARABIC_RE, renderQuranBlock } from "./quran.js";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decodeEntities(value) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

const ARABIC_CHARS = "\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
// A run of Arabic words, allowing spaces and light punctuation between them.
const ARABIC_RUN = new RegExp(`[${ARABIC_CHARS}]+(?:[\\s\\u200c\\u200d.,:;!?()«»\\-–—]+[${ARABIC_CHARS}]+)*`, "g");
const STARTS_ARABIC = new RegExp(`^\\s*[${ARABIC_CHARS}]`);

/** Wrap Arabic runs inside LTR text so they get the Arabic font and correct bidi. */
export function wrapArabic(html) {
  return html.replace(ARABIC_RUN, (run) => `<span class="ar" lang="ar" dir="rtl">${run}</span>`);
}

export function transformCodeFence(language = "", code = "", context = {}) {
  const raw = decodeEntities(code).replace(/\n$/, "");
  const lang = (language || "").toLowerCase();

  if (lang === "quran") {
    const result = renderQuranBlock(raw, { store: context.quran, rtl: context.rtl });
    return { html: result.html, hasMermaid: false, hasChart: false, hasQuran: true };
  }

  if (lang === "mermaid") {
    return {
      // Newlines are entity-encoded so the HTML minifier (which collapses whitespace) can't flatten the diagram source.
      html: `<div class="mermaid-block"><div class="mermaid">${escapeHtml(raw).replaceAll("\n", "&#10;")}</div></div>`,
      hasMermaid: true,
      hasChart: false,
    };
  }

  if (lang === "chart") {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.type || !parsed.data) {
        throw new Error("invalid chart shape");
      }
      const payload = escapeHtml(JSON.stringify(parsed));
      return {
        html: `<div class="chart-block"><canvas class="post-chart" data-chart="${payload}" role="img" aria-label="Chart"></canvas></div>`,
        hasMermaid: false,
        hasChart: true,
      };
    } catch {
      return {
        html: `<div class="chart-fallback"><p>Could not render chart.</p><pre><code>${escapeHtml(raw)}</code></pre></div>`,
        hasMermaid: false,
        hasChart: false,
      };
    }
  }

  const highlighted =
    lang && hljs.getLanguage(lang)
      ? hljs.highlight(raw, { language: lang }).value
      : hljs.highlightAuto(raw).value;

  return {
    html: `<div class="code-shell"><div class="code-bar"><span>${escapeHtml(lang || "code")}</span><button type="button" data-copy-code>Copy</button></div><pre><code class="hljs">${highlighted}</code></pre></div>`,
    hasMermaid: false,
    hasChart: false,
  };
}

/* ---------- quotes, callouts, footnotes, headings ---------- */

const CALLOUTS = {
  note: { label: "Note", icon: "✎" },
  info: { label: "Info", icon: "ℹ" },
  tip: { label: "Tip", icon: "✦" },
  important: { label: "Important", icon: "!" },
  warning: { label: "Warning", icon: "!" },
  danger: { label: "Caution", icon: "!" },
  example: { label: "Example", icon: "›" },
  hadith: { label: "Hadith", icon: "❝" },
  dua: { label: "Dua", icon: "❝" },
  quote: { label: "Quote", icon: "❝" },
};
const CALLOUT_ALIASES = { hint: "tip", caution: "warning", error: "danger", abstract: "note", summary: "note", cite: "quote" };
const CALLOUT_RE = /^\[!([A-Za-z-]+)\][+-]?[ \t]*([^\n]*)(?:\n|$)/;
// "— Author, Source" as the last line of a quote.
const ATTRIBUTION_RE = /(?:^|\n)[ \t]*(?:—|–|―|--)[ \t]*([^\n]+)\s*$/;

export function slugifyHeading(text) {
  return String(text)
    .replace(/<[^>]+>/g, "")
    .replace(/[*_`~]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function createRenderer({ rtl, quran }) {
  let hasMermaid = false;
  let hasChart = false;
  let hasQuran = false;
  const headings = [];
  const usedIds = new Map();
  const footnotes = { defs: new Map(), order: [], refCounts: new Map() };

  const marked = new Marked({ gfm: true, breaks: false });

  marked.use({
    extensions: [
      {
        name: "footnoteDef",
        level: "block",
        start: (src) => src.match(/^\[\^[^\]\s]+\]:/m)?.index,
        tokenizer(src) {
          const match = /^\[\^([\p{L}\p{N}_-]+)\]:[ \t]*([^\n]*(?:\n(?: {2,}|\t)[^\n]*)*)(?:\n|$)/u.exec(src);
          if (!match) return undefined;
          footnotes.defs.set(match[1], match[2].replace(/\n[ \t]+/g, " ").trim());
          return { type: "footnoteDef", raw: match[0] };
        },
        renderer: () => "",
      },
      {
        name: "footnoteRef",
        level: "inline",
        start: (src) => src.indexOf("[^"),
        tokenizer(src) {
          const match = /^\[\^([\p{L}\p{N}_-]+)\](?!:)/u.exec(src);
          return match ? { type: "footnoteRef", raw: match[0], id: match[1] } : undefined;
        },
        renderer(token) {
          if (!footnotes.order.includes(token.id)) footnotes.order.push(token.id);
          const number = footnotes.order.indexOf(token.id) + 1;
          const count = (footnotes.refCounts.get(token.id) || 0) + 1;
          footnotes.refCounts.set(token.id, count);
          const refId = `fnref-${token.id}${count > 1 ? `-${count}` : ""}`;
          return `<sup class="fn-ref"><a id="${escapeHtml(refId)}" href="#fn-${escapeHtml(token.id)}" aria-label="Note ${number}">${number}</a></sup>`;
        },
      },
    ],
    renderer: {
      heading({ tokens, depth, text }) {
        const inner = this.parser.parseInline(tokens);
        if (depth < 2 || depth > 3) return `<h${depth}>${inner}</h${depth}>\n`;
        const base = slugifyHeading(text) || `section-${headings.length + 1}`;
        const seen = usedIds.get(base) || 0;
        usedIds.set(base, seen + 1);
        const id = seen ? `${base}-${seen + 1}` : base;
        headings.push({ id, depth, text: text.replace(/[*_`~]/g, "").trim() });
        return `<h${depth} id="${escapeHtml(id)}">${inner}<a class="heading-anchor" href="#${escapeHtml(id)}" aria-label="Link to this section">#</a></h${depth}>\n`;
      },

      paragraph({ tokens, text }) {
        const inner = this.parser.parseInline(tokens);
        // An Arabic paragraph inside an English post reads right-to-left.
        if (!rtl && STARTS_ARABIC.test(text)) return `<p class="ar-block" lang="ar" dir="rtl">${inner}</p>\n`;
        return `<p>${inner}</p>\n`;
      },

      text(token) {
        if (token.tokens) return this.parser.parseInline(token.tokens);
        const safe = token.escaped ? token.text : escapeHtml(token.text);
        return rtl ? safe : wrapArabic(safe);
      },

      image({ href, title, text }) {
        const caption = title ? ` title="${escapeHtml(title)}"` : "";
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${caption} loading="lazy" decoding="async">`;
      },

      blockquote({ text }) {
        let body = text.replace(/\n$/, "");
        let kind = "";
        let title = "";

        const callout = CALLOUT_RE.exec(body);
        if (callout) {
          kind = callout[1].toLowerCase();
          kind = CALLOUT_ALIASES[kind] || kind;
          title = callout[2].trim();
          body = body.slice(callout[0].length);
        }

        let cite = "";
        const attribution = ATTRIBUTION_RE.exec(body);
        if (attribution) {
          cite = attribution[1].trim();
          body = body.slice(0, attribution.index);
        }

        const inner = marked.parse(body.trim()).trim();

        if (!kind || kind === "quote" || kind === "hadith" || kind === "dua") {
          // A hadith/dua "title" is its source, so it doubles as the attribution.
          if (!cite && title) cite = title;
          if (!cite && !kind) return `<blockquote>${inner}</blockquote>\n`;
          const label = kind === "hadith" ? "Hadith" : kind === "dua" ? "Dua" : "";
          return `<figure class="quote${kind ? ` quote-${kind}` : ""}">${label ? `<span class="quote-label">${label}</span>` : ""}<blockquote>${inner}</blockquote>${cite ? `<figcaption>${marked.parseInline(cite)}</figcaption>` : ""}</figure>\n`;
        }

        const meta = CALLOUTS[kind] || { label: kind.charAt(0).toUpperCase() + kind.slice(1), icon: "✎" };
        const heading = title ? marked.parseInline(title) : meta.label;
        const type = CALLOUTS[kind] ? kind : "note";
        return `<aside class="callout callout-${type}"><p class="callout-title"><span class="callout-icon" aria-hidden="true">${meta.icon}</span>${heading}</p><div class="callout-body">${inner}</div></aside>\n`;
      },
    },
  });

  function finish(html) {
    // Code fences → code shells, mermaid, charts, Quran cards.
    html = html.replace(
      /<pre><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
      (_, language = "", code) => {
        const result = transformCodeFence(language, code, { quran, rtl });
        hasMermaid = hasMermaid || result.hasMermaid;
        hasChart = hasChart || result.hasChart;
        hasQuran = hasQuran || Boolean(result.hasQuran);
        return result.html;
      },
    );

    html = html.replace(
      /<p><a href="https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^"&?/]+)[^"]*">[^<]*<\/a><\/p>/gi,
      '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/$1" title="YouTube video" loading="lazy" allowfullscreen></iframe></div>',
    );

    // Wrap raw YouTube iframes (from pasted embed HTML) so they pick up .video styles.
    html = html.replace(
      /(?:<div class="video">\s*)?<iframe\b([^>]*\bsrc=["']https?:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/[^"']+["'][^>]*)><\/iframe>(?:\s*<\/div>)?/gi,
      '<div class="video"><iframe$1></iframe></div>',
    );

    if (footnotes.order.length) {
      const items = footnotes.order
        .map((id) => {
          const definition = footnotes.defs.get(id);
          const body = definition ? marked.parseInline(definition) : "<em>Missing note.</em>";
          const count = footnotes.refCounts.get(id) || 1;
          const backs = Array.from({ length: count }, (_, index) => {
            const refId = `fnref-${id}${index ? `-${index + 1}` : ""}`;
            return `<a class="fn-back" href="#${escapeHtml(refId)}" aria-label="Back to text">↩</a>`;
          }).join("");
          return `<li id="fn-${escapeHtml(id)}">${body} ${backs}</li>`;
        })
        .join("");
      html += `<section class="footnotes" aria-label="${rtl ? "المراجع" : "References"}"><h2 class="footnotes-title">${rtl ? "المراجع" : "References"}</h2><ol>${items}</ol></section>`;
    }

    return { html, hasMermaid, hasChart, hasQuran, headings };
  }

  return { marked, finish };
}

/**
 * @param {string} markdown
 * @param {{ rtl?: boolean, quran?: Map }} options  `quran` is the store from createQuranResolver.
 */
export function markdownHtml(markdown, { rtl = false, quran } = {}) {
  const { marked, finish } = createRenderer({ rtl, quran });
  return finish(marked.parse(markdown));
}

/** Posts that open in Arabic are laid out right-to-left. */
export function isArabicPost(markdown = "") {
  return /^[؀-ۿ]/.test(String(markdown).trim());
}

/** ~220 wpm; code blocks are skimmed so they count for less. */
export function readingMinutes(markdown = "") {
  const prose = String(markdown).replace(/```[\s\S]*?```/g, " ");
  const words = prose.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export { ARABIC_RE };
