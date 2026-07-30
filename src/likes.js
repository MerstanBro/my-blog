(() => {
  const mount = document.querySelector("[data-likes]");
  if (!mount) return;

  const slug = mount.dataset.slug || "";
  const STORAGE_KEY = "blog-device-id";

  function deviceId() {
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!id && crypto.randomUUID) {
        id = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id || "";
    } catch {
      return "";
    }
  }

  const id = deviceId();
  mount.innerHTML = `
    <button type="button" class="like-button" data-like-button aria-pressed="false">
      <span data-like-label>Like</span>
      <span class="like-count" data-like-count>0</span>
    </button>
    <p class="like-status" data-like-status hidden></p>
  `;

  const button = mount.querySelector("[data-like-button]");
  const countEl = mount.querySelector("[data-like-count]");
  const labelEl = mount.querySelector("[data-like-label]");
  const statusEl = mount.querySelector("[data-like-status]");

  function render({ count = 0, liked = false } = {}) {
    countEl.textContent = String(count);
    button.disabled = liked;
    button.setAttribute("aria-pressed", String(liked));
    labelEl.textContent = liked ? "Liked" : "Like";
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
      // Keep defaults offline.
    }
  }

  button?.addEventListener("click", async () => {
    if (!slug || !id || button.disabled) return;
    button.disabled = true;
    statusEl.hidden = true;
    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, deviceId: id }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok || response.status === 409) {
        render({ count: data.count ?? Number(countEl.textContent) || 0, liked: true });
        return;
      }
      statusEl.textContent = data.error || "Could not like this post.";
      statusEl.hidden = false;
      button.disabled = false;
    } catch {
      statusEl.textContent = "Could not like this post.";
      statusEl.hidden = false;
      button.disabled = false;
    }
  });

  refresh();
})();
