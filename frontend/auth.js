/* ─── AUTH: token storage, login/register UI, and API auth headers ──────────*/

const AUTH_TOKEN_KEY = "atsToken";
const AUTH_USER_KEY = "atsUser";

function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USER_KEY));
    } catch (err) {
        return null;
    }
}

function setSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

/* Every call the app makes to fetch("/api/...") automatically gets the
   logged-in user's token attached, and a 401 response automatically
   sends the user back to the login screen. This avoids having to edit
   every single fetch() call scattered across app.js. */
const originalFetch = window.fetch.bind(window);

window.fetch = function (input, init) {
    init = init ? Object.assign({}, init) : {};

    const url = typeof input === "string" ? input : (input && input.url) || "";
    const isApiCall = url.startsWith("/api/") || url.startsWith(API_URL_PREFIX_PLACEHOLDER());
    const isAuthCall = url.startsWith("/api/auth/");

    const token = getToken();
    if (token && isApiCall && !isAuthCall) {
        const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined));
        headers.set("Authorization", "Bearer " + token);
        init.headers = headers;
    }

    return originalFetch(input, init).then(function (response) {
        if (response.status === 401 && isApiCall && !isAuthCall) {
            clearSession();
            showAuthScreen();
        }
        return response;
    });
};

// Kept as a function so it evaluates after API_URL (declared in app.js) exists.
function API_URL_PREFIX_PLACEHOLDER() {
    return typeof API_URL !== "undefined" ? API_URL : "/api";
}

/* ─── SCREEN SWITCHING ───────────────────────────────────────────────────────*/

function showAuthScreen() {
    document.getElementById("auth-screen").style.display = "flex";
    document.getElementById("mainLayout").style.display = "none";
}

function showMainApp(user) {
    document.getElementById("auth-screen").style.display = "none";
    document.getElementById("mainLayout").style.display = "flex";

    const sidebarUser = document.getElementById("sidebarUser");
    if (sidebarUser && user) {
        sidebarUser.textContent = user.name || user.email || "";
    }

    if (typeof window.onAuthenticated === "function") {
        window.onAuthenticated();
    }
}

/* ─── TAB SWITCHING ──────────────────────────────────────────────────────────*/

function setAuthError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message || "";
}

document.getElementById("showLoginTab").addEventListener("click", function () {
    document.getElementById("showLoginTab").classList.add("active");
    document.getElementById("showRegisterTab").classList.remove("active");
    document.getElementById("loginForm").style.display = "flex";
    document.getElementById("registerForm").style.display = "none";
    setAuthError("loginError", "");
    setAuthError("registerError", "");
});

document.getElementById("showRegisterTab").addEventListener("click", function () {
    document.getElementById("showRegisterTab").classList.add("active");
    document.getElementById("showLoginTab").classList.remove("active");
    document.getElementById("registerForm").style.display = "flex";
    document.getElementById("loginForm").style.display = "none";
    setAuthError("loginError", "");
    setAuthError("registerError", "");
});

/* ─── LOGIN ──────────────────────────────────────────────────────────────────*/

document.getElementById("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    setAuthError("loginError", "");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitBtn = document.getElementById("loginSubmitBtn");

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    try {
        const response = await originalFetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            setAuthError("loginError", data.message || "Login failed.");
            return;
        }

        setSession(data.token, data.user);
        showMainApp(data.user);
        event.target.reset();
    } catch (err) {
        console.error("Login error:", err);
        setAuthError("loginError", "Could not reach the server. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Log In";
    }
});

/* ─── REGISTER ───────────────────────────────────────────────────────────────*/

document.getElementById("registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    setAuthError("registerError", "");

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const submitBtn = document.getElementById("registerSubmitBtn");

    if (password.length < 6) {
        setAuthError("registerError", "Password must be at least 6 characters long.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
        const response = await originalFetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            setAuthError("registerError", data.message || "Registration failed.");
            return;
        }

        setSession(data.token, data.user);
        showMainApp(data.user);
        event.target.reset();
    } catch (err) {
        console.error("Register error:", err);
        setAuthError("registerError", "Could not reach the server. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
    }
});

/* ─── LOGOUT ─────────────────────────────────────────────────────────────────*/

document.getElementById("logoutBtn").addEventListener("click", function () {
    clearSession();
    showAuthScreen();
});

/* ─── SESSION CHECK ON LOAD ──────────────────────────────────────────────────*/

async function initAuth() {
    const token = getToken();

    if (!token) {
        showAuthScreen();
        return;
    }

    try {
        const response = await originalFetch("/api/auth/me", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!response.ok) {
            clearSession();
            showAuthScreen();
            return;
        }

        const user = await response.json();
        setSession(token, user);
        showMainApp(user);
    } catch (err) {
        console.error("Session check failed:", err);
        showAuthScreen();
    }
}

document.addEventListener("DOMContentLoaded", initAuth);
