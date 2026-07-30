import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

describe("demo build smoke", () => {
  it("emits post HTML with like/comment mounts and diagram markup", () => {
    const result = spawnSync(process.execPath, ["build.mjs", "--demo"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const postPath = path.join(root, "dist", "blog", "Building-a-fast-static-blog", "index.html");
    assert.ok(fs.existsSync(postPath), "demo post missing");
    const html = fs.readFileSync(postPath, "utf8");
    assert.match(html, /data-likes/);
    assert.match(html, /data-comments/);
    assert.match(html, /class="mermaid"/);
    assert.match(html, /post-chart/);
    assert.match(html, /likes\.js/);
    assert.match(html, /comments\.js/);
    assert.match(html, /diagrams\.js/);

    const commentsPath = path.join(
      root,
      "dist",
      "comments",
      "Building-a-fast-static-blog.json",
    );
    assert.ok(fs.existsSync(commentsPath));
  });
});
