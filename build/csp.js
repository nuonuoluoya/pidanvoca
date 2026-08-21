const crypto = require("node:crypto");

function inlineHashes(html, tagName) {
  const pattern = new RegExp(
    `<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`,
    "gi",
  );
  return Array.from(html.matchAll(pattern), (match) => {
    const digest = crypto
      .createHash("sha256")
      .update(match[1], "utf8")
      .digest("base64");
    return `'sha256-${digest}'`;
  });
}

function withSecurityPolicy(html) {
  const scriptHashes = inlineHashes(html, "script");
  const styleHashes = inlineHashes(html, "style");
  const policy = [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(" ")}`,
    "script-src-attr 'none'",
    `style-src-elem 'self' ${styleHashes.join(" ")}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
  const referrerMeta = '<meta name="referrer" content="no-referrer">';
  return html.replace(
    referrerMeta,
    `${referrerMeta}\n  <meta http-equiv="Content-Security-Policy" content="${policy}">`,
  );
}

module.exports = { inlineHashes, withSecurityPolicy };
