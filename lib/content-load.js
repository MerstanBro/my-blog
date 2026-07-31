import { toUiEntries, parseLeaderboard } from "./leaderboard.js";
import { needsFullRebuild, parseManifest } from "./manifest.js";
import { readCacheFile } from "./site-cache.js";

export function createContentLoader({ isDemo, demo, projectId, token, ref, postSlugFromName, slugify }) {
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

  return { loadContent };
}
