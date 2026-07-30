export function emptyManifest() {
  return {
    version: 1,
    full: false,
    posts: [],
    commentPages: [],
    indexes: false,
  };
}

export function parseManifest(raw) {
  if (!raw) return emptyManifest();
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return emptyManifest();
    return {
      version: Number(data.version) || 1,
      full: Boolean(data.full),
      posts: Array.isArray(data.posts) ? data.posts.map(String) : [],
      commentPages: Array.isArray(data.commentPages) ? data.commentPages.map(String) : [],
      indexes: Boolean(data.indexes),
    };
  } catch {
    return emptyManifest();
  }
}

export function mergeManifest(base, patch = {}) {
  const next = {
    ...emptyManifest(),
    ...base,
    posts: [...(base.posts || [])],
    commentPages: [...(base.commentPages || [])],
  };
  if (patch.full) next.full = true;
  if (patch.indexes) next.indexes = true;
  for (const post of patch.posts || []) {
    if (post && !next.posts.includes(post)) next.posts.push(post);
  }
  for (const slug of patch.commentPages || []) {
    if (slug && !next.commentPages.includes(slug)) next.commentPages.push(slug);
  }
  return next;
}

export function clearProcessedManifest(manifest, processed = {}) {
  const next = {
    version: 1,
    full: false,
    posts: [],
    commentPages: [],
    indexes: false,
  };
  const processedPosts = new Set(processed.posts || manifest.posts || []);
  const processedComments = new Set(processed.commentPages || manifest.commentPages || []);

  if (!processed.clearAll) {
    for (const post of manifest.posts || []) {
      if (!processedPosts.has(post)) next.posts.push(post);
    }
    for (const slug of manifest.commentPages || []) {
      if (!processedComments.has(slug)) next.commentPages.push(slug);
    }
    if (manifest.indexes && !processed.indexes) next.indexes = true;
    if (manifest.full && !processed.full) next.full = true;
  }

  return next;
}

export function needsFullRebuild(manifest, { hasCache = true } = {}) {
  return Boolean(manifest?.full) || !hasCache;
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
