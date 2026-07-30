import { parseLikesFile } from "./likes.js";

function parsePendingFrontMatter(text) {
  if (!text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end === -1) return {};
  const block = text.slice(4, end);
  const meta = {};
  for (const line of block.split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return meta;
}

export function renderReviewHome(pendingItems = []) {
  const lines = [
    "---",
    "type: review-home",
    "---",
    "",
    "# Review inbox",
    "",
    "**How to moderate:** open a pending note → set frontmatter `decision:` to `accept` or `reject` → commit & push with Obsidian Git.",
    "",
    "See also: [[Review/Likes|Likes overview]]",
    "",
    `## Pending (${pendingItems.length})`,
    "",
  ];

  if (!pendingItems.length) {
    lines.push("No comments waiting — you’re clear.", "");
  } else {
    for (const item of pendingItems) {
      const when = (item.createdAt || "").slice(0, 10) || "unknown date";
      const link = `Review/Pending/${item.name}`;
      lines.push(`- [[${link}|${item.post} — ${item.author}]] · ${when}`);
      if (item.preview) lines.push(`  - ${item.preview}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}`;
}

export function renderLikesMarkdown(rows = []) {
  const lines = [
    "---",
    "type: review-likes",
    "---",
    "",
    "# Likes",
    "",
    "| Post | Likes |",
    "|------|------:|",
  ];
  if (!rows.length) {
    lines.push("| — | 0 |", "", "No likes recorded yet.", "");
  } else {
    for (const { slug, count } of rows) {
      lines.push(`| ${slug} | ${count} |`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}`;
}

export async function listPendingFromGitlab(gitlab, { treeFetch } = {}) {
  // Without tree API, rebuild Home from known writes; callers can pass items.
  if (typeof treeFetch === "function") {
    return treeFetch();
  }
  return [];
}

export function pendingItemFromNote(filename, content) {
  const meta = parsePendingFrontMatter(content);
  if ((meta.decision || "pending") !== "pending") return null;
  const body = content.split(/\n---\n/).slice(2).join("\n---\n") || "";
  const lines = body.trim().split("\n");
  let start = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("#") || line.startsWith("**From:**") || line.startsWith("**When:**") || !line.trim()) {
      start = i + 1;
      continue;
    }
    break;
  }
  let preview = lines.slice(start).join(" ").trim();
  if (preview.length > 120) preview = `${preview.slice(0, 117)}…`;
  return {
    name: filename.replace(/\.md$/, ""),
    post: meta.post || "",
    author: meta.author || "Anonymous",
    createdAt: meta.createdAt || "",
    preview,
  };
}

/** Refresh Likes.md from all likes/*.json currently known via optional list + getRaw. */
export async function refreshLikesMarkdown(gitlab, { listLikeFiles } = {}) {
  const rows = [];
  if (typeof listLikeFiles === "function") {
    const files = await listLikeFiles();
    for (const filePath of files) {
      try {
        const { content } = await gitlab.getRaw(filePath);
        const slug = filePath.replace(/^likes\//, "").replace(/\.json$/, "");
        const data = parseLikesFile(content, slug);
        rows.push({ slug: data.slug, count: data.devices.length });
      } catch {
        // skip missing
      }
    }
  }
  rows.sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
  await gitlab.writeFile("Review/Likes.md", renderLikesMarkdown(rows), {
    message: "refresh Review/Likes",
    skipRebuild: true,
  });
  return rows;
}

/**
 * Append one pending item into Home.md by reading current Home or rewriting from items.
 */
export async function refreshHomeMarkdown(gitlab, pendingItems) {
  await gitlab.writeFile("Review/Home.md", renderReviewHome(pendingItems), {
    message: "refresh Review/Home",
    skipRebuild: true,
  });
}

/**
 * After creating a pending comment, merge into Home by reading existing Home links if possible.
 */
export async function appendPendingToHome(gitlab, item) {
  let existing = [];
  try {
    const { content } = await gitlab.getRaw("Review/Home.md");
    const linkRe = /- \[\[Review\/Pending\/([^\]]+)\|([^\]]+)\]\] · ([^\n]+)/g;
    let match;
    while ((match = linkRe.exec(content))) {
      const name = match[1];
      const label = match[2];
      const [post, author] = label.split(" — ");
      existing.push({
        name,
        post: post || "",
        author: (author || "Anonymous").trim(),
        createdAt: match[3] || "",
        preview: "",
      });
    }
  } catch {
    existing = [];
  }

  if (!existing.some((entry) => entry.name === item.name)) {
    existing.unshift(item);
  }
  await refreshHomeMarkdown(gitlab, existing);
}
