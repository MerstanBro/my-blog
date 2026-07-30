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
      <button type="button" class="like-button" data-like-button aria-pressed="false">
        <span data-like-label>Like</span>
        <span class="like-count" data-like-count>0</span>
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
    button.disabled = liked || pending || busy;
    button.setAttribute("aria-pressed", String(liked));
    if (labelEl) {
      if (pending) labelEl.textContent = "Saving";
      else labelEl.textContent = liked ? "Liked" : "Like";
    }
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
      // Button stays usable; click will surface errors.
    }
  }

  button?.addEventListener("click", async () => {
    if (!slug || !id || busy || button.disabled) return;
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
        setStatus(response.status === 409 ? "Already liked from this device." : "Liked.", "success");
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
        button.disabled = false;
      }
    }
  });

  refresh();
})();
