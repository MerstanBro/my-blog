(() => {
  const article = document.querySelector(".article-shell");
  if (!article) return;
  const rtl = article.getAttribute("dir") === "rtl";

  /* ---------- reading progress ---------- */
  const bar = document.querySelector("[data-read-progress]");
  const body = article.querySelector(".article-body");
  if (bar && body) {
    if (rtl) bar.dataset.rtl = "";
    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = body.getBoundingClientRect();
      const distance = rect.height - window.innerHeight * 0.6;
      const progress = distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 0;
      bar.style.setProperty("--p", progress.toFixed(4));
    };
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true },
    );
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  /* ---------- table of contents: highlight the section being read ---------- */
  const tocLinks = new Map(
    [...article.querySelectorAll(".toc a[href^='#']")].map((link) => [decodeURIComponent(link.hash.slice(1)), link]),
  );
  if (tocLinks.size && "IntersectionObserver" in window) {
    const current = () => {
      let active = null;
      for (const id of tocLinks.keys()) {
        const heading = document.getElementById(id);
        if (heading && heading.getBoundingClientRect().top <= window.innerHeight * 0.3) active = id;
      }
      for (const [id, link] of tocLinks) {
        if (id === active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      }
    };
    const observer = new IntersectionObserver(current, { rootMargin: "0px 0px -70% 0px" });
    for (const id of tocLinks.keys()) {
      const heading = document.getElementById(id);
      if (heading) observer.observe(heading);
    }
    window.addEventListener("scroll", current, { passive: true });
  }

  /* ---------- copy link / share ---------- */
  const shareButton = document.querySelector("[data-share]");
  const shareLabel = shareButton?.querySelector("[data-share-label]");
  shareButton?.addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}`;
    const title = shareButton.dataset.title || document.title;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    try {
      if (touch && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (shareLabel) shareLabel.textContent = "Press ⌘/Ctrl+C";
      return;
    }
    if (shareLabel) {
      shareLabel.textContent = "Link copied";
      shareButton.classList.add("is-done");
      setTimeout(() => {
        shareLabel.textContent = "Copy link";
        shareButton.classList.remove("is-done");
      }, 1800);
    }
  });

  /* ---------- copy a Quran verse card ---------- */
  article.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-quran]");
    if (!button) return;
    const card = button.closest("[data-quran-card]");
    if (!card) return;
    const verses = [...card.querySelectorAll(".ayah")]
      .map((ayah) => {
        const number = ayah.querySelector(".ayah-no")?.textContent.trim();
        const text = [...ayah.childNodes]
          .filter((node) => !(node.nodeType === 1 && node.classList.contains("ayah-no")))
          .map((node) => node.textContent)
          .join("")
          .trim();
        return number ? `${text} ﴿${number}﴾` : text;
      })
      .join(" ");
    const translation = card.querySelector(".quran-translation")?.textContent.trim();
    const reference = card.querySelector(".quran-ref a")?.textContent.trim();
    const text = [verses, translation, reference && `— ${reference}`].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Select text";
    }
    setTimeout(() => {
      button.textContent = "Copy";
    }, 1500);
  });

  /* ---------- newer / older articles ---------- */
  const nav = document.querySelector("[data-post-nav]");
  if (nav) {
    const normalise = (value) => {
      try {
        value = decodeURIComponent(value);
      } catch {
        // keep as is
      }
      return value.endsWith("/") ? value : `${value}/`;
    };
    fetch("/posts.json")
      .then((response) => (response.ok ? response.json() : []))
      .then((posts) => {
        const here = normalise(location.pathname);
        const index = posts.findIndex((post) => normalise(post.href) === here);
        if (index === -1) return;
        const items = [
          { post: posts[index - 1], kind: "newer", label: "Newer" },
          { post: posts[index + 1], kind: "older", label: "Older" },
        ].filter((item) => item.post);
        if (!items.length) return;
        for (const { post, kind, label } of items) {
          const link = document.createElement("a");
          link.className = `post-nav-link is-${kind}`;
          link.href = post.href;
          const labelEl = document.createElement("span");
          labelEl.className = "post-nav-label";
          labelEl.textContent = label;
          const titleEl = document.createElement("span");
          titleEl.className = "post-nav-title";
          titleEl.textContent = post.title;
          link.append(labelEl, titleEl);
          nav.append(link);
        }
        nav.hidden = false;
      })
      .catch(() => {});
  }
})();
