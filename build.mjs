import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { createGitlabClient } from "./lib/gitlab.mjs";
import { markdownHtml } from "./lib/markdown.mjs";
import {
  clearProcessedManifest,
  needsFullRebuild,
  parseManifest,
  serializeManifest,
} from "./lib/manifest.mjs";
import { toUiEntries, parseLeaderboard } from "./lib/leaderboard.mjs";
import { cacheRef, readCacheFile } from "./lib/site-cache.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const isDemo = process.argv.includes("--demo");

dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, "..", ".env") });

const siteUrl = (process.env.SITE_URL || "https://anasmerstani.com").replace(/\/$/, "");
const projectId = process.env.GITLAB_PROJECT_ID || process.env.NEXT_PUBLIC_GITLAB_PROJECT_ID;
const token = process.env.GITLAB_TOKEN || process.env.NEXT_PUBLIC_GITLAB_TOKEN;
const ref = process.env.GITLAB_REF || "main";

const site = {
  name: "Anas Al-Merstani",
  role: "Developer",
  description:
    "Thoughtful notes on development, technology, philosophy, and building useful things.",
};

const demo = {
  content: {
    HERO_SECTION: {
      title: "Anas Al-Merstani",
      subtitle: "Developer and builder.",
      info: "I build focused web products and share what I learn along the way.",
    },
    CTA_SECTION: {
      title: "Notes from the workbench",
      description: "Practical writing about code, systems, and the craft of shipping.",
      buttonText: "Read the blog",
    },
    projects: [
      {
        id: "1",
        title: "A focused web project",
        description: "A clean, useful product designed around speed and clarity.",
        link: "https://gitlab.com/batMerstan",
        image: "",
      },
    ],
    SOCIAL_LINKS: [
      {
        name: "GitLab",
        href: "https://gitlab.com/batMerstan",
        icon: "Gitlab",
      },
      {
        name: "LinkedIn",
        href: "https://www.linkedin.com/in/anas-merstani-261ba81ab/",
        icon: "Linkedin",
      },
    ],
    leaderboardEntries: {
      entries: [
        { rank: 1, Name: "Anas", WPM: 77, Date: "Today" },
        { rank: 2, Name: "You?", WPM: 70, Date: "Next" },
      ],
    },
  },
  details: {
    number_of_pages: 1,
    tags: [
      { name: "JavaScript", number_of_pages: 1 },
      { name: "Engineering", number_of_pages: 1 },
    ],
  },
  blogs: [
    {
      title: "Building a fast static blog",
      path: "Building a fast static blog",
      description: "Why simple HTML, CSS, and JavaScript can be the right stack.",
      image: "",
      tags: ["JavaScript", "Engineering"],
      date: "2026-07-31",
    },
  ],
  posts: {
    "Building a fast static blog": `---
title: Building a fast static blog
description: Why simple HTML, CSS, and JavaScript can be the right stack.
date: 2026-07-31
image: ""
tags:
  - JavaScript
  - Engineering
---

Static sites are hard to beat when the content can be prepared ahead of time.

## The useful split

- Render articles during the build.
- Ship only the JavaScript that creates real interaction.
- Keep content editing separate from presentation.

\`\`\`js
const fast = "less runtime work";
console.log(fast);
\`\`\`

\`\`\`mermaid
flowchart LR
  Content[Content] --> Build[build.mjs] --> Dist[dist]
\`\`\`

\`\`\`chart
{"type":"bar","data":{"labels":["HTML","CSS","JS"],"datasets":[{"label":"Files","data":[12,1,3]}]}}
\`\`\`

The result is fast by default, easy to cache, and friendly to search engines.
`,
  },
  approvedComments: {
    "Building-a-fast-static-blog": [
      {
        id: "demo-1",
        postSlug: "Building-a-fast-static-blog",
        author: "Reader",
        body: "Clear and useful. Looking forward to v2.",
        createdAt: "2026-07-31T00:00:00.000Z",
      },
    ],
  },
  manifest: { version: 1, full: true, posts: [], commentPages: [], indexes: false },
};

