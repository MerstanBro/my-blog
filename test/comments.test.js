import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createPendingComment,
  pendingNotePath,
  validateCommentInput,
} from "../lib/comments.mjs";
import { createMemoryGitlab } from "../lib/gitlab.mjs";

describe("comments", () => {
  it("validates payloads and rejects honeypots", () => {
    assert.throws(() => validateCommentInput({ website: "spam", postSlug: "words", author: "A", body: "hi" }), (error) => error.status === 400);
    assert.throws(() => validateCommentInput({ postSlug: "words", author: "", body: "hi" }), (error) => error.status === 400);
    const ok = validateCommentInput({ postSlug: "words", author: "Ada", body: "Nice post" });
    assert.equal(ok.postSlug, "words");
  });

  it("writes a pending review note", async () => {
    const gitlab = createMemoryGitlab();
    const result = await createPendingComment(gitlab, {
      postSlug: "words",
      postPath: "words.md",
      author: "Ada",
      body: "Thoughtful piece.",
    });
    assert.ok(result.id);
    const path = [...gitlab.files.keys()].find((key) => key.startsWith("Review/Pending/"));
    assert.ok(path);
    assert.equal(path, pendingNotePath(path.split("/").pop()));
    const note = gitlab.files.get(path);
    assert.match(note, /decision: pending/);
    assert.match(note, /Thoughtful piece/);
  });
});
