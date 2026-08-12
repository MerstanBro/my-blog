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