function postSlugFromName(name = "") {
  return slugify(String(name).replace(/\.md$/i, ""));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function slugify(value = "") {
  return String(value).trim().replace(/\s+/g, "-");
}

function pathSegment(value = "") {
  // Encode non-ASCII/spaces for safe static paths (Arabic titles, tags, etc.)
  return encodeURIComponent(slugify(value));
}

function tagSlug(value = "") {
  return pathSegment(value);
}

function absoluteUrl(value = "") {
  if (!value) return `${siteUrl}/og-default.svg`;
  return /^https?:\/\//.test(value) ? value : `${siteUrl}${value.startsWith("/") ? "" : "/"}${value}`;
}

function isoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toISOString();
}

async function write(relativePath, value) {
  const target = path.join(dist, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, value, "utf8");
}

async function copy(source, destination) {
  try {
    await fs.cp(source, destination, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function copyFonts() {
  const fontFiles = [
    ["@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2", "manrope-variable.woff2"],
    ["@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff2", "dm-mono-400.woff2"],
    ["@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2", "dm-mono-500.woff2"],
    ["@fontsource-variable/noto-kufi-arabic/files/noto-kufi-arabic-arabic-wght-normal.woff2", "noto-kufi-arabic-variable.woff2"],
  ];
  const destination = path.join(dist, "assets", "fonts");
  await fs.mkdir(destination, { recursive: true });
  for (const [source, filename] of fontFiles) {
    await fs.copyFile(path.join(root, "node_modules", source), path.join(destination, filename));
  }
}

async function copyVendorScripts() {
  const vendor = path.join(dist, "assets", "vendor");
  await fs.mkdir(vendor, { recursive: true });
  await fs.copyFile(
    path.join(root, "node_modules", "chart.js", "dist", "chart.umd.js"),
    path.join(vendor, "chart.umd.js"),
  );
}

async function gitlabFile(filePath, fileRef = ref) {
  if (!projectId || !token) {
    throw new Error("GITLAB_PROJECT_ID and GITLAB_TOKEN are required. Use npm run build:demo for a local preview.");
  }

  const url =
    `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}` +
    `/repository/files/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(fileRef)}`;
  const response = await fetch(url, { headers: { "PRIVATE-TOKEN": token } });

  if (!response.ok) {
    throw new Error(`GitLab ${response.status}: failed to fetch ${filePath}`);
  }

  return response.text();
}

async function gitlabFileOptional(filePath, fileRef = ref) {
  try {
    return await gitlabFile(filePath, fileRef);
  } catch {
    return null;
  }
}

async function loadApprovedComments(slugs) {
  const approved = {};
  for (const slug of slugs) {
    const raw = await gitlabFileOptional(`comments/approved/${slug}.json`);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) approved[slug] = data;
    } catch {
      // ignore malformed
    }
  }
  return approved;
}

async function loadContent() {
  if (isDemo) {
    return {
      content: demo.content,
      details: demo.details,
      pages: new Map([["all:1", { blogs: demo.blogs }]]),
      posts: demo.posts,
      approvedComments: demo.approvedComments,
      manifest: demo.manifest,
      incremental: false,
      cachedHtml: new Map(),
    };
  }

  const manifestRaw = await gitlabFileOptional("rebuild-manifest.json");
  const manifest = parseManifest(manifestRaw);
  const cacheProbe = await readCacheFile(gitlabFileOptional, "blog/index.html");
  const full = needsFullRebuild(manifest, { hasCache: Boolean(cacheProbe) });

  const [contentRaw, detailsRaw, leaderboardRaw] = await Promise.all([
    gitlabFile("content.json"),
    gitlabFile("details.json"),
    gitlabFileOptional("leaderboard.json"),
  ]);
  const content = JSON.parse(contentRaw);
  const details = JSON.parse(detailsRaw);
  if (leaderboardRaw) {
    content.leaderboardEntries = toUiEntries(parseLeaderboard(leaderboardRaw));
  }

  const pages = new Map();
  for (let page = 1; page <= details.number_of_pages; page += 1) {
    pages.set(`all:${page}`, JSON.parse(await gitlabFile(`pages/${page}.json`)));
  }
  for (const tag of details.tags || []) {
    for (let page = 1; page <= tag.number_of_pages; page += 1) {
      pages.set(
        `${tag.name}:${page}`,
        JSON.parse(await gitlabFile(`tags/${tag.name}/${page}.json`)),
      );
    }
  }

  const postNames = new Set();
  for (let page = 1; page <= details.number_of_pages; page += 1) {
    for (const blog of pages.get(`all:${page}`)?.blogs || []) {
      postNames.add(blog.path || blog.title);
    }
  }

  const dirtyPosts = new Set(manifest.posts || []);
  const posts = {};
  const cachedHtml = new Map();

  for (const name of postNames) {
    const dirty = full || dirtyPosts.has(name) || dirtyPosts.has(postSlugFromName(name));
    if (dirty) {
      posts[name] = await gitlabFile(name);
    } else {
      const fileSlug = slugify(name);
      const cached = await readCacheFile(gitlabFileOptional, `blog/${fileSlug}/index.html`);
      if (cached) cachedHtml.set(name, cached);
      else posts[name] = await gitlabFile(name);
    }
  }

  const commentSlugs = new Set([
    ...(manifest.commentPages || []),
    ...[...postNames].map((name) => postSlugFromName(name)),
  ]);
  const approvedComments = await loadApprovedComments([...commentSlugs]);

  return {
    content,
    details,
    pages,
    posts,
    approvedComments,
    manifest,
    incremental: !full,
    cachedHtml,
  };
}

function icons(name) {
  const paths = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    keyboard: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h.01M11 9h.01M15 9h.01M19 9h.01M7 13h.01M11 13h.01M15 13h.01M19 13h.01M8 17h8"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ""}</svg>`;
}

function header(active = "") {
  return `<header class="site-header">
    <div class="shell header-inner">
      <a class="wordmark" href="/" aria-label="${site.name} home">AM<span>.</span></a>
      <nav class="desktop-nav" aria-label="Main navigation">
        <a ${active === "home" ? 'aria-current="page"' : ""} href="/">Home</a>
        <a ${active === "blog" ? 'aria-current="page"' : ""} href="/blog/">Writing</a>
        <a href="/#projects">Projects</a>
        <a href="/#type-race">Type race</a>
      </nav>
      <div class="header-actions">
        <button class="icon-button theme-toggle" type="button" aria-label="Toggle color theme">
          <span class="theme-icon-light">${icons("sun")}</span>
          <span class="theme-icon-dark">${icons("moon")}</span>
        </button>
        <button class="icon-button menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false">${icons("menu")}</button>
      </div>
    </div>
    <nav class="mobile-nav shell" aria-label="Mobile navigation">
      <a href="/">Home</a><a href="/blog/">Writing</a><a href="/#projects">Projects</a><a href="/#type-race">Type race</a>
    </nav>
  </header>`;
}

function footer(content) {
  const social = (content.SOCIAL_LINKS || [])
    .map((item) => `<a href="${escapeHtml(item.href)}" rel="noreferrer" target="_blank">${escapeHtml(item.name)}</a>`)
    .join("");
  return `<footer class="site-footer">
    <div class="shell footer-inner">
      <div><a class="wordmark" href="/">AM<span>.</span></a><p>Built with plain HTML, CSS, and JavaScript.</p></div>
      <div class="footer-links">${social}</div>
    </div>
    <div class="shell footer-bottom"><span>© ${new Date().getFullYear()} ${site.name}</span><a href="/blog/">Read the writing</a></div>
  </footer>`;
}

function head({ title, description, pathname = "/", image = "", type = "website", date, tags = [], schema }) {
  const canonical = `${siteUrl}${pathname}`;
  const fullTitle = title === site.name ? `${site.name} — ${site.role}` : `${title} — ${site.name}`;
  const tagMeta = tags.length ? `<meta name="keywords" content="${escapeHtml(tags.join(", "))}">` : "";
  const articleMeta = type === "article"
    ? `<meta property="article:published_time" content="${escapeHtml(isoDate(date))}">${tags.map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}">`).join("")}`
    : "";
  return `<!doctype html>
