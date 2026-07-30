(() => {
  const mount = document.querySelector("[data-comments]");
  if (!mount) return;

  const slug = mount.dataset.slug || "";
  const postPath = mount.dataset.postPath || `${slug}.md`;

  mount.innerHTML = `
    <section class="comments-panel" aria-labelledby="comments-heading">
      <header class="comments-head">
        <div>
          <p class="section-kicker">Conversation</p>
          <h2 id="comments-heading">Comments <span class="comments-count" data-comments-count></span></h2>
        </div>
        <p class="comments-lead">Thoughtful notes welcome. New comments are reviewed before they appear.</p>
      </header>

      <div class="comments-list" data-comments-list>
        <p class="comments-empty">Loading comments…</p>
      </div>

      <form class="comment-form" data-comment-form novalidate>
        <div class="comment-form-head">
          <h3>Write a reply</h3>
          <p class="comment-note">Held for review — usually published after you approve it in Obsidian.</p>
        </div>
        <div class="comment-fields">
          <label class="comment-field comment-field-name">
            <span>Name</span>
            <input name="author" type="text" maxlength="60" required autocomplete="name" placeholder="Your name">
          </label>
          <label class="comment-field comment-field-body">
            <span>Comment</span>
            <textarea name="body" rows="5" maxlength="4000" required placeholder="What stayed with you?"></textarea>
          </label>
        </div>
        <label class="comment-honeypot" aria-hidden="true">
          <span>Website</span>
          <input name="website" type="text" tabindex="-1" autocomplete="off">
        </label>
        <div class="comment-form-actions">
          <button class="button primary" type="submit" data-comment-submit>Submit for review</button>
          <p class="comment-status" data-comment-status hidden role="status"></p>
        </div>
      </form>
    </section>
  `;

  const list = mount.querySelector("[data-comments-list]");
  const countEl = mount.querySelector("[data-comments-count]");
  const form = mount.querySelector("[data-comment-form]");
  const status = mount.querySelector("[data-comment-status]");
  const submit = mount.querySelector("[data-comment-submit]");

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function initials(name = "") {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return String(value).slice(0, 10);
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function setCount(n) {
    if (!countEl) return;
    countEl.textContent = n > 0 ? `(${n})` : "";
  }

  function emptyState(message) {
    setCount(0);
    list.innerHTML = `
      <div class="comments-empty-state">
        <p class="comments-empty">${escapeHtml(message)}</p>
      </div>
    `;
  }

  async function loadApproved() {
    if (!slug) {
      emptyState("No comments yet.");
      return;
    }
    try {
      const response = await fetch(`/comments/${encodeURIComponent(slug)}.json`);
      if (response.status === 404) {
        emptyState("No comments yet. Be the first to leave one.");
        return;
      }
      if (!response.ok) throw new Error("failed");
      const comments = await response.json();
      if (!Array.isArray(comments) || !comments.length) {
        emptyState("No comments yet. Be the first to leave one.");
        return;
      }
      setCount(comments.length);
      list.innerHTML = comments
        .map((comment) => {
          const author = comment.author || "Anonymous";
          return `<article class="comment-item">
            <div class="comment-avatar" aria-hidden="true">${escapeHtml(initials(author))}</div>
            <div class="comment-body">
              <header class="comment-meta">
                <strong>${escapeHtml(author)}</strong>
                <time datetime="${escapeHtml(comment.createdAt || "")}">${escapeHtml(formatDate(comment.createdAt))}</time>
              </header>
              <p>${escapeHtml(comment.body || "")}</p>
            </div>
          </article>`;
        })
        .join("");
    } catch {
      emptyState("Comments unavailable right now.");
    }
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.hidden = true;
    status.classList.remove("is-success", "is-error");
    const data = new FormData(form);
    const payload = {
      postSlug: slug,
      postPath,
      author: String(data.get("author") || ""),
      body: String(data.get("body") || ""),
      website: String(data.get("website") || ""),
    };
    submit.disabled = true;
    submit.textContent = "Sending…";
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        status.textContent = result.error || "Could not submit comment.";
        status.classList.add("is-error");
        status.hidden = false;
        return;
      }
      form.reset();
      status.textContent = "Thanks — your comment is held for review.";
      status.classList.add("is-success");
      status.hidden = false;
    } catch {
      status.textContent = "Could not submit comment.";
      status.classList.add("is-error");
      status.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = "Submit for review";
    }
  });

  loadApproved();
})();
