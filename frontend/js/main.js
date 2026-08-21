/* ─── EVENTS ──────────────────────────────────────────────────────────────────*/

document.getElementById("dashboardBtn")?.addEventListener("click", loadDashboard);
document.getElementById("coursesBtn")?.addEventListener("click", loadCourses);
document.getElementById("examsBtn")?.addEventListener("click", loadExamsPage);
document.getElementById("studyBtn")?.addEventListener("click", loadStudyPage);
document.getElementById("settingsBtn")?.addEventListener("click", loadSettingsPage);


/* ─── START ───────────────────────────────────────────────────────────────────*/

window.onAuthenticated = loadDashboard;