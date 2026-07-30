import { createGitlabClient, gitlabConfig } from "../lib/gitlab.mjs";
import { appendLeaderboardScore } from "../lib/leaderboard.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const { projectId, token, ref } = gitlabConfig();
  if (!projectId || !token) {
    return response.status(503).json({ error: "Leaderboard is not configured" });
  }

  try {
    const gitlab = createGitlabClient({ projectId, token, ref });
    const result = await appendLeaderboardScore(gitlab, request.body || {});
    return response.status(200).json({ message: result.message });
  } catch (error) {
    console.error("Leaderboard request failed:", error);
    return response.status(error.status || 500).json({
      error: error.message || "Internal server error",
    });
  }
}
