/* ─── AUTH: token storage, login/register UI, and API auth headers ────────── */

const AUTH_TOKEN_KEY = "atsToken";
const AUTH_USER_KEY = "atsUser";


/* ─── API URL ──────────────────────────────────────────────────────────────── */

/*
 * Eğer uygulama Express tarafından servis ediliyorsa:
 *
 *     http://localhost:5000
 *
 * API istekleri:
 *
 *     http://localhost:5000/api/...
 *
 * Eğer Render'da çalışıyorsa aynı domain kullanılır.
 *
 * Local geliştirmede VS Code Live Server (127.0.0.1:3000)
 * kullanıldığında backend'in 5000 portunda çalıştığını varsayıyoruz.
 */

function getApiBaseUrl() {

    const hostname = window.location.hostname;

    /*
     * Kullanıcı veya APK tarafından belirlenen özel API adresi
     */
    const customApi = localStorage.getItem("ats_custom_api_url");
    if (customApi) {
        return customApi.replace(/\/+$/, "");
    }

    /*
     * VS Code Live Server / local frontend.
     */
    if (window.location.port === "3000") {
        return `${window.location.protocol}//${hostname}:5000`;
    }

    /*
     * Sayfa zaten Express tarafından 5000 üzerinden servis ediliyorsa.
     */
    if (window.location.port === "5000") {
        return "";
    }

    /*
     * Capacitor mobil ortamı (Android APK / iOS)
     */
    const isCapacitor =
        (typeof window !== "undefined" && window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform()) ||
        window.location.protocol === "capacitor:" ||
        (window.location.protocol === "http:" && window.location.hostname === "localhost" && !window.location.port);

    if (isCapacitor) {
        return window.ATS_PROD_API_URL || "";
    }

    /*
     * Render / Vercel / production.
     * Frontend ve backend aynı domain üzerinden servis ediliyorsa relative URL kullanılır.
     */
    return "";
}


const API_BASE_URL = getApiBaseUrl();


function apiUrl(path) {
    return API_BASE_URL + path;
}


/* ─── TOKEN STORAGE ────────────────────────────────────────────────────────── */

function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}


function getStoredUser() {

    try {

        return JSON.parse(
            localStorage.getItem(AUTH_USER_KEY)
        );

    } catch (err) {

        return null;

    }
}


function setSession(token, user) {

    /*
     * Token gerçekten geldiyse kaydet.
     */
    if (token) {
        localStorage.setItem(
            AUTH_TOKEN_KEY,
            token
        );
    }


    /*
     * User gerçekten geldiyse kaydet.
     */
    if (user) {
        localStorage.setItem(
            AUTH_USER_KEY,
            JSON.stringify(user)
        );

        // Çevrimdışı oturum açabilmek için profili sakla
        try {
            const savedUsers = JSON.parse(localStorage.getItem("ats_saved_users") || "{}");
            if (user.email) {
                savedUsers[user.email.toLowerCase().trim()] = {
                    token: token || getToken(),
                    user: user,
                    savedAt: Date.now()
                };
                localStorage.setItem("ats_saved_users", JSON.stringify(savedUsers));
            }
        } catch (e) {}
    }
}


function clearSession() {

    localStorage.removeItem(
        AUTH_TOKEN_KEY
    );

    localStorage.removeItem(
        AUTH_USER_KEY
    );
}


/* ─── AUTHORIZED FETCH ─────────────────────────────────────────────────────── */

/*
 * Uygulamanın diğer API çağrılarına JWT token ekler.
 */

const originalFetch =
    window.fetch.bind(window);


