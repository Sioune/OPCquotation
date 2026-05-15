import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const rootArg = args.get("--root") ?? ".";
const port = Number(args.get("--port") ?? 4173);
const host = args.get("--host") ?? "127.0.0.1";
const root = path.resolve(process.cwd(), rootArg);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml"
};

function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const requested = path.join(root, safePath === "/" ? "index.html" : safePath);
  const stats = existsSync(requested) ? statSync(requested) : null;
  if (stats?.isDirectory()) return path.join(requested, "index.html");
  return requested;
}

const server = createServer((request, response) => {
  const filePath = resolvePath(request.url ?? "/");
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const extension = path.extname(filePath);
  response.writeHead(200, { "content-type": mimeTypes[extension] ?? "application/octet-stream" });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  const scriptName = path.basename(fileURLToPath(import.meta.url));
  console.log(`${scriptName} serving ${root} at http://${host}:${port}`);
});
