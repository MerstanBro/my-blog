import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryGitlab } from "../lib/gitlab.js";
import { addLike, getLikeStatus } from "../lib/likes.js";

const deviceA = "11111111-1111-4111-8111-111111111111";
const deviceB = "22222222-2222-4222-8222-222222222222";

describe("likes", () => {
  it("accepts the first like and rejects the same device", async () => {
    const gitlab = createMemoryGitlab();
    const first = await addLike(gitlab, "words", deviceA);
    assert.equal(first.count, 1);
    assert.equal(first.liked, true);

    await assert.rejects(() => addLike(gitlab, "words", deviceA), (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.code, "already_liked");
      return true;
    });

    const second = await addLike(gitlab, "words", deviceB);
    assert.equal(second.count, 2);

    const status = await getLikeStatus(gitlab, "words", deviceA);
    assert.deepEqual(status, { count: 2, liked: true });
  });

  it("rejects invalid input", async () => {
    const gitlab = createMemoryGitlab();
    await assert.rejects(() => addLike(gitlab, "../nope", deviceA), (error) => error.status === 400);
    await assert.rejects(() => addLike(gitlab, "words", "not-a-uuid"), (error) => error.status === 400);
  });
});
