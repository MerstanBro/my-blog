import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFsHelpers } from "./lib/build-fs.js";
import { createContentLoader } from "./lib/content-load.js";
import { createGitlabClient } from "./lib/gitlab.js";
import { pathSegment, postSlugFromName, slugify } from "./lib/html-utils.js";
import { createImageOptimizer } from "./lib/images.js";
import { clearProcessedManifest, serializeManifest } from "./lib/manifest.js";
import { minifyCss, minifyHtml, minifyJs } from "./lib/minify.js";
import { cacheRef } from "./lib/site-cache.js";
import { demo, site } from "./lib/site-config.js";
import { createTemplates } from "./lib/templates.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const isDemo = process.argv.includes("--demo");

dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, "..", ".env") });

const siteUrl = (process.env.SITE_URL || "https://anasmerstani.com").replace(/\/$/, "");
const projectId = process.env.GITLAB_PROJECT_ID || process.env.NEXT_PUBLIC_GITLAB_PROJECT_ID;
const token = process.env.GITLAB_TOKEN || process.env.NEXT_PUBLIC_GITLAB_TOKEN;
const ref = process.env.GITLAB_REF || "main";

const images = createImageOptimizer({ root, dist });

async function minifyAsset(relativePath, transform) {
  try {
    const absolute = path.join(dist, relativePath);
    const body = await fs.readFile(absolute, "utf8");
    await fs.writeFile(absolute, (await transform(body)).trimEnd(), "utf8");
    return true;
  } catch (error) {
    console.warn(`minify skip ${relativePath}:`, error.message);
    return false;
  }
}

async function minifyAssets() {
  const assetFiles = ["styles.css", "main.js", "likes.js", "comments.js", "diagrams.js", "type-race.js"];
  const results = await Promise.all(
    assetFiles.map((file) =>
      minifyAsset(path.join("assets", file), file.endsWith(".css") ? minifyCss : minifyJs),
    ),
  );
  return results.filter(Boolean).length;
}

const fsHelpers = createFsHelpers({ root, dist });
const { write: writeRaw, copy, copyFonts, copyVendorScripts } = fsHelpers;

const write = async (relativePath, value) => {
  const html = relativePath.endsWith(".html") ? minifyHtml(value) : value;
  return writeRaw(relativePath, html);
};

const { loadContent } = createContentLoader({
  isDemo,
  demo,
  projectId,
  token,
  ref,
  postSlugFromName,
  slugify,
});
const { homePage, listingPage, postPage, sitemap, listingPath } = createTemplates({ site, siteUrl, images });

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

  const optimizedImages = await images.optimizeAllImages();
  if (optimizedImages) console.log(`Optimized ${optimizedImages} images into AVIF/WebP variants`);

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
  const minifiedAssets = await minifyAssets();
  await copyFonts();
  await copyVendorScripts();
  await copy(path.join(root, "public"), dist);
  const iconData = await fs.readFile(path.join(dist, "square.png"));
  const embeddedIcon = iconData.toString("base64");
  await write("favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><clipPath id="circle"><circle cx="256" cy="256" r="248"/></clipPath></defs><image width="512" height="512" href="data:image/png;base64,${embeddedIcon}" preserveAspectRatio="xMidYMid slice" clip-path="url(#circle)"/></svg>`);

  await publishSiteCache(["blog/index.html", ...cachePaths]);
  await clearManifestAfterBuild(data.manifest || { posts: [], commentPages: [] });

  console.log(`Done: ${urls.length} URLs generated in dist (${minifiedAssets} assets minified)`);
}

build().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
