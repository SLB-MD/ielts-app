// Service Worker — Muc 22.5.
// Vo ung dung: precache theo phien ban. JSON noi dung: stale-while-revalidate.
// Audio: cache-first sau lan dau, ho tro Range 206 cho Safari.
// Khong cache yeu cau co Authorization. Yeu cau Talk Gateway luon network-only.
const VERSION = "p0-v2";
const SHELL = [
  "./",
  "index.html",
  "404.html",
  "styles/tokens.css",
  "styles/base.css",
  "styles/components.css",
  "app/main.js",
  "app/router.js",
  "app/spa-redirect.js",
  "app/views/welcome.js",
  "app/views/today.js",
  "app/views/method.js",
  "app/views/not-found.js",
  "app/state.js",
  "app/repo/db.js",
  "app/engine/day.js",
  "app/engine/placement.js",
  "app/engine/srs.js",
  "app/engine/plan.js",
  "app/engine/normalize.js",
  "app/engine/band.js",
  "app/engine/calibration.js",
  "app/views/placement.js",
  "app/views/learn.js",
  "app/views/vocab.js",
  "app/views/progress.js",
  "app/views/settings.js",
  "app/views/errors.js",
  "app/views/today.js",
  "app/gamify-ui.js",
  "app/engine/errors.js",
  "app/engine/gamify.js",
  "app/engine/lint.js",
  "app/engine/speaking.js",
  "app/views/practice.js",
  "app/views/test.js",
  "app/views/repair.js",
  "app/views/write.js",
  "app/views/speak.js",
  "app/views/talk.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
});

// Khong tu skipWaiting: chi kich hoat khi client bao khong con phien dang chay.
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "APPLY_UPDATE") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.headers.has("Authorization")) return;
  if (url.pathname.includes("/talk/")) return; // network-only

  if (e.request.headers.has("Range")) {
    e.respondWith(serveRange(e.request));
    return;
  }
  if (url.pathname.startsWith("/content/") || url.pathname.endsWith(".json")) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => hit);
  return hit || network;
}

async function serveRange(request) {
  const cache = await caches.open(VERSION);
  let res = await cache.match(request.url);
  if (!res) {
    res = await fetch(request.url);
    if (res.ok) cache.put(request.url, res.clone());
  }
  const blob = await res.blob();
  const range = /bytes=(\d+)-(\d*)/.exec(request.headers.get("Range") || "");
  if (!range) return new Response(blob, { headers: { "Content-Type": blob.type } });
  const start = Number(range[1]);
  const end = range[2] ? Number(range[2]) : blob.size - 1;
  const slice = blob.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    headers: {
      "Content-Type": blob.type,
      "Content-Range": `bytes ${start}-${end}/${blob.size}`,
      "Content-Length": String(slice.size),
      "Accept-Ranges": "bytes",
    },
  });
}
