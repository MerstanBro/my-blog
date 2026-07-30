export function validateScore(input = {}) {
  const name = String(input.Name || input.name || "")
    .trim()
    .slice(0, 30);
  const wpm = Number(input.WPM ?? input.wpm);
  if (!name || !Number.isFinite(wpm) || wpm < 1 || wpm > 400) {
    const error = new Error("Invalid score");
    error.status = 400;
    throw error;
  }
  return { Name: name, WPM: Math.round(wpm) };
}

export function parseLeaderboard(raw) {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function toUiEntries(rows) {
  return {
    entries: rows
      .slice()
      .sort((a, b) => Number(b.WPM) - Number(a.WPM))
      .slice(0, 20)
      .map((row, index) => ({
        rank: index + 1,
        Name: row.Name,
        WPM: row.WPM,
        Date: (row.createdAt || "").slice(0, 10) || "Recent",
      })),
  };
}

export async function appendLeaderboardScore(gitlab, input) {
  const score = validateScore(input);
  const path = "leaderboard.json";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let raw = "[]";
    let lastCommitId = "";
    try {
      ({ content: raw, lastCommitId } = await gitlab.getRaw(path));
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    const rows = parseLeaderboard(raw);
    rows.push({
      Name: score.Name,
      WPM: score.WPM,
      createdAt: new Date().toISOString(),
    });

    try {
      await gitlab.writeFile(path, `${JSON.stringify(rows, null, 2)}\n`, {
        message: `leaderboard ${score.Name}`,
        skipRebuild: true,
        lastCommitId,
      });
      return { message: "Score submitted", entries: toUiEntries(rows).entries };
    } catch (error) {
      if (error.status === 400 || error.status === 409) continue;
      throw error;
    }
  }

  const error = new Error("Could not save score");
  error.status = 503;
  throw error;
}
