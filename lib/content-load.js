import { toUiEntries, parseLeaderboard } from "./leaderboard.js";
import { needsFullRebuild, parseManifest } from "./manifest.js";
import { readCacheFile } from "./site-cache.js";

export function createContentLoader({ isDemo, demo, projectId, token, ref, postSlugFromName, slugify }) {
  /** Run an async worker over items with bounded concurrency. */
  async function mapLimit(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    async function run() {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index], index);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return results;
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
    const raws = await mapLimit(slugs, 12, async (slug) => {
      const raw = await gitlabFileOptional(`comments/approved/${slug}.json`);
      if (!raw) return null;
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) return [slug, data];
      } catch {
        // ignore malformed
      }
      return null;
    });
    for (const entry of raws) {
      if (entry) approved[entry[0]] = entry[1];
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
    const pageKeys = [];
    for (let page = 1; page <= details.number_of_pages; page += 1) {
      pageKeys.push([`all:${page}`, `pages/${page}.json`]);
    }
    for (const tag of details.tags || []) {
      for (let page = 1; page <= tag.number_of_pages; page += 1) {
        pageKeys.push([`${tag.name}:${page}`, `tags/${tag.name}/${page}.json`]);
      }
    }
    await mapLimit(pageKeys, 12, async ([key, filePath]) => {
      pages.set(key, JSON.parse(await gitlabFile(filePath)));
    });

    const postNames = new Set();
    for (let page = 1; page <= details.number_of_pages; page += 1) {
      for (const blog of pages.get(`all:${page}`)?.blogs || []) {
        postNames.add(blog.path || blog.title);
      }
    }

    const dirtyPosts = new Set(manifest.posts || []);
    const posts = {};
    const cachedHtml = new Map();

    await mapLimit([...postNames], 8, async (name) => {
      const dirty = full || dirtyPosts.has(name) || dirtyPosts.has(postSlugFromName(name));
      if (dirty) {
        posts[name] = await gitlabFile(name);
        return;
      }
      const fileSlug = slugify(name);
      const cached = await readCacheFile(gitlabFileOptional, `blog/${fileSlug}/index.html`);
      if (cached) cachedHtml.set(name, cached);
      else posts[name] = await gitlabFile(name);
    });

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

  return { loadContent };
}
