import { transform } from "esbuild";

export async function minifyCss(css) {
  return (await transform(css, { loader: "css", minify: true })).code;
}

export async function minifyJs(js) {
  return (await transform(js, { loader: "js", minify: true, target: ["es2020"] })).code;
}

/**
 * Collapse insignificant whitespace outside of whitespace-sensitive tags.
 * <pre>, <textarea>, <script> and <style> contents are preserved verbatim.
 */
const TOKEN = /<(pre|textarea|script|style)(?:\s[^>]*)?>[\s\S]*?<\/\1[^>]*>|<!--[\s\S]*?-->|<[^>]*>|[^<]+/gi;

export function minifyHtml(html) {
  return html.replace(TOKEN, (token) => {
    if (token.startsWith("<!--")) return token;
    if (/^<(pre|textarea|script|style)(?:\s|>)/i.test(token)) return token;
    if (token.startsWith("<")) return token.replace(/\s+$/, "");
    return token.replace(/\s+/g, " ");
  });
}
