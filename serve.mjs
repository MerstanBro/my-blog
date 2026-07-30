import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml; charset=utf-8",
};

http
  .createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = pathname.replace(/^\/+/, "");
    const candidates = pathname.endsWith("/")
      ? [path.join(root, relative, "index.html")]
      : [path.join(root, relative), path.join(root, relative, "index.html")];

    for (const candidate of candidates) {
      if (!candidate.startsWith(root)) break;
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
  })
  .listen(port, () => {
    console.log(`Preview: http://localhost:${port}`);
  });
