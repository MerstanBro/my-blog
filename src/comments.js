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
              <p class="comment-note">Comments are read before they’re published, usually within a day or two.</p>
            </div>
            <div class="comment-fields">
              <label class="comment-field comment-field-name">
                <span>Name</span>
                <input name="author" type="text" maxlength="60" required autocomplete="name" placeholder="Your name" disabled>
              </label>
              <label class="comment-field comment-field-body">
                <span class="comment-field-label">Comment <em class="comment-counter" data-comment-counter aria-live="off"></em></span>
                <textarea name="body" dir="auto" rows="5" maxlength="4000" required placeholder="What stayed with you?" disabled></textarea>
              </label>
            </div>
            <label class="comment-honeypot" aria-hidden="true">
              <span>Website</span>
              <input name="website" type="text" tabindex="-1" autocomplete="off" disabled>
            </label>
            <div class="comment-form-actions">
              <button class="button primary" type="submit" data-comment-submit disabled>Submit for review</button>
              <span class="comment-shortcut" aria-hidden="true">or press <kbd>Ctrl</kbd> + <kbd>Enter</kbd></span>
              <p class="comment-status" data-comment-status hidden role="status"></p>
            </div>
          </form>

          <div class="comment-thanks" data-comment-thanks hidden role="status">
            <span class="comment-thanks-icon" aria-hidden="true">✓</span>
            <div>
              <h3>Thank you, <span data-thanks-name></span>.</h3>
              <p>Your comment is waiting for approval and will appear here once it’s published.</p>
              <button type="button" class="text-button" data-comment-again>Write another</button>
            </div>
          </div>
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
  const counter = mount.querySelector("[data-comment-counter]");
  const thanks = mount.querySelector("[data-comment-thanks]");
  const AUTHOR_KEY = "comment-author";
  let ready = false;

  function savedAuthor() {
    try {
      return localStorage.getItem(AUTHOR_KEY) || "";
    } catch {
      return "";
    }
  }

  function updateCounter() {
    const length = form.elements.body.value.length;
    counter.textContent = length > 3200 ? `${length} / 4000` : "";
  }

  function fitTextarea() {
    const field = form.elements.body;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight + 2, 420)}px`;
  }

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
    if (enabled && form && !form.elements.author.value) form.elements.author.value = savedAuthor();
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
              <p dir="auto">${escapeHtml(comment.body || "")}</p>
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
    const author = String(data.get("author") || "").trim();
    const text = String(data.get("body") || "").trim();
    const invalid = !author ? form.elements.author : text.length < 2 ? form.elements.body : null;
    if (invalid) {
      status.textContent = invalid === form.elements.author ? "Please add your name." : "Please write a few words.";
      status.classList.add("is-error");
      status.hidden = false;
      invalid.focus();
      return;
    }
    const payload = {
      pagePath: location.pathname,
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
      try {
        localStorage.setItem(AUTHOR_KEY, author);
      } catch {
        // ignore
      }
      form.elements.body.value = "";
      updateCounter();
      fitTextarea();
      mount.querySelector("[data-thanks-name]").textContent = author;
      form.hidden = true;
      thanks.hidden = false;
      thanks.focus?.();
    } catch {
      status.textContent = "Could not submit comment.";
      status.classList.add("is-error");
      status.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = "Submit for review";
    }
  });

  form?.elements.body.addEventListener("input", () => {
    updateCounter();
    fitTextarea();
  });

  form?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  mount.querySelector("[data-comment-again]")?.addEventListener("click", () => {
    thanks.hidden = true;
    form.hidden = false;
    status.hidden = true;
    form.elements.body.focus();
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
