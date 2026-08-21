const fs = require("node:fs");
const path = require("node:path");

function embeddedScript(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .replace(/[ \t]+$/gm, "")
    .replace(/<\/script/gi, "<\\/script");
}

function dataUri(filePath, mimeType) {
  return `data:${mimeType};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function loadBuildAssets(projectRoot) {
  const importProcessor = embeddedScript(
    path.join(projectRoot, "src", "services", "import", "processor.js"),
  );
  const importWorker = embeddedScript(
    path.join(projectRoot, "src", "services", "import", "import-worker.js"),
  );
  const fsrsEntryPath = require.resolve("ts-fsrs", { paths: [projectRoot] });
  const fsrsPackagePath = path.join(
    path.dirname(fsrsEntryPath),
    "..",
    "package.json",
  );
  return {
    stylesheet: {
      PLAYFUL_CLOUD_LEFT_DATA_URI: dataUri(
        path.join(projectRoot, "assets", "playful-paper-cloud.png"),
        "image/png",
      ),
      PLAYFUL_CLOUD_RIGHT_DATA_URI: dataUri(
        path.join(projectRoot, "assets", "playful-paper-cloud-right.png"),
        "image/png",
      ),
      PLAYFUL_SUN_DATA_URI: dataUri(
        path.join(projectRoot, "assets", "playful-paper-sun.svg"),
        "image/svg+xml",
      ),
    },
    importWorkerSource: JSON.stringify(
      `${importProcessor}\n${importWorker}`,
    ).replace(/</g, "\\u003c"),
    fsrsPackageVersion: JSON.parse(fs.readFileSync(fsrsPackagePath, "utf8"))
      .version,
  };
}

module.exports = { embeddedScript, dataUri, loadBuildAssets };
