(function attachWordbookParser(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) {
    root.PidanvocaWordbooks = Object.assign(
      {},
      root.PidanvocaWordbooks || {},
      api,
    );
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createWordbookParser() {
  "use strict";

const namedEntities = Object.freeze({
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  middot: "·",
  ndash: "–",
  mdash: "—",
});

function decodeEntities(value) {
  return String(value).replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity) => {
      if (entity[0] === "#") {
        const isHex = entity[1].toLowerCase() === "x";
        const number = Number.parseInt(
          entity.slice(isHex ? 2 : 1),
          isHex ? 16 : 10,
        );
        return Number.isFinite(number) ? String.fromCodePoint(number) : match;
      }
      return namedEntities[entity.toLowerCase()] ?? match;
    },
  );
}

  function htmlToText(html, decode = decodeEntities) {
    return decode(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "")
    .replace(/<\/(?:div|p|h[1-6]|ol|ul)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractNote(explanationHtml) {
  const match = String(explanationHtml).match(
    /<!--meta files\s+({[\s\S]*?})\s*-->/i,
  );
  if (!match) return "";
  try {
    const meta = JSON.parse(match[1]);
    return typeof meta.comment === "string" ? meta.comment.trim() : "";
  } catch {
    return "";
  }
}

  function extractMeaning(explanationHtml, note, toText = htmlToText) {
  let content = String(explanationHtml)
    .replace(/<!--meta files[\s\S]*?-->/gi, "")
    .trim();
  if (note) {
    const split = content.match(
      /^[\s\S]*?(?:<br\s*\/?>\s*){2}([\s\S]*)$/i,
    );
    if (split) content = split[1];
  }
    return toText(content);
  }

function parseWordbook(source, fileName = "wordbook.html") {
  const bodyMatch = String(source).match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!bodyMatch) {
    throw new Error(`未能在 ${fileName} 中找到单词表 tbody。`);
  }

  const rowMatches = bodyMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const words = rowMatches
    .map((row) => {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
        (match) => match[1],
      );
      const explanationHtml = cells[4] || "";
      const note = extractNote(explanationHtml);
      return {
        word: htmlToText(cells[1] || ""),
        phonetic: htmlToText(cells[2] || "").replace(/\s+/g, " "),
        meaning: extractMeaning(explanationHtml, note),
        note,
      };
    })
    .filter((item) => item.word);

  if (!words.length) {
    throw new Error(`未能从 ${fileName} 中提取到词条。`);
  }
  return words;
}

  return Object.freeze({
    decodeEntities,
    htmlToText,
    extractNote,
    extractMeaning,
    parseWordbook,
  });
});
