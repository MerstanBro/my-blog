/**
 * GitLab CMS webhook → Vercel Deploy Hook
 *
 * Configure in the content GitLab project:
 *   URL: https://anasmerstani.com/api/content-webhook
 *   Secret token: same value as GITLAB_WEBHOOK_SECRET
 *   Trigger: Push events
 *
 * Required env vars on Vercel:
 *   GITLAB_WEBHOOK_SECRET
 *   VERCEL_DEPLOY_HOOK_URL
 *   GITLAB_REF (optional, defaults to main)
 *
 * Commits whose messages all contain [skip rebuild] do not trigger a deploy
 * (likes, pending comments, leaderboard, manifest clear, site-cache).
 */

import { allowedContentRef, shouldSkipRebuild } from "../lib/webhook.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const expectedSecret = process.env.GITLAB_WEBHOOK_SECRET;
  const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
  const branch = process.env.GITLAB_REF || "main";

  if (!expectedSecret || !deployHook) {
    return response.status(503).json({
      error: "Webhook is not configured",
      missing: [
        !expectedSecret ? "GITLAB_WEBHOOK_SECRET" : null,
        !deployHook ? "VERCEL_DEPLOY_HOOK_URL" : null,
      ].filter(Boolean),
    });
  }

  const token = request.headers["x-gitlab-token"];
  if (!token || token !== expectedSecret) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const payload = request.body || {};
  const event = request.headers["x-gitlab-event"] || "unknown";
  const refCheck = allowedContentRef(payload.ref, branch);

  if (payload.ref && !refCheck.ok) {
    return response.status(200).json({
      ok: true,
      skipped: true,
      reason: `Ignored ref ${payload.ref}; expected ${refCheck.allowed}`,
    });
  }

  if (shouldSkipRebuild(payload, request.headers)) {
    return response.status(200).json({
      ok: true,
      skipped: true,
      reason: "Commit message contains [skip rebuild]",
    });
  }

  try {
    const result = await fetch(deployHook, { method: "POST" });
    const text = await result.text();

    if (!result.ok) {
      console.error("Deploy hook failed:", result.status, text);
      return response.status(502).json({
        error: "Failed to trigger Vercel rebuild",
        status: result.status,
      });
    }

    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      // Deploy hooks sometimes return plain text.
    }

    return response.status(200).json({
      ok: true,
      event,
      ref: payload.ref || refCheck.allowed,
      deploy: body,
    });
  } catch (error) {
    console.error("Deploy hook request failed:", error);
    return response.status(500).json({ error: "Internal server error" });
  }
}
