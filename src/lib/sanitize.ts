/**
 * Minimal, dependency-free HTML sanitizer for rendering message bodies that
 * come from external providers (email / portal messages). It does NOT attempt
 * to be a full sanitizer — instead it strips the obvious dangerous vectors
 * (<script> blocks, on* event handlers, javascript: URLs, and a few other
 * risky attributes/tags) before the consumer renders the result with
 * `dangerouslySetInnerHTML`.
 *
 * The server also stores a `bodyHtmlSanitized` field — this helper is a
 * second line of defense on the client side. If the incoming HTML is empty
 * or only whitespace, the caller should fall back to rendering bodyText.
 */
const RISKY_TAGS = /<\/?(script|iframe|object|embed|link|meta|base|form|style|applet|noscript|svg)\b[^>]*>/gi;
const ON_ATTRS = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URLS = /(href|src|action|formaction|data|xlink:href)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]*)/gi;
const HTML_COMMENTS = /<!--[\s\S]*?-->/g;

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(HTML_COMMENTS, "")
    .replace(RISKY_TAGS, "")
    .replace(ON_ATTRS, "")
    .replace(JS_URLS, (_m, attr: string) => `${attr}="#"`);
}
