const CACHE_NAME = "academi-buddy-static-v3";
const API_CACHE_NAME = "academi-buddy-api-v3";

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
    "./photos/logo.png",
    "./photos/favicon-180.png",
    "./photos/favicon-32.png",
    "./photos/favicon-16.png",
    "./icons_pwa/icon-192.png",
    "./icons_pwa/icon-512.png",
    "./apple-touch-icon.png",
    "./icons/pp.png"
];

// Service Worker Kurulumu: Tüm statik varlıkları önbelleğe al
self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                STATIC_ASSETS.map((asset) =>
                    cache.add(asset).catch((err) => {
                        console.warn(`[SW] Precache failed for: ${asset}`, err);
                    })
                )
            );
        })
    );
});

// Eski önbellekleri temizle
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
                        console.log(`[SW] Deleting old cache: ${key}`);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Ağ ve Önbellek İstek Yönetimi
self.addEventListener("fetch", (event) => {
    const request = event.request;

    // Yalnızca GET isteklerini önbellekle
    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    // 1. API İstekleri: Network-First (Ağ Öncelikli, Çevrimdışında Önbellek)
    if (url.pathname.includes("/api/")) {
        // Oturum açma / kayıt olma gibi public endpoint'leri önbelleğe alma
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
                    // Ağ hatası (çevrimdışı) -> API önbelleğine bak
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) {
                        console.log(`[SW] Serving cached API: ${request.url}`);
                        return cachedResponse;
                    }

                    // Önbellekte de yoksa boş/hata JSON dön (uygulamanın çökmesini engelle)
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

    // 2. Statik Dosyalar (HTML, CSS, JS, Görseller, vb.): Cache-First with Network Revalidate
    event.respondWith(
        caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
            // Önbellekte varsa hemen sun, arka planda güncelliğini kontrol et
            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Ağ yoksa ve navigasyon isteğiyse fallback index.html dön
                    if (request.mode === "navigate") {
                        return caches.match("./index.html", { ignoreSearch: true });
                    }
                });

            return cachedResponse || fetchPromise;
        })
    );
});
