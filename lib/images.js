import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { escapeHtml } from "./html-utils.js";

const CANDIDATE_WIDTHS = [640, 1280];
const MAX_WIDTH = 1280;

/** Local raster images under /images/ are optimized; anything else renders as-is. */
export function isOptimizableImage(src = "") {
  return /^\/images\/[^?#]+\.(jpe?g|png)$/i.test(String(src));
}

function buildWidths(originalWidth) {
  const widths = CANDIDATE_WIDTHS.filter((width) => width <= originalWidth && width <= MAX_WIDTH);
  if (!widths.length) return [originalWidth];
  if (originalWidth > 640 && originalWidth < MAX_WIDTH && !widths.includes(originalWidth)) widths.push(originalWidth);
  return widths.sort((a, b) => a - b);
}

/**
 * Generates AVIF/WebP variants (and a resized fallback) for local /images references.
 * Variants are written next to the copied originals inside dist.
 */
export function createImageOptimizer({ root, dist }) {
  const publicDir = path.join(root, "public");
  const imagesDir = path.join(publicDir, "images");
  const variants = new Map();

  async function optimize(src) {
    if (variants.has(src)) return variants.get(src);
    const relative = src.replace(/^\//, "");
    const absolute = path.join(publicDir, relative);
    const base = src.replace(/\.[^./]+$/i, "");
    const extension = path.extname(src).slice(1).toLowerCase();
    if (path.resolve(publicDir, `.${base}`) !== path.join(publicDir, base)) {
      variants.set(src, null);
      return null;
    }
    try {
      const image = sharp(absolute, { failOn: "none" });
      const metadata = await image.metadata();
      if (!metadata.width) throw new Error("missing width");
      const widths = buildWidths(metadata.width);
      await fs.mkdir(path.dirname(path.join(dist, base.slice(1))), { recursive: true });
      for (const width of widths) {
        const target = (extension) => path.join(dist, `${base.slice(1)}-${width}.${extension}`);
        const resized = sharp(absolute, { failOn: "none" }).resize({ width, withoutEnlargement: true });
        await resized.clone().avif({ quality: 52, effort: 4 }).toFile(target("avif"));
        await resized.clone().webp({ quality: 78, effort: 4 }).toFile(target("webp"));
        await (extension === "png"
          ? resized.clone().png({ compressionLevel: 9, palette: metadata.hasAlpha })
          : resized.clone().jpeg({ quality: 82, progressive: true, mozjpeg: true })
        ).toFile(target(extension));
      }
      const entry = { base, extension, widths };
      variants.set(src, entry);
      return entry;
    } catch (error) {
      if (error.code !== "ENOENT") console.warn(`image optimize skip ${src}:`, error.message);
      variants.set(src, null);
      return null;
    }
  }

  /** Optimize every raster image in public/images so cached HTML always finds its variants. */
  async function optimizeAllImages() {
    try {
      const files = await fs.readdir(imagesDir);
      const rasters = files.filter((file) => /\.(jpe?g|png)$/i.test(file));
      await Promise.all(rasters.map((file) => optimize(`/images/${file}`)));
      return rasters.length;
    } catch (error) {
      if (error.code !== "ENOENT") console.warn("image optimize skipped:", error.message);
      return 0;
    }
  }

  function srcsetFor(entry) {
    return entry.widths.map((width) => `${entry.base}-${width}.${entry.extension} ${width}w`).join(", ");
  }

  /** <picture> markup with AVIF/WebP sources and a resized fallback. */
  function markup(src, { alt = "", sizes = "", className = "", loading = "lazy", decoding = "async", fetchpriority = "", width, height } = {}) {
    if (!src) return "";
    const attrs = [
      className ? `class="${escapeHtml(className)}"` : "",
      sizes ? `sizes="${escapeHtml(sizes)}"` : "",
      loading ? `loading="${loading}"` : "",
      decoding ? `decoding="${decoding}"` : "",
      fetchpriority ? `fetchpriority="${fetchpriority}"` : "",
      width ? `width="${width}"` : "",
      height ? `height="${height}"` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const entry = isOptimizableImage(src) ? variants.get(src) : null;
    if (!entry) {
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" ${attrs}>`;
    }
    const sources = ["avif", "webp"]
      .map(
        (format) =>
          `<source type="image/${format}" srcset="${entry.widths
            .map((w) => `${entry.base}-${w}.${format} ${w}w`)
            .join(", ")}"${sizes ? ` sizes="${escapeHtml(sizes)}"` : ""}>`,
      )
      .join("");
    return `<picture>${sources}<img src="${escapeHtml(entry.base)}-${entry.widths.at(-1)}.${entry.extension}" srcset="${escapeHtml(
      srcsetFor(entry),
    )}" alt="${escapeHtml(alt)}" ${attrs}></picture>`;
  }

  return { optimizeAllImages, markup, isOptimizableImage };
}
