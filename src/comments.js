(() => {
  const mount = document.querySelector("[data-comments]");
  if (!mount) return;

  const slug = mount.dataset.slug || "";
  const postPath = mount.dataset.postPath || `${slug}.md`;

  mount.innerHTML = `
    <section class="comments-panel" aria-labelledby="comments-heading">
      <h2 id="comments-heading">Comments</h2>
      <div class="comments-list" data-comments-list><p class="comments-empty">Loading comments…</p></div>
      <form class="comment-form" data-comment-form>
        <h3>Leave a comment</h3>
        <p class="comment-note">Comments are held for review before they appear.</p>
        <label>
          <span>Name</span>
          <input name="author" type="text" maxlength="60" required autocomplete="name">
        </label>
        <label>
          <span>Comment</span>
          <textarea name="body" rows="4" maxlength="4000" required></textarea>
        </label>
        <label class="comment-honeypot" aria-hidden="true">
          <span>Website</span>
          <input name="website" type="text" tabindex="-1" autocomplete="off">
        </label>
        <button class="button primary" type="submit">Submit comment</button>
        <p class="comment-status" data-comment-status hidden></p>
      </form>
    </section>
  `;

  const list = mount.querySelector("[data-comments-list]");
  const form = mount.querySelector("[data-comment-form]");
  const status = mount.querySelector("[data-comment-status]");

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function loadApproved() {
    if (!slug) {
      list.innerHTML = `<p class="comments-empty">No comments yet.</p>`;
      return;
    }
    try {
      const response = await fetch(`/comments/${encodeURIComponent(slug)}.json`);
      if (response.status === 404) {
        list.innerHTML = `<p class="comments-empty">No comments yet. Be the first.</p>`;
        return;
      }
      if (!response.ok) throw new Error("failed");
      const comments = await response.json();
      if (!Array.isArray(comments) || !comments.length) {
        list.innerHTML = `<p class="comments-empty">No comments yet. Be the first.</p>`;
        return;
      }
      list.innerHTML = comments
        .map(
          (comment) => `<article class="comment-item">
          <header><strong>${escapeHtml(comment.author || "Anonymous")}</strong>
          <time datetime="${escapeHtml(comment.createdAt || "")}">${escapeHtml((comment.createdAt || "").slice(0, 10))}</time></header>
          <p>${escapeHtml(comment.body || "")}</p>
        </article>`,
        )
        .join("");
    } catch {
      list.innerHTML = `<p class="comments-empty">Comments unavailable right now.</p>`;
    }
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.hidden = true;
    const data = new FormData(form);
    const payload = {
      postSlug: slug,
      postPath,
      author: String(data.get("author") || ""),
      body: String(data.get("body") || ""),
      website: String(data.get("website") || ""),
    };
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        status.textContent = result.error || "Could not submit comment.";
        status.hidden = false;
        return;
      }
      form.reset();
      status.textContent = "Thanks — your comment is held for review.";
      status.hidden = false;
    } catch {
      status.textContent = "Could not submit comment.";
      status.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });

  loadApproved();
})();
