const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.join(__dirname, "..");
const generatedRoots = ["vocabulary-flashcards.html", "data", "dist"];

function listFiles(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  if (fs.statSync(absolutePath).isFile()) return [relativePath];
  return fs
    .readdirSync(absolutePath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "en"))
    .flatMap((entry) => listFiles(path.join(relativePath, entry.name)));
}

function snapshot() {
  return Object.fromEntries(
    generatedRoots
      .flatMap(listFiles)
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((relativePath) => {
        const content = fs.readFileSync(path.join(projectRoot, relativePath));
        return [
          relativePath.replaceAll("\\", "/"),
          crypto.createHash("sha256").update(content).digest("hex"),
        ];
      }),
  );
}

function build() {
  const environment = { ...process.env };
  delete environment.INCLUDE_PERSONAL_WORDBOOKS;
  const result = spawnSync(process.execPath, ["build-vocabulary.js"], {
    cwd: projectRoot,
    env: environment,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

function assertPersonalWordbooksExcluded() {
  const generatedHtmlPaths = [
    "vocabulary-flashcards.html",
    path.join("dist", "offline", "vocabulary-flashcards.html"),
    path.join("dist", "web", "index.html"),
  ];
  const generatedHtml = generatedHtmlPaths.map((relativePath) =>
    fs.readFileSync(path.join(projectRoot, relativePath), "utf8"),
  );
  generatedHtml.forEach((html) => {
    if (!/<!-- Personal wordbooks included: 0 -->/.test(html)) {
      throw new Error("Default build contains personal wordbook data");
    }
  });

  const personalDirectory = path.join(projectRoot, "wordbooks", "my");
  if (!fs.existsSync(personalDirectory)) return;
  const privateMarkers = fs
    .readdirSync(personalDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.json$/i.test(entry.name))
    .flatMap((entry) => {
      const payload = JSON.parse(
        fs.readFileSync(path.join(personalDirectory, entry.name), "utf8"),
      );
      return [
        path.parse(entry.name).name,
        payload.id,
        payload.name,
        payload.fileName,
        payload.sourceFileName,
      ].filter((value) => typeof value === "string" && value.length >= 6);
    });
  if (
    privateMarkers.some((marker) =>
      generatedHtml.some((html) => html.includes(marker)),
    )
  ) {
    throw new Error("Default build leaked a personal wordbook marker");
  }
}

build();
const first = snapshot();
build();
const second = snapshot();

if (JSON.stringify(first) !== JSON.stringify(second)) {
  const changed = Array.from(
    new Set([...Object.keys(first), ...Object.keys(second)]),
  ).filter((fileName) => first[fileName] !== second[fileName]);
  throw new Error(
    `Generated output is not deterministic: ${changed.join(", ")}`,
  );
}

assertPersonalWordbooksExcluded();
console.log(
  `Deterministic build verified for ${Object.keys(second).length} generated files; personal wordbooks excluded.`,
);
