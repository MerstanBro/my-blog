import { createGitlabClient, gitlabConfig } from "../lib/gitlab.js";
import { appendLeaderboardScore } from "../lib/leaderboard.js";
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
    return response.status(503).json({ error: "Leaderboard is not configured" });
  }

  try {
    const gitlab = createGitlabClient({ projectId, token, ref });
    const body = await getJsonBody(request);
    const result = await appendLeaderboardScore(gitlab, body);
    return response.status(200).json({ message: result.message });
  } catch (error) {
    console.error("Leaderboard request failed:", error);
    return response.status(error.status && error.status < 600 ? error.status : 500).json({
      error: error.message || "Internal server error",
    });
  }
}
