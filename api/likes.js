import { createGitlabClient, gitlabConfig } from "../lib/gitlab.js";
import { addLike, getLikeStatus } from "../lib/likes.js";
import { refreshLikesMarkdown } from "../lib/review-notes.js";
import { getJsonBody, getQuery } from "./_parse.js";

export const config = {
  maxDuration: 15,
};

async function refreshLikes(gitlab) {
  try {
    await refreshLikesMarkdown(gitlab, {
      listLikeFiles: () => gitlab.listFiles("likes"),
    });
  } catch (error) {
    console.warn("Could not refresh Review/Likes.md:", error.message);
  }
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  const { projectId, token, ref } = gitlabConfig();
  if (!projectId || !token) {
    return response.status(503).json({
      error: "Likes are not configured",
      missing: [
        !projectId ? "GITLAB_PROJECT_ID" : null,
        !token ? "GITLAB_TOKEN" : null,
      ].filter(Boolean),
    });
  }

  try {
    const gitlab = createGitlabClient({ projectId, token, ref });

    if (request.method === "GET") {
      const query = getQuery(request);
      const slug = String(query.slug || "").trim();
      const deviceId = String(query.deviceId || "").trim();
      const status = await getLikeStatus(gitlab, slug, deviceId || undefined);
      return response.status(200).json(status);
    }

    if (request.method === "POST") {
      const body = await getJsonBody(request);
      const slug = String(body.slug || body.postSlug || "").trim();
      const deviceId = String(body.deviceId || "").trim();
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
    return response.status(error.status && error.status < 600 ? error.status : 500).json({
      error: error.message || "Internal server error",
    });
  }
}
