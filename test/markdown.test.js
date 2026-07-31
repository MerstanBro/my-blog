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
