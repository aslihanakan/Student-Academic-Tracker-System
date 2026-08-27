const CACHE_NAME = "academi-buddy-v2";

const STATIC_ASSETS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icons_pwa/icon-192.png",
    "./icons_pwa/icon-512.png",
    "./photos/favicon-180.png",
    "./photos/favicon-32.png",
    "./photos/favicon-16.png"
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {});
        })
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.url.includes("/api/")) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
