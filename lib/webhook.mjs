export function shouldSkipRebuild(payload = {}, headers = {}) {
  const commits = Array.isArray(payload.commits) ? payload.commits : [];
  if (!commits.length) return false;

  const messages = commits.map((commit) => String(commit.message || ""));
  // Skip only when every commit in the push asks to skip rebuild.
  return messages.every((message) => message.includes("[skip rebuild]"));
}

export function allowedContentRef(payloadRef, expectedBranch = "main") {
  const allowed = `refs/heads/${expectedBranch}`;
  if (!payloadRef) return { ok: true, allowed };
  return { ok: payloadRef === allowed, allowed };
}
