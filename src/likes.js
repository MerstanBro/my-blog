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

  // Ensure markup exists even if the page was cached without the button shell.
  if (!mount.querySelector("[data-like-button]")) {
    mount.innerHTML = `
      <button type="button" class="like-button" data-like-button aria-pressed="false">
        <span data-like-label>Like</span>
        <span class="like-count" data-like-count>·</span>
      </button>
      <p class="like-status" data-like-status hidden></p>
    `;
  }

  const id = deviceId();
  const button = mount.querySelector("[data-like-button]");
  const countEl = mount.querySelector("[data-like-count]");
  const labelEl = mount.querySelector("[data-like-label]");
  const statusEl = mount.querySelector("[data-like-status]");

  function render({ count = 0, liked = false } = {}) {
    if (countEl) countEl.textContent = String(count);
    if (!button) return;
    button.disabled = liked;
    button.setAttribute("aria-pressed", String(liked));
    if (labelEl) labelEl.textContent = liked ? "Liked" : "Like";
  }

  async function refresh() {
    if (!slug || !id) return;
    try {
      const response = await fetch(
        `/api/likes?slug=${encodeURIComponent(slug)}&deviceId=${encodeURIComponent(id)}`,
      );
      if (!response.ok) return;
      render(await response.json());
    } catch {
      // Keep the visible button; count stays as placeholder until the API responds.
    }
  }

  button?.addEventListener("click", async () => {
    if (!slug || !id || button.disabled) return;
    button.disabled = true;
    if (statusEl) {
      statusEl.hidden = true;
      statusEl.textContent = "";
    }
    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, deviceId: id }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok || response.status === 409) {
        render({ count: data.count ?? Number(countEl?.textContent) || 0, liked: true });
        return;
      }
      if (statusEl) {
        statusEl.textContent = data.error || "Could not like this post.";
        statusEl.hidden = false;
      }
      button.disabled = false;
    } catch {
      if (statusEl) {
        statusEl.textContent = "Could not like this post.";
        statusEl.hidden = false;
      }
      button.disabled = false;
    }
  });

  refresh();
})();