window.fetch = function (input, init) {
    init = init ? Object.assign({}, init) : {};

    const url = typeof input === "string" ? input : (input && input.url) || "";
    const method = (init.method || "GET").toUpperCase();
    const isApiCall = url.includes("/api/");
    const isPublicAuthCall =
        url.includes("/api/auth/login") ||
        url.includes("/api/auth/register") ||
        url.includes("/api/auth/avatars");

    const token = getToken();

    if (token && isApiCall && !isPublicAuthCall) {
        const headers = new Headers(
            init.headers || (typeof input !== "string" ? input.headers : undefined)
        );
        headers.set("Authorization", "Bearer " + token);
        init.headers = headers;
    }

    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    // 1. Cihaz kesin olarak çevrimdışıysa mutasyon isteklerini kuyruğa al ve başarılı dön
    if (isApiCall && !isPublicAuthCall && isMutation && !navigator.onLine) {
        console.log(`[Offline Mutation] Queuing offline action: ${method} ${url}`);
        let parsedBody = null;
        try {
            parsedBody = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
        } catch (e) {}

        const syntheticId = "temp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);

        if (typeof queueOfflineAction === "function") {
            queueOfflineAction({
                url,
                method,
                body: parsedBody,
                headers: init.headers ? Object.fromEntries(new Headers(init.headers).entries()) : undefined,
                description: `${method} ${url.split("/api/")[1] || url}`
            });
        }

        if (typeof applyOptimisticOfflineMutation === "function") {
            applyOptimisticOfflineMutation(url, method, parsedBody, syntheticId);
        }

        return Promise.resolve(new Response(JSON.stringify({
            id: syntheticId,
            offline: true,
            ...(parsedBody || {})
        }), {
            status: 200,
            statusText: "OK (Offline Queued)",
            headers: { "Content-Type": "application/json" }
        }));
    }

    return originalFetch(input, init)
        .then(function (response) {
            if (response.status === 401 && isApiCall && !isPublicAuthCall) {
                clearSession();
                showAuthScreen();
            }
            return response;
        })
        .catch(function (networkErr) {
            // 2. Ağ isteği sırasında bağlantı koptuysa mutasyon işlemini yerel olarak kaydet
            if (isApiCall && !isPublicAuthCall && isMutation) {
                console.warn(`[Offline Mutation Fallback] Network failed on ${method} ${url}:`, networkErr);
                let parsedBody = null;
                try {
                    parsedBody = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
                } catch (e) {}

                const syntheticId = "temp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);

                if (typeof queueOfflineAction === "function") {
                    queueOfflineAction({
                        url,
                        method,
                        body: parsedBody,
                        headers: init.headers ? Object.fromEntries(new Headers(init.headers).entries()) : undefined,
                        description: `${method} ${url.split("/api/")[1] || url}`
                    });
                }

                if (typeof applyOptimisticOfflineMutation === "function") {
                    applyOptimisticOfflineMutation(url, method, parsedBody, syntheticId);
                }

                return new Response(JSON.stringify({
                    id: syntheticId,
                    offline: true,
                    ...(parsedBody || {})
                }), {
                    status: 200,
                    statusText: "OK (Offline Queued)",
                    headers: { "Content-Type": "application/json" }
                });
            }
            throw networkErr;
        });
};


/* ─── SCREEN SWITCHING ─────────────────────────────────────────────────────── */

function showAuthScreen() {

    const authScreen =
        document.getElementById(
            "auth-screen"
        );


    const mainLayout =
        document.getElementById(
            "mainLayout"
        );


    if (authScreen) {
        authScreen.style.display = "flex";
    }


    if (mainLayout) {
        mainLayout.style.display = "none";
    }

}


function renderSidebarUser(user) {
    if (!user) return;

    const sidebarUser = document.getElementById("sidebarUser");
    const mainLogo = document.getElementById("sidebarMainLogo");
    const logoWrapper = document.getElementById("sidebarLogoWrapper");

    if (mainLogo) {
        if (!user.avatar || user.avatar === "default" || user.avatar === "pp.png" || user.avatar === "icons/pp.png") {
            mainLogo.src = "icons/pp.png";
        } else if (user.avatar === "logo.png" || user.avatar === "photos/logo.png") {
            mainLogo.src = "photos/logo.png";
        } else {
            mainLogo.src = user.avatar.startsWith("icons/") || user.avatar.startsWith("photos/")
                ? user.avatar
                : "icons/" + user.avatar;
        }
    }

    if (logoWrapper) {
        logoWrapper.onclick = function () {
            if (typeof loadSettingsPage === "function") {
                loadSettingsPage();
            }
        };
    }

    if (sidebarUser) {
        const userName = user.name || user.email || "Student";
        const gradeText = user.gradeLevel && user.gradeLevel !== "Other" ? escapeHtml(user.gradeLevel) : "";
        const deptText = user.department ? escapeHtml(user.department) : "";

        sidebarUser.innerHTML = `
            <div class="sidebar-user-name">${escapeHtml(userName)}</div>
            ${gradeText || deptText ? `
                <div class="sidebar-user-dept">
                    ${gradeText}${gradeText && deptText ? " · " : ""}${deptText}
                </div>
            ` : ""}
        `;
    }
}

