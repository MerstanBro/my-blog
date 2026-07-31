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
