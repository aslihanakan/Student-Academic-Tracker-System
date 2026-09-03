/* ==============================================================================
   ACADEMI BUDDY - BUDDIES & GROUP PROJECTS COLLABORATION MODULE
   ============================================================================== */

let buddiesPollInterval = null;
let lastKnownAcceptedCount = -1;
let lastKnownIncomingCount = -1;

function startBuddiesPolling() {
    stopBuddiesPolling();
    // Poll every 3.5 seconds while the buddies modal is open
    buddiesPollInterval = setInterval(() => {
        const modal = document.getElementById("buddiesModal");
        if (modal) {
            loadBuddiesList(true);
        } else {
            stopBuddiesPolling();
        }
    }, 3500);
}

function stopBuddiesPolling() {
    if (buddiesPollInterval) {
        clearInterval(buddiesPollInterval);
        buddiesPollInterval = null;
    }
}

function closeBuddiesModal() {
    stopBuddiesPolling();
    const modal = document.getElementById("buddiesModal");
    if (modal) modal.remove();
}
window.closeBuddiesModal = closeBuddiesModal;

function updateSidebarBuddyBadge(count) {
    const btn = document.getElementById("buddiesSidebarBtn");
    if (!btn) return;
    if (count > 0) {
        btn.innerHTML = `🤝 Academi Buddies <span style="background:#ef4444; color:#ffffff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:10px; margin-left:6px; vertical-align:middle; display:inline-block;">${count}</span>`;
    } else {
        btn.innerHTML = `🤝 Academi Buddies`;
    }
}
window.updateSidebarBuddyBadge = updateSidebarBuddyBadge;

/**
 * Open Academi Buddies & Study Streaks Modal
 */