function updateCurrentUser(updatedUser) {
    if (!updatedUser) return;

    const current = getStoredUser() || {};
    const merged = { ...current, ...updatedUser };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(merged));
    renderSidebarUser(merged);
}

window.updateCurrentUser = updateCurrentUser;

function showMainApp(user) {

    const authScreen =
        document.getElementById(
            "auth-screen"
        );


    const mainLayout =
        document.getElementById(
            "mainLayout"
        );


    if (authScreen) {
        authScreen.style.display = "none";
    }


    if (mainLayout) {
        mainLayout.style.display = "flex";
    }

    renderSidebarUser(user);

    if (
        typeof window.onAuthenticated ===
        "function"
    ) {

        window.onAuthenticated();

    }

}


/* ─── ERROR HANDLING ───────────────────────────────────────────────────────── */

function setAuthError(
    elementId,
    message
) {

    const el =
        document.getElementById(
            elementId
        );


    if (el) {

        el.textContent =
            message || "";

    }

}


/*
 * Backend'den JSON gelmezse uygulamanın
 * patlamasını önler.
 */

async function readResponseData(response) {

    try {

        return await response.json();

    } catch (err) {

        return {};

    }

}


/* ─── TAB SWITCHING ────────────────────────────────────────────────────────── */

document
    .getElementById("showLoginTab")
    .addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "showLoginTab"
                )
                .classList
                .add("active");


            document
                .getElementById(
                    "showRegisterTab"
                )
                .classList
                .remove("active");


            document
                .getElementById(
                    "loginForm"
                )
                .style.display = "flex";


            document
                .getElementById(
                    "registerForm"
                )
                .style.display = "none";


            setAuthError(
                "loginError",
                ""
            );


            setAuthError(
                "registerError",
                ""
            );

        }
    );


document
    .getElementById("showRegisterTab")
    .addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "showRegisterTab"
                )
                .classList
                .add("active");


            document
                .getElementById(
                    "showLoginTab"
                )
                .classList
                .remove("active");


            document
                .getElementById(
                    "registerForm"
                )
                .style.display = "flex";


            document
                .getElementById(
                    "loginForm"
                )
                .style.display = "none";


            setAuthError(
                "loginError",
                ""
            );


            setAuthError(
                "registerError",
                ""
            );

        }
    );


/* ─── EMAIL AUTO-TRIM HELPER ─────────────────────────────────────────────── */
["loginEmail", "registerEmail"].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
        if (this.value.startsWith(" ") || this.value.endsWith(" ")) {
            this.value = this.value.trim();
        }
    });
    el.addEventListener("blur", function () {
        this.value = this.value.trim();
    });
});

document.getElementById("loginSubmitBtn")?.addEventListener("click", function () {
    const el = document.getElementById("loginEmail");
    if (el) el.value = el.value.trim();
});

document.getElementById("registerSubmitBtn")?.addEventListener("click", function () {
    const el = document.getElementById("registerEmail");
    if (el) el.value = el.value.trim();
});

/* ─── LOGIN ────────────────────────────────────────────────────────────────── */

