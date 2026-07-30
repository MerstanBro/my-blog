export function isValidSlug(slug) {
  const value = String(slug || "").trim();
  return value.length > 0 && value.length <= 160 && !/[\\/]/.test(value);
}

export function sanitizeAuthor(author) {
  return String(author || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
}

export function sanitizeBody(body) {
  return String(body || "")
    .trim()
    .replace(/\r\n/g, "\n")
    .slice(0, 4000);
}

export function makeCommentId(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  const rand = Math.random().toString(36).slice(2, 6);
  return `${stamp}-${rand}`;
}

export function pendingNoteFilename({ id, postSlug, author }) {
  const safeAuthor = (author || "anon").replace(/[\\/:*?"<>|]/g, "").slice(0, 40) || "anon";
  return `${id} — ${postSlug} — ${safeAuthor}.md`;
}

export function pendingNotePath(filename) {
  return `Review/Pending/${filename}`;
}

export function renderPendingNote({ id, postSlug, postPath, author, body, createdAt }) {
  const yamlAuthor = JSON.stringify(author);
  const yamlPost = JSON.stringify(postSlug);
  const yamlPath = JSON.stringify(postPath);
  return `---
type: pending-comment
id: ${id}
post: ${yamlPost}
postPath: ${yamlPath}
author: ${yamlAuthor}
createdAt: ${createdAt}
decision: pending
---

# Comment on ${postSlug}

**From:** ${author}  
**When:** ${createdAt.slice(0, 10)}

${body}
`;
}

export function validateCommentInput(input = {}) {
  if (input.website || input.honeypot) {
    const error = new Error("Rejected");
    error.status = 400;
    throw error;
  }

  const postSlug = String(input.postSlug || input.slug || "").trim();
  const postPath = String(input.postPath || `${postSlug}.md`).trim();
  const author = sanitizeAuthor(input.author || input.name);
  const body = sanitizeBody(input.body || input.comment);

  if (!isValidSlug(postSlug)) {
    const error = new Error("Invalid post");
    error.status = 400;
    throw error;
  }
  if (!author) {
    const error = new Error("Author is required");
    error.status = 400;
    throw error;
  }
  if (!body || body.length < 2) {
    const error = new Error("Comment is too short");
    error.status = 400;
    throw error;
  }

  return { postSlug, postPath, author, body };
}

export async function createPendingComment(gitlab, input, { refreshHome } = {}) {
  const validated = validateCommentInput(input);
  const id = makeCommentId();
  const createdAt = new Date().toISOString();
  const filename = pendingNoteFilename({
    id,
    postSlug: validated.postSlug,
    author: validated.author,
  });
  const path = pendingNotePath(filename);
  const content = renderPendingNote({
    id,
    postSlug: validated.postSlug,
    postPath: validated.postPath,
    author: validated.author,
    body: validated.body,
    createdAt,
  });

  await gitlab.writeFile(path, content, {
    message: `pending comment on ${validated.postSlug}`,
    skipRebuild: true,
  });

  if (typeof refreshHome === "function") {
    await refreshHome(gitlab);
  }

  return { id, path, postSlug: validated.postSlug };
}
