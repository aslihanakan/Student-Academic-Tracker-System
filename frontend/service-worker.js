const CACHE_NAME = "academi-buddy-static-v37";

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
    "./js/i18n.js",
    "./js/auth.js",
    "./js/common.js",
    "./js/courses.js",
    "./js/exams.js",
    "./js/dashboard.js",
    "./js/study.js",
    "./js/aiCoach.js",
    "./js/buddies.js",
    "./js/settings.js",
    "./js/main.js",
    "./videos/login-background.mp4",
    "./videos/default.mp4",
    "./videos/spring.mp4",
    "./videos/spring.gif",
    "./videos/spring_cat.mp4",
    "./videos/summer_cat.mp4",
    "./videos/summer_cat.gif",
    "./videos/autumn_cat.mp4",
    "./videos/winter_cat.mp4",
    "./videos/motivation.mp4",
    "./photos/ai.jpg",
    "./photos/spring.jpg",
    "./photos/summer.jpg",
    "./photos/autumn.jpg",
    "./photos/winter.jpg",
    "./photos/summer_tree_sidebar.svg",
    "./photos/summer_tree_topbar.svg",
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

// Clear old cache versions on activate: Delete ALL old caches so stale versions never ghost back
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
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

    // 1. API Requests: Pass directly to network!
    if (url.pathname.includes("/api/")) {
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

    // 3. Static Assets & App Navigation
    const isNavigate = request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");

    event.respondWith(
        (async () => {
            // When online: Network-First to guarantee newest code is loaded immediately
            if (navigator.onLine) {
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone);
                        });
                        return networkResponse;
                    }
                } catch (netErr) {
                    // Fall back to cache on network drop
                }
            }

            // Offline or network error: return cached copy immediately!
            const cached = await findInCaches(request, isNavigate);
            if (cached) {
                return cached;
            }

            // Not in cache: attempt one last network fetch
            try {
                const netRes = await fetch(request);
                if (netRes && netRes.status === 200) {
                    const clone = netRes.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return netRes;
                }
            } catch (e) {
                if (isNavigate) {
                    const fallbackHtml = await findInCaches(new Request("./index.html"), true);
                    if (fallbackHtml) return fallbackHtml;
                }
            }

            return new Response("App is loading...", {
                status: 200,
                headers: { "Content-Type": "text/html" }
            });
        })()
    );
});
