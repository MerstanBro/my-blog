(() => {
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
        existing.addEventListener("load", () => resolve());
        if (existing.dataset.loaded) resolve();
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

  async function bootMermaid() {
    const nodes = document.querySelectorAll("pre.mermaid");
    if (!nodes.length) return;
    await loadScript("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js");
    const mermaid = window.mermaid;
    if (!mermaid) return;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: effectiveTheme() === "dark" ? "dark" : "neutral",
    });
    await mermaid.run({ nodes });
  }

  async function bootCharts() {
    const canvases = document.querySelectorAll("canvas.post-chart[data-chart]");
    if (!canvases.length) return;
    await loadScript("/assets/vendor/chart.umd.js");
    const Chart = window.Chart;
    if (!Chart) return;

    const ink = cssVar("--ink", "#181916");
    const accent = cssVar("--accent", "#a66f00");
    const muted = cssVar("--muted", "#686b63");
    const line = cssVar("--line", "#d8d8d0");

    for (const canvas of canvases) {
      if (canvas.dataset.chartReady) continue;
      let config;
      try {
        config = JSON.parse(canvas.getAttribute("data-chart") || "{}");
      } catch {
        continue;
      }
      const options = { ...(config.options || {}) };
      options.responsive = true;
      options.maintainAspectRatio = true;
      options.plugins = options.plugins || {};
      options.plugins.legend = {
        ...(options.plugins.legend || {}),
        labels: { color: ink, ...((options.plugins.legend || {}).labels || {}) },
      };
      if (config.type !== "pie" && config.type !== "doughnut") {
        options.scales = options.scales || {};
        options.scales.x = {
          ticks: { color: muted },
          grid: { color: line },
          ...(options.scales.x || {}),
        };
        options.scales.y = {
          ticks: { color: muted },
          grid: { color: line },
          ...(options.scales.y || {}),
        };
      }
      if (Array.isArray(config.data?.datasets)) {
        config.data.datasets = config.data.datasets.map((dataset) => ({
          backgroundColor: dataset.backgroundColor || accent,
          borderColor: dataset.borderColor || accent,
          ...dataset,
        }));
      }
      // eslint-disable-next-line no-new
      new Chart(canvas, { type: config.type, data: config.data, options });
      canvas.dataset.chartReady = "1";
    }
  }

  async function boot() {
    try {
      await bootMermaid();
    } catch (error) {
      console.error("Mermaid failed", error);
    }
    try {
      await bootCharts();
    } catch (error) {
      console.error("Charts failed", error);
    }
  }

  boot();
})();
