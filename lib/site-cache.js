const CACHE_REF = "site-cache";

export function cacheRef() {
  return process.env.SITE_CACHE_REF || CACHE_REF;
}

/** Relative dist paths we keep in the cache branch. */
export function cacheablePaths(urls = [], commentSlugs = []) {
  const paths = [];
  for (const item of urls) {
    const pathname = item.pathname || item;
    if (!pathname.startsWith("/blog")) continue;
    paths.push(`${pathname.replace(/^\//, "").replace(/\/$/, "")}/index.html`);
  }
  for (const slug of commentSlugs) {
    paths.push(`comments/${slug}.json`);
  }
  return [...new Set(paths)];
}

export async function readCacheFile(gitlabFileFn, relativePath) {
  try {
    return await gitlabFileFn(relativePath, cacheRef());
  } catch {
    return null;
  }
}
