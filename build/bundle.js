const path = require("node:path");
const esbuild = require("esbuild");

function buildBrowserBundle({
  projectRoot,
  define,
  minify = true,
  sourcemap = false,
}) {
  const result = esbuild.buildSync({
    entryPoints: [path.join(projectRoot, "src", "app", "bundle-entry.js")],
    absWorkingDir: projectRoot,
    bundle: true,
    charset: "utf8",
    define,
    format: "iife",
    legalComments: "inline",
    logLevel: "silent",
    metafile: true,
    minify,
    outfile: "app.js",
    platform: "browser",
    sourcemap: sourcemap ? "external" : false,
    supported: { "template-literal": false },
    target: ["es2020"],
    treeShaking: true,
    write: false,
  });
  const output = result.outputFiles.find((file) =>
    file.path.endsWith("app.js"),
  );
  if (!output) throw new Error("esbuild did not produce a browser bundle");
  return {
    code: output.text.trimEnd(),
    metafile: result.metafile,
    sourceMap: result.outputFiles.find((file) => file.path.endsWith(".js.map"))
      ?.text,
  };
}

module.exports = { buildBrowserBundle };