async function openBuddiesModal() {
    const existing = document.getElementById("buddiesModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.className = "modal-overlay is-open";
    modal.id = "buddiesModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "9999";
    modal.style.padding = "20px";

    modal.addEventListener("click", function(e) {
        if (e.target === modal) closeBuddiesModal();
    });

    modal.innerHTML = `
        <div class="modal-box" style="max-width:680px; width:100%; max-height:88vh; overflow-y:auto; padding:0; background:var(--theme-sidebar-bg, #0f172a); color:#f8fafc; border-radius:14px; border:1px solid var(--theme-sidebar-border, rgba(255,255,255,0.15)); box-shadow:0 25px 50px -12px rgba(0,0,0,0.6), 0 0 25px var(--theme-accent-glow, transparent);">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:18px 24px; background:var(--theme-header-bg, #1e293b); border-bottom:1px solid var(--theme-header-border, rgba(255,255,255,0.1)); border-radius:14px 14px 0 0;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">🤝</span>
                    <div>
                        <div style="font-size:16px; font-weight:800; color:var(--theme-header-title, #ffffff);">${escapeHtml(typeof t === "function" ? t("buddies_modal_title", "Academi Buddies & Study Streaks") : "Academi Buddies & Study Streaks")}</div>
                        <div style="font-size:12px; color:var(--theme-active-nav-color, #e2e8f0);">${escapeHtml(typeof t === "function" ? t("buddies_modal_subtitle", "Connect with classmates, share study streaks and motivate each other") : "Connect with classmates, share study streaks and motivate each other")}</div>
                    </div>
                </div>
                <button type="button" onclick="closeBuddiesModal()" style="background:rgba(255,255,255,0.1); border:none; color:#ffffff; font-size:14px; font-weight:700; width:28px; height:28px; border-radius:50%; cursor:pointer;">✕</button>
            </div>

            <!-- Content Area -->
            <div style="padding:24px;">
                <!-- Add Buddy Bar -->
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <input
                        type="text"
                        id="addBuddyInput"
                        placeholder="${escapeHtml(typeof t === 'function' ? t('buddies_input_placeholder', 'Enter classmate\'s email or username to send invite...') : 'Enter classmate\'s email or username to send invite...')}"
                        style="flex:1; padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid var(--theme-sidebar-border, #334155); border-radius:8px; color:#ffffff; font-size:13px;"
                        onkeydown="if(event.key === 'Enter') addClassmateBuddy()"
                    >
                    <button
                        type="button"
                        onclick="addClassmateBuddy()"
                        style="padding:10px 20px; background:var(--theme-accent-gradient, #2563eb); color:#ffffff; font-weight:700; font-size:13px; border:none; border-radius:8px; cursor:pointer; box-shadow:0 3px 10px var(--theme-accent-glow, rgba(0,0,0,0.2));"
                    >
                        ${escapeHtml(typeof t === "function" ? t("btn_send_invite", "+ Send Invite") : "+ Send Invite")}
                    </button>
                </div>

                <div id="buddiesContentList">
                    <div style="text-align:center; padding:24px; color:#94a3b8;">Loading...</div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    await loadBuddiesList(false);
    startBuddiesPolling();
}
window.openBuddiesModal = openBuddiesModal;

async function loadBuddiesList(silent = false) {
    const listEl = document.getElementById("buddiesContentList");
    if (!listEl) return;

    if (!silent) {
        listEl.innerHTML = `<div style="text-align:center; padding:24px; color:#94a3b8;">Loading buddies and study stats...</div>`;
    }

    try {
        const data = await fetchJson(`${API_URL}/buddies`);
        if (!data) throw new Error("Could not load buddies");

        const myStreak = data.myStreak || 0;
        const myWeekly = data.myWeeklyHours || 0;
        const buddies = data.buddies || [];
        const incoming = data.pendingIncoming || [];
        const outgoing = data.pendingOutgoing || [];

        // Check if an invitation was just accepted while viewing!
        if (lastKnownAcceptedCount !== -1 && buddies.length > lastKnownAcceptedCount) {
            const newlyAdded = buddies[buddies.length - 1];
            if (typeof showToast === "function") {
                showToast(`🎉 ${newlyAdded ? newlyAdded.name : "Your classmate"} accepted your buddy request!`, "success");
            }
        }
        if (lastKnownIncomingCount !== -1 && incoming.length > lastKnownIncomingCount) {
            if (typeof showToast === "function") {
                showToast(`📬 You have a new buddy invitation!`, "info");
            }
        }

        lastKnownAcceptedCount = buddies.length;
        lastKnownIncomingCount = incoming.length;
        updateSidebarBuddyBadge(incoming.length);

        const myUser = typeof getStoredUser === "function" ? getStoredUser() : null;
        const myName = myUser ? (myUser.name || "Me") : "Me";

        const incomingHtml = incoming.length ? `
            <div style="background:rgba(59, 130, 246, 0.12); border:1px solid rgba(59, 130, 246, 0.35); border-radius:10px; padding:14px 16px; margin-bottom:18px;">
                <div style="font-weight:800; font-size:13px; color:#60a5fa; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                    <span>📬</span> Buddy Requests (${incoming.length})
                </div>
                ${incoming.map(req => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(0,0,0,0.25); border-radius:8px; margin-bottom:6px; flex-wrap:wrap; gap:8px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${escapeHtml(typeof getAvatarSrc === 'function' ? getAvatarSrc(req.avatar) : 'icons/' + (req.avatar || 'pp.png'))}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.1);">
                            <div>
                                <div style="font-weight:700; font-size:13px; color:#ffffff;">${escapeHtml(req.senderName)}</div>
                                <div style="font-size:11px; color:#94a3b8;">${escapeHtml(req.department || req.gradeLevel || 'Student')}</div>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" onclick="acceptBuddyInvitation(${req.invitationId})" style="padding:6px 14px; background:#10b981; color:#fff; border:none; border-radius:6px; font-weight:700; font-size:11.5px; cursor:pointer;">
                                ✅ Accept
                            </button>
                            <button type="button" onclick="declineBuddyInvitation(${req.invitationId})" style="padding:6px 12px; background:rgba(255,255,255,0.1); color:#cbd5e1; border:none; border-radius:6px; font-weight:600; font-size:11.5px; cursor:pointer;">
                                ✕ Decline
                            </button>
                        </div>
                    </div>
                `).join("")}
            </div>
        ` : "";

        const outgoingHtml = outgoing.length ? `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 14px; margin-bottom:18px;">
                <div style="font-weight:700; font-size:12px; color:#94a3b8; margin-bottom:8px;">⏳ Sent Invitations (${outgoing.length})</div>
                ${outgoing.map(out => `
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#cbd5e1; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                        <span>Waiting for <strong>${escapeHtml(out.recipientName)}</strong> to accept...</span>
                        <button type="button" onclick="declineBuddyInvitation(${out.invitationId})" style="background:none; border:none; color:#f87171; font-size:11.5px; cursor:pointer;" title="Cancel invitation">Cancel</button>
                    </div>
                `).join("")}
            </div>
        ` : "";

        const buddyCards = buddies.map((b, idx) => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:15px; font-weight:800; color:#94a3b8; width:22px;">#${idx + 2}</div>
                    <img src="${escapeHtml(typeof getAvatarSrc === 'function' ? getAvatarSrc(b.avatar) : 'icons/' + (b.avatar || 'pp.png'))}" alt="Avatar" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.1);">
                    <div>
                        <div style="font-weight:700; color:#f8fafc; font-size:13px;">${escapeHtml(b.name)}</div>
                        <div style="font-size:11px; color:#94a3b8;">${escapeHtml(typeof formatLocalizedGradeLevel === 'function' ? formatLocalizedGradeLevel(b.gradeLevel) : b.gradeLevel || (typeof t === 'function' ? t('grade_student', 'Student') : 'Student'))}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:16px;">
                    <div style="text-align:right;">
                        <div style="font-size:13px; font-weight:700; color:#fbbf24;">${(typeof t === 'function' ? t('buddies_streak_text', { n: b.streak }) : `🔥 ${b.streak} day streak`)}</div>
                        <div style="font-size:11px; color:#94a3b8;">${(typeof t === 'function' ? t('buddies_logged_week', { n: b.weeklyHours }) : `${b.weeklyHours}h this week`)}</div>
                    </div>
                    <button
                        type="button"
                        onclick="removeBuddyClassmate(${b.id})"
                        style="background:none; border:none; color:#ef4444; font-size:13px; cursor:pointer; padding:4px;"
                        title="${escapeHtml(typeof t === 'function' ? t('buddies_remove_btn', 'Remove Buddy') : 'Remove Buddy')}"
                    >🗑️</button>
                </div>
            </div>
        `).join("");

        listEl.innerHTML = `
            ${incomingHtml}
            ${outgoingHtml}

            <!-- My Current Stats Banner -->
            <div style="background:linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05)); border:1px solid rgba(16, 185, 129, 0.3); border-radius:10px; padding:16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:15px; font-weight:800; color:#34d399; width:22px;">#1</div>
                    <img src="${escapeHtml(typeof getAvatarSrc === 'function' ? getAvatarSrc(myUser?.avatar) : 'icons/' + (myUser?.avatar || 'pp.png'))}" alt="My Avatar" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid #34d399;">
                    <div>
                        <div style="font-weight:800; color:#ffffff; font-size:14px;">${escapeHtml(myName)} ${escapeHtml(typeof t === 'function' ? t('buddies_you', '(You)') : '(You)')}</div>
                        <div style="font-size:11px; color:#a7f3d0;">${escapeHtml(typeof t === 'function' ? t('buddies_profile_desc', 'Your Academic Study Profile') : 'Your Academic Study Profile')}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:15px; font-weight:800; color:#f59e0b;">${(typeof t === 'function' ? t('buddies_streak_text', { n: myStreak }) : `🔥 ${myStreak} day streak`)}</div>
                    <div style="font-size:12px; color:#94a3b8;">${(typeof t === 'function' ? t('buddies_logged_week', { n: myWeekly }) : `${myWeekly}h logged this week`)}</div>
                </div>
            </div>

            <div style="font-size:13px; font-weight:700; color:#cbd5e1; margin-bottom:12px;">
                ${(typeof t === 'function' ? t('buddies_leaderboard_title', { n: buddies.length + 1 }) : `🏆 Weekly Study Leaderboard (${buddies.length + 1} students)`)}
            </div>

            ${buddies.length ? buddyCards : `
                <div style="text-align:center; padding:24px; color:#94a3b8; background:rgba(255,255,255,0.02); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
                    <div>${escapeHtml(typeof t === 'function' ? t('buddies_no_buddies', '👋 No buddies added yet!') : '👋 No buddies added yet!')}</div>
                    <div style="font-size:12px; margin-top:4px;">${escapeHtml(typeof t === 'function' ? t('buddies_invite_tip', 'Type your classmate\'s email or name above to send an invitation. Once they accept, you\'ll study and maintain streaks together!') : 'Type your classmate\'s email or name above to send an invitation. Once they accept, you\'ll study and maintain streaks together!')}</div>
                </div>
            `}
        `;
    } catch (e) {
        if (!silent) {
            listEl.innerHTML = `
                <div style="text-align:center; padding:24px; color:#94a3b8; background:rgba(255,255,255,0.02); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
                    <div style="font-size:24px; margin-bottom:6px;">⚡</div>
                    <div style="font-size:14px; font-weight:700; color:#f8fafc; margin-bottom:4px;">Connecting to leaderboard...</div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:12px;">The server may be waking up or syncing.</div>
                    <button type="button" onclick="loadBuddiesList()" style="padding:7px 18px; background:var(--theme-accent-gradient, #2563eb); color:#ffffff; font-weight:700; font-size:12px; border:none; border-radius:6px; cursor:pointer;">
                        🔄 Retry Now
                    </button>
                </div>
            `;
        }
    }
}

async function checkBackgroundBuddySync() {
    try {
        const data = await fetchJson(`${API_URL}/buddies`);
        if (!data) return;
        const buddies = data.buddies || [];
        const incoming = data.pendingIncoming || [];

        if (lastKnownAcceptedCount !== -1 && buddies.length > lastKnownAcceptedCount) {
            const newlyAdded = buddies[buddies.length - 1];
            if (typeof showToast === "function") {
                showToast(`🎉 ${newlyAdded ? newlyAdded.name : "A classmate"} accepted your buddy request!`, "success");
            }
            if (typeof refreshCurrentView === "function") refreshCurrentView();
        }

        lastKnownAcceptedCount = buddies.length;
        lastKnownIncomingCount = incoming.length;
        updateSidebarBuddyBadge(incoming.length);

        const modal = document.getElementById("buddiesModal");
        if (modal) loadBuddiesList(true);
    } catch (e) {}
}

// Listen for tab focus and visibility changes to auto-sync instantly!
window.addEventListener("focus", checkBackgroundBuddySync);
document.addEventListener("visibilitychange", function() {
    if (!document.hidden) checkBackgroundBuddySync();
});
// Periodic background check every 15 seconds
setInterval(checkBackgroundBuddySync, 15000);
setTimeout(checkBackgroundBuddySync, 2000);

async function addClassmateBuddy() {
    const input = document.getElementById("addBuddyInput");
    const query = input ? input.value.trim() : "";
    if (!query) {
        showToast("Please enter an email or username.", "warning");
        return;
    }

    const btn = document.querySelector("#buddiesModal button[onclick='addClassmateBuddy()']");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending...";
    }

    try {
        const res = await fetch(`${API_URL}/buddies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailOrName: query })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to send invitation");

        showToast(json.message || "Invitation sent!", "success");
        if (input) input.value = "";
        await loadBuddiesList(false);
    } catch (e) {
        showToast(e.message || "Could not send invitation.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "+ Send Invite";
        }
    }
}
window.addClassmateBuddy = addClassmateBuddy;

