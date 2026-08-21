/* ─── SETTINGS & PROFILE MANAGEMENT ─────────────────────────────────────────*/

const DEFAULT_AVATAR_LIST = [
    "indir (4).jpg",
    "indir (2).jpg",
    "14.jpg",
    "1.jpg",
    "2.jpg",
    "3.jpg",
    "4.jpg",
    "5.jpg",
    "6.jpg",
    "7.jpg",
    "8.jpg",
    "9.jpg",
    "10.jpg",
    "11.jpg",
    "12.png",
    "indir (12).jpg",
    "indir (13).jpg",
    "quby 3.jpg"
];

let currentSelectedAvatar = "default";

function getAvatarSrc(avatarVal) {
    if (!avatarVal || avatarVal === "default" || avatarVal === "pp.png" || avatarVal === "icons/pp.png" || avatarVal === "logo.png" || avatarVal === "photos/logo.png") {
        return "icons/pp.png";
    }
    return avatarVal.startsWith("icons/") || avatarVal.startsWith("photos/") ? avatarVal : "icons/" + avatarVal;
}

async function loadSettingsPage() {
    updateStickyHeader("settings");

    const appEl = document.getElementById("app");
    if (!appEl) return;

    let user = typeof getStoredUser === "function" ? getStoredUser() : null;

    // Fetch fresh user data from server with token
    const token = typeof getToken === "function" ? getToken() : (localStorage.getItem("atsToken") || "");
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: token ? { "Authorization": "Bearer " + token } : {}
        });
        if (response.ok) {
            const freshUser = await response.json();
            if (freshUser) {
                user = freshUser;
                if (typeof updateCurrentUser === "function") {
                    updateCurrentUser(user);
                }
            }
        }
    } catch (e) {
        console.log("Using cached user data for settings:", e);
    }

    if (!user) {
        appEl.innerHTML = `<p>Please log in to view settings.</p>`;
        return;
    }

    currentSelectedAvatar = user.avatar || "default";

    let availableAvatars = DEFAULT_AVATAR_LIST;
    try {
        const avatarsFromServer = await fetchJson(`${API_URL}/auth/avatars`);
        if (Array.isArray(avatarsFromServer) && avatarsFromServer.length > 0) {
            availableAvatars = avatarsFromServer.filter(av => av !== "pp.png" && av !== "logo.png");
        }
    } catch (e) {
        // Fallback to DEFAULT_AVATAR_LIST
    }

    const userName = escapeHtml(user.name || "");
    const userEmail = escapeHtml(user.email || "");
    const userGrade = user.gradeLevel || "";
    const userDept = escapeHtml(user.department || "");

    const gradeOptions = [
        "1st Year (Freshman)",
        "2nd Year (Sophomore)",
        "3rd Year (Junior)",
        "4th Year (Senior)",
        "Prep Year",
        "Master's / Graduate",
        "PhD",
        "Other"
    ].map(g => `<option value="${escapeHtml(g)}" ${g === userGrade ? "selected" : ""}>${escapeHtml(g)}</option>`).join("");

    const avatarGridHtml = availableAvatars.map(av => {
        const isSelected = (av === currentSelectedAvatar);
        const imgPath = `icons/${escapeHtml(av)}`;
        const titleText = (av === "indir (4).jpg" ? "Avatar indir (4)" : (av === "indir (2).jpg" ? "Avatar indir (2)" : `Avatar ${escapeHtml(av)}`));

        return `
            <button
                type="button"
                class="avatar-option ${isSelected ? "selected" : ""}"
                data-avatar="${escapeHtml(av)}"
                onclick="selectSettingsAvatar('${escapeForOnclick(av)}')"
                title="${escapeHtml(titleText)}"
            >
                <img src="${imgPath}" alt="${escapeHtml(titleText)}">
                ${isSelected ? `<span class="avatar-option-check">✓</span>` : ""}
            </button>
        `;
    }).join("");

    appEl.innerHTML = `
        <div class="settings-container">

            <!-- HERO PROFILE CARD -->
            <div class="settings-hero-card">
                <div class="settings-current-avatar-wrapper">
                    <img id="settingsHeroAvatar" src="${escapeHtml(getAvatarSrc(currentSelectedAvatar))}" alt="Current Avatar" class="settings-current-avatar-img">
                </div>
                <div class="settings-hero-info">
                    <h2 id="settingsHeroName">${userName || "Student Profile"}</h2>
                    <div id="settingsHeroMeta" class="settings-hero-meta">
                        ${userGrade && userGrade !== "Other" ? escapeHtml(userGrade) : ""} ${userGrade && userGrade !== "Other" && userDept ? "·" : ""} ${userDept}
                    </div>
                    <div class="settings-hero-email">${userEmail}</div>
                </div>
            </div>

            <!-- AVATAR PICKER CARD -->
            <div class="settings-card">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
                    <div>
                        <h2 style="margin:0; display:flex; align-items:center; gap:8px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#3b82f6;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            Profile Avatar
                        </h2>
                        <p class="card-desc" style="margin:4px 0 0 0;">Choose a custom avatar icon from our collection or reset to the default avatar.</p>
                    </div>
                    <button
                        type="button"
                        onclick="selectSettingsAvatar('pp.png')"
                        style="display:inline-flex; align-items:center; gap:6px; padding:7px 14px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:20px; font-size:12px; font-weight:600; color:#475569; cursor:pointer;"
                        title="Reset to default icon"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                        Reset to Default Icon
                    </button>
                </div>
                
                <div class="avatar-grid" id="settingsAvatarGrid">
                    ${avatarGridHtml}
                </div>
            </div>

            <!-- PERSONAL INFO CARD -->
            <div class="settings-card">
                <h2 style="display:flex; align-items:center; gap:8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#3b82f6;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Personal Information
                </h2>
                <p class="card-desc">Update your academic information and profile details.</p>

                <form id="settingsProfileForm" onsubmit="event.preventDefault(); saveUserSettings();" style="display:flex; flex-direction:column; gap:16px;">
                    <div class="settings-grid-2">
                        <div class="settings-field-group">
                            <label for="settingsName">Full Name</label>
                            <input type="text" id="settingsName" value="${userName}" placeholder="e.g. Peter Parker" required>
                        </div>
                        <div class="settings-field-group">
                            <label for="settingsEmail">Email Address</label>
                            <input type="email" id="settingsEmail" value="${userEmail}" placeholder="you@example.com" required>
                        </div>
                    </div>

                    <div class="settings-grid-2">
                        <div class="settings-field-group">
                            <label for="settingsGrade">Class / Year</label>
                            <select id="settingsGrade" required>
                                <option value="" disabled ${!userGrade ? "selected" : ""}>Select your class / year</option>
                                ${gradeOptions}
                            </select>
                        </div>
                        <div class="settings-field-group">
                            <label for="settingsDepartment">Department <span style="font-size:12px; font-weight:normal; opacity:0.75;">(optional)</span></label>
                            <input type="text" id="settingsDepartment" value="${userDept}" placeholder="e.g. Computer Engineering">
                        </div>
                    </div>

                    <!-- PASSWORD CHANGE SECTION -->
                    <div style="margin-top:10px; padding-top:16px; border-top:1px solid #f1f5f9;">
                        <h4 style="margin:0 0 10px 0; color:#334155; font-size:14px; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#64748b;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Change Password (optional)
                        </h4>
                        <div class="settings-grid-2">
                            <div class="settings-field-group">
                                <label for="settingsCurrentPassword">Current Password</label>
                                <input type="password" id="settingsCurrentPassword" placeholder="Enter current password if changing">
                            </div>
                            <div class="settings-field-group">
                                <label for="settingsNewPassword">New Password</label>
                                <input type="password" id="settingsNewPassword" placeholder="At least 6 characters">
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:12px; display:flex; justify-content:flex-end;">
                        <button type="submit" id="settingsSaveBtn" class="settings-btn-save">Save Changes</button>
                    </div>
                </form>
            </div>

            <!-- DANGER ZONE / DELETE ACCOUNT CARD -->
            <div class="settings-card settings-danger-card" style="border: 1px solid #fee2e2; background: #fffdfd;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                    <div>
                        <h2 style="margin:0; color:#dc2626; display:flex; align-items:center; gap:8px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#dc2626;">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            Delete Account
                        </h2>
                        <p class="card-desc" style="margin:4px 0 0 0; color:#991b1b;">
                            Permanently delete your account and all associated data including courses, grades, deadlines, and study sessions. This action cannot be undone.
                        </p>
                    </div>
                    <button
                        type="button"
                        id="settingsDeleteAccountBtn"
                        onclick="deleteUserSettingsAccount()"
                        style="display:inline-flex; align-items:center; gap:6px; padding:10px 18px !important; background:#ef4444 !important; color:#ffffff !important; border:none !important; border-radius:10px !important; font-weight:700 !important; font-size:13px !important; cursor:pointer !important; box-shadow:0 4px 12px rgba(239,68,68,0.25) !important;"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete My Account
                    </button>
                </div>
            </div>

        </div>
    `;

    if (typeof autoFormatInput === "function") {
        autoFormatInput(document.getElementById("settingsName"), "name");
        autoFormatInput(document.getElementById("settingsDepartment"), "title");
        autoFormatInput(document.getElementById("settingsEmail"), "email");
    }
}

