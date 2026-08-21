const crypto = require("node:crypto");
const path = require("node:path");

function hashedAsset(fileName, content) {
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);
  const buffer = Buffer.isBuffer(content)
    ? content
    : Buffer.from(content, "utf8");
  const hash = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex")
    .slice(0, 12);
  return Object.freeze({
    fileName: `${baseName}.${hash}${extension}`,
    content: buffer,
  });
}

module.exports = { hashedAsset };
