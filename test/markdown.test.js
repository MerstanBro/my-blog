import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { markdownHtml, transformCodeFence } from "../lib/markdown.js";

describe("markdown fences", () => {
  it("renders mermaid blocks", () => {
    const result = transformCodeFence("mermaid", "flowchart LR\nA-->B");
    assert.match(result.html, /class="mermaid"/);
    assert.match(result.html, /mermaid-block/);
    assert.equal(result.hasMermaid, true);
  });

  it("renders chart canvases and falls back on bad JSON", () => {
    const ok = transformCodeFence(
      "chart",
      JSON.stringify({ type: "bar", data: { labels: ["a"], datasets: [{ data: [1] }] } }),
    );
    assert.match(ok.html, /post-chart/);
    assert.equal(ok.hasChart, true);

    const bad = transformCodeFence("chart", "{not json");
    assert.match(bad.html, /chart-fallback/);
    assert.equal(bad.hasChart, false);
  });

  it("flags posts that need diagram scripts", () => {
    const result = markdownHtml("```mermaid\nflowchart LR\nA-->B\n```\n");
    assert.equal(result.hasMermaid, true);
  });
});

describe("youtube embeds", () => {
  it("converts watch URLs to nocookie iframes", () => {
    const result = markdownHtml("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.match(result.html, /class="video"/);
    assert.match(result.html, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  });

  it("converts youtu.be URLs", () => {
    const result = markdownHtml("https://youtu.be/dQw4w9WgXcQ");
    assert.match(result.html, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  });

  it("converts embed URLs", () => {
    const result = markdownHtml("https://www.youtube.com/embed/dQw4w9WgXcQ");
    assert.match(result.html, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
    assert.match(result.html, /class="video"/);
  });

  it("wraps raw YouTube iframes in .video", () => {
    const result = markdownHtml(
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video" allowfullscreen></iframe>',
    );
    assert.match(result.html, /<div class="video"><iframe[^>]*youtube\.com\/embed\/dQw4w9WgXcQ/);
    assert.equal((result.html.match(/class="video"/g) || []).length, 1);
  });

  it("does not double-wrap already wrapped iframes", () => {
    const result = markdownHtml(
      '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe></div>',
    );
    assert.equal((result.html.match(/class="video"/g) || []).length, 1);
  });
});

describe("quotes, callouts and references", () => {
  it("turns a trailing em-dash line into an attribution", () => {
    const { html } = markdownHtml("> Know thyself.\n> — Socrates, *Apology*\n");
    assert.match(
      html,
      /<figure class="quote"><blockquote><p>Know thyself\.<\/p><\/blockquote><figcaption>Socrates, <em>Apology<\/em><\/figcaption><\/figure>/,
    );
  });

  it("leaves plain blockquotes alone", () => {
    const { html } = markdownHtml("> just a quote\n");
    assert.match(html, /^<blockquote><p>just a quote<\/p><\/blockquote>/);
  });

  it("renders Obsidian callouts and hadith blocks", () => {
    const callout = markdownHtml("> [!warning] Careful\n> Mind the gap.\n").html;
    assert.match(callout, /class="callout callout-warning"/);
    assert.match(callout, /Careful/);
    assert.match(callout, /Mind the gap\./);

    const hadith = markdownHtml("> [!hadith] Sahih al-Bukhari 1\n> إنما الأعمال بالنيات\n").html;
    assert.match(hadith, /quote-hadith/);
    assert.match(hadith, /<figcaption>Sahih al-Bukhari 1<\/figcaption>/);
    assert.match(hadith, /class="ar-block"/);
  });

  it("numbers footnotes in order of use and links them back", () => {
    const { html } = markdownHtml("One[^b] two[^a] again[^b].\n\n[^a]: Note A.\n[^b]: Note B.\n");
    assert.match(html, /href="#fn-b"[^>]*>1<\/a>/);
    assert.match(html, /href="#fn-a"[^>]*>2<\/a>/);
    assert.match(html, /<li id="fn-b">Note B\./);
    assert.match(html, /href="#fnref-b-2"/); // a second use of [^b] gets its own back-link
    assert.match(html, /class="footnotes"/);
  });

  it("collects headings with stable, unique ids", () => {
    const { html, headings } = markdownHtml("## Same\n\ntext\n\n## Same\n\n### عنوان\n");
    assert.deepEqual(headings.map((h) => h.id), ["same", "same-2", "عنوان"]);
    assert.match(html, /<h2 id="same">Same<a class="heading-anchor"/);
  });

  it("wraps Arabic runs in English text, but not in right-to-left posts", () => {
    assert.match(markdownHtml("Say بسم الله now").html, /<span class="ar" lang="ar" dir="rtl">بسم الله<\/span>/);
    assert.ok(!markdownHtml("قال بسم الله", { rtl: true }).html.includes('class="ar"'));
  });

  it("does not touch code", () => {
    const { html } = markdownHtml("`بسم` and\n\n```js\nconst a = 'بسم';\n```\n");
    assert.ok(!html.includes('<span class="ar"'));
  });
});