async function selectSettingsAvatar(avatarFile) {
    currentSelectedAvatar = avatarFile || "default";

    const heroImg = document.getElementById("settingsHeroAvatar");
    if (heroImg) {
        heroImg.src = getAvatarSrc(currentSelectedAvatar);
    }

    const mainLogo = document.getElementById("sidebarMainLogo");
    if (mainLogo) {
        mainLogo.src = getAvatarSrc(currentSelectedAvatar);
    }

    const grid = document.getElementById("settingsAvatarGrid");
    if (grid) {
        grid.querySelectorAll(".avatar-option").forEach(btn => {
            const isMatch = (
                btn.dataset.avatar === currentSelectedAvatar ||
                (btn.dataset.avatar === "pp.png" && (currentSelectedAvatar === "default" || currentSelectedAvatar === "pp.png"))
            );
            btn.classList.toggle("selected", isMatch);
            const check = btn.querySelector(".avatar-option-check");
            if (isMatch && !check) {
                btn.insertAdjacentHTML("beforeend", `<span class="avatar-option-check">✓</span>`);
            } else if (!isMatch && check) {
                check.remove();
            }
        });
    }

    // Immediately update sidebar and local storage
    if (typeof updateCurrentUser === "function") {
        updateCurrentUser({ avatar: currentSelectedAvatar });
    }

    // Persist to server
    const token = typeof getToken === "function" ? getToken() : (localStorage.getItem("atsToken") || "");
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": "Bearer " + token } : {})
            },
            body: JSON.stringify({ avatar: currentSelectedAvatar })
        });

        if (response.ok) {
            const data = await response.json();
            if (data && typeof updateCurrentUser === "function") {
                updateCurrentUser(data);
            }
            showToast("Avatar icon updated!", "success");
        }
    } catch (e) {
        console.error("Avatar save error:", e);
    }
}