async function acceptBuddyInvitation(invitationId) {
    try {
        const res = await fetch(`${API_URL}/buddies/${invitationId}/accept`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" }
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to accept");

        showToast(json.message || "Invitation accepted! 🎉", "success");
        await loadBuddiesList();
    } catch (e) {
        showToast(e.message || "Could not accept invitation.", "error");
    }
}
window.acceptBuddyInvitation = acceptBuddyInvitation;

async function declineBuddyInvitation(invitationId) {
    try {
        const res = await fetch(`${API_URL}/buddies/${invitationId}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Failed to decline");

        showToast("Invitation declined.", "success");
        await loadBuddiesList();
    } catch (e) {
        showToast("Could not decline invitation.", "error");
    }
}
window.declineBuddyInvitation = declineBuddyInvitation;

async function removeBuddyClassmate(buddyId) {
    const confirmed = await showConfirm(
        typeof t === "function" ? t("confirm_remove_buddy_title", "Remove Buddy") : "Remove Buddy",
        typeof t === "function" ? t("confirm_remove_buddy_msg", "Are you sure you want to remove this buddy?") : "Are you sure you want to remove this buddy?",
        typeof t === "function" ? t("btn_delete", "Remove") : "Remove"
    );
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_URL}/buddies/${buddyId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Could not remove");
        showToast(typeof t === "function" ? t("toast_buddy_removed", "Buddy removed.") : "Buddy removed.", "success");
        await loadBuddiesList();
    } catch (e) {
        showToast(typeof t === "function" ? t("toast_buddy_remove_err", "Could not remove buddy.") : "Could not remove buddy.", "error");
    }
}
window.removeBuddyClassmate = removeBuddyClassmate;

/**
 * Open Group Projects & Shared Tasks Modal
 */
async function openGroupProjectsModal() {
    const existing = document.getElementById("groupProjectsModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.className = "modal-overlay is-open";
    modal.id = "groupProjectsModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "9999";
    modal.style.padding = "20px";

    modal.innerHTML = `
        <div class="modal-box" style="max-width:800px; width:100%; max-height:88vh; overflow-y:auto; padding:0; background:#0f172a; color:#f8fafc; border-radius:14px; border:1px solid rgba(255,255,255,0.15); box-shadow:0 25px 50px -12px rgba(0,0,0,0.6);">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:18px 24px; background:linear-gradient(135deg, #1e3a8a, #2563eb); border-bottom:1px solid rgba(255,255,255,0.1); border-radius:14px 14px 0 0;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">👥</span>
                    <div>
                        <div style="font-size:16px; font-weight:800; color:#ffffff;">${escapeHtml(typeof t === 'function' ? t('group_modal_title', 'Group Projects & Shared Tasks') : 'Group Projects & Shared Tasks')}</div>
                        <div style="font-size:12px; color:#bfdbfe;">${escapeHtml(typeof t === 'function' ? t('group_modal_subtitle', 'Collaborate on term projects, assign tasks, and track member progress') : 'Collaborate on term projects, assign tasks, and track member progress')}</div>
                    </div>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button type="button" onclick="showCreateGroupProjectForm()" style="padding:6px 14px; background:#10b981; color:#ffffff; font-weight:700; font-size:12px; border:none; border-radius:6px; cursor:pointer;">
                        ${escapeHtml(typeof t === 'function' ? t('group_new_project_btn', '+ New Group Project') : '+ New Group Project')}
                    </button>
                    <button type="button" onclick="document.getElementById('groupProjectsModal').remove()" style="background:rgba(255,255,255,0.1); border:none; color:#ffffff; font-size:14px; font-weight:700; width:28px; height:28px; border-radius:50%; cursor:pointer;">✕</button>
                </div>
            </div>

            <!-- Content Area -->
            <div style="padding:24px;">
                <!-- Create Form Box (Collapsible) -->
                <div id="createGroupProjectBox" style="display:none; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:16px; margin-bottom:20px;">
                    <div style="font-size:14px; font-weight:700; color:#ffffff; margin-bottom:10px;">${escapeHtml(typeof t === 'function' ? t('group_create_title', 'Create Collaborative Project') : 'Create Collaborative Project')}</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                        <input type="text" id="gpTitle" placeholder="${escapeHtml(typeof t === 'function' ? t('group_title_placeholder', 'Project Title') : 'Project Title')}" style="padding:8px 12px; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#ffffff; font-size:13px;">
                        <input type="text" id="gpCourse" placeholder="${escapeHtml(typeof t === 'function' ? t('group_course_placeholder', 'Course Name') : 'Course Name')}" style="padding:8px 12px; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#ffffff; font-size:13px;">
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                        <input type="date" id="gpDueDate" style="padding:8px 12px; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#ffffff; font-size:13px;">
                        <input type="text" id="gpDesc" placeholder="${escapeHtml(typeof t === 'function' ? t('group_desc_placeholder', 'Brief project description...') : 'Brief project description...')}" style="padding:8px 12px; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#ffffff; font-size:13px;">
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:8px;">
                        <button type="button" onclick="document.getElementById('createGroupProjectBox').style.display='none'" style="padding:6px 14px; background:rgba(255,255,255,0.1); color:#ffffff; border:none; border-radius:6px; font-size:12px; cursor:pointer;">${escapeHtml(typeof t === 'function' ? t('btn_cancel', 'Cancel') : 'Cancel')}</button>
                        <button type="button" onclick="submitCreateGroupProject()" style="padding:6px 16px; background:#2563eb; color:#ffffff; font-weight:700; border:none; border-radius:6px; font-size:12px; cursor:pointer;">${escapeHtml(typeof t === 'function' ? t('group_save_btn', 'Save Project') : 'Save Project')}</button>
                    </div>
                </div>

                <div id="groupProjectsList">
                    <div style="text-align:center; padding:30px; color:#94a3b8;">Loading...</div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    await loadGroupProjectsList();
}
window.openGroupProjectsModal = openGroupProjectsModal;

function showCreateGroupProjectForm() {
    const box = document.getElementById("createGroupProjectBox");
    if (box) {
        box.style.display = box.style.display === "none" ? "block" : "none";
    }
}
window.showCreateGroupProjectForm = showCreateGroupProjectForm;

async function submitCreateGroupProject() {
    const title = document.getElementById("gpTitle")?.value.trim();
    const courseName = document.getElementById("gpCourse")?.value.trim();
    const dueDate = document.getElementById("gpDueDate")?.value;
    const description = document.getElementById("gpDesc")?.value.trim();

    if (!title) {
        showToast("Please enter a project title.", "warning");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/group-projects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, courseName, dueDate, description })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to create");

        showToast(json.message || "Project created!", "success");
        document.getElementById("createGroupProjectBox").style.display = "none";
        await loadGroupProjectsList();
    } catch (e) {
        showToast(e.message || "Could not create group project.", "error");
    }
}
window.submitCreateGroupProject = submitCreateGroupProject;

async function loadGroupProjectsList() {
    const listEl = document.getElementById("groupProjectsList");
    if (!listEl) return;

    try {
        const res = await fetch(`${API_URL}/group-projects`);
        if (!res.ok) throw new Error("Failed to load");

        const json = await res.json();
        const projects = json.projects || [];

        if (!projects.length) {
            listEl.innerHTML = `
                <div style="text-align:center; padding:32px; color:#94a3b8; background:rgba(255,255,255,0.02); border-radius:10px; border:1px dashed rgba(255,255,255,0.1);">
                    <div style="font-size:28px; margin-bottom:8px;">👥</div>
                    <div style="font-size:14px; font-weight:700; color:#f8fafc;">${escapeHtml(typeof t === 'function' ? t('group_no_projects', 'No group projects yet!') : 'No group projects yet!')}</div>
                    <div style="font-size:12px; margin-top:4px;">${escapeHtml(typeof t === 'function' ? t('group_no_projects_tip', 'Click "+ New Group Project" above to collaborate with classmates.') : 'Click "+ New Group Project" above to collaborate with classmates.')}</div>
                </div>
            `;
            return;
        }

        listEl.innerHTML = projects.map(p => {
            const total = p.totalTasks || 0;
            const done = p.completedTasks || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            const memberAvatars = (p.members || []).map(m => `
                <img src="${escapeHtml(typeof getAvatarSrc === 'function' ? getAvatarSrc(m.avatar) : 'icons/' + (m.avatar || 'pp.png'))}" title="${escapeHtml(m.name)}" alt="${escapeHtml(m.name)}" style="width:26px; height:26px; border-radius:50%; object-fit:cover; border:2px solid #0f172a; margin-left:-6px;">
            `).join("");

            return `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                        <div>
                            <div style="font-size:15px; font-weight:800; color:#f8fafc;">${escapeHtml(p.title)}</div>
                            <div style="font-size:12px; color:#94a3b8;">${escapeHtml(p.courseName || "")} • 📅 ${escapeHtml(typeof t === 'function' ? t('deadlines_due_date', 'Due Date') : 'Due Date')}: ${escapeHtml(toDateText(p.dueDate))}</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="display:flex; align-items:center;">${memberAvatars}</div>
                            <button type="button" onclick="inviteMemberToProject(${p.id})" style="padding:4px 8px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#ffffff; font-size:11px; cursor:pointer;" title="Invite classmate">${escapeHtml(typeof t === 'function' ? t('group_invite_btn', '+ Invite') : '+ Invite')}</button>
                            ${p.isOwner ? `<button type="button" onclick="deleteGroupProjectById(${p.id})" style="background:none; border:none; color:#ef4444; font-size:12px; cursor:pointer;" title="Delete Project">🗑️</button>` : ""}
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div style="margin-bottom:12px;">
                        <div style="display:flex; justify-content:space-between; font-size:11px; color:#cbd5e1; margin-bottom:4px;">
                            <span>${escapeHtml(typeof t === 'function' ? t('group_tasks_progress', 'Tasks Progress') : 'Tasks Progress')} (${done}/${total})</span>
                            <span style="font-weight:700; color:#60a5fa;">${pct}%</span>
                        </div>
                        <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
                            <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, #3b82f6, #10b981); transition:width 0.3s ease;"></div>
                        </div>
                    </div>

                    <!-- Tasks Accordion Trigger -->
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
                        <button type="button" onclick="toggleProjectTasksView(${p.id})" style="background:none; border:none; color:#93c5fd; font-size:12px; font-weight:700; cursor:pointer; padding:0;">
                            📋 ${escapeHtml(typeof t === 'function' ? t('group_view_subtasks', 'View & Manage Subtasks') : 'View & Manage Subtasks')} ▾
                        </button>
                    </div>

                    <!-- Tasks Container -->
                    <div id="gpTasks_${p.id}" style="display:none; margin-top:12px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.1);">
                        <div style="display:flex; gap:8px; margin-bottom:10px;">
                            <input type="text" id="newTaskInput_${p.id}" placeholder="${escapeHtml(typeof t === 'function' ? t('group_add_subtask_placeholder', 'Add subtask (e.g. Prepare Slide 1-5)...') : 'Add subtask (e.g. Prepare Slide 1-5)...')}" style="flex:1; padding:7px 10px; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#ffffff; font-size:12px;">
                            <button type="button" onclick="addGroupSubtask(${p.id})" style="padding:7px 14px; background:#2563eb; color:#ffffff; font-weight:700; border:none; border-radius:6px; font-size:12px; cursor:pointer;">${escapeHtml(typeof t === 'function' ? t('group_add_task_btn', '+ Add Task') : '+ Add Task')}</button>
                        </div>
                        <div id="gpTasksList_${p.id}" style="font-size:12px; color:#94a3b8;">Loading tasks...</div>
                    </div>
                </div>
            `;
        }).join("");
    } catch (e) {
        listEl.innerHTML = `<div style="padding:20px; text-align:center; color:#f87171;">Could not load group projects.</div>`;
    }
}

async function inviteMemberToProject(projectId) {
    const email = prompt("Enter the classmate's registered email:");
    if (!email || !email.trim()) return;

    try {
        const res = await fetch(`${API_URL}/group-projects/${projectId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim() })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Could not add");

        showToast(json.message || "Classmate added to project!", "success");
        await loadGroupProjectsList();
    } catch (e) {
        showToast(e.message || "Could not add member.", "error");
    }
}
window.inviteMemberToProject = inviteMemberToProject;

async function deleteGroupProjectById(projectId) {
    const confirmed = await showConfirm(
        typeof t === "function" ? t("confirm_del_grp_proj_title", "Delete Project") : "Delete Project",
        typeof t === "function" ? t("confirm_del_grp_proj_msg", "Are you sure you want to delete this group project?") : "Are you sure you want to delete this group project?",
        typeof t === "function" ? t("btn_delete", "Delete") : "Delete"
    );
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_URL}/group-projects/${projectId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Could not delete");
        showToast(typeof t === "function" ? t("toast_grp_proj_deleted", "Group project deleted.") : "Group project deleted.", "success");
        await loadGroupProjectsList();
    } catch (e) {
        showToast(typeof t === "function" ? t("toast_grp_proj_delete_err", "Could not delete project.") : "Could not delete project.", "error");
    }
}
window.deleteGroupProjectById = deleteGroupProjectById;

async function toggleProjectTasksView(projectId) {
    const box = document.getElementById(`gpTasks_${projectId}`);
    if (!box) return;

    const isOpening = box.style.display === "none";
    box.style.display = isOpening ? "block" : "none";

    if (isOpening) {
        await loadProjectTasks(projectId);
    }
}
window.toggleProjectTasksView = toggleProjectTasksView;

async function loadProjectTasks(projectId) {
    const listEl = document.getElementById(`gpTasksList_${projectId}`);
    if (!listEl) return;

    try {
        const res = await fetch(`${API_URL}/group-projects/${projectId}/tasks`);
        if (!res.ok) throw new Error("Failed");

        const json = await res.json();
        const tasks = json.tasks || [];

        if (!tasks.length) {
            listEl.innerHTML = `<div style="padding:8px 0; color:#64748b;">No subtasks created yet. Add one above!</div>`;
            return;
        }

        listEl.innerHTML = tasks.map(t => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 8px; background:rgba(255,255,255,0.02); border-radius:6px; margin-bottom:6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" ${Number(t.isDone) === 1 ? "checked" : ""} onchange="toggleGroupSubtaskDone(${projectId}, ${t.id}, this.checked)" style="cursor:pointer;">
                    <span style="color:${Number(t.isDone) === 1 ? '#94a3b8' : '#ffffff'}; text-decoration:${Number(t.isDone) === 1 ? 'line-through' : 'none'}; font-size:12px;">
                        ${escapeHtml(t.title)}
                    </span>
                </div>
                <button type="button" onclick="deleteGroupSubtask(${projectId}, ${t.id})" style="background:none; border:none; color:#ef4444; font-size:11px; cursor:pointer;">✕</button>
            </div>
        `).join("");
    } catch (e) {
        listEl.innerHTML = `<div style="color:#f87171;">Could not load tasks.</div>`;
    }
}

async function addGroupSubtask(projectId) {
    const input = document.getElementById(`newTaskInput_${projectId}`);
    const title = input ? input.value.trim() : "";
    if (!title) return;

    try {
        const res = await fetch(`${API_URL}/group-projects/${projectId}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title })
        });

        if (!res.ok) throw new Error("Failed");
        if (input) input.value = "";
        await loadProjectTasks(projectId);
        await loadGroupProjectsList();
    } catch (e) {
        showToast("Could not add task.", "error");
    }
}
window.addGroupSubtask = addGroupSubtask;

async function toggleGroupSubtaskDone(projectId, taskId, isDone) {
    try {
        await fetch(`${API_URL}/group-projects/${projectId}/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDone })
        });
        await loadProjectTasks(projectId);
        await loadGroupProjectsList();
    } catch (e) {
        showToast("Could not update task.", "error");
    }
}
window.toggleGroupSubtaskDone = toggleGroupSubtaskDone;

async function deleteGroupSubtask(projectId, taskId) {
    try {
        await fetch(`${API_URL}/group-projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
        await loadProjectTasks(projectId);
        await loadGroupProjectsList();
    } catch (e) {
        showToast("Could not delete task.", "error");
    }
}
window.deleteGroupSubtask = deleteGroupSubtask;
