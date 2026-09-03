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
    if (avatarVal.startsWith("data:image/") || avatarVal.startsWith("blob:") || avatarVal.startsWith("http://") || avatarVal.startsWith("https://")) {
        return avatarVal;
    }
    return avatarVal.startsWith("icons/") || avatarVal.startsWith("photos/") ? avatarVal : "icons/" + avatarVal;
}
window.getAvatarSrc = getAvatarSrc;

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

    const gradeLevelList = [
        { value: "1st Year (Freshman)", key: "grade_1st", fallback: "1st Year (Freshman)" },
        { value: "2nd Year (Sophomore)", key: "grade_2nd", fallback: "2nd Year (Sophomore)" },
        { value: "3rd Year (Junior)", key: "grade_3rd", fallback: "3rd Year (Junior)" },
        { value: "4th Year (Senior)", key: "grade_4th", fallback: "4th Year (Senior)" },
        { value: "Prep Year", key: "grade_prep", fallback: "Prep Year" },
        { value: "Master's / Graduate", key: "grade_masters", fallback: "Master's / Graduate" },
        { value: "PhD", key: "grade_phd", fallback: "PhD" },
        { value: "Other", key: "grade_other", fallback: "Other" }
    ];
    const gradeOptions = gradeLevelList.map(g => `<option value="${escapeHtml(g.value)}" ${g.value === userGrade ? "selected" : ""}>${escapeHtml(typeof t === "function" ? t(g.key, g.fallback) : g.fallback)}</option>`).join("");

    const isCustomAvatar = currentSelectedAvatar && currentSelectedAvatar.startsWith("data:image/");
    const uploadBtnHtml = `
        <label
            class="avatar-option avatar-upload-option ${isCustomAvatar ? "selected" : ""}"
            id="customAvatarOptionBtn"
            title="${escapeHtml(typeof t === 'function' ? t('settings_avatar_desc', 'Upload custom photo') : 'Upload custom photo')}"
            style="cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px dashed #93c5fd; background:#f0f7ff; color:#2563eb; position:relative; overflow:hidden; border-radius:14px; min-height:56px; box-sizing:border-box;"
        >
            <input type="file" id="customAvatarFileInput" accept="image/*" style="display:none;" onchange="handleCustomAvatarUpload(event)">
            ${isCustomAvatar
                ? `<img src="${escapeHtml(currentSelectedAvatar)}" alt="Custom Photo" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">
                   <span class="avatar-option-check">✓</span>
                   <span style="position:absolute; bottom:1px; left:50%; transform:translateX(-50%); font-size:8px; font-weight:800; background:rgba(15,23,42,0.8); color:#fff; padding:1px 4px; border-radius:3px; white-space:nowrap;">${escapeHtml(typeof t === 'function' ? t('settings_avatar_custom', 'Custom') : 'Custom')}</span>`
                : `<div style="font-size:24px; line-height:1; font-weight:800; color:#2563eb; margin-top:-2px;">+</div>
                   <div style="font-size:9.5px; font-weight:700; color:#2563eb; margin-top:2px;">${escapeHtml(typeof t === 'function' ? t('settings_avatar_gallery', 'Gallery') : 'Gallery')}</div>`
            }
        </label>
    `;

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
    }).join("") + uploadBtnHtml;

    appEl.innerHTML = `
        <div class="settings-container">

            <!-- HERO PROFILE CARD -->
            <div class="settings-hero-card">
                <div class="settings-current-avatar-wrapper">
                    <img id="settingsHeroAvatar" src="${escapeHtml(getAvatarSrc(currentSelectedAvatar))}" alt="Current Avatar" class="settings-current-avatar-img">
                </div>
                <div class="settings-hero-info">
                    <h2 id="settingsHeroName">${userName || (typeof t === "function" ? t("buddies_profile_desc", "Student Profile") : "Student Profile")}</h2>
                    <div id="settingsHeroMeta" class="settings-hero-meta">
                        ${(() => {
                            const localizedGrade = typeof formatLocalizedGradeLevel === "function" ? formatLocalizedGradeLevel(userGrade) : userGrade;
                            const localizedDept = typeof formatLocalizedDepartment === "function" ? formatLocalizedDepartment(user.department) : userDept;
                            const isOther = ["other", "diğer", "sonstiges", "otro", "autre", "altro", "другое", "기타", "その他", "أخرى"].includes(String(userGrade || "").toLowerCase());
                            const gradeDisplay = userGrade && !isOther ? escapeHtml(localizedGrade) : "";
                            const deptDisplay = user.department ? escapeHtml(localizedDept) : "";
                            return `${gradeDisplay}${gradeDisplay && deptDisplay ? " · " : ""}${deptDisplay}`;
                        })()}
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
                            ${escapeHtml(t("settings_avatar_title"))}
                        </h2>
                        <p class="card-desc" style="margin:4px 0 0 0;">${escapeHtml(t("settings_avatar_desc"))}</p>
                    </div>
                    <button
                        type="button"
                        onclick="selectSettingsAvatar('pp.png')"
                        style="display:inline-flex; align-items:center; gap:6px; padding:7px 14px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:20px; font-size:12px; font-weight:600; color:#475569; cursor:pointer;"
                        title="Reset to default icon"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                        ${escapeHtml(t("settings_avatar_reset"))}
                    </button>
                </div>
                
                <div class="avatar-grid" id="settingsAvatarGrid">
                    ${avatarGridHtml}
                </div>
            </div>

            <!-- SEASONAL THEME & ATMOSPHERE CARD (COMPACT DROPDOWN) -->
            <div class="settings-card" style="padding:18px 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                    <div>
                        <h2 style="margin:0; font-size:16px; display:flex; align-items:center; gap:8px;">
                            <span style="font-size:18px;">🎨</span>
                            ${escapeHtml(typeof t === "function" ? t("settings_theme_title", "Seasonal Theme & Atmosphere") : "Seasonal Theme & Atmosphere")}
                        </h2>
                        <p class="card-desc" style="margin:3px 0 0 0;">${escapeHtml(typeof t === "function" ? t("settings_theme_desc", "Customize the overall site color palette and dashboard video according to seasons.") : "Customize the overall site color palette and dashboard video according to seasons.")}</p>
                    </div>

                    <div style="min-width:240px;">
                        <select
                            id="settingsThemeSelect"
                            onchange="applyTheme(this.value, true)"
                            style="width:100%; padding:10px 14px; background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:10px; font-weight:700; font-size:13.5px; color:#1e293b; cursor:pointer; outline:none;"
                        >
                            ${(function() {
                                const currentActiveTheme = typeof getSavedTheme === "function" ? getSavedTheme() : "default";
                                const themesData = [
                                    { key: "default", icon: "🌟", nameKey: "theme_default", defaultName: "Default" },
                                    { key: "spring", icon: "🌸", nameKey: "theme_spring", defaultName: "Spring" },
                                    { key: "summer", icon: "☀️", nameKey: "theme_summer", defaultName: "Summer" },
                                    { key: "autumn", icon: "🍂", nameKey: "theme_autumn", defaultName: "Autumn" },
                                    { key: "winter", icon: "❄️", nameKey: "theme_winter", defaultName: "Winter" }
                                ];

                                return themesData.map(th => {
                                    const isSelected = (th.key === currentActiveTheme);
                                    const localizedName = typeof t === "function" ? t(th.nameKey, th.defaultName) : th.defaultName;
                                    return `
                                        <option value="${escapeHtml(th.key)}" ${isSelected ? "selected" : ""}>
                                            ${th.icon} ${escapeHtml(localizedName)}
                                        </option>
                                    `;
                                }).join("");
                            })()}
                        </select>
                    </div>
                </div>
            </div>

            <!-- LANGUAGE & LOCALIZATION CARD (COMPACT DROPDOWN) -->
            <div class="settings-card" style="padding:18px 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                    <div>
                        <h2 style="margin:0; font-size:16px; display:flex; align-items:center; gap:8px;">
                            <span style="font-size:18px;">🌐</span>
                            ${escapeHtml(t("settings_lang_title"))}
                        </h2>
                        <p class="card-desc" style="margin:3px 0 0 0;">${escapeHtml(t("settings_lang_desc"))}</p>
                    </div>

                    <div style="min-width:240px;">
                        <select
                            id="settingsLanguageSelect"
                            onchange="setLanguage(this.value)"
                            style="width:100%; padding:10px 14px; background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:10px; font-weight:700; font-size:13.5px; color:#1e293b; cursor:pointer; outline:none;"
                        >
                            ${(typeof getSupportedLanguages === "function" ? getSupportedLanguages() : []).map(l => {
                                const isSelected = (l.code === (typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "en"));
                                return `
                                    <option value="${escapeHtml(l.code)}" ${isSelected ? "selected" : ""}>
                                        ${l.flag} ${escapeHtml(l.nativeName)} (${escapeHtml(l.name)})
                                    </option>
                                `;
                            }).join("")}
                        </select>
                    </div>
                </div>
            </div>

            <!-- PERSONAL INFO CARD -->
            <div class="settings-card">
                <h2 style="display:flex; align-items:center; gap:8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#3b82f6;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    ${escapeHtml(t("settings_personal_title"))}
                </h2>
                <p class="card-desc">${escapeHtml(t("settings_personal_desc"))}</p>

                <form id="settingsProfileForm" onsubmit="event.preventDefault(); saveUserSettings();" style="display:flex; flex-direction:column; gap:16px;">
                    <div class="settings-grid-2">
                        <div class="settings-field-group">
                            <label for="settingsName">${escapeHtml(t("settings_fullname"))}</label>
                            <input type="text" id="settingsName" value="${userName}" placeholder="e.g. Peter Parker" required>
                        </div>
                        <div class="settings-field-group">
                            <label for="settingsEmail">${escapeHtml(t("settings_email"))}</label>
                            <input type="email" id="settingsEmail" value="${userEmail}" placeholder="you@example.com" required>
                        </div>
                    </div>

                    <div class="settings-grid-2">
                        <div class="settings-field-group">
                            <label for="settingsGrade">${escapeHtml(t("settings_grade"))}</label>
                            <select id="settingsGrade" required>
                                <option value="" disabled ${!userGrade ? "selected" : ""}>Select your class / year</option>
                                ${gradeOptions}
                            </select>
                        </div>
                        <div class="settings-field-group">
                            <label for="settingsDepartment">${escapeHtml(t("settings_department"))} <span style="font-size:12px; font-weight:normal; opacity:0.75;">(optional)</span></label>
                            <input type="text" id="settingsDepartment" value="${userDept}" placeholder="e.g. Computer Engineering">
                        </div>
                    </div>

                    <!-- PASSWORD CHANGE SECTION -->
                    <div style="margin-top:10px; padding-top:16px; border-top:1px solid #f1f5f9;">
                        <h4 style="margin:0 0 10px 0; color:#334155; font-size:14px; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#64748b;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            ${escapeHtml(t("settings_change_password"))}
                        </h4>
                        <div class="settings-grid-2">
                            <div class="settings-field-group">
                                <label for="settingsCurrentPassword">${escapeHtml(t("settings_curr_password"))}</label>
                                <input type="password" id="settingsCurrentPassword" placeholder="Enter current password if changing">
                            </div>
                            <div class="settings-field-group">
                                <label for="settingsNewPassword">${escapeHtml(t("settings_new_password"))}</label>
                                <input type="password" id="settingsNewPassword" placeholder="At least 6 characters">
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:12px; display:flex; justify-content:flex-end;">
                        <button type="submit" id="settingsSaveBtn" class="settings-btn-save">${escapeHtml(t("settings_save_btn"))}</button>
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
                            ${escapeHtml(t("settings_danger_title"))}
                        </h2>
                        <p class="card-desc" style="margin:4px 0 0 0; color:#991b1b;">
                            ${escapeHtml(t("settings_danger_desc"))}
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
                        ${escapeHtml(t("settings_delete_btn"))}
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

function openAvatarCropperModal(imageSrc) {
    const existing = document.getElementById("avatarCropperModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.className = "modal-overlay is-open";
    modal.id = "avatarCropperModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "10000";
    modal.style.padding = "20px";

    modal.innerHTML = `
        <div class="modal-box" style="max-width:440px; width:100%; padding:0; background:#0f172a; border:1px solid #334155; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.6); color:#f8fafc; overflow:hidden;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:#1e293b; border-bottom:1px solid #334155;">
                <div style="font-weight:800; font-size:15px; display:flex; align-items:center; gap:8px;">
                    <span>✂️</span> Adjust &amp; Crop Avatar
                </div>
                <button type="button" onclick="document.getElementById('avatarCropperModal').remove()" style="background:rgba(255,255,255,0.1); border:none; color:#cbd5e1; font-size:14px; font-weight:700; width:28px; height:28px; border-radius:50%; cursor:pointer;">✕</button>
            </div>

            <!-- Cropper Canvas Viewport -->
            <div style="padding:20px; display:flex; flex-direction:column; align-items:center; user-select:none;">
                <div style="position:relative; width:300px; height:300px; background:#020617; border-radius:12px; overflow:hidden; border:1px solid #334155; touch-action:none; cursor:grab;" id="cropperViewport">
                    <canvas id="avatarCropCanvas" width="300" height="300" style="display:block; width:100%; height:100%;"></canvas>
                </div>
                <div style="font-size:11.5px; color:#94a3b8; margin-top:8px; display:flex; align-items:center; gap:6px;">
                    <span>👆 Drag to position • Scroll/Slider to zoom</span>
                </div>

                <!-- Controls -->
                <div style="width:100%; margin-top:14px; display:flex; flex-direction:column; gap:10px;">
                    <!-- Zoom Slider -->
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:12px; color:#94a3b8; font-weight:600; width:45px;">Zoom</span>
                        <input type="range" id="cropZoomSlider" min="0.5" max="3" step="0.05" value="1" style="flex:1; accent-color:#3b82f6; cursor:pointer;">
                        <span id="cropZoomLabel" style="font-size:11px; color:#60a5fa; font-weight:700; width:35px; text-align:right;">1.0x</span>
                    </div>

                    <!-- Rotate & Reset Toolbar -->
                    <div style="display:flex; justify-content:center; gap:8px;">
                        <button type="button" id="cropRotateBtn" style="padding:6px 14px; background:#1e293b; border:1px solid #334155; color:#cbd5e1; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                            🔄 Rotate 90°
                        </button>
                        <button type="button" id="cropResetBtn" style="padding:6px 14px; background:#1e293b; border:1px solid #334155; color:#cbd5e1; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                            ↺ Reset
                        </button>
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div style="padding:14px 20px; background:#1e293b; border-top:1px solid #334155; display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" onclick="document.getElementById('avatarCropperModal').remove()" style="padding:9px 16px; background:rgba(255,255,255,0.06); border:1px solid #475569; color:#cbd5e1; border-radius:8px; font-weight:600; font-size:12.5px; cursor:pointer;">
                    Cancel
                </button>
                <button type="button" id="cropSaveBtn" style="padding:9px 20px; background:linear-gradient(135deg, #2563eb, #1d4ed8); border:none; color:#ffffff; border-radius:8px; font-weight:700; font-size:12.5px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                    ✓ Set Profile Picture
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const canvas = document.getElementById("avatarCropCanvas");
    const ctx = canvas.getContext("2d");
    const viewport = document.getElementById("cropperViewport");
    const zoomSlider = document.getElementById("cropZoomSlider");
    const zoomLabel = document.getElementById("cropZoomLabel");
    const rotateBtn = document.getElementById("cropRotateBtn");
    const resetBtn = document.getElementById("cropResetBtn");
    const saveBtn = document.getElementById("cropSaveBtn");

    const img = new Image();
    const W = 300;
    const H = 300;
    const cropRadius = 125; // 250px diameter
    const cx = W / 2;
    const cy = H / 2;

    let baseScale = 1;
    let zoomMultiplier = 1;
    let rotationDeg = 0;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    function renderCropCanvas() {
        ctx.clearRect(0, 0, W, H);

        // 1. Draw Image with transforms
        ctx.save();
        ctx.translate(cx + offsetX, cy + offsetY);
        ctx.rotate((rotationDeg * Math.PI) / 180);
        const totalScale = baseScale * zoomMultiplier;
        ctx.scale(totalScale, totalScale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        // 2. Draw Dark Overlay Mask with Circle Cutout
        ctx.save();
        ctx.fillStyle = "rgba(2, 6, 23, 0.75)";
        ctx.beginPath();
        // Outer rect
        ctx.rect(0, 0, W, H);
        // Inner circle (counter-clockwise for cutout)
        ctx.arc(cx, cy, cropRadius, 0, Math.PI * 2, true);
        ctx.fill();

        // 3. Draw Circle Border Guide
        ctx.beginPath();
        ctx.arc(cx, cy, cropRadius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.restore();
    }

    img.onload = function () {
        baseScale = (cropRadius * 2) / Math.min(img.width, img.height);
        renderCropCanvas();
    };
    img.src = imageSrc;

    // Drag handlers
    function startDrag(clientX, clientY) {
        isDragging = true;
        dragStartX = clientX - offsetX;
        dragStartY = clientY - offsetY;
        viewport.style.cursor = "grabbing";
    }

    function moveDrag(clientX, clientY) {
        if (!isDragging) return;
        offsetX = clientX - dragStartX;
        offsetY = clientY - dragStartY;
        renderCropCanvas();
    }

    function endDrag() {
        isDragging = false;
        viewport.style.cursor = "grab";
    }

    viewport.addEventListener("mousedown", e => startDrag(e.clientX, e.clientY));
    window.addEventListener("mousemove", e => moveDrag(e.clientX, e.clientY));
    window.addEventListener("mouseup", endDrag);

    viewport.addEventListener("touchstart", e => {
        if (e.touches.length === 1) {
            startDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener("touchmove", e => {
        if (e.touches.length === 1) {
            moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener("touchend", endDrag);

    // Wheel Zoom
    viewport.addEventListener("wheel", e => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        zoomMultiplier = Math.max(0.5, Math.min(3.0, zoomMultiplier + delta));
        zoomSlider.value = zoomMultiplier;
        zoomLabel.textContent = zoomMultiplier.toFixed(1) + "x";
        renderCropCanvas();
    }, { passive: false });

    // Slider Zoom
    zoomSlider.addEventListener("input", function () {
        zoomMultiplier = parseFloat(this.value);
        zoomLabel.textContent = zoomMultiplier.toFixed(1) + "x";
        renderCropCanvas();
    });

    // Rotate
    rotateBtn.addEventListener("click", function () {
        rotationDeg = (rotationDeg + 90) % 360;
        renderCropCanvas();
    });

    // Reset
    resetBtn.addEventListener("click", function () {
        zoomMultiplier = 1;
        zoomSlider.value = 1;
        zoomLabel.textContent = "1.0x";
        rotationDeg = 0;
        offsetX = 0;
        offsetY = 0;
        renderCropCanvas();
    });

    // Save Cropped Image
    saveBtn.addEventListener("click", function () {
        const outCanvas = document.createElement("canvas");
        const outSize = 256;
        outCanvas.width = outSize;
        outCanvas.height = outSize;
        const outCtx = outCanvas.getContext("2d");

        const ratio = outSize / (cropRadius * 2);

        outCtx.save();
        outCtx.translate((outSize / 2) + offsetX * ratio, (outSize / 2) + offsetY * ratio);
        outCtx.rotate((rotationDeg * Math.PI) / 180);
        const totalScale = baseScale * zoomMultiplier * ratio;
        outCtx.scale(totalScale, totalScale);
        outCtx.drawImage(img, -img.width / 2, -img.height / 2);
        outCtx.restore();

        const croppedDataUrl = outCanvas.toDataURL("image/jpeg", 0.90);

        selectSettingsAvatar(croppedDataUrl);

        const customOption = document.getElementById("customAvatarOptionBtn");
        if (customOption) {
            customOption.classList.add("selected");
            customOption.innerHTML = `
                <input type="file" id="customAvatarFileInput" accept="image/*" style="display:none;" onchange="handleCustomAvatarUpload(event)">
                <img src="${croppedDataUrl}" alt="Custom Photo" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">
                <span class="avatar-option-check">✓</span>
                <span style="position:absolute; bottom:1px; left:50%; transform:translateX(-50%); font-size:8px; font-weight:800; background:rgba(15,23,42,0.8); color:#fff; padding:1px 4px; border-radius:3px; white-space:nowrap;">Custom</span>
            `;
        }

        modal.remove();
        showToast(typeof t === "function" ? t("toast_pfp_updated", "Profile picture adjusted and updated!") : "Profile picture adjusted and updated!", "success");
    });
}
window.openAvatarCropperModal = openAvatarCropperModal;

function handleCustomAvatarUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast(typeof t === "function" ? t("toast_invalid_image", "Please select a valid image file (JPEG, PNG, WEBP).") : "Please select a valid image file (JPEG, PNG, WEBP).", "warning");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        openAvatarCropperModal(e.target.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
}
window.handleCustomAvatarUpload = handleCustomAvatarUpload;

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

    const isCustom = currentSelectedAvatar && currentSelectedAvatar.startsWith("data:image/");

    const grid = document.getElementById("settingsAvatarGrid");
    if (grid) {
        grid.querySelectorAll(".avatar-option").forEach(btn => {
            if (btn.id === "customAvatarOptionBtn") {
                btn.classList.toggle("selected", isCustom);
                const check = btn.querySelector(".avatar-option-check");
                if (isCustom && !check) {
                    btn.insertAdjacentHTML("beforeend", `<span class="avatar-option-check">✓</span>`);
                } else if (!isCustom && check) {
                    check.remove();
                }
                return;
            }

            const isMatch = !isCustom && (
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
            showToast(typeof t === "function" ? t("toast_avatar_updated", "Avatar icon updated!") : "Avatar icon updated!", "success");
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
        showToast(typeof t === "function" ? t("toast_name_empty", "Full Name cannot be empty.") : "Full Name cannot be empty.", "warning");
        nameInput?.focus();
        return;
    }

    if (!email) {
        showToast(typeof t === "function" ? t("toast_email_empty", "Email address cannot be empty.") : "Email address cannot be empty.", "warning");
        emailInput?.focus();
        return;
    }

    if (!gradeLevel) {
        showToast(typeof t === "function" ? t("toast_grade_empty", "Please select your class / year.") : "Please select your class / year.", "warning");
        gradeSelect?.focus();
        return;
    }

    if (newPassword && newPassword.length < 6) {
        showToast(typeof t === "function" ? t("toast_pass_min_length", "New password must be at least 6 characters long.") : "New password must be at least 6 characters long.", "warning");
        newPassInput?.focus();
        return;
    }

    if (newPassword && !currentPassword) {
        showToast(typeof t === "function" ? t("toast_curr_pass_required", "Please enter your current password to set a new password.") : "Please enter your current password to set a new password.", "warning");
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

        showToast(typeof t === "function" ? t("toast_profile_saved", "Profile updated successfully!") : "Profile updated successfully!", "success");
    } catch (err) {
        console.error("Settings Save Error:", err);
        showToast(typeof t === "function" ? t("toast_profile_update_err", "An error occurred while saving profile.") : "An error occurred while saving profile.", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = typeof t === "function" ? t("btn_save_changes", "Save Changes") : "Save Changes";
        }
    }
}

async function deleteUserSettingsAccount() {
    const confirmDelete = await showConfirm(
        typeof t === "function" ? t("settings_del_account_title", "Delete Account") : "Delete Account",
        typeof t === "function" ? t("settings_del_account_confirm", "Are you sure you want to permanently delete your account? All your courses, grades, deadlines, study logs, and profile data will be permanently removed. This action cannot be undone.") : "Are you sure you want to permanently delete your account? All your courses, grades, deadlines, study logs, and profile data will be permanently removed. This action cannot be undone.",
        typeof t === "function" ? t("btn_confirm_delete", "Yes, Delete Account") : "Yes, Delete Account"
    );

    if (!confirmDelete) return;

    const token = typeof getToken === "function" ? getToken() : (localStorage.getItem("atsToken") || "");
    const deleteBtn = document.getElementById("settingsDeleteAccountBtn");
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = typeof t === "function" ? t("common_loading", "Deleting...") : "Deleting...";
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
            showToast(errData.message || (typeof t === "function" ? t("toast_account_delete_err", "Failed to delete account.") : "Failed to delete account."), "error");
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = typeof t === "function" ? t("settings_btn_delete_account", "Delete My Account") : "Delete My Account";
            }
            return;
        }

        showToast(typeof t === "function" ? t("toast_account_deleted", "Your account has been deleted.") : "Your account has been deleted.", "info");

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
        showToast(typeof t === "function" ? t("toast_account_delete_err", "An error occurred while deleting account.") : "An error occurred while deleting account.", "error");
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = typeof t === "function" ? t("settings_btn_delete_account", "Delete My Account") : "Delete My Account";
        }
    }
}

window.deleteUserSettingsAccount = deleteUserSettingsAccount;
