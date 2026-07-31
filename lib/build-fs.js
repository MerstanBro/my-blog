import fs from "node:fs/promises";
import path from "node:path";

export function createFsHelpers({ root, dist }) {
  async function write(relativePath, value) {
    const target = path.join(dist, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, value, "utf8");
  }

  async function copy(source, destination) {
    try {
      await fs.cp(source, destination, { recursive: true });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  async function copyFonts() {
    const fontFiles = [
      ["@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2", "manrope-variable.woff2"],
      ["@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff2", "dm-mono-400.woff2"],
      ["@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2", "dm-mono-500.woff2"],
      ["@fontsource-variable/noto-kufi-arabic/files/noto-kufi-arabic-arabic-wght-normal.woff2", "noto-kufi-arabic-variable.woff2"],
    ];
    const destination = path.join(dist, "assets", "fonts");
    await fs.mkdir(destination, { recursive: true });
    for (const [source, filename] of fontFiles) {
      await fs.copyFile(path.join(root, "node_modules", source), path.join(destination, filename));
    }
  }

  async function copyVendorScripts() {
    const vendor = path.join(dist, "assets", "vendor");
    await fs.mkdir(vendor, { recursive: true });
    await fs.copyFile(
      path.join(root, "node_modules", "chart.js", "dist", "chart.umd.js"),
      path.join(vendor, "chart.umd.js"),
    );
  }

  return { write, copy, copyFonts, copyVendorScripts };
}
