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
     * VS Code Live Server / local frontend.
     *
     * Not: hostname kontrolü kaldırıldı, çünkü mobil cihazdan
     * bilgisayarın yerel ağ IP'si (ör. 192.168.x.x) üzerinden
     * bağlanıldığında hostname "localhost" olmuyor. Bunun yerine
     * PORT'a bakıyoruz: sayfa 3000'den açıldıysa (Live Server),
     * backend'in AYNI HOST üzerinde 5000 portunda çalıştığını
     * varsayıyoruz. Böylece hem bilgisayardan hem mobilden
     * doğru backend adresine gidilir.
     */
    if (window.location.port === "3000") {
        return `${window.location.protocol}//${hostname}:5000`;
    }

    /*
     * Sayfa zaten Express tarafından 5000
     * üzerinden servis ediliyorsa.
     */
    if (window.location.port === "5000") {
        return "";
    }


    /*
     * Render / production.
     *
     * Frontend ve backend aynı Render servisi
     * üzerinden servis ediliyorsa relative URL kullanılır.
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

    init = init
        ? Object.assign({}, init)
        : {};


    const url =
        typeof input === "string"
            ? input
            : (input && input.url) || "";


    const isApiCall =
        url.includes("/api/");

    const isPublicAuthCall =
        url.includes("/api/auth/login") ||
        url.includes("/api/auth/register") ||
        url.includes("/api/auth/avatars");

    const token =
        getToken();

    if (
        token &&
        isApiCall &&
        !isPublicAuthCall
    ) {

        const headers =
            new Headers(
                init.headers ||
                (
                    typeof input !== "string"
                        ? input.headers
                        : undefined
                )
            );

        headers.set(
            "Authorization",
            "Bearer " + token
        );

        init.headers = headers;

    }


    return originalFetch(
        input,
        init
    ).then(function (response) {

        /*
         * API'den 401 gelirse oturumu temizle.
         */

        if (
            response.status === 401 &&
            isApiCall &&
            !isPublicAuthCall
        ) {

            clearSession();

            showAuthScreen();

        }


        return response;

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


            submitBtn.disabled = true;

            submitBtn.textContent =
                "Logging in...";


            try {

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
                            })
                        }
                    );


                const data =
                    await readResponseData(
                        response
                    );


                /*
                 * Backend hata döndürdüyse
                 * gerçek hata mesajını göster.
                 */

                if (!response.ok) {

                    if (
                        response.status === 401
                    ) {

                        setAuthError(
                            "loginError",
                            "Invalid email or password."
                        );

                    } else if (
                        response.status === 400
                    ) {

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


                /*
                 * Başarılı login'de token
                 * ve user gelmeli.
                 */

                if (
                    !data.token ||
                    !data.user
                ) {

                    console.error(
                        "Invalid login response:",
                        data
                    );


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


                /*
                 * Bu mesaj artık sadece gerçekten
                 * network / server bağlantısı
                 * başarısız olduğunda gösterilir.
                 */

                setAuthError(
                    "loginError",
                    "Could not reach the server. Please try again."
                );


            } finally {

                submitBtn.disabled = false;

                submitBtn.textContent =
                    "Log In";

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

    const token =
        getToken();


    if (!token) {

        showAuthScreen();

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

        console.error(
            "Session check failed:",
            err
        );


        /*
         * Server geçici olarak ulaşılmazsa
         * mevcut oturumu hemen silmiyoruz.
         */

        showAuthScreen();

    }

}


/* ─── START AUTH ───────────────────────────────────────────────────────────── */

document.addEventListener(
    "DOMContentLoaded",
    initAuth
);