const CACHE_NAME = "academi-buddy-static-v9";
const API_CACHE_NAME = "academi-buddy-api-v9";

const STATIC_ASSETS = [
    "./",
    "./index.html",
    "index.html",
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

// Helper: Safely look up a request in current and ANY existing cache
async function findInCaches(request, isNavigate = false) {
    // 1. Direct match with ignoreSearch
    try {
        const direct = await caches.match(request, { ignoreSearch: true });
        if (direct) return direct;
    } catch (e) {}

    // 2. If it's a navigation or HTML request, check all candidate paths
    if (isNavigate) {
        const candidates = ["./index.html", "index.html", "./", "/index.html", "/"];
        for (const candidate of candidates) {
            try {
                const match = await caches.match(candidate, { ignoreSearch: true });
                if (match) return match;
            } catch (e) {}
        }
    }

    // 3. Fallback: Search across ALL opened cache stores on device
    try {
        const keyList = await caches.keys();
        for (const key of keyList) {
            const c = await caches.open(key);
            const res = await c.match(request, { ignoreSearch: true });
            if (res) return res;

            if (isNavigate) {
                const idx = (await c.match("./index.html", { ignoreSearch: true })) ||
                            (await c.match("index.html", { ignoreSearch: true })) ||
                            (await c.match("./", { ignoreSearch: true }));
                if (idx) return idx;
            }
        }
    } catch (e) {}

    return null;
}

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

// Clear old cache versions on activate, preserving recent caches as safety net
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    // Do not purge v8 or v7 immediately to prevent black screen if offline
                    if (
                        key !== CACHE_NAME &&
                        key !== API_CACHE_NAME &&
                        !key.includes("v8") &&
                        !key.includes("v7")
                    ) {
                        console.log(`[SW] Purging legacy cache: ${key}`);
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
            findInCaches(request).then(async (cachedResponse) => {
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

    // 3. Static Assets & App Navigation (App Shell)
    const isNavigate = request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");

    event.respondWith(
        (async () => {
            // First check if asset is in cache (Instant load & 100% offline guarantee)
            const cached = await findInCaches(request, isNavigate);

            // Fetch in background (or foreground if cache miss)
            const networkPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => null);

            // If we have a cached copy, return it immediately!
            if (cached) {
                return cached;
            }

            // Not in cache: wait for network response
            const netRes = await networkPromise;
            if (netRes) return netRes;

            // Both cache and network failed:
            if (isNavigate) {
                const fallbackHtml = await findInCaches(new Request("./index.html"), true);
                if (fallbackHtml) return fallbackHtml;
            }

            // Fallback response instead of undefined to avoid browser blank screen
            return new Response("App is loading...", {
                status: 200,
                headers: { "Content-Type": "text/html" }
            });
        })()
    );
});
