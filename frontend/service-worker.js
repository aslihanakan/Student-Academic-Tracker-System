const CACHE_NAME = "academi-buddy-static-v6";
const API_CACHE_NAME = "academi-buddy-api-v6";

const STATIC_ASSETS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./css/common.css",
    "./css/auth.css",
    "./css/dashboard.css",
    "./css/grades.css",
    "./css/deadlines.css",
    "./css/study-sessions.css",
    "./js/auth.js",
    "./js/common.js",
    "./js/courses.js",
    "./js/exams.js",
    "./js/dashboard.js",
    "./js/study.js",
    "./js/settings.js",
    "./js/main.js",
    "./videos/login-background.mp4",
    "./videos/motivation.mp4",
    "./photos/logo.png",
    "./photos/favicon-180.png",
    "./photos/favicon-32.png",
    "./photos/favicon-16.png",
    "./photos/apple-touch-icon.png",
    "./icons_pwa/icon-192.png",
    "./icons_pwa/icon-512.png",
    "./apple-touch-icon.png",
    "./apple-touch-icon-precomposed.png",
    "./icons/pp.png",
    "./icons/1.jpg",
    "./icons/2.jpg",
    "./icons/3.jpg",
    "./icons/4.jpg",
    "./icons/5.jpg",
    "./icons/6.jpg",
    "./icons/7.jpg",
    "./icons/8.jpg",
    "./icons/9.jpg",
    "./icons/10.jpg",
    "./icons/11.jpg",
    "./icons/12.png",
    "./icons/14.jpg",
    "./icons/indir (2).jpg",
    "./icons/indir (4).jpg",
    "./icons/indir (12).jpg",
    "./icons/indir (13).jpg",
    "./icons/quby 3.jpg"
];

// Service Worker Install: Precaches all application and media assets
self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                STATIC_ASSETS.map((asset) =>
                    cache.add(asset).catch((err) => {
                        console.warn(`[SW] Precache skipped for: ${asset}`, err);
                    })
                )
            );
        })
    );
});

// Clear old cache versions on activate
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
                        console.log(`[SW] Purging old cache: ${key}`);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Handle Requests
self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    // 1. API Requests: Network-First with Cache Fallback
    if (url.pathname.includes("/api/")) {
        if (
            url.pathname.includes("/api/auth/login") ||
            url.pathname.includes("/api/auth/register")
        ) {
            return;
        }

        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(API_CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return new Response(
                        JSON.stringify({ offline: true, message: "Offline mode - data unavailable" }),
                        {
                            status: 503,
                            statusText: "Service Unavailable (Offline)",
                            headers: { "Content-Type": "application/json" }
                        }
                    );
                })
        );
        return;
    }

    // 2. Video Range Requests (for offline video playback in Chrome/Edge/Safari)
    if (request.headers.get("range") && url.pathname.endsWith(".mp4")) {
        event.respondWith(
            caches.match(request, { ignoreSearch: true }).then(async (cachedResponse) => {
                if (!cachedResponse) {
                    return fetch(request);
                }
                const rangeHeader = request.headers.get("range");
                const arrayBuffer = await cachedResponse.arrayBuffer();
                const bytes = /^bytes\=(\d+)\-(\d+)?$/g.exec(rangeHeader);
                if (bytes) {
                    const start = Number(bytes[1]);
                    const end = Number(bytes[2]) || arrayBuffer.byteLength - 1;
                    return new Response(arrayBuffer.slice(start, end + 1), {
                        status: 206,
                        statusText: "Partial Content",
                        headers: [
                            ["Content-Range", `bytes ${start}-${end}/${arrayBuffer.byteLength}`],
                            ["Content-Length", `${end - start + 1}`],
                            ["Content-Type", "video/mp4"],
                            ["Accept-Ranges", "bytes"]
                        ]
                    });
                }
                return cachedResponse;
            }).catch(() => fetch(request))
        );
        return;
    }

    // 3. Static Assets: Network-First for HTML/JS/CSS (so updates take effect immediately),
    // and Cache-First for Images/Fonts/Videos
    const isCodeAsset = url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || request.mode === "navigate";

    if (isCodeAsset) {
        // Network-First for JS, CSS, and HTML
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    const cached = await caches.match(request, { ignoreSearch: true });
                    if (cached) return cached;
                    if (request.mode === "navigate") {
                        return caches.match("./index.html", { ignoreSearch: true });
                    }
                })
        );
    } else {
        // Cache-First for Images and Media
        event.respondWith(
            caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;

                return fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    if (request.mode === "navigate") {
                        return caches.match("./index.html", { ignoreSearch: true });
                    }
                });
            })
        );
    }
});