<html lang="en" data-theme="system">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script>try{const t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch{}</script>
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${tagMeta}
  <link rel="canonical" href="${canonical}">
  <meta name="theme-color" content="#f5f4ef" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#111210" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${absoluteUrl(image)}">
  ${articleMeta}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/square.png">
  <link rel="preload" href="/assets/fonts/manrope-variable.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/dm-mono-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/styles.css">
  ${schema ? `<script type="application/ld+json">${escapeJson(schema)}</script>` : ""}
</head>`;
}

function layout({ title, description, pathname, image, type, date, tags, schema, active, content, body, scripts = [] }) {
  return `${head({ title, description, pathname, image, type, date, tags, schema })}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${header(active)}
  <main id="main">${body}</main>
  ${footer(content)}
  <script src="/assets/main.js" defer></script>
  ${scripts.map((script) => `<script src="${script}" defer></script>`).join("\n")}
</body>
</html>`;
}

function imageOrMark(image, title, className = "") {
  return image
    ? `<img class="${className}" src="${escapeHtml(image)}" alt="" loading="lazy">`
    : `<div class="image-mark ${className}" aria-hidden="true"><span>${escapeHtml(title.slice(0, 1))}</span></div>`;
}

function homePage(content) {
  const hero = content.HERO_SECTION || {};
  const cta = content.CTA_SECTION || {};
  const projects = (content.projects || [])
    .map((project, index) => `<article class="project-card">
      <div class="project-number">0${index + 1}</div>
      ${imageOrMark(project.image, project.title, "project-image")}
      <div class="project-copy">
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        <a class="text-link" href="${escapeHtml(project.link)}" target="_blank" rel="noreferrer">View project ${icons("external")}</a>
      </div>
    </article>`)
    .join("");
  const body = `
    <section class="hero shell">
      <div class="hero-grid">
        <div>
          <div class="eyebrow"><span></span>${escapeHtml(site.role)}</div>
          <h1>${escapeHtml(hero.title || site.name)}</h1>
          <p class="hero-lead">${escapeHtml(hero.subtitle || site.description)}</p>
          <p class="hero-note">${escapeHtml(hero.info || "")}</p>
          <div class="hero-actions">
            <a class="button primary" href="/blog/">${escapeHtml(cta.buttonText || "Read the blog")} ${icons("arrow")}</a>
            <a class="button quiet" href="#type-race">${icons("keyboard")} Race me</a>
          </div>
        </div>
        <figure class="hero-portrait">
          <img src="/images/anas.jpg" alt="${escapeHtml(site.name)}" width="420" height="420" decoding="async">
        </figure>
      </div>
    </section>
    <section class="section shell" id="projects">
      <div class="section-heading"><div><p class="section-kicker">Selected work</p><h2>Things I’ve built</h2></div><p>Focused projects made to solve real problems without unnecessary complexity.</p></div>
      <div class="project-grid">${projects}</div>
    </section>
    <section class="section shell race-section" id="type-race">
      <div class="section-heading"><div><p class="section-kicker">A small challenge</p><h2>Think you type faster?</h2></div><p>Race against my target speed. Win with perfect accuracy to join the board.</p></div>
      <div id="typing-race" data-target-wpm="77" data-leaderboard="${escapeHtml(escapeJson(content.leaderboardEntries || { entries: [] }))}"></div>
    </section>`;
  return layout({
    title: site.name,
    description: site.description,
    pathname: "/",
    active: "home",
    content,
    body,
    scripts: ["/assets/type-race.js"],
    schema: {
      "@context": "https://schema.org",
      "@type": "Person",
      name: site.name,
      url: siteUrl,
      jobTitle: "Developer",
      sameAs: (content.SOCIAL_LINKS || []).map((item) => item.href),
    },
  });
}

function listingPath(tag, page, forUrl = true) {
  const tagPart = tag ? (forUrl ? pathSegment(tag) : slugify(tag)) : null;
  if (tagPart) return page === 1 ? `/blog/tag/${tagPart}/` : `/blog/tag/${tagPart}/page/${page}/`;
  return page === 1 ? "/blog/" : `/blog/page/${page}/`;
}

function pagination(tag, page, total) {
  if (total <= 1) return "";
  const links = [];
  for (let value = 1; value <= total; value += 1) {
    if (value === 1 || value === total || Math.abs(value - page) <= 1) {
      links.push(`<a ${value === page ? 'aria-current="page"' : ""} href="${listingPath(tag, value)}">${value}</a>`);
    } else if (links.at(-1) !== "<span>…</span>") links.push("<span>…</span>");
  }
  return `<nav class="pagination" aria-label="Pagination">${page > 1 ? `<a href="${listingPath(tag, page - 1)}">Previous</a>` : "<span></span>"}<div>${links.join("")}</div>${page < total ? `<a href="${listingPath(tag, page + 1)}">Next</a>` : "<span></span>"}</nav>`;
}

function listingPage(content, details, pageData, tag, page) {
  const total = tag
    ? details.tags.find((item) => item.name === tag)?.number_of_pages || 1
    : details.number_of_pages;
  const cards = (pageData.blogs || []).map((blog) => {
    const href = `/blog/${pathSegment(blog.path || blog.title)}/`;
    return `<article class="post-card">
      <a class="post-image-link" href="${href}">${imageOrMark(blog.image, blog.title, "post-image")}</a>
      <div class="post-card-copy">
        <div class="post-meta"><time datetime="${escapeHtml(blog.date)}">${formatDate(blog.date)}</time><span>${escapeHtml((blog.tags || [])[0] || "Article")}</span></div>
        <h2><a href="${href}">${escapeHtml(blog.title)}</a></h2>
        <p>${escapeHtml(blog.description)}</p>
        <a class="text-link" href="${href}">Read article ${icons("arrow")}</a>
      </div>
    </article>`;
  }).join("");
  const tags = (details.tags || []).map((item) => `<a ${item.name === tag ? 'aria-current="page"' : ""} href="${listingPath(item.name, 1)}">${escapeHtml(item.name)}</a>`).join("");
  const title = tag ? `${tag} articles` : "Writing";
  const body = `<section class="page-hero shell">
      <p class="section-kicker">Ideas, notes, and field reports</p>
      <h1>${escapeHtml(title)}</h1>
      <p>Practical writing about software, the web, and making useful things.</p>
    </section>
    <section class="blog-layout shell">
      <aside class="tag-nav" aria-label="Filter articles"><a ${!tag ? 'aria-current="page"' : ""} href="/blog/">All writing</a>${tags}</aside>
      <div><div class="post-grid">${cards || "<p>No articles found.</p>"}</div>${pagination(tag, page, total)}</div>
    </section>`;
  return layout({
    title,
    description: tag ? `Articles about ${tag} by ${site.name}.` : site.description,
    pathname: listingPath(tag, page),
    active: "blog",
    content,
    body,
  });
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? escapeHtml(value)
    : new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function postPage(content, raw, fallbackName) {
  const parsed = matter(raw);
  const metadata = parsed.data;
  const title = metadata.title || fallbackName;
  const fileSlug = slugify(fallbackName || title);
  const urlSlug = pathSegment(fallbackName || title);
  const interactionSlug = postSlugFromName(fallbackName || title);
  const postPath = String(fallbackName || "").endsWith(".md")
    ? String(fallbackName)
    : `${fallbackName}.md`;
  const tags = metadata.tags || [];
  const tagLinks = tags.map((tag) => `<a href="${listingPath(tag, 1)}">${escapeHtml(tag)}</a>`).join("");
  const isArabic = /^[\u0600-\u06ff]/.test(parsed.content.trim());
  const rendered = markdownHtml(parsed.content);
  const scripts = ["/assets/likes.js", "/assets/comments.js"];
  if (rendered.hasMermaid || rendered.hasChart) scripts.push("/assets/diagrams.js");

  const body = `<article class="article-shell shell" dir="${isArabic ? "rtl" : "ltr"}">
      <a class="back-link" href="/blog/">← All writing</a>
      <div class="article-lead ${metadata.image ? "has-cover" : ""}">
        <header class="article-header">
          <div class="post-meta"><time datetime="${escapeHtml(metadata.date)}">${formatDate(metadata.date)}</time><span>${tags.length ? `${tags.length} topics` : "Article"}</span></div>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(metadata.description || "")}</p>
          <div class="article-tags">${tagLinks}</div>
        </header>
        ${metadata.image ? `<img class="article-cover" src="${escapeHtml(metadata.image)}" alt="">` : ""}
      </div>
      <div class="article-actions" data-likes data-slug="${escapeHtml(interactionSlug)}">
        <button type="button" class="like-button" data-like-button aria-pressed="false">
          <span data-like-label>Like</span>
          <span class="like-count" data-like-count>·</span>
        </button>
        <p class="like-status" data-like-status hidden></p>
      </div>
      <div class="article-body">${rendered.html}</div>
      <div data-comments data-slug="${escapeHtml(interactionSlug)}" data-post-path="${escapeHtml(postPath)}"></div>
    </article>`;
  const filePathname = `/blog/${fileSlug}/`;
  const urlPathname = `/blog/${urlSlug}/`;
  return {
    filePathname,
    pathname: urlPathname,
    date: metadata.date,
    interactionSlug,
    html: layout({
      title,
      description: metadata.description || "",
      pathname: urlPathname,
      image: metadata.image,
      type: "article",
      date: metadata.date,
      tags,
      active: "blog",
      content,
      body,
      scripts,
      schema: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        description: metadata.description,
        datePublished: isoDate(metadata.date),
        image: metadata.image ? [absoluteUrl(metadata.image)] : undefined,
        author: { "@type": "Person", name: site.name, url: siteUrl },
        mainEntityOfPage: `${siteUrl}${urlPathname}`,
        keywords: tags.join(", "),
      },
    }),
  };
}

function sitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((item) => `  <url><loc>${siteUrl}${item.pathname}</loc>${item.date ? `<lastmod>${new Date(item.date).toISOString().slice(0, 10)}</lastmod>` : ""}</url>`).join("\n")}
</urlset>`;
}