document
    .getElementById("loginForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            setAuthError(
                "loginError",
                ""
            );


            /*
             * Email'i standartlaştır.
             */

            const email =
                document
                    .getElementById(
                        "loginEmail"
                    )
                    .value
                    .trim()
                    .toLowerCase();


            const password =
                document
                    .getElementById(
                        "loginPassword"
                    )
                    .value;


            const submitBtn =
                document.getElementById(
                    "loginSubmitBtn"
                );


            if (!email) {

                setAuthError(
                    "loginError",
                    "Please enter your email address."
                );

                return;

            }


            if (!password) {
                setAuthError(
                    "loginError",
                    "Please enter your password."
                );
                return;
            }

            // Çevrimdışı Modda Oturum Açma Desteği
            if (!navigator.onLine) {
                try {
                    const savedUsers = JSON.parse(localStorage.getItem("ats_saved_users") || "{}");
                    const cached = savedUsers[email.toLowerCase().trim()];
                    if (cached && cached.token && cached.user) {
                        console.log("[Auth] Offline sign-in with cached profile:", cached.user);
                        setSession(cached.token, cached.user);
                        showMainApp(cached.user);
                        if (typeof window.showOfflineIndicator === "function") {
                            window.showOfflineIndicator(true);
                        }
                        if (typeof showToast === "function") {
                            showToast("Signed in offline with cached profile.", "success");
                        }
                        event.target.reset();
                        return;
                    }
                } catch (e) {}
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Logging in...";

            try {
                // 5 saniyelik timeout controller ekle ki çevrimdışında sonsuza kadar "Logging in..." kalmasın
                const abortController = new AbortController();
                const timeoutId = setTimeout(() => abortController.abort(), 6000);

                const response =
                    await originalFetch(
                        apiUrl(
                            "/api/auth/login"
                        ),
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                email,
                                password
                            }),
                            signal: abortController.signal
                        }
                    );

                clearTimeout(timeoutId);

                const data =
                    await readResponseData(
                        response
                    );

                if (!response.ok) {
                    if (response.status === 401) {
                        setAuthError(
                            "loginError",
                            "Invalid email or password."
                        );
                    } else if (response.status === 400) {
                        setAuthError(
                            "loginError",
                            data.message ||
                            "Please check your information."
                        );
                    } else {
                        setAuthError(
                            "loginError",
                            data.message ||
                            "An error occurred. Please try again."
                        );
                    }
                    return;
                }

                if (!data.token || !data.user) {
                    setAuthError(
                        "loginError",
                        "Login response was invalid. Please try again."
                    );
                    return;
                }

                setSession(
                    data.token,
                    data.user
                );

                showMainApp(
                    data.user
                );

                event.target.reset();

            } catch (err) {
                console.error(
                    "Login error:",
                    err
                );

                // Ağ hatası veya timeout durumunda son çare olarak kayıtlı profili kontrol et
                try {
                    const savedUsers = JSON.parse(localStorage.getItem("ats_saved_users") || "{}");
                    const cached = savedUsers[email.toLowerCase().trim()];
                    if (cached && cached.token && cached.user) {
                        console.log("[Auth] Network fallback: logging in with cached credentials:", cached.user);
                        setSession(cached.token, cached.user);
                        showMainApp(cached.user);
                        if (typeof window.showOfflineIndicator === "function") {
                            window.showOfflineIndicator(true);
                        }
                        if (typeof showToast === "function") {
                            showToast("Signed in offline with cached profile.", "success");
                        }
                        event.target.reset();
                        return;
                    }
                } catch (e) {}

                setAuthError(
                    "loginError",
                    !navigator.onLine
                        ? "You are offline. To sign in offline, please log in with your account while online at least once."
                        : "Could not reach the server. Please try again."
                );

            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Log In";
            }

        }
    );


/* ─── REGISTER ─────────────────────────────────────────────────────────────── */

document
    .getElementById("registerForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            setAuthError(
                "registerError",
                ""
            );


            const name =
                document
                    .getElementById(
                        "registerName"
                    )
                    .value
                    .trim();


            const email =
                document
                    .getElementById(
                        "registerEmail"
                    )
                    .value
                    .trim()
                    .toLowerCase();


            const password =
                document
                    .getElementById(
                        "registerPassword"
                    )
                    .value;


            const gradeLevel =
                document
                    .getElementById(
                        "registerGrade"
                    )
                    ? document.getElementById("registerGrade").value
                    : "";

            const department =
                document
                    .getElementById(
                        "registerDepartment"
                    )
                    ? document.getElementById("registerDepartment").value.trim()
                    : "";

            const submitBtn =
                document.getElementById(
                    "registerSubmitBtn"
                );


            if (!name) {

                setAuthError(
                    "registerError",
                    "Please enter your full name."
                );

                return;

            }


            if (!email) {

                setAuthError(
                    "registerError",
                    "Please enter your email address."
                );

                return;

            }

            if (!gradeLevel) {

                setAuthError(
                    "registerError",
                    "Please select your class / grade."
                );

                return;

            }


            if (password.length < 6) {

                setAuthError(
                    "registerError",
                    "Password must be at least 6 characters long."
                );

                return;

            }


            submitBtn.disabled = true;

            submitBtn.textContent =
                "Creating account...";


            try {

                const response =
                    await originalFetch(
                        apiUrl(
                            "/api/auth/register"
                        ),
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                name,
                                email,
                                password,
                                gradeLevel,
                                department: department || "",
                                avatar: "default"
                            })
                        }
                    );


                const data =
                    await readResponseData(
                        response
                    );


                /*
                 * Email zaten kayıtlıysa
                 * backend'in mesajını göster.
                 */

                if (!response.ok) {

                    if (
                        data.message ===
                        "This email is already registered."
                    ) {

                        setAuthError(
                            "registerError",
                            "This email is already registered."
                        );

                    } else {

                        setAuthError(
                            "registerError",
                            data.message ||
                            "Registration failed. Please try again."
                        );

                    }

                    return;

                }


                /*
                 * ÖNEMLİ:
                 *
                 * Mevcut backend register endpoint'in
                 * sadece user bilgisi döndürüyor olabilir.
                 *
                 * Bu durumda token yoksa otomatik login
                 * yapmıyoruz.
                 */

                if (
                    data.token &&
                    data.user
                ) {

                    setSession(
                        data.token,
                        data.user
                    );


                    showMainApp(
                        data.user
                    );


                    event.target.reset();

                    return;

                }


                /*
                 * Register başarılı fakat backend
                 * token döndürmüyorsa login ekranına
                 * geçiyoruz.
                 */

                event.target.reset();


                setAuthError(
                    "registerError",
                    "Account created successfully. Please log in."
                );


                /*
                 * Login sekmesine geç.
                 */

                document
                    .getElementById(
                        "showLoginTab"
                    )
                    .click();


                /*
                 * Kullanıcının emailini login
                 * ekranına aktar.
                 */

                document
                    .getElementById(
                        "loginEmail"
                    )
                    .value = email;


            } catch (err) {

                console.error(
                    "Register error:",
                    err
                );


                setAuthError(
                    "registerError",
                    "Could not reach the server. Please try again."
                );


            } finally {

                submitBtn.disabled = false;

                submitBtn.textContent =
                    "Create Account";

            }

        }
    );


