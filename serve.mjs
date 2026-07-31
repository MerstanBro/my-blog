import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(rootDir, "dist");
const srcDir = path.join(rootDir, "src");
const port = Number(process.env.PORT || 4173);

dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config({ path: path.join(rootDir, "..", ".env") });

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml; charset=utf-8",
  ".woff2": "font/woff2",
};

async function readBody(request) {
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

function createResponse(serverResponse) {
  return {
    statusCode: 200,
    setHeader(name, value) {
      serverResponse.setHeader(name, value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      if (!serverResponse.headersSent) {
        serverResponse.statusCode = this.statusCode;
        serverResponse.setHeader("content-type", "application/json; charset=utf-8");
      }
      serverResponse.end(JSON.stringify(payload));
    },
  };
}

async function handleApi(request, serverResponse, pathname) {
  const handlers = {
    "/api/likes": () => import("./api/likes.js"),
    "/api/comments": () => import("./api/comments.js"),
    "/api/leaderboard": () => import("./api/leaderboard.js"),
  };
  const load = handlers[pathname];
  if (!load) return false;

  const url = new URL(request.url, `http://${request.headers.host}`);
  const body = request.method === "GET" || request.method === "HEAD" ? {} : await readBody(request);
  const query = Object.fromEntries(url.searchParams.entries());
  const fakeRequest = {
    method: request.method,
    headers: request.headers,
    body,
    query,
  };
  const fakeResponse = createResponse(serverResponse);
  const mod = await load();
  await mod.default(fakeRequest, fakeResponse);
  if (!serverResponse.writableEnded) {
    fakeResponse.json({ error: "Empty API response" });
  }
  return true;
}

http
  .createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);

      if (pathname.startsWith("/api/")) {
        const handled = await handleApi(request, response, pathname.replace(/\/$/, "") || pathname);
        if (handled) return;
        response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Not found" }));
        return;
      }

      // Prefer live src assets during local preview so JS/CSS edits apply without rebuild.
      if (pathname.startsWith("/assets/") && !pathname.includes("..")) {
        const assetName = pathname.slice("/assets/".length);
        const live = path.join(srcDir, assetName);
        try {
          const body = await fs.readFile(live);
          response.writeHead(200, {
            "content-type": types[path.extname(live)] || "application/octet-stream",
            "cache-control": "no-cache",
          });
          response.end(body);
          return;
        } catch {
          // Fall through to dist (fonts/vendor/copied files).
        }
      }

      const relative = pathname.replace(/^\/+/, "");
      const candidates = pathname.endsWith("/")
        ? [path.join(dist, relative, "index.html")]
        : [path.join(dist, relative), path.join(dist, relative, "index.html")];

      for (const candidate of candidates) {
        if (!candidate.startsWith(dist)) break;
        try {
          const body = await fs.readFile(candidate);
          response.writeHead(200, {
            "content-type": types[path.extname(candidate)] || "application/octet-stream",
            "cache-control": "no-cache",
          });
          response.end(body);
          return;
        } catch {
          // Try the next clean-URL candidate.
        }
      }

      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    } catch (error) {
      console.error(error);
      if (!response.headersSent) {
        response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      }
      response.end(JSON.stringify({ error: error.message || "Internal server error" }));
    }
  })
  .listen(port, () => {
    console.log(`Preview: http://localhost:${port}`);
  });
