#!/usr/bin/env node
// Serves the frontend build (already uploaded via sync-frontend-to-local-cdn.sh) at clean,
// root-relative URLs — http://localhost:8081/ — by rewriting each request into fake-gcs-server's
// raw JSON-API object-download URL underneath. This is what a real load balancer + backend
// bucket (infra/frontend.tf) does for you automatically in production; fake-gcs-server's plain
// API has no such path-mapping, so browsing it directly 404s on every asset (root-relative paths
// like /assets/x.js resolve against the emulator's origin, not the object's actual location).
//
// Any path with no matching object falls back to index.html (200, not a real 404) — same as the
// bucket's not_found_page=index.html setting, so React Router's client-side routes still work on
// a full page load/refresh (e.g. opening http://localhost:8081/en/jobs/123 directly).
//
// Requires: `docker compose up -d fake-gcs-server` running, and dist/ already synced (see
// scripts/sync-frontend-to-local-cdn.sh). Also requires app.cors.allowed-origins to include
// http://localhost:8081 (already added in application.properties) for the SPA's API calls to
// the backend on :8080 to work from this origin.
import http from "node:http";

const PORT = Number(process.env.PORT ?? 8081);
const EMULATOR_HOST = process.env.STORAGE_GCS_EMULATOR_HOST ?? "http://localhost:4443";
const BUCKET = process.env.FRONTEND_BUCKET ?? "openopportunity-frontend";

async function fetchObject(objectPath) {
  const url = `${EMULATOR_HOST}/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;
  const response = await fetch(url);
  return response.ok ? response : null;
}

const server = http.createServer(async (req, res) => {
  const requestedPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const objectPath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\//, "");

  let upstream = await fetchObject(objectPath);
  let status = 200;
  if (!upstream) {
    // SPA fallback — no object at this exact path, so let the client-side router handle it.
    upstream = await fetchObject("index.html");
    status = upstream ? 200 : 404;
  }

  if (!upstream) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(
      `Not found, and index.html fallback is missing too — did you run ` +
        `scripts/sync-frontend-to-local-cdn.sh yet?`,
    );
    return;
  }

  res.writeHead(status, { "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream" });
  res.end(Buffer.from(await upstream.arrayBuffer()));
});

server.listen(PORT, () => {
  console.log(`Local CDN proxy: http://localhost:${PORT}/ -> ${EMULATOR_HOST} bucket "${BUCKET}"`);
});