async function saveUserSettings() {
    const saveBtn = document.getElementById("settingsSaveBtn");
    const nameInput = document.getElementById("settingsName");
    const emailInput = document.getElementById("settingsEmail");
    const gradeSelect = document.getElementById("settingsGrade");
    const deptInput = document.getElementById("settingsDepartment");
    const currentPassInput = document.getElementById("settingsCurrentPassword");
    const newPassInput = document.getElementById("settingsNewPassword");

    const name = nameInput?.value.trim() || "";
    const email = emailInput?.value.trim().toLowerCase() || "";
    const gradeLevel = gradeSelect?.value || "";
    const department = deptInput?.value.trim() || "";
    const currentPassword = currentPassInput?.value || "";
    const newPassword = newPassInput?.value || "";

    if (!name) {
        showToast("Full Name cannot be empty.", "warning");
        nameInput?.focus();
        return;
    }

    if (!email) {
        showToast("Email address cannot be empty.", "warning");
        emailInput?.focus();
        return;
    }

    if (!gradeLevel) {
        showToast("Please select your class / year.", "warning");
        gradeSelect?.focus();
        return;
    }

    if (newPassword && newPassword.length < 6) {
        showToast("New password must be at least 6 characters long.", "warning");
        newPassInput?.focus();
        return;
    }

    if (newPassword && !currentPassword) {
        showToast("Please enter your current password to set a new password.", "warning");
        currentPassInput?.focus();
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
    }

    const payload = {
        name,
        email,
        gradeLevel,
        department,
        avatar: currentSelectedAvatar
    };

    if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
    }

    const token = typeof getToken === "function" ? getToken() : (localStorage.getItem("atsToken") || "");

    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": "Bearer " + token } : {})
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            showToast(data.message || "Profile could not be updated.", "error");
            return;
        }

        if (typeof updateCurrentUser === "function") {
            updateCurrentUser(data);
        }

        const heroName = document.getElementById("settingsHeroName");
        const heroMeta = document.getElementById("settingsHeroMeta");
        if (heroName) heroName.textContent = data.name || data.email;
        if (heroMeta) {
            const gText = data.gradeLevel && data.gradeLevel !== "Other" ? data.gradeLevel : "";
            heroMeta.textContent = `${gText} ${gText && data.department ? "·" : ""} ${data.department || ""}`;
        }

        if (currentPassInput) currentPassInput.value = "";
        if (newPassInput) newPassInput.value = "";

        showToast("Profile updated successfully!", "success");
    } catch (err) {
        console.error("Settings Save Error:", err);
        showToast("An error occurred while saving profile.", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
        }
    }
}

async function deleteUserSettingsAccount() {
    const confirmDelete = await showConfirm(
        "Delete Account",
        "Are you sure you want to permanently delete your account? All your courses, grades, deadlines, study logs, and profile data will be permanently removed. This action cannot be undone.",
        "Yes, Delete Account"
    );

    if (!confirmDelete) return;

    const token = typeof getToken === "function" ? getToken() : (localStorage.getItem("atsToken") || "");
    const deleteBtn = document.getElementById("settingsDeleteAccountBtn");
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = "Deleting...";
    }

    try {
        const response = await fetch(`${API_URL}/auth/account`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": "Bearer " + token } : {})
            }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            showToast(errData.message || "Failed to delete account.", "error");
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = "Delete My Account";
            }
            return;
        }

        showToast("Your account has been deleted.", "info");

        // Clear local storage and return to login screen
        localStorage.removeItem("atsToken");
        localStorage.removeItem("atsUser");

        setTimeout(() => {
            if (typeof renderAuthScreen === "function") {
                renderAuthScreen();
            } else {
                window.location.reload();
            }
        }, 500);

    } catch (e) {
        console.error("Account delete error:", e);
        showToast("An error occurred while deleting account.", "error");
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = "Delete My Account";
        }
    }
}

window.deleteUserSettingsAccount = deleteUserSettingsAccount;
