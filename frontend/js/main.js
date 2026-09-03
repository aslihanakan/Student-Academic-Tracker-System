/* ─── EVENTS ──────────────────────────────────────────────────────────────────*/

document.getElementById("dashboardBtn")?.addEventListener("click", loadDashboard);
document.getElementById("coursesBtn")?.addEventListener("click", loadCourses);
document.getElementById("examsBtn")?.addEventListener("click", loadExamsPage);
document.getElementById("studyBtn")?.addEventListener("click", loadStudyPage);
document.getElementById("settingsBtn")?.addEventListener("click", loadSettingsPage);

document.getElementById("buddiesSidebarBtn")?.addEventListener("click", () => {
    if (typeof openBuddiesModal === "function") openBuddiesModal();
});
document.getElementById("groupProjectsSidebarBtn")?.addEventListener("click", () => {
    if (typeof openGroupProjectsModal === "function") openGroupProjectsModal();
});


/* ─── START ───────────────────────────────────────────────────────────────────*/

window.onAuthenticated = function() {
    loadDashboard();
    if (typeof initAiChatBubble === "function") {
        initAiChatBubble();
    }
};