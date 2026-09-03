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

const ATS_CREDENTIALS_KEY = "ats_saved_credentials";

async function hashOfflinePassword(email, password) {
    const cleanEmail = (email || "").toLowerCase().trim();
    const text = `${cleanEmail}::ats_secure_salt::${password}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function saveOfflineCredentials(email, token, user, passwordHash) {
    try {
        const creds = JSON.parse(localStorage.getItem(ATS_CREDENTIALS_KEY) || "{}");
        const key = (email || "").toLowerCase().trim();
        if (key) {
            creds[key] = {
                token,
                user,
                passwordHash,
                savedAt: Date.now()
            };
            localStorage.setItem(ATS_CREDENTIALS_KEY, JSON.stringify(creds));
        }
    } catch (e) {}
}

function getStoredOfflineCredential(email) {
    try {
        const creds = JSON.parse(localStorage.getItem(ATS_CREDENTIALS_KEY) || "{}");
        const key = (email || "").toLowerCase().trim();
        return creds[key] || null;
    } catch (e) {
        return null;
    }
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
        url.includes("/api/auth/forgot-password") ||
        url.includes("/api/auth/verify-reset-code") ||
        url.includes("/api/auth/reset-password") ||
        url.includes("/api/auth/reset-password-by-account") ||
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
        mainLogo.src = typeof getAvatarSrc === "function"
            ? getAvatarSrc(user.avatar)
            : ((!user.avatar || user.avatar === "default" || user.avatar === "pp.png") ? "icons/pp.png" : (user.avatar.startsWith("icons/") || user.avatar.startsWith("photos/") || user.avatar.startsWith("data:") ? user.avatar : "icons/" + user.avatar));
    }

    if (logoWrapper) {
        logoWrapper.onclick = function () {
            if (typeof loadSettingsPage === "function") {
                loadSettingsPage();
            }
        };
    }

    if (sidebarUser) {
        const userName = user.name || user.email || (typeof t === "function" ? t("grade_student", "Student") : "Student");
        const localizedGrade = typeof formatLocalizedGradeLevel === "function" ? formatLocalizedGradeLevel(user.gradeLevel) : user.gradeLevel;
        const localizedDept = typeof formatLocalizedDepartment === "function" ? formatLocalizedDepartment(user.department) : user.department;
        const otherKeywords = ["other", "diğer", "sonstiges", "otro", "autre", "altro", "другое", "기타", "その他", "أخرى"];
        const isOther = otherKeywords.includes(String(user.gradeLevel || "").toLowerCase());
        const gradeText = user.gradeLevel && !isOther ? escapeHtml(localizedGrade) : "";
        const deptText = user.department ? escapeHtml(localizedDept) : "";

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

            // Çevrimdışı Modda Güvenli Giriş: Şifre karmasını (hash) doğrula
            if (!navigator.onLine) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Logging in...";
                try {
                    const record = getStoredOfflineCredential(email);
                    if (!record || !record.passwordHash) {
                        setAuthError(
                            "loginError",
                            "No offline account found on this device. Please connect to the internet and sign in once."
                        );
                        return;
                    }

                    const enteredHash = await hashOfflinePassword(email, password);
                    if (enteredHash !== record.passwordHash) {
                        setAuthError("loginError", "Invalid email or password.");
                        return;
                    }

                    // Şifre doğrulandı, güvenli oturum aç
                    setSession(record.token, record.user);
                    showMainApp(record.user);
                    if (typeof window.showOfflineIndicator === "function") {
                        window.showOfflineIndicator(true);
                    }
                    if (typeof showToast === "function") {
                        showToast(`Signed in offline. Welcome back, ${record.user.name || "Student"}!`, "success");
                    }
                    event.target.reset();
                    return;
                } catch (err) {
                    console.error("Offline login error:", err);
                    setAuthError("loginError", "Offline sign-in failed. Please try again.");
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Log In";
                }
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Logging in...";

            try {
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

                // Çevrimdışı şifreli giriş için parola karmasını güvenli kaydet
                try {
                    const passwordHash = await hashOfflinePassword(email, password);
                    saveOfflineCredentials(email, data.token, data.user, passwordHash);
                } catch (hashErr) {
                    console.warn("[Auth] Failed to cache offline password hash:", hashErr);
                }

                showMainApp(
                    data.user
                );

                event.target.reset();

            } catch (err) {
                console.warn(
                    "[Auth] Network login failed, checking offline credentials:",
                    err
                );

                try {
                    const record = getStoredOfflineCredential(email);
                    if (record && record.passwordHash) {
                        const enteredHash = await hashOfflinePassword(email, password);
                        if (enteredHash === record.passwordHash) {
                            setSession(record.token, record.user);
                            showMainApp(record.user);
                            if (typeof window.showOfflineIndicator === "function") {
                                window.showOfflineIndicator(true);
                            }
                            if (typeof showToast === "function") {
                                showToast(`Signed in offline. Welcome back, ${record.user.name || "Student"}!`, "success");
                            }
                            event.target.reset();
                            return;
                        } else {
                            setAuthError("loginError", "Invalid email or password.");
                            return;
                        }
                    }
                } catch (e) {}

                setAuthError("loginError", "Could not reach the server. Please check your internet connection.");

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

    const token = getToken();
    const storedUser = getStoredUser();

    // 1. OTURUM AÇIK BIRAKILMADIYSA (Kullanıcı çıkış yaptıysa veya oturum yoksa):
    // İster çevrimiçi ister çevrimdışı olsun, doğrudan içeri alma; giriş ekranını göster!
    if (!token || !storedUser) {
        showAuthScreen();
        return;
    }

    // 2. OTURUM AÇIK BIRAKILDIYSA VE ÇEVRİMDIŞIYSA:
    // Mevcut açık oturumla güvenle devam et
    if (!navigator.onLine) {
        console.log("[Auth] Session left open: continuing in offline mode with:", storedUser);
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
                if (!navigator.onLine && typeof window.showOfflineIndicator === "function") {
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

        if (typeof window.showOfflineIndicator === "function") {
            window.showOfflineIndicator(false);
        }


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
            if (!navigator.onLine && typeof window.showOfflineIndicator === "function") {
                window.showOfflineIndicator(true);
            }
            return;
        }

        showAuthScreen();

    }

}


/* ─── FORGOT / RESET PASSWORD UI ─────────────────────────────────────────── */

let resetTimerInterval = null;
let resetTimerSeconds = 900; // 15 minutes
let currentResetEmail = "";

function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.type = (field.type === "password") ? "text" : "password";
}
window.togglePasswordVisibility = togglePasswordVisibility;

function setRecoveryStep(stepNum) {
    const dot1 = document.getElementById("stepDot1");
    const dot2 = document.getElementById("stepDot2");
    const dot3 = document.getElementById("stepDot3");

    if (dot1 && dot2 && dot3) {
        dot1.style.width = stepNum === 1 ? "28px" : "12px";
        dot1.style.background = stepNum >= 1 ? "#2563eb" : "#e2e8f0";

        dot2.style.width = stepNum === 2 ? "28px" : "12px";
        dot2.style.background = stepNum >= 2 ? "#2563eb" : "#e2e8f0";

        dot3.style.width = stepNum === 3 ? "28px" : "12px";
        dot3.style.background = stepNum === 3 ? "#16a34a" : "#e2e8f0";
    }
}

function clearResetPasswordInputs() {
    const codeInput = document.getElementById("resetCodeInput");
    const newPassInput = document.getElementById("resetNewPassword");
    const confirmPassInput = document.getElementById("resetConfirmPassword");
    const err2 = document.getElementById("forgotError2");
    const bar = document.getElementById("codeStrengthBar");
    const label = document.getElementById("codeStrengthLabel");
    const badge = document.getElementById("codeMatchBadge");

    if (codeInput) codeInput.value = "";
    if (newPassInput) newPassInput.value = "";
    if (confirmPassInput) confirmPassInput.value = "";
    if (err2) { err2.style.display = "none"; err2.textContent = ""; }
    if (bar) { bar.style.width = "0%"; bar.style.background = "#e2e8f0"; }
    if (label) { 
        label.textContent = typeof t === "function" ? t("auth_strength_weak", "Weak") : "Weak"; 
        label.style.color = "#94a3b8"; 
    }
    if (badge) { badge.style.display = "none"; badge.textContent = ""; }
}
window.clearResetPasswordInputs = clearResetPasswordInputs;

function goToStep1Email() {
    const emailStep1 = document.getElementById("forgotStep1");
    const step2 = document.getElementById("forgotStep2");
    const step3 = document.getElementById("forgotStep3");

    if (emailStep1) emailStep1.style.display = "block";
    if (step2) step2.style.display = "none";
    if (step3) step3.style.display = "none";

    setRecoveryStep(1);
    clearResetPasswordInputs();

    const forgotEmail = document.getElementById("forgotEmail");
    if (forgotEmail) {
        forgotEmail.focus();
    }
}
window.goToStep1Email = goToStep1Email;

function updatePasswordStrengthMeter(inputId, barId, labelId) {
    const input = document.getElementById(inputId);
    const bar = document.getElementById(barId);
    const label = document.getElementById(labelId);
    if (!input || !bar || !label) return;

    const val = input.value;
    let score = 0;

    if (val.length >= 6) score += 30;
    if (val.length >= 8) score += 20;
    if (/[A-Z]/.test(val)) score += 15;
    if (/[0-9]/.test(val)) score += 15;
    if (/[^A-Za-z0-9]/.test(val)) score += 20;

    const weakText = typeof t === "function" ? t("auth_strength_weak", "Weak") : "Weak";
    const medText = typeof t === "function" ? t("auth_strength_medium", "Medium") : "Medium";
    const strongText = typeof t === "function" ? t("auth_strength_strong", "Strong 💪") : "Strong 💪";

    if (val.length === 0) {
        bar.style.width = "0%";
        bar.style.background = "#e2e8f0";
        label.textContent = weakText;
        label.style.color = "#94a3b8";
    } else if (score < 50) {
        bar.style.width = "33%";
        bar.style.background = "#ef4444";
        label.textContent = weakText;
        label.style.color = "#ef4444";
    } else if (score < 80) {
        bar.style.width = "66%";
        bar.style.background = "#f59e0b";
        label.textContent = medText;
        label.style.color = "#f59e0b";
    } else {
        bar.style.width = "100%";
        bar.style.background = "#10b981";
        label.textContent = strongText;
        label.style.color = "#10b981";
    }
}
window.updatePasswordStrengthMeter = updatePasswordStrengthMeter;

function checkPasswordMatch(newPassId, confirmPassId, badgeId) {
    const newPass = document.getElementById(newPassId);
    const confirmPass = document.getElementById(confirmPassId);
    const badge = document.getElementById(badgeId);
    if (!newPass || !confirmPass || !badge) return;

    if (!confirmPass.value) {
        badge.style.display = "none";
        return;
    }

    badge.style.display = "block";
    if (newPass.value === confirmPass.value) {
        badge.textContent = typeof t === "function" ? t("auth_passwords_match", "✓ Passwords match") : "✓ Passwords match";
        badge.style.color = "#16a34a";
    } else {
        badge.textContent = typeof t === "function" ? t("auth_passwords_dont_match", "✗ Passwords do not match yet") : "✗ Passwords do not match yet";
        badge.style.color = "#ef4444";
    }
}
window.checkPasswordMatch = checkPasswordMatch;

function openForgotPasswordModal() {
    const modal = document.getElementById("forgotPasswordModal");
    if (!modal) return;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Show Step 1 and clear previous inputs
    goToStep1Email();

    const err1 = document.getElementById("forgotError1");
    if (err1) { err1.style.display = "none"; err1.textContent = ""; }

    // Pre-fill email from login form if present
    const loginEmail = document.getElementById("loginEmail");
    const forgotEmail = document.getElementById("forgotEmail");
    if (loginEmail && forgotEmail && loginEmail.value) {
        forgotEmail.value = loginEmail.value.trim();
    }

    updateForgotPasswordModalTranslations();
}
window.openForgotPasswordModal = openForgotPasswordModal;

function closeForgotPasswordModal() {
    const modal = document.getElementById("forgotPasswordModal");
    if (!modal) return;

    modal.style.display = "none";
    document.body.style.overflow = "";

    clearResetPasswordInputs();

    if (resetTimerInterval) {
        clearInterval(resetTimerInterval);
        resetTimerInterval = null;
    }
}
window.closeForgotPasswordModal = closeForgotPasswordModal;

function updateForgotPasswordModalTranslations() {
    const linkBtn = document.getElementById("forgotPasswordLinkBtn");
    if (linkBtn) linkBtn.textContent = typeof t === "function" ? t("auth_forgot_password_link", "Forgot Password?") : "Forgot Password?";

    const t1 = document.getElementById("forgotTitleStep1");
    if (t1) t1.textContent = typeof t === "function" ? t("auth_forgot_title", "Reset Password") : "Reset Password";

    const d1 = document.getElementById("forgotDescStep1");
    if (d1) d1.textContent = typeof t === "function" ? t("auth_forgot_subtitle_step1", "Enter your registered email address to receive a 6-digit verification code.") : "Enter your registered email address to receive a 6-digit verification code.";

    const el1 = document.getElementById("forgotEmailLabel");
    if (el1) el1.textContent = typeof t === "function" ? t("email_label", "Email Address") : "Email Address";

    const btn1 = document.getElementById("forgotSendBtn");
    if (btn1) btn1.textContent = typeof t === "function" ? t("auth_send_code_btn", "Send Verification Code") : "Send Verification Code";

    const t2 = document.getElementById("forgotTitleStep2");
    if (t2) t2.textContent = typeof t === "function" ? t("auth_forgot_title", "Reset Password") : "Reset Password";

    const d2 = document.getElementById("forgotDescStep2");
    if (d2) d2.textContent = typeof t === "function" ? t("auth_forgot_subtitle_step2", "Enter the 6-digit code sent to your email and set your new password.") : "Enter the 6-digit code sent to your email and set your new password.";

    const changeEmailBtn = document.getElementById("forgotChangeEmailBtn");
    if (changeEmailBtn) changeEmailBtn.textContent = typeof t === "function" ? t("auth_change_email", "Change") : "Change";

    const cl = document.getElementById("resetCodeLabel");
    if (cl) cl.textContent = typeof t === "function" ? t("auth_code_label", "6-Digit Verification Code") : "6-Digit Verification Code";

    const npl = document.getElementById("resetNewPassLabel");
    if (npl) npl.textContent = typeof t === "function" ? t("auth_new_password_label", "New Password") : "New Password";

    const npInput = document.getElementById("resetNewPassword");
    if (npInput) npInput.placeholder = typeof t === "function" ? t("auth_new_pass_ph", "At least 6 characters") : "At least 6 characters";

    const cpl = document.getElementById("resetConfirmPassLabel");
    if (cpl) cpl.textContent = typeof t === "function" ? t("auth_confirm_password_label", "Confirm New Password") : "Confirm New Password";

    const cpInput = document.getElementById("resetConfirmPassword");
    if (cpInput) cpInput.placeholder = typeof t === "function" ? t("auth_confirm_pass_ph", "Re-enter new password") : "Re-enter new password";

    const btn2 = document.getElementById("forgotSubmitBtn");
    if (btn2) btn2.textContent = typeof t === "function" ? t("auth_reset_btn", "Update Password") : "Update Password";

    const resendBtn = document.getElementById("resendCodeBtn");
    if (resendBtn) resendBtn.textContent = typeof t === "function" ? t("auth_resend_code", "Resend Code") : "Resend Code";

    const st = document.getElementById("forgotSuccessTitle");
    if (st) st.textContent = typeof t === "function" ? t("auth_password_reset_success", "Password updated successfully!") : "Password updated successfully!";

    const sd = document.getElementById("forgotSuccessDesc");
    if (sd) sd.textContent = typeof t === "function" ? t("auth_success_auto_login", "You are being logged in automatically, please wait...") : "You are being logged in automatically, please wait...";

    const sb = document.getElementById("forgotSuccessBtn");
    if (sb) sb.textContent = typeof t === "function" ? t("auth_continue_app", "Continue to App ➔") : "Continue to App ➔";
}
window.updateForgotPasswordModalTranslations = updateForgotPasswordModalTranslations;

function startResetCountdown() {
    if (resetTimerInterval) {
        clearInterval(resetTimerInterval);
    }
    resetTimerSeconds = 900; // 15 mins

    const timerEl = document.getElementById("resetTimerSpan");
    function updateDisplay() {
        const m = Math.floor(resetTimerSeconds / 60);
        const s = resetTimerSeconds % 60;
        const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        if (timerEl) {
            timerEl.textContent = `⏳ ${timeStr}`;
        }
    }
    updateDisplay();

    resetTimerInterval = setInterval(() => {
        resetTimerSeconds--;
        if (resetTimerSeconds <= 0) {
            clearInterval(resetTimerInterval);
            resetTimerInterval = null;
            if (timerEl) {
                timerEl.textContent = typeof t === "function" ? t("auth_code_expired_note", "⚠️ Code has expired") : "⚠️ Code has expired";
            }
        } else {
            updateDisplay();
        }
    }, 1000);
}

async function handleSendResetCode() {
    const emailInput = document.getElementById("forgotEmail");
    const errEl = document.getElementById("forgotError1");
    const sendBtn = document.getElementById("forgotSendBtn");

    if (!emailInput || !emailInput.value.trim()) return;
    const email = emailInput.value.trim();
    currentResetEmail = email;

    if (errEl) errEl.style.display = "none";
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = typeof t === "function" ? t("common_loading", "Sending...") : "Sending...";
    }

    try {
        const res = await fetch(apiUrl("/api/auth/forgot-password"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to send reset code.");
        }

        if (typeof showToast === "function") {
            showToast(typeof t === "function" ? t("auth_code_sent_toast", "Verification code sent to your email.") : "Verification code sent to your email.", "success");
        }

        // Switch to Step 2 and ALWAYS clear any previous inputs
        document.getElementById("forgotStep1").style.display = "none";
        document.getElementById("forgotStep2").style.display = "block";
        setRecoveryStep(2);
        clearResetPasswordInputs();

        const emailDisplay = document.getElementById("forgotTargetEmailDisplay");
        if (emailDisplay) {
            if (data.previewUrl) {
                emailDisplay.innerHTML = `${escapeHtml(email)} &nbsp;·&nbsp; <a href="${data.previewUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:800; text-decoration:underline;">📬 Gelen E-postayı Aç ↗</a>`;
            } else {
                emailDisplay.textContent = email;
            }
        }

        startResetCountdown();

        const codeInput = document.getElementById("resetCodeInput");
        if (codeInput) {
            codeInput.value = "";
            codeInput.focus();
        }

    } catch (err) {
        if (errEl) {
            errEl.textContent = err.message || "Failed to send reset code.";
            errEl.style.display = "block";
        }
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = typeof t === "function" ? t("auth_send_code_btn", "Send Verification Code") : "Send Verification Code";
        }
    }
}
window.handleSendResetCode = handleSendResetCode;

async function handleResendResetCode() {
    if (!currentResetEmail) return;
    const resendBtn = document.getElementById("resendCodeBtn");
    if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.style.opacity = "0.5";
    }

    try {
        const res = await fetch(apiUrl("/api/auth/forgot-password"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: currentResetEmail })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to resend code.");
        }

        if (typeof showToast === "function") {
            showToast(typeof t === "function" ? t("auth_code_sent_toast", "Verification code sent to your email.") : "Verification code sent to your email.", "success");
        }
        startResetCountdown();
        clearResetPasswordInputs();
    } catch (err) {
        if (typeof showToast === "function") {
            showToast(err.message, "error");
        }
    } finally {
        setTimeout(() => {
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.style.opacity = "1";
            }
        }, 3000);
    }
}
window.handleResendResetCode = handleResendResetCode;

async function handleResetPasswordSubmit() {
    const codeInput = document.getElementById("resetCodeInput");
    const newPassInput = document.getElementById("resetNewPassword");
    const confirmPassInput = document.getElementById("resetConfirmPassword");
    const errEl = document.getElementById("forgotError2");
    const submitBtn = document.getElementById("forgotSubmitBtn");

    if (!codeInput || !newPassInput || !confirmPassInput) return;

    const code = codeInput.value.trim();
    const newPassword = newPassInput.value;
    const confirmPassword = confirmPassInput.value;

    if (errEl) errEl.style.display = "none";

    if (newPassword !== confirmPassword) {
        if (errEl) {
            errEl.textContent = typeof t === "function" ? t("auth_passwords_mismatch", "Passwords do not match.") : "Passwords do not match.";
            errEl.style.display = "block";
        }
        return;
    }

    if (newPassword.length < 6) {
        if (errEl) {
            errEl.textContent = typeof t === "function" ? t("toast_pass_min_length", "New password must be at least 6 characters long.") : "New password must be at least 6 characters long.";
            errEl.style.display = "block";
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = typeof t === "function" ? t("common_loading", "Updating...") : "Updating...";
    }

    try {
        const res = await fetch(apiUrl("/api/auth/reset-password"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: currentResetEmail,
                code: code,
                newPassword: newPassword
            })
        });
        const data = await res.json();

        if (!res.ok) {
            let errorMsg = data.message || "Failed to reset password.";
            if (errorMsg === "NEW_PASSWORD_SAME_AS_OLD" || errorMsg.includes("eski şifrenizle aynı olamaz") || errorMsg.includes("same as your old password")) {
                errorMsg = typeof t === "function" ? t("auth_password_same_as_old", "Yeni şifreniz eski şifrenizle aynı olamaz. Lütfen farklı bir şifre belirleyin.") : "Yeni şifreniz eski şifrenizle aynı olamaz. Lütfen farklı bir şifre belirleyin.";
            }
            throw new Error(errorMsg);
        }

        if (resetTimerInterval) {
            clearInterval(resetTimerInterval);
            resetTimerInterval = null;
        }

        // Show step 3 (Success)
        document.getElementById("forgotStep2").style.display = "none";
        document.getElementById("forgotStep3").style.display = "block";
        setRecoveryStep(3);

        if (typeof showToast === "function") {
            showToast("🎉 Şifreniz başarıyla yenilendi!", "success");
        }

        // Auto login user if token and user info returned
        if (data.token && data.user) {
            setTimeout(() => {
                closeForgotPasswordModal();
                setSession(data.token, data.user);
                showMainApp(data.user);
            }, 1200);
        }

    } catch (err) {
        if (errEl) {
            errEl.textContent = err.message || "Failed to reset password.";
            errEl.style.display = "block";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = typeof t === "function" ? t("auth_reset_btn", "Update Password") : "Update Password";
        }
    }
}
window.handleResetPasswordSubmit = handleResetPasswordSubmit;




/* ─── START AUTH ───────────────────────────────────────────────────────────── */

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
} else {
    initAuth();
}