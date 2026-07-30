import { createGitlabClient, gitlabConfig } from "../lib/gitlab.mjs";
import { addLike, getLikeStatus } from "../lib/likes.mjs";
import { refreshLikesMarkdown } from "../lib/review-notes.mjs";

async function refreshLikes(gitlab) {
  await refreshLikesMarkdown(gitlab, {
    listLikeFiles: () => gitlab.listFiles("likes"),
  });
}

export default async function handler(request, response) {
  const { projectId, token, ref } = gitlabConfig();
  if (!projectId || !token) {
    return response.status(503).json({ error: "Likes are not configured" });
  }

  try {
    const gitlab = createGitlabClient({ projectId, token, ref });

    if (request.method === "GET") {
      const slug = String(request.query?.slug || "").trim();
      const deviceId = String(request.query?.deviceId || "").trim();
      const status = await getLikeStatus(gitlab, slug, deviceId || undefined);
      return response.status(200).json(status);
    }

    if (request.method === "POST") {
      const slug = String(request.body?.slug || request.body?.postSlug || "").trim();
      const deviceId = String(request.body?.deviceId || "").trim();
      const result = await addLike(gitlab, slug, deviceId, { refreshReview: refreshLikes });
      return response.status(200).json(result);
    }

    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error.code === "already_liked") {
      return response.status(409).json({
        error: "already_liked",
        count: error.count,
        liked: true,
      });
    }
    console.error("Likes request failed:", error);
    return response.status(error.status || 500).json({
      error: error.message || "Internal server error",
    });
  }
}
