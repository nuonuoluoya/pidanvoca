const path = require("node:path");
const esbuild = require("esbuild");
const { buildBrowserBundle } = require("../build/bundle");

const projectRoot = path.join(__dirname, "..");
const result = buildBrowserBundle({
  projectRoot,
  minify: false,
  sourcemap: true,
  define: {
    __BUILD_APP_BUILD_TARGET__: '"analysis"',
    __BUILD_BUILT_IN_BOOKS__: "[]",
    __BUILD_PERSONAL_BOOKS__: "[]",
    __BUILD_DEFAULT_BOOK_ID__: '""',
    __BUILD_LEGACY_BUILT_IN_BOOK_IDS__: "{}",
    __BUILD_IMPORT_WORKER_SOURCE__: '""',
    __BUILD_FSRS_PACKAGE_VERSION__: '"5.4.1"',
  },
});

if (!result.sourceMap)
  throw new Error("Development bundle source map is missing");
console.log(esbuild.analyzeMetafileSync(result.metafile, { verbose: false }));