/* ─── LOGOUT ───────────────────────────────────────────────────────────────── */

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        function () {

            clearSession();

            showAuthScreen();

        }
    );


/* ─── SESSION CHECK ON LOAD ────────────────────────────────────────────────── */

async function initAuth() {

    let token = getToken();
    let storedUser = getStoredUser();

    // Çevrimdışı açılışta aktif token olmasa bile bu cihazda daha önce oturum açmış kullanıcıyı aç
    if ((!token || !storedUser) && !navigator.onLine) {
        try {
            const savedUsers = JSON.parse(localStorage.getItem("ats_saved_users") || "{}");
            const emails = Object.keys(savedUsers);
            if (emails.length > 0) {
                const last = savedUsers[emails[emails.length - 1]];
                if (last && last.user) {
                    console.log("[Auth] Restoring offline session from cached user:", last.user);
                    token = last.token || "offline_token";
                    storedUser = last.user;
                    setSession(token, storedUser);
                }
            }
        } catch (e) {}
    }

    if (!token) {
        showAuthScreen();
        return;
    }


    /*
     * Doğrudan tarayıcı çevrimdışı ise ve kayıtlı kullanıcı varsa direkt uygulamayı aç
     */
    if (!navigator.onLine && storedUser) {

        console.log("[Auth] Offline mode detected on load: logging in with cached session.");

        showMainApp(storedUser);

        if (typeof window.showOfflineIndicator === "function") {
            window.showOfflineIndicator(true);
        }

        return;

    }


    try {

        const response =
            await originalFetch(
                apiUrl(
                    "/api/auth/me"
                ),
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );


        if (!response.ok) {

            // Sadece 401/403 durumunda oturum geçersizdir
            if (response.status === 401 || response.status === 403) {
                clearSession();
                showAuthScreen();
                return;
            }

            // Diğer sunucu/servis hatalarında (500, 502, 503 veya SW çevrimdışı yanıtı)
            if (storedUser) {
                console.warn("[Auth] Server responded with error, falling back to cached user:", response.status);
                showMainApp(storedUser);
                if (typeof window.showOfflineIndicator === "function") {
                    window.showOfflineIndicator(true);
                }
                return;
            }

            clearSession();

            showAuthScreen();

            return;

        }


        const user =
            await response.json();


        setSession(
            token,
            user
        );


        showMainApp(
            user
        );


    } catch (err) {

        console.warn(
            "[Auth] Session check failed (offline or network error):",
            err
        );


        /*
         * Server geçici olarak ulaşılmazsa veya cihaz çevrimdışıysa
         * mevcut kayıtlı oturumla devam et.
         */
        if (storedUser) {
            console.log("[Auth] Continuing in offline mode with cached user data");
            showMainApp(storedUser);
            if (typeof window.showOfflineIndicator === "function") {
                window.showOfflineIndicator(true);
            }
            return;
        }

        showAuthScreen();

    }

}


/* ─── START AUTH ───────────────────────────────────────────────────────────── */

document.addEventListener(
    "DOMContentLoaded",
    initAuth
);