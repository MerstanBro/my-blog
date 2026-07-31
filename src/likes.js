(() => {
  const mount = document.querySelector("[data-likes]");
  if (!mount) return;

  const slug = mount.dataset.slug || "";
  const STORAGE_KEY = "blog-device-id";

  function fallbackId() {
    return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (char) => {
      const rand = (Math.random() * 16) | 0;
      const value = char === "x" ? rand : (rand & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function deviceId() {
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : fallbackId();
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      return fallbackId();
    }
  }

  if (!mount.querySelector("[data-like-button]")) {
    mount.innerHTML = `
      <button type="button" class="like-button is-loading" data-like-button aria-pressed="false" disabled aria-busy="true">
        <span class="like-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7.2-4.35-9.3-8.1C1.2 9.3 2.4 5.8 5.7 5.2c1.9-.35 3.7.55 4.8 2 1.1-1.45 2.9-2.35 4.8-2 3.3.6 4.5 4.1 3 6.7C19.2 15.65 12 20 12 20Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
        </span>
        <span class="like-copy">
          <span class="like-label" data-like-label>Like</span>
          <span class="like-count" data-like-count>—</span>
        </span>
      </button>
      <p class="like-status" data-like-status hidden></p>
    `;
  }

  const id = deviceId();
  const button = mount.querySelector("[data-like-button]");
  const countEl = mount.querySelector("[data-like-count]");
  const labelEl = mount.querySelector("[data-like-label]");
  const statusEl = mount.querySelector("[data-like-status]");
  let busy = false;
  let ready = false;

  function setStatus(message, kind = "") {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.hidden = !message;
    statusEl.classList.toggle("is-error", kind === "error");
    statusEl.classList.toggle("is-success", kind === "success");
  }

  function render({ count, liked = false, pending = false } = {}) {
    if (countEl && count !== undefined && count !== null && !Number.isNaN(Number(count))) {
      countEl.textContent = String(count);
    }
    if (!button) return;
    button.classList.toggle("is-liked", liked);
    button.classList.toggle("is-pending", pending);
    button.classList.toggle("is-loading", !ready);
    button.disabled = !ready || liked || pending || busy;
    button.setAttribute("aria-busy", String(!ready || pending));
    button.setAttribute("aria-pressed", String(liked));
    if (labelEl) {
      if (!ready) labelEl.textContent = "Like";
      else if (pending) labelEl.textContent = "Saving";
      else labelEl.textContent = liked ? "Liked" : "Like";
    }
  }

  async function refresh() {
    if (!slug || !id) {
      ready = true;
      render({ count: 0, liked: false });
      return;
    }
    try {
      const response = await fetch(
        `/api/likes?slug=${encodeURIComponent(slug)}&deviceId=${encodeURIComponent(id)}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      ready = true;
      render(await response.json());
    } catch {
      ready = true;
      render({ count: Number(countEl?.textContent) || 0, liked: false });
      setStatus("Likes unavailable right now.", "error");
    }
  }

  button?.addEventListener("click", async () => {
    if (!ready || !slug || !id || busy || button.disabled) return;
    busy = true;
    const previousCount = Number(countEl?.textContent);
    const optimistic = Number.isFinite(previousCount) ? previousCount + 1 : 1;
    setStatus("");
    render({ count: optimistic, liked: true, pending: true });

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, deviceId: id }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok || response.status === 409) {
        render({
          count: Number.isFinite(data.count) ? data.count : optimistic,
          liked: true,
          pending: false,
        });
        setStatus("");
        return;
      }

      render({
        count: Number.isFinite(previousCount) ? previousCount : 0,
        liked: false,
        pending: false,
      });
      setStatus(data.error || `Could not like this post (${response.status}).`, "error");
    } catch (error) {
      render({
        count: Number.isFinite(previousCount) ? previousCount : 0,
        liked: false,
        pending: false,
      });
      setStatus(
        "Could not reach the likes API. Use npm run dev (with .env) or the deployed site.",
        "error",
      );
      console.error(error);
    } finally {
      busy = false;
      if (button && button.getAttribute("aria-pressed") !== "true") {
        button.disabled = !ready;
      }
    }
  });

  render({ pending: false, liked: false });
  refresh();
})();
