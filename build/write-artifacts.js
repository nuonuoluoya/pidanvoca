const fs = require("node:fs");
const path = require("node:path");

function writeArtifacts({
  bookArtifacts,
  manifestJson,
  offlinePath,
  offlineHtml,
  webPath,
  webHtml,
  serviceWorkerPath,
  serviceWorker,
  webAssetsPath,
  webAssets,
  webDataBooksPath,
  webManifestPath,
  pagesPath,
}) {
  fs.mkdirSync(path.dirname(webPath), { recursive: true });
  fs.mkdirSync(path.dirname(offlinePath), { recursive: true });
  fs.rmSync(webAssetsPath, { recursive: true, force: true });
  fs.rmSync(path.dirname(webDataBooksPath), { recursive: true, force: true });
  fs.mkdirSync(webAssetsPath, { recursive: true });
  fs.mkdirSync(webDataBooksPath, { recursive: true });
  fs.writeFileSync(offlinePath, offlineHtml, "utf8");
  fs.writeFileSync(webPath, webHtml, "utf8");
  fs.writeFileSync(serviceWorkerPath, serviceWorker, "utf8");
  webAssets.forEach((asset) => {
    fs.writeFileSync(path.join(webAssetsPath, asset.fileName), asset.content);
  });
  bookArtifacts.forEach((artifact) => {
    fs.writeFileSync(
      path.join(webDataBooksPath, artifact.jsonFileName),
      artifact.json,
      "utf8",
    );
  });
  fs.writeFileSync(webManifestPath, manifestJson, "utf8");
  fs.rmSync(pagesPath, { recursive: true, force: true });
  fs.cpSync(path.dirname(webPath), pagesPath, { recursive: true });
  const downloadsPath = path.join(pagesPath, "downloads");
  fs.mkdirSync(downloadsPath, { recursive: true });
  fs.copyFileSync(
    offlinePath,
    path.join(downloadsPath, "vocabulary-flashcards.html"),
  );
  fs.writeFileSync(path.join(pagesPath, ".nojekyll"), "", "utf8");
}

module.exports = { writeArtifacts };
