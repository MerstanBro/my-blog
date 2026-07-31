(() => {
  const chartInstances = new Map();
  let renderToken = 0;

  function effectiveTheme() {
    const theme = document.documentElement.dataset.theme;
    if (theme === "dark" || theme === "light") return theme;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded) {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.addEventListener("load", () => {
        script.dataset.loaded = "1";
        resolve();
      });
      script.addEventListener("error", reject);
      document.head.appendChild(script);
    });
  }

  function fitMermaidSvg(svg) {
    if (!svg) return;
    const viewBox = svg.getAttribute("viewBox");
    if (!viewBox) {
      try {
        const box = svg.getBBox();
        if (box.width && box.height) {
          svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
        }
      } catch {
        /* ignore getBBox failures on detached/hidden nodes */
      }
    }
    svg.removeAttribute("height");
    svg.removeAttribute("width");
    svg.removeAttribute("style");
    svg.style.width = "100%";
    svg.style.maxWidth = "48rem";
    svg.style.height = "auto";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  function captureMermaidSources(nodes) {
    for (const node of nodes) {
      if (node.dataset.mermaidSource) continue;
      const svg = node.querySelector("svg");
      if (svg) continue;
      node.dataset.mermaidSource = node.textContent.trim();
    }
  }

  async function renderMermaid() {
    const nodes = [...document.querySelectorAll(".mermaid-block .mermaid")];
    if (!nodes.length) return;
    await loadScript("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js");
    const mermaid = window.mermaid;
    if (!mermaid) return;

    captureMermaidSources(nodes);
    const dark = effectiveTheme() === "dark";
    const token = ++renderToken;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: dark ? "dark" : "neutral",
      fontFamily: "Manrope, sans-serif",
      themeVariables: {
        fontSize: "18px",
        fontFamily: "Manrope, sans-serif",
      },
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        padding: 16,
        nodeSpacing: 50,
        rankSpacing: 50,
      },
      sequence: {
        actorMargin: 40,
        messageMargin: 40,
        boxMargin: 12,
      },
    });

    for (const node of nodes) {
      const source = node.dataset.mermaidSource;
      if (!source) continue;
      node.removeAttribute("data-processed");
      node.classList.remove("is-ready");
      node.textContent = source;
    }

    const runnable = nodes.filter((node) => node.dataset.mermaidSource);
    if (!runnable.length) return;
    await mermaid.run({ nodes: runnable });
    if (token !== renderToken) return;

    for (const node of runnable) {
      fitMermaidSvg(node.querySelector("svg"));
      node.classList.add("is-ready");
    }
  }

  function chartColors() {
    return {
      ink: cssVar("--ink", "#181916"),
      accent: cssVar("--accent", "#a66f00"),
      muted: cssVar("--muted", "#686b63"),
      line: cssVar("--line", "#d8d8d0"),
    };
  }

  function buildChartConfig(raw, colors) {
    const config = typeof structuredClone === "function"
      ? structuredClone(raw)
      : JSON.parse(JSON.stringify(raw));
    const options = { ...(config.options || {}) };
    options.responsive = true;
    options.maintainAspectRatio = true;
    options.plugins = options.plugins || {};
    const legend = options.plugins.legend || {};
    options.plugins.legend = {
      ...legend,
      labels: { ...(legend.labels || {}), color: colors.ink },
    };
    if (config.type !== "pie" && config.type !== "doughnut") {
      options.scales = options.scales || {};
      const x = options.scales.x || {};
      const y = options.scales.y || {};
      options.scales.x = {
        ...x,
        ticks: { ...(x.ticks || {}), color: colors.muted },
        grid: { ...(x.grid || {}), color: colors.line },
      };
      options.scales.y = {
        ...y,
        ticks: { ...(y.ticks || {}), color: colors.muted },
        grid: { ...(y.grid || {}), color: colors.line },
      };
    }
    if (Array.isArray(config.data?.datasets)) {
      config.data.datasets = config.data.datasets.map((dataset) => ({
        ...dataset,
        backgroundColor: dataset.backgroundColor || colors.accent,
        borderColor: dataset.borderColor || colors.accent,
      }));
    }
    config.options = options;
    return config;
  }

  async function renderCharts() {
    const canvases = [...document.querySelectorAll("canvas.post-chart[data-chart]")];
    if (!canvases.length) return;
    await loadScript("/assets/vendor/chart.umd.js");
    const Chart = window.Chart;
    if (!Chart) return;

    const colors = chartColors();
    for (const canvas of canvases) {
      let raw;
      try {
        raw = JSON.parse(canvas.getAttribute("data-chart") || "{}");
      } catch {
        continue;
      }
      if (!canvas.dataset.chartId) {
        canvas.dataset.chartId = `chart-${chartInstances.size + 1}`;
      }
      const existing = chartInstances.get(canvas) || Chart.getChart(canvas);
      if (existing) existing.destroy();

      const config = buildChartConfig(raw, colors);
      const chart = new Chart(canvas, {
        type: config.type,
        data: config.data,
        options: config.options,
      });
      chartInstances.set(canvas, chart);
      canvas.dataset.chartReady = "1";
    }
  }

  async function refreshTheme() {
    try {
      if (document.querySelector(".mermaid-block .mermaid")) await renderMermaid();
    } catch (error) {
      console.error("Mermaid theme refresh failed", error);
    }
    try {
      if (document.querySelector("canvas.post-chart[data-chart]")) await renderCharts();
    } catch (error) {
      console.error("Chart theme refresh failed", error);
    }
  }

  function watchTheme() {
    let last = effectiveTheme();
    const maybeRefresh = () => {
      const next = effectiveTheme();
      if (next === last) return;
      last = next;
      // Wait a frame so CSS variables have updated for the new theme.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          refreshTheme();
        });
      });
    };

    new MutationObserver(maybeRefresh).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", maybeRefresh);
    window.addEventListener("themechange", maybeRefresh);
  }

  async function boot() {
    try {
      await renderMermaid();
    } catch (error) {
      console.error("Mermaid failed", error);
    }
    try {
      await renderCharts();
    } catch (error) {
      console.error("Charts failed", error);
    }
    watchTheme();
  }

  boot();
})();
