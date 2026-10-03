/* Decision Guard service worker:
   1) Receives tips shared from WhatsApp/Telegram etc. (Android share sheet), including screenshots.
   2) Caches the app shell so it opens fast on slow networks. */
const SHELL = "dg-shell-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/icon.svg", "/icon-192.png", "/manifest.webmanifest"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("dg-shell") && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Share target: stash shared text/image, then open the check form.
  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith((async () => {
      try {
        const form = await event.request.formData();
        const text = [form.get("title"), form.get("text"), form.get("url")].filter(Boolean).join("\n");
        const cache = await caches.open("share-inbox");
        await cache.put("/shared/text", new Response(text));
        const file = form.get("image");
        if (file && typeof file !== "string") await cache.put("/shared/image", new Response(file, { headers: { "Content-Type": file.type } }));
      } catch (e) { /* ignore */ }
      return Response.redirect("/check?shared=1", 303);
    })());
    return;
  }

  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Static build files: cache-first (they are versioned by Next.js).
  if (url.pathname.startsWith("/_next/static/") || /\.(svg|png|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(SHELL).then(async (c) => {
        const hit = await c.match(event.request);
        if (hit) return hit;
        const res = await fetch(event.request);
        if (res.ok) c.put(event.request, res.clone());
        return res;
      })
    );
    return;
  }

  // Pages: network-first, fall back to cached copy when offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match("/home")))
    );
  }
});
