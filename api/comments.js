import { createPendingComment, pendingNoteFilename, sanitizeAuthor } from "../lib/comments.mjs";
import { createGitlabClient, gitlabConfig } from "../lib/gitlab.mjs";
import { appendPendingToHome } from "../lib/review-notes.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const { projectId, token, ref } = gitlabConfig();
  if (!projectId || !token) {
    return response.status(503).json({ error: "Comments are not configured" });
  }

  try {
    const gitlab = createGitlabClient({ projectId, token, ref });
    const result = await createPendingComment(gitlab, request.body || {});
    const author = sanitizeAuthor(request.body?.author || request.body?.name) || "Anonymous";

    await appendPendingToHome(gitlab, {
      name: pendingNoteFilename({
        id: result.id,
        postSlug: result.postSlug,
        author,
      }).replace(/\.md$/, ""),
      post: result.postSlug,
      author,
      createdAt: new Date().toISOString(),
      preview: String(request.body?.body || request.body?.comment || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 120),
    });

    return response.status(200).json({
      ok: true,
      id: result.id,
      message: "Comment submitted for review",
    });
  } catch (error) {
    console.error("Comment submit failed:", error);
    return response.status(error.status || 500).json({
      error: error.message || "Internal server error",
    });
  }
}
