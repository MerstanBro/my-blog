import { createPendingComment, pendingNoteFilename, sanitizeAuthor } from "../lib/comments.js";
import { createGitlabClient, gitlabConfig } from "../lib/gitlab.js";
import { appendPendingToHome } from "../lib/review-notes.js";
import { getJsonBody } from "./_parse.js";

export const config = {
  maxDuration: 15,
};

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const { projectId, token, ref } = gitlabConfig();
  if (!projectId || !token) {
    return response.status(503).json({
      error: "Comments are not configured",
      missing: [
        !projectId ? "GITLAB_PROJECT_ID" : null,
        !token ? "GITLAB_TOKEN" : null,
      ].filter(Boolean),
    });
  }

  try {
    const gitlab = createGitlabClient({ projectId, token, ref });
    const body = await getJsonBody(request);
    const result = await createPendingComment(gitlab, body);
    const author = sanitizeAuthor(body.author || body.name) || "Anonymous";

    // Home refresh is best-effort and must not fail the submit.
    Promise.resolve(
      appendPendingToHome(gitlab, {
        name: pendingNoteFilename({
          id: result.id,
          postSlug: result.postSlug,
          author,
        }).replace(/\.md$/, ""),
        post: result.postSlug,
        author,
        createdAt: new Date().toISOString(),
        preview: String(body.body || body.comment || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 120),
      }),
    ).catch((error) => console.warn("appendPendingToHome failed:", error.message));

    return response.status(200).json({
      ok: true,
      id: result.id,
      message: "Comment submitted for review",
    });
  } catch (error) {
    console.error("Comment submit failed:", error);
    return response.status(error.status && error.status < 600 ? error.status : 500).json({
      error: error.message || "Internal server error",
    });
  }
}
