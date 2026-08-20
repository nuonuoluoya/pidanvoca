const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const host = "127.0.0.1";
const port = 4173;
const projectRoot = path.resolve(__dirname, "..", "..");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${host}:${port}`);
  const pathname = decodeURIComponent(
    requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname,
  );
  const filePath = path.resolve(projectRoot, `.${pathname}`);
  const allowedRoot = `${projectRoot}${path.sep}`;

  if (filePath !== projectRoot && !filePath.startsWith(allowedRoot)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type":
        mimeTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(content);
  });
});

server.listen(port, host, () => {
  console.log(`Test server listening at http://${host}:${port}`);
});

function closeServer() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
