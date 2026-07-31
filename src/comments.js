(() => {
  const mount = document.querySelector("[data-comments]");
  if (!mount) return;

  const slug = mount.dataset.slug || "";
  const postPath = mount.dataset.postPath || `${slug}.md`;
  const storageKey = `comments-open:${slug || location.pathname}`;

  mount.innerHTML = `
    <section class="comments-panel is-loading" data-comments-panel aria-busy="true">
      <button type="button" class="comments-toggle" data-comments-toggle aria-expanded="false" aria-controls="comments-drawer" disabled>
        <span class="comments-toggle-copy">
          <span class="section-kicker">Conversation</span>
          <span class="comments-toggle-title">Comments <span class="comments-count" data-comments-count></span></span>
          <span class="comments-toggle-hint" data-comments-hint>Loading…</span>
        </span>
        <span class="comments-toggle-icon" aria-hidden="true"></span>
      </button>

      <div class="comments-drawer" id="comments-drawer" data-comments-drawer inert>
        <div class="comments-drawer-inner">
          <p class="comments-lead">Thoughtful notes welcome. New comments are reviewed before they appear.</p>

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
                <input name="author" type="text" maxlength="60" required autocomplete="name" placeholder="Your name" disabled>
              </label>
              <label class="comment-field comment-field-body">
                <span>Comment</span>
                <textarea name="body" rows="5" maxlength="4000" required placeholder="What stayed with you?" disabled></textarea>
              </label>
            </div>
            <label class="comment-honeypot" aria-hidden="true">
              <span>Website</span>
              <input name="website" type="text" tabindex="-1" autocomplete="off" disabled>
            </label>
            <div class="comment-form-actions">
              <button class="button primary" type="submit" data-comment-submit disabled>Submit for review</button>
              <p class="comment-status" data-comment-status hidden role="status"></p>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;

  const panel = mount.querySelector("[data-comments-panel]");
  const toggle = mount.querySelector("[data-comments-toggle]");
  const drawer = mount.querySelector("[data-comments-drawer]");
  const hint = mount.querySelector("[data-comments-hint]");
  const list = mount.querySelector("[data-comments-list]");
  const countEl = mount.querySelector("[data-comments-count]");
  const form = mount.querySelector("[data-comment-form]");
  const status = mount.querySelector("[data-comment-status]");
  const submit = mount.querySelector("[data-comment-submit]");
  let ready = false;

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

  function setFormEnabled(enabled) {
    form?.querySelectorAll("input, textarea, button").forEach((el) => {
      el.disabled = !enabled;
    });
  }

  function setReady(enabled) {
    ready = enabled;
    panel?.classList.toggle("is-loading", !enabled);
    panel?.setAttribute("aria-busy", String(!enabled));
    if (toggle) toggle.disabled = !enabled;
    if (drawer) {
      if (enabled) drawer.removeAttribute("inert");
      else drawer.setAttribute("inert", "");
    }
    setFormEnabled(enabled);
    if (hint && !panel?.classList.contains("is-open")) {
      hint.textContent = enabled ? "Show discussion" : "Loading…";
    }
  }

  function setOpen(open) {
    if (!ready && open) return;
    panel?.classList.toggle("is-open", open);
    toggle?.setAttribute("aria-expanded", String(open));
    if (hint) hint.textContent = open ? "Hide discussion" : "Show discussion";
    try {
      sessionStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      // ignore
    }
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
      setReady(true);
      return;
    }
    try {
      const response = await fetch(`/comments/${encodeURIComponent(slug)}.json`);
      if (response.status === 404) {
        emptyState("No comments yet. Be the first to leave one.");
        setReady(true);
        return;
      }
      if (!response.ok) throw new Error("failed");
      const comments = await response.json();
      if (!Array.isArray(comments) || !comments.length) {
        emptyState("No comments yet. Be the first to leave one.");
        setReady(true);
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
      setReady(true);
    } catch {
      emptyState("Comments unavailable right now.");
      setReady(true);
    }
  }

  toggle?.addEventListener("click", () => {
    if (!ready || toggle.disabled) return;
    setOpen(!panel.classList.contains("is-open"));
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ready) return;
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

  setReady(false);
  loadApproved().then(() => {
    let shouldOpen = false;
    try {
      shouldOpen = sessionStorage.getItem(storageKey) === "1";
    } catch {
      shouldOpen = false;
    }
    if (shouldOpen) setOpen(true);
  });
})();
