(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector(".theme-toggle");
  const menuButton = document.querySelector(".menu-toggle");
  const mobileNav = document.querySelector(".mobile-nav");

  function effectiveTheme() {
    if (root.dataset.theme === "dark" || root.dataset.theme === "light") {
      return root.dataset.theme;
    }
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  themeButton?.addEventListener("click", () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem("theme", next);
  });

  menuButton?.addEventListener("click", () => {
    const open = mobileNav?.classList.toggle("open") || false;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });

  mobileNav?.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    mobileNav.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-code]");
    if (!button) return;
    const code = button.closest(".code-shell")?.querySelector("code")?.textContent;
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = "Copy";
      }, 1500);
    } catch {
      button.textContent = "Select code";
    }
  });

  // Page enter animation
  root.classList.add("is-ready");
  document.getElementById("main")?.classList.add("page-enter");

  function ensureSkeleton() {
    let shell = document.querySelector("[data-nav-skeleton]");
    if (shell) return shell;
    shell = document.createElement("div");
    shell.className = "nav-skeleton";
    shell.dataset.navSkeleton = "";
    shell.hidden = true;
    shell.innerHTML = `
      <div class="nav-skeleton-panel shell" aria-hidden="true">
        <div class="skel skel-kicker"></div>
        <div class="skel skel-title"></div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line short"></div>
        <div class="skel skel-cover"></div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line short"></div>
      </div>
    `;
    document.body.appendChild(shell);
    return shell;
  }

  function showSkeleton() {
    const shell = ensureSkeleton();
    shell.hidden = false;
    root.classList.add("is-navigating");
    requestAnimationFrame(() => shell.classList.add("is-visible"));
  }

  function isInternalNav(anchor) {
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
    if (anchor.origin !== location.origin) return false;
    const href = anchor.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (anchor.pathname === location.pathname && anchor.search === location.search) return false;
    return true;
  }

  function isPostLike(pathname) {
    return /^\/blog\/(?!tag\/|page\/)[^/]+\/?$/.test(pathname);
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const anchor = event.target.closest("a[href]");
    if (!isInternalNav(anchor)) return;

    // Skeleton especially for article navigations; still snappy for other internal links.
    if (isPostLike(anchor.pathname) || isPostLike(location.pathname) || anchor.pathname.startsWith("/blog")) {
      event.preventDefault();
      showSkeleton();
      // Full page loads: skip View Transitions (they double-paint with the skeleton).
      window.setTimeout(() => {
        location.href = anchor.href;
      }, 80);
    }
  });

  window.addEventListener("pageshow", () => {
    root.classList.remove("is-navigating");
    const shell = document.querySelector("[data-nav-skeleton]");
    if (shell) {
      shell.classList.remove("is-visible");
      shell.hidden = true;
    }
  });
})();