async function clearManifestAfterBuild(manifest) {
  if (isDemo || !projectId || !token) return;
  try {
    const client = createGitlabClient({ projectId, token, ref });
    const cleared = clearProcessedManifest(manifest, { clearAll: true });
    await client.writeFile("rebuild-manifest.json", serializeManifest(cleared), {
      message: "clear rebuild-manifest after build",
      skipRebuild: true,
    });
    console.log("Cleared rebuild-manifest.json");
  } catch (error) {
    console.warn("Could not clear rebuild-manifest.json:", error.message);
  }
}

async function publishSiteCache(relativePaths) {
  if (isDemo || !projectId || !token || process.env.SKIP_SITE_CACHE === "1") return;
  const branch = cacheRef();
  try {
    const client = createGitlabClient({ projectId, token, ref: branch });
    for (const relative of relativePaths) {
      const absolute = path.join(dist, relative);
      try {
        const content = await fs.readFile(absolute, "utf8");
        await client.writeFile(relative, content, {
          message: `site-cache ${relative}`,
          skipRebuild: true,
        });
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.warn(`site-cache skip ${relative}:`, error.message);
        }
      }
    }
    console.log(`Updated site-cache branch (${relativePaths.length} paths attempted)`);
  } catch (error) {
    console.warn("site-cache update skipped:", error.message);
  }
}

