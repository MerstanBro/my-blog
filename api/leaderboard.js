export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return response.status(503).json({ error: "Leaderboard is not configured" });
  }

  const name = String(request.body?.Name || "").trim().slice(0, 30);
  const wpm = Number(request.body?.WPM);
  if (!name || !Number.isFinite(wpm) || wpm < 1 || wpm > 400) {
    return response.status(400).json({ error: "Invalid score" });
  }

  try {
    const result = await fetch(`${supabaseUrl}/rest/v1/leaderboard`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify([{ Name: name, WPM: Math.round(wpm) }]),
    });

    if (!result.ok) {
      const detail = await result.text();
      console.error("Supabase leaderboard error:", detail);
      return response.status(502).json({ error: "Could not save score" });
    }

    return response.status(200).json({ message: "Score submitted" });
  } catch (error) {
    console.error("Leaderboard request failed:", error);
    return response.status(500).json({ error: "Internal server error" });
  }
}
