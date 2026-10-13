(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector(".theme-toggle");
  const menuButton = document.querySelector(".menu-toggle");
  const mobileNav = document.querySelector(".mobile-nav");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function prefersReducedMotion() {
    return reducedMotion.matches;
  }

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
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
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
    } catch {
      button.textContent = "Select code";
      return;
    }
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = "Copy";
    }, 1500);
  });

  function ensureTransit() {
    let shell = document.querySelector("[data-nav-transit]");
    if (shell) return shell;
    shell = document.createElement("div");
    shell.className = "nav-transit";
    shell.dataset.navTransit = "";
    shell.hidden = true;
    shell.innerHTML = `
      <div class="nav-transit-mark" aria-hidden="true">
        <span class="nav-transit-ring"></span>
        <span class="nav-transit-ring delay"></span>
        <img class="nav-transit-logo" src="/square.png" alt="" width="56" height="56" decoding="async">
      </div>
    `;
    document.body.appendChild(shell);
    return shell;
  }

  function showTransit() {
    const shell = ensureTransit();
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

  function normalizePath(pathname) {
    if (!pathname) return "/";
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      // keep raw
    }
    return pathname.endsWith("/") ? pathname : `${pathname}/`;
  }

  function isPostLike(pathname) {
    return /^\/blog\/(?!tag\/|page\/)[^/]+\/?$/.test(pathname);
  }

  function isBlogListing(pathname) {
    const p = normalizePath(pathname);
    return (
      p === "/blog/" ||
      /^\/blog\/page\/\d+\/$/.test(p) ||
      /^\/blog\/tag\/[^/]+\/$/.test(p) ||
      /^\/blog\/tag\/[^/]+\/page\/\d+\/$/.test(p)
    );
  }

  const listingCache = new Map();
  const LISTING_CACHE_LIMIT = 24;
  let listingRequest = 0;

  /** Fetch a listing page once; repeat visits and back/forward swap instantly. */
  async function fetchListingText(url) {
    if (listingCache.has(url)) return listingCache.get(url);
    const response = await fetch(url, { headers: { Accept: "text/html" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (listingCache.size >= LISTING_CACHE_LIMIT) {
      listingCache.delete(listingCache.keys().next().value);
    }
    listingCache.set(url, text);
    return text;
  }

  async function swapListing(doc) {
    const listing = document.querySelector("[data-blog-listing]") || document.querySelector(".blog-layout");
    const main = document.getElementById("main");
    if (!listing || !main) return false;

    const nextListing = doc.querySelector("[data-blog-listing]") || doc.querySelector(".blog-layout");
    if (!nextListing) throw new Error("Listing markup missing");

    const aside = listing.querySelector("[data-tag-nav]") || listing.querySelector(".tag-nav");
    const nextAside = nextListing.querySelector("[data-tag-nav]") || nextListing.querySelector(".tag-nav");
    if (aside && nextAside) aside.innerHTML = nextAside.innerHTML;

    const results = listing.querySelector("[data-listing-results]") || listing.querySelector(":scope > div:not(.tag-nav)");
    const nextResults = nextListing.querySelector("[data-listing-results]") || nextListing.querySelector(":scope > div:not(.tag-nav)");
    if (results && nextResults) results.replaceWith(nextResults);

    document.title = doc.title;
    const nextDescription = doc.querySelector('meta[name="description"]')?.getAttribute("content");
    const description = document.querySelector('meta[name="description"]');
    if (description && nextDescription) description.setAttribute("content", nextDescription);
    return true;
  }

  async function softListingNavigate(url, { push = true } = {}) {
    const main = document.getElementById("main");
    const cached = listingCache.has(url);
    const requestId = ++listingRequest;
    if (!cached) main?.classList.add("is-soft-loading");
    try {
      const doc = new DOMParser().parseFromString(await fetchListingText(url), "text/html");
      if (requestId !== listingRequest) return;
      if (!(await swapListing(doc))) throw new Error("Listing markup missing");
      if (push) {
        history.pushState({ listing: true, scrollY: 0 }, "", url);
        window.scrollTo(0, 0);
      }
    } catch (error) {
      console.error("Soft listing navigation failed", error);
      location.href = url;
    } finally {
      if (requestId === listingRequest) main?.classList.remove("is-soft-loading");
    }
  }

  // Remember scroll position per history entry so back/forward restores it.
  let scrollScheduled = false;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollScheduled) return;
      scrollScheduled = true;
      requestAnimationFrame(() => {
        scrollScheduled = false;
        const state = history.state;
        if (state && state.listing) {
          history.replaceState({ ...state, scrollY: window.scrollY }, "");
        }
      });
    },
    { passive: true },
  );

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const anchor = event.target.closest("a[href]");
    if (!isInternalNav(anchor)) return;

    const softListing =
      anchor.hasAttribute("data-listing-soft") ||
      (isBlogListing(location.pathname) && isBlogListing(anchor.pathname));

    if (softListing && isBlogListing(anchor.pathname)) {
      event.preventDefault();
      event.stopPropagation();
      softListingNavigate(anchor.href);
      return;
    }

    if (isPostLike(anchor.pathname) || isPostLike(location.pathname) || anchor.pathname.startsWith("/blog")) {
      event.preventDefault();
      if (prefersReducedMotion()) {
        location.href = anchor.href;
        return;
      }
      showTransit();
      location.href = anchor.href;
    }
  });

  window.addEventListener("popstate", (event) => {
    if (isBlogListing(location.pathname) && document.querySelector(".blog-layout")) {
      softListingNavigate(location.href, { push: false }).then(() => {
        window.scrollTo(0, Number(event.state?.scrollY) || 0);
      });
    }
  });

  window.addEventListener("pageshow", () => {
    root.classList.remove("is-navigating");
    const shell = document.querySelector("[data-nav-transit]");
    if (shell) {
      shell.classList.remove("is-visible");
      shell.hidden = true;
    }
  });

  // Prefetch likely next pages while the connection is idle so the first click feels instant.
  function prefetchDocument(href) {
    if (!href || !href.startsWith(location.origin)) return;
    if (listingCache.has(href)) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "document";
    link.href = href;
    document.head.appendChild(link);
  }

  function schedulePrefetches() {
    const run = () => {
      if (navigator.connection?.saveData) return;
      const targets = [];
      if (normalizePath(location.pathname) === "/") targets.push("/blog/");
      const firstPost = document.querySelector(".post-card h2 a");
      if (firstPost?.href) targets.push(firstPost.href);
      for (const target of targets.slice(0, 2)) prefetchDocument(new URL(target, location.origin).href);
    };
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 3000 });
    else window.setTimeout(run, 2000);
  }

  // Seed scroll tracking for a listing page opened directly (no pushState yet).
  if (isBlogListing(location.pathname) && !history.state?.listing) {
    history.replaceState({ listing: true, scrollY: window.scrollY }, "");
  }

  if (document.readyState === "complete") schedulePrefetches();
  else window.addEventListener("load", schedulePrefetches, { once: true });
})();