async function build() {
  console.log(`Building ${isDemo ? "demo" : "GitLab"} content…`);
  const data = await loadContent();
  if (data.incremental) console.log("Incremental mode: reusing cached post HTML where possible");

  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });

  const urls = [{ pathname: "/" }, { pathname: "/blog/" }];
  await write("index.html", homePage(data.content));

  for (let page = 1; page <= data.details.number_of_pages; page += 1) {
    const pathname = listingPath(null, page);
    await write(path.join(pathname, "index.html"), listingPage(data.content, data.details, data.pages.get(`all:${page}`), null, page));
    if (page > 1) urls.push({ pathname });
  }

  for (const tag of data.details.tags || []) {
    for (let page = 1; page <= tag.number_of_pages; page += 1) {
      const filePathname = listingPath(tag.name, page, false);
      const urlPathname = listingPath(tag.name, page, true);
      const pageData = data.pages.get(`${tag.name}:${page}`) || {
        blogs: data.pages.get("all:1")?.blogs?.filter((blog) => blog.tags?.includes(tag.name)) || [],
      };
      await write(path.join(filePathname, "index.html"), listingPage(data.content, data.details, pageData, tag.name, page));
      urls.push({ pathname: urlPathname });
    }
  }

  const allPostNames = new Set([
    ...Object.keys(data.posts),
    ...[...(data.cachedHtml?.keys?.() || [])],
  ]);

  // Include listing-only names from pages
  for (let page = 1; page <= data.details.number_of_pages; page += 1) {
    for (const blog of data.pages.get(`all:${page}`)?.blogs || []) {
      allPostNames.add(blog.path || blog.title);
    }
  }

  const cachePaths = [];
  for (const name of allPostNames) {
    if (data.posts[name]) {
      const post = postPage(data.content, data.posts[name], name);
      await write(path.join(post.filePathname, "index.html"), post.html);
      urls.push({ pathname: post.pathname, date: post.date });
      cachePaths.push(`${post.filePathname.replace(/^\//, "").replace(/\/$/, "")}/index.html`);
    } else if (data.cachedHtml?.has(name)) {
      const fileSlug = slugify(name);
      const filePathname = `/blog/${fileSlug}/`;
      await write(path.join(filePathname, "index.html"), data.cachedHtml.get(name));
      urls.push({ pathname: `/blog/${pathSegment(name)}/` });
      cachePaths.push(`blog/${fileSlug}/index.html`);
    }
  }

  for (const [slug, comments] of Object.entries(data.approvedComments || {})) {
    await write(path.join("comments", `${slug}.json`), `${JSON.stringify(comments, null, 2)}\n`);
    cachePaths.push(`comments/${slug}.json`);
  }

  await write("sitemap.xml", sitemap(urls));
  await write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`);
  await write("manifest.webmanifest", JSON.stringify({
    name: `${site.name} — Portfolio & Blog`,
    short_name: site.name,
    start_url: "/",
    display: "standalone",
    background_color: "#f5f4ef",
    theme_color: "#f5f4ef",
    icons: [{ src: "/square.png", sizes: "any", type: "image/png" }],
  }));
  await write("og-default.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f5f4ef"/><circle cx="1040" cy="100" r="240" fill="#fff0b8"/><text x="90" y="290" font-family="Arial,sans-serif" font-size="88" font-weight="700" fill="#181916">Anas Al-Merstani</text><text x="95" y="380" font-family="Arial,sans-serif" font-size="34" fill="#686b63">Developer</text><text x="95" y="535" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#a66f00">anasmerstani.com</text></svg>');
  await copy(path.join(root, "src"), path.join(dist, "assets"));
  await copyFonts();
  await copyVendorScripts();
  await copy(path.join(root, "public"), dist);
  const iconData = await fs.readFile(path.join(dist, "square.png"));
  const embeddedIcon = iconData.toString("base64");
  await write("favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><clipPath id="circle"><circle cx="256" cy="256" r="248"/></clipPath></defs><image width="512" height="512" href="data:image/png;base64,${embeddedIcon}" preserveAspectRatio="xMidYMid slice" clip-path="url(#circle)"/></svg>`);

  await publishSiteCache(["blog/index.html", ...cachePaths]);
  await clearManifestAfterBuild(data.manifest || { posts: [], commentPages: [] });

  console.log(`Done: ${urls.length} URLs generated in dist`);
}

build().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
