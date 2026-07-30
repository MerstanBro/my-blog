import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryGitlab } from "../lib/gitlab.js";
import { appendLeaderboardScore, validateScore } from "../lib/leaderboard.js";

describe("leaderboard", () => {
  it("validates scores", () => {
    assert.throws(() => validateScore({ Name: "", WPM: 50 }), (error) => error.status === 400);
    assert.throws(() => validateScore({ Name: "Ada", WPM: 900 }), (error) => error.status === 400);
    assert.deepEqual(validateScore({ Name: "Ada", WPM: 88.2 }), { Name: "Ada", WPM: 88 });
  });

  it("appends to leaderboard.json", async () => {
    const gitlab = createMemoryGitlab({ "leaderboard.json": "[]\n" });
    const result = await appendLeaderboardScore(gitlab, { Name: "Ada", WPM: 91 });
    assert.equal(result.message, "Score submitted");
    const rows = JSON.parse(gitlab.files.get("leaderboard.json"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].Name, "Ada");
  });
});
