import hljs from "highlight.js";
import { marked } from "marked";

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
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function transformCodeFence(language = "", code = "") {
  const raw = decodeEntities(code).replace(/\n$/, "");
  const lang = (language || "").toLowerCase();

  if (lang === "mermaid") {
    return {
      html: `<div class="mermaid-block"><pre class="mermaid">${escapeHtml(raw)}</pre></div>`,
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

export function markdownHtml(markdown) {
  marked.setOptions({ gfm: true, breaks: false });
  let html = marked.parse(markdown);
  let hasMermaid = false;
  let hasChart = false;

  html = html.replace(
    /<pre><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_, language = "", code) => {
      const result = transformCodeFence(language, code);
      hasMermaid = hasMermaid || result.hasMermaid;
      hasChart = hasChart || result.hasChart;
      return result.html;
    },
  );

  html = html.replace(
    /<p><a href="https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^"&]+)[^"]*">[^<]*<\/a><\/p>/gi,
    '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/$1" title="YouTube video" loading="lazy" allowfullscreen></iframe></div>',
  );

  return { html, hasMermaid, hasChart };
}
