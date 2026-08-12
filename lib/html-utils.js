export function slugify(value = "") {
  return String(value).trim().replace(/\s+/g, "-");
}

export function postSlugFromName(name = "") {
  return slugify(String(name).replace(/\.md$/i, ""));
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function pathSegment(value = "") {
  // Encode non-ASCII/spaces for safe static paths (Arabic titles, tags, etc.)
  return encodeURIComponent(slugify(value));
}

export function absoluteUrl(siteUrl, value = "") {
  if (!value) return `${siteUrl}/og-default.svg`;
  return /^https?:\/\//.test(value) ? value : `${siteUrl}${value.startsWith("/") ? "" : "/"}${value}`;
}

export function isoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toISOString();
}

export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? escapeHtml(value)
    : new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

/** Strip query/hash; return canonical https SoundCloud track URL or "" if invalid. */
export function normalizeSoundCloudUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!/^https?:$/i.test(url.protocol)) return "";
    if (!/^(?:www\.)?soundcloud\.com$/i.test(url.hostname)) return "";
    const path = url.pathname.replace(/\/+$/, "");
    if (!path || path === "/") return "";
    return `https://soundcloud.com${path}`;
  } catch {
    return "";
  }
}

/** Official SoundCloud player iframe HTML, or "" if the URL is not a SoundCloud track. */
export function soundCloudEmbedHtml(value = "") {
  const trackUrl = normalizeSoundCloudUrl(value);
  if (!trackUrl) return "";
  const src =
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}` +
    `&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`;
  return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="${escapeHtml(src)}" loading="lazy" title="SoundCloud player"></iframe>`;
}
