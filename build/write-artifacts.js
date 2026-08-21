const fs = require("node:fs");
const path = require("node:path");

function writeArtifacts({
  bookArtifacts,
  dataBooksPath,
  manifestPath,
  manifestJson,
  rootOfflinePath,
  offlinePath,
  offlineHtml,
  webPath,
  webHtml,
  serviceWorkerPath,
  serviceWorker,
}) {
  fs.mkdirSync(dataBooksPath, { recursive: true });
  fs.mkdirSync(path.dirname(webPath), { recursive: true });
  fs.mkdirSync(path.dirname(offlinePath), { recursive: true });
  bookArtifacts.forEach((artifact) => {
    fs.writeFileSync(
      path.join(dataBooksPath, artifact.jsonFileName),
      artifact.json,
      "utf8",
    );
  });
  fs.writeFileSync(manifestPath, manifestJson, "utf8");
  fs.writeFileSync(rootOfflinePath, offlineHtml, "utf8");
  fs.writeFileSync(offlinePath, offlineHtml, "utf8");
  fs.writeFileSync(webPath, webHtml, "utf8");
  fs.writeFileSync(serviceWorkerPath, serviceWorker, "utf8");
}

module.exports = { writeArtifacts };
