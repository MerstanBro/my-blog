import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSoundCloudUrl, soundCloudEmbedHtml } from "../lib/html-utils.js";
import { createTemplates } from "../lib/templates.js";

// Stubs for the image optimizer used by templates (no variants available in tests).
const images = {
  markup: (src, options = {}) => `<img src="${src}"${options.className ? ` class="${options.className}"` : ""}>`,
};

describe("soundcloud helpers", () => {
  it("normalizes track URLs and strips UTM query params", () => {
    assert.equal(
      normalizeSoundCloudUrl(
        "https://soundcloud.com/banoo-002/gloria-gaynor-i-will-survive?utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
      ),
      "https://soundcloud.com/banoo-002/gloria-gaynor-i-will-survive",
    );
  });

  it("rejects non-SoundCloud URLs", () => {
    assert.equal(normalizeSoundCloudUrl("https://example.com/track"), "");
    assert.equal(normalizeSoundCloudUrl(""), "");
    assert.equal(normalizeSoundCloudUrl("not a url"), "");
  });

  it("builds a player iframe with encoded track url", () => {
    const html = soundCloudEmbedHtml(
      "https://soundcloud.com/banoo-002/gloria-gaynor-i-will-survive?utm_source=clipboard",
    );
    assert.match(html, /w\.soundcloud\.com\/player\/\?url=/);
    assert.match(html, /url=https%3A%2F%2Fsoundcloud\.com%2Fbanoo-002%2Fgloria-gaynor-i-will-survive/);
    assert.doesNotMatch(html, /utm_source/);
    assert.match(html, /title="SoundCloud player"/);
  });

  it("returns empty HTML for invalid song values", () => {
    assert.equal(soundCloudEmbedHtml("https://youtube.com/watch?v=abc"), "");
  });
});

describe("postPage song block", () => {
  const { postPage } = createTemplates({
    site: { name: "Test", role: "Developer", description: "Test site" },
    siteUrl: "https://example.com",
    images,
  });

  it("injects SoundCloud player when song frontmatter is set", () => {
    const raw = `---
title: Song post
date: 2026-08-12
description: with music
image: https://example.com/cover.jpg
tags:
  - music
song: https://soundcloud.com/banoo-002/gloria-gaynor-i-will-survive?utm_source=clipboard
---

Body text.
`;
    const page = postPage({ name: "Test" }, raw, "song-post.md");
    assert.match(page.html, /class="post-song"/);
    assert.match(page.html, /w\.soundcloud\.com\/player\/\?url=/);
    assert.match(page.html, /banoo-002%2Fgloria-gaynor-i-will-survive/);
  });

  it("omits song block when song is missing or invalid", () => {
    const raw = `---
title: Quiet post
date: 2026-08-12
description: no music
image: https://example.com/cover.jpg
tags:
  - writing
---

Body text.
`;
    const page = postPage({ name: "Test" }, raw, "quiet-post.md");
    assert.doesNotMatch(page.html, /post-song/);
    assert.doesNotMatch(page.html, /soundcloud\.com\/player/);
  });
});

describe("homePage top songs", () => {
  const { homePage } = createTemplates({
    site: { name: "Test", role: "Developer", description: "Test site" },
    siteUrl: "https://example.com",
    images,
  });

  it("renders up to three SoundCloud players from content.songs", () => {
    const html = homePage({
      HERO_SECTION: { title: "Test", subtitle: "Hi", info: "" },
      CTA_SECTION: { buttonText: "Blog" },
      projects: [],
      songs: [
        { title: "One", url: "https://soundcloud.com/banoo-002/gloria-gaynor-i-will-survive" },
        { title: "Two", url: "https://soundcloud.com/forss/flickermood" },
        { title: "Skip me", url: "" },
        { title: "Four should not show", url: "https://soundcloud.com/extra/track" },
      ],
      SOCIAL_LINKS: [],
    });
    assert.match(html, /id="songs"/);
    assert.match(html, /Top three songs/);
    assert.match(html, /banoo-002%2Fgloria-gaynor-i-will-survive/);
    assert.match(html, /forss%2Fflickermood/);
    assert.doesNotMatch(html, /extra%2Ftrack/);
    assert.equal((html.match(/class="home-song"/g) || []).length, 2);
  });

  it("hides the songs section when there are no valid links", () => {
    const html = homePage({
      HERO_SECTION: { title: "Test", subtitle: "Hi", info: "" },
      CTA_SECTION: { buttonText: "Blog" },
      projects: [],
      songs: [{ title: "Nope", url: "https://example.com/x" }],
      SOCIAL_LINKS: [],
    });
    assert.doesNotMatch(html, /id="songs"/);
  });
});

