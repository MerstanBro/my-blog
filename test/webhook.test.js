import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowedContentRef, shouldSkipRebuild } from "../lib/webhook.mjs";

describe("webhook", () => {
  it("skips when every commit asks to skip rebuild", () => {
    assert.equal(
      shouldSkipRebuild({
        commits: [{ message: "like words [skip rebuild]" }],
      }),
      true,
    );
    assert.equal(
      shouldSkipRebuild({
        commits: [
          { message: "like words [skip rebuild]" },
          { message: "real content change" },
        ],
      }),
      false,
    );
    assert.equal(shouldSkipRebuild({ commits: [] }), false);
  });

  it("checks content branch refs", () => {
    assert.equal(allowedContentRef("refs/heads/main", "main").ok, true);
    assert.equal(allowedContentRef("refs/heads/dev", "main").ok, false);
  });
});
