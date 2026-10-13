import matter from "gray-matter";
import {
  absoluteUrl,
  escapeHtml,
  escapeJson,
  formatDate,
  isoDate,
  pathSegment,
  postSlugFromName,
  slugify,
  soundCloudEmbedHtml,
} from "./html-utils.js";
import { markdownHtml } from "./markdown.js";
import { heroImage } from "./site-config.js";

const HERO_SIZES = "(max-width: 520px) 96px, (max-width: 800px) 112px, 420px";
const PROJECT_SIZES = "(max-width: 800px) calc(100vw - 36px), 560px";
const CARD_SIZES = "(max-width: 640px) calc(100vw - 36px), 320px";
const COVER_SIZES = "(max-width: 860px) calc(100vw - 36px), 820px";

export function createTemplates({ site, siteUrl, images }) {
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
    const writingGo = `<a class="nav-go ${active === "blog" ? "is-active" : ""}" ${active === "blog" ? 'aria-current="page"' : ""} href="/blog/">Writing ${icons("arrow")}</a>`;
    return `<header class="site-header">
    <div class="shell header-inner">
      <a class="brand-mark" href="/" aria-label="${site.name} home"><img src="/square.png" alt="" width="36" height="36" decoding="async"></a>
      <nav class="desktop-nav" aria-label="Main navigation">
        <a ${active === "home" ? 'aria-current="page"' : ""} href="/">Home</a>
        <a href="/#projects">Projects</a>
        <a href="/#type-race">Type race</a>
      </nav>
      <div class="header-actions">
        <button class="icon-button theme-toggle" type="button" aria-label="Toggle color theme">
          <span class="theme-icon-light">${icons("sun")}</span>
          <span class="theme-icon-dark">${icons("moon")}</span>
        </button>
        ${writingGo}
        <button class="icon-button menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false">${icons("menu")}</button>
      </div>
    </div>
    <nav class="mobile-nav shell" aria-label="Mobile navigation">
      <div class="mobile-nav-panel">
        <div class="mobile-nav-links">
          <a ${active === "home" ? 'aria-current="page"' : ""} href="/">Home</a>
          <a href="/#projects">Projects</a>
          <a href="/#type-race">Type race</a>
        </div>
        ${writingGo}
      </div>
    </nav>
  </header>`;
  }

  function footer(content) {
    const social = (content.SOCIAL_LINKS || [])
      .map((item) => `<a href="${escapeHtml(item.href)}" rel="noreferrer" target="_blank">${escapeHtml(item.name)}</a>`)
      .join("");
    return `<footer class="site-footer">
    <div class="shell footer-inner">
      <div><a class="brand-mark brand-mark-footer" href="/" aria-label="${site.name} home"><img src="/square.png" alt="" width="40" height="40" decoding="async"></a><p>Built with plain HTML, CSS, and JavaScript.</p></div>
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
  <meta property="og:image" content="${absoluteUrl(siteUrl, image)}">
  ${articleMeta}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/square.png">
  <link rel="preload" href="/assets/fonts/manrope-variable.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/dm-mono-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/dm-mono-500.woff2" as="font" type="font/woff2" crossorigin>
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

  function imageOrMark(image, title, className = "", sizes = "") {
    return image
      ? images.markup(image, { className, sizes, loading: "lazy" })
      : `<div class="image-mark ${className}" aria-hidden="true"><span>${escapeHtml(title.slice(0, 1))}</span></div>`;
  }

  function homePage(content) {
    const hero = content.HERO_SECTION || {};
    const cta = content.CTA_SECTION || {};
    const projects = (content.projects || [])
      .map((project, index) => `<article class="project-card">
      <div class="project-number">0${index + 1}</div>
      ${imageOrMark(project.image, project.title, "project-image", PROJECT_SIZES)}
      <div class="project-copy">
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        <a class="text-link" href="${escapeHtml(project.link)}" target="_blank" rel="noreferrer">View project ${icons("external")}</a>
      </div>
    </article>`)
      .join("");
    const topSongs = (content.songs || [])
      .slice(0, 3)
      .map((song) => {
        const iframe = soundCloudEmbedHtml(song?.url || song?.song || "");
        if (!iframe) return null;
        return { title: song?.title || "", iframe };
      })
      .filter(Boolean)
      .map(
        (song, index) => `<article class="home-song">
      <div class="home-song-meta"><span class="home-song-rank">0${index + 1}</span>${song.title ? `<h3>${escapeHtml(song.title)}</h3>` : ""}</div>
      ${song.iframe}
    </article>`,
      )
      .join("");
    const songsSection = topSongs
      ? `<section class="section shell" id="songs">
      <div class="section-heading"><div><p class="section-kicker">Listening</p><h2>Top three songs</h2></div><p>Three tracks I keep coming back to. Play them here.</p></div>
      <div class="home-songs">${topSongs}</div>
    </section>`
      : "";
    const body = `
    <section class="hero shell">
      <div class="hero-grid">
        <div class="hero-copy">
          <div class="eyebrow"></div>
          <h1>${escapeHtml(hero.title || site.name)}</h1>
          <p class="hero-lead">${escapeHtml(hero.subtitle || site.description)}</p>
          <p class="hero-note">${escapeHtml(hero.info || "")}</p>
          <div class="hero-actions">
            <a class="button primary" href="/blog/">${escapeHtml(cta.buttonText || "Read the blog")} ${icons("arrow")}</a>
            <a class="button quiet" href="#type-race">${icons("keyboard")} Race me</a>
          </div>
        </div>
        <figure class="hero-portrait">
          ${images.markup(heroImage, { alt: site.name, sizes: HERO_SIZES, loading: "eager", fetchpriority: "high", width: 420, height: 420 })}
        </figure>
      </div>
    </section>
    <section class="section shell" id="projects">
      <div class="section-heading"><div><p class="section-kicker">Selected work</p><h2>Things I've built</h2></div><p>Focused projects made to solve real problems without unnecessary complexity.</p></div>
      <div class="project-grid">${projects}</div>
    </section>
    ${songsSection}
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
        links.push(`<a data-listing-soft ${value === page ? 'aria-current="page"' : ""} href="${listingPath(tag, value)}">${value}</a>`);
      } else if (links.at(-1) !== "<span>…</span>") links.push("<span>…</span>");
    }
    return `<nav class="pagination" aria-label="Pagination" data-listing-pagination>${page > 1 ? `<a data-listing-soft href="${listingPath(tag, page - 1)}">Previous</a>` : "<span></span>"}<div>${links.join("")}</div>${page < total ? `<a data-listing-soft href="${listingPath(tag, page + 1)}">Next</a>` : "<span></span>"}</nav>`;
  }

  function listingPage(content, details, pageData, tag, page) {
    const total = tag
      ? details.tags.find((item) => item.name === tag)?.number_of_pages || 1
      : details.number_of_pages;
    const cards = (pageData.blogs || []).map((blog) => {
      const href = `/blog/${pathSegment(blog.path || blog.title)}/`;
      return `<article class="post-card">
      <a class="post-image-link" href="${href}">${imageOrMark(blog.image, blog.title, "post-image", CARD_SIZES)}</a>
      <div class="post-card-copy">
        <div class="post-meta"><time datetime="${escapeHtml(blog.date)}">${formatDate(blog.date)}</time><span>${escapeHtml((blog.tags || [])[0] || "Article")}</span></div>
        <h2><a href="${href}">${escapeHtml(blog.title)}</a></h2>
        <p>${escapeHtml(blog.description)}</p>
        <a class="text-link" href="${href}">Read article ${icons("arrow")}</a>
      </div>
    </article>`;
    }).join("");
    const tags = (details.tags || []).map((item) => `<a data-listing-soft ${item.name === tag ? 'aria-current="page"' : ""} href="${listingPath(item.name, 1)}">${escapeHtml(item.name)}</a>`).join("");
    const title = tag ? `${tag} · Writing` : "Writing";
    const body = `<section class="blog-layout shell" data-blog-listing>
      <aside class="tag-nav" aria-label="Filter articles" data-tag-nav><a data-listing-soft ${!tag ? 'aria-current="page"' : ""} href="/blog/">All writing</a>${tags}</aside>
      <div data-listing-results><div class="post-grid">${cards || "<p>No articles found.</p>"}</div>${pagination(tag, page, total)}</div>
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

    const cover = metadata.image
      ? `<figure class="article-cover-wrap">${images.markup(metadata.image, {
          className: "article-cover",
          sizes: COVER_SIZES,
          loading: "eager",
          fetchpriority: "high",
        })}</figure>`
      : "";
    const songIframe = soundCloudEmbedHtml(metadata.song);
    const songBlock = songIframe
      ? `<aside class="post-song" aria-label="Song">${songIframe}</aside>`
      : "";
    const body = `<article class="article-shell shell ${metadata.image ? "has-cover" : ""}" dir="${isArabic ? "rtl" : "ltr"}">
      <a class="back-link" href="/blog/">← All writing</a>
      ${cover}
      <header class="article-header">
        <div class="article-topline">
          <div class="post-meta"><time datetime="${escapeHtml(metadata.date)}">${formatDate(metadata.date)}</time><span>${tags.length ? `${tags.length} topics` : "Article"}</span></div>
          <div class="article-actions" data-likes data-slug="${escapeHtml(interactionSlug)}">
            <button type="button" class="like-button is-loading" data-like-button aria-pressed="false" disabled aria-busy="true">
              <span class="like-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7.2-4.35-9.3-8.1C1.2 9.3 2.4 5.8 5.7 5.2c1.9-.35 3.7.55 4.8 2 1.1-1.45 2.9-2.35 4.8-2 3.3.6 4.5 4.1 3 6.7C19.2 15.65 12 20 12 20Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
              </span>
              <span class="like-copy">
                <span class="like-label" data-like-label>Like</span>
                <span class="like-count" data-like-count>—</span>
              </span>
            </button>
            <p class="like-status" data-like-status hidden></p>
          </div>
        </div>
        <h1>${escapeHtml(title)}</h1>
        <p class="article-deck">${escapeHtml(metadata.description || "")}</p>
        <div class="article-tags">${tagLinks}</div>
      </header>
      <div class="article-body">${rendered.html}</div>
      ${songBlock}
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
          image: metadata.image ? [absoluteUrl(siteUrl, metadata.image)] : undefined,
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

  return { layout, homePage, listingPage, postPage, sitemap, listingPath, icons };
}
