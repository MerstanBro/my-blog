import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearProcessedManifest,
  mergeManifest,
  needsFullRebuild,
  parseManifest,
} from "../lib/manifest.js";

describe("manifest", () => {
  it("parses and merges dirty entries", () => {
    const base = parseManifest('{"version":1,"full":false,"posts":["a.md"],"commentPages":[],"indexes":false}');
    const merged = mergeManifest(base, { posts: ["b.md"], commentPages: ["b"], indexes: true });
    assert.deepEqual(merged.posts, ["a.md", "b.md"]);
    assert.deepEqual(merged.commentPages, ["b"]);
    assert.equal(merged.indexes, true);
  });

  it("clears processed entries and detects full rebuild", () => {
    const manifest = {
      version: 1,
      full: true,
      posts: ["a.md"],
      commentPages: ["a"],
      indexes: true,
    };
    assert.equal(needsFullRebuild(manifest, { hasCache: true }), true);
    assert.equal(needsFullRebuild({ full: false }, { hasCache: false }), true);
    const cleared = clearProcessedManifest(manifest, { clearAll: true });
    assert.equal(cleared.full, false);
    assert.deepEqual(cleared.posts, []);
    assert.deepEqual(cleared.commentPages, []);
  });
});
