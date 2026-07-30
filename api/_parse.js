/** Normalize Vercel / Node request body + query for API handlers. */

export function getQuery(request) {
  if (request.query && typeof request.query === "object") return request.query;
  try {
    const host = request.headers?.host || "localhost";
    const url = new URL(request.url || "/", `http://${host}`);
    return Object.fromEntries(url.searchParams.entries());
  } catch {
    return {};
  }
}

export async function getJsonBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return request.body;
  }
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body || "{}");
    } catch {
      return {};
    }
  }
  if (typeof request.body === "undefined" && typeof request[Symbol.asyncIterator] === "function") {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}
