/* ==============================================================================
   ACADEMI BUDDY - AI ACADEMIC COACH & SMART SYLLABUS IMPORT MODULE
   ============================================================================== */

/**
 * Open AI Academic Coach & GPA Target Advisor Modal
 */
async function openAiCoachModal(defaultTarget = 3.0) {
    // Remove existing modal if open
    const existing = document.getElementById("aiCoachModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.className = "modal-overlay is-open";
    modal.id = "aiCoachModal";
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
        <div class="modal-box" style="max-width:760px; width:100%; max-height:88vh; overflow-y:auto; padding:0; background:#0f172a; color:#f8fafc; border-radius:14px; border:1px solid rgba(255,255,255,0.15); box-shadow:0 25px 50px -12px rgba(0,0,0,0.6);">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:18px 24px; background:linear-gradient(135deg, #1e1b4b, #312e81); border-bottom:1px solid rgba(255,255,255,0.1); border-radius:14px 14px 0 0;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">🤖</span>
                    <div>
                        <div style="font-size:16px; font-weight:800; color:#ffffff;">AI Academic Coach &amp; GPA Advisor</div>
                        <div style="font-size:12px; color:#c7d2fe;">Personalized study strategy and target final score calculations</div>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('aiCoachModal').remove()" style="background:rgba(255,255,255,0.1); border:none; color:#ffffff; font-size:14px; font-weight:700; width:28px; height:28px; border-radius:50%; cursor:pointer;">✕</button>
            </div>

            <!-- Content Area -->
            <div style="padding:24px;">
                <!-- Target GPA Selector -->
                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:14px 18px; border-radius:10px; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                    <div>
                        <div style="font-size:13px; font-weight:700; color:#ffffff;">Target Cumulative GPA</div>
                        <div style="font-size:11px; color:#94a3b8;">Choose the GPA you want to achieve this semester</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <select id="aiTargetGpaSelect" style="background:#1e293b; color:#ffffff; border:1px solid #334155; padding:6px 12px; border-radius:8px; font-weight:700; font-size:14px;">
                            <option value="2.50" ${defaultTarget == 2.5 ? "selected" : ""}>2.50 (Average)</option>
                            <option value="3.00" ${defaultTarget == 3.0 ? "selected" : ""}>3.00 (Honors)</option>
                            <option value="3.50" ${defaultTarget == 3.5 ? "selected" : ""}>3.50 (High Honors)</option>
                            <option value="3.80" ${defaultTarget == 3.8 ? "selected" : ""}>3.80 (Dean's List)</option>
                        </select>
                        <button type="button" onclick="refreshAiCoachAdvice()" style="background:#4f46e5; color:#ffffff; font-weight:700; border:none; padding:7px 16px; border-radius:8px; cursor:pointer; font-size:13px;">
                            Analyze
                        </button>
                    </div>
                </div>

                <div id="aiCoachLoading" style="text-align:center; padding:30px 0; color:#94a3b8;">
                    <div style="font-size:28px; margin-bottom:8px; animation:spin 1s infinite linear;">⚙️</div>
                    <div>Analyzing your grades, weights, and study habits...</div>
                </div>

                <div id="aiCoachResults" style="display:none;"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    await refreshAiCoachAdvice();
}
window.openAiCoachModal = openAiCoachModal;

async function refreshAiCoachAdvice() {
    const targetGpa = document.getElementById("aiTargetGpaSelect")?.value || 3.0;
    const loadingEl = document.getElementById("aiCoachLoading");
    const resultsEl = document.getElementById("aiCoachResults");

    if (loadingEl) loadingEl.style.display = "block";
    if (resultsEl) resultsEl.style.display = "none";

    try {
        const res = await fetch(`${API_URL}/ai/coach`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetGpa })
        });

        if (!res.ok) {
            throw new Error("Could not fetch advice");
        }

        const json = await res.json();
        const data = json.data;

        if (loadingEl) loadingEl.style.display = "none";
        if (resultsEl) {
            resultsEl.style.display = "block";

            const courseRows = (data.courseAnalyses || []).map(ca => {
                const targetText = ca.neededForTarget !== null ? `${ca.neededForTarget}` : "Pass";
                const passText = ca.neededForPass !== null ? `${ca.neededForPass}` : "-";
                const riskBadge = ca.isRisk
                    ? `<span style="background:rgba(239,68,68,0.2); color:#f87171; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:700;">HIGH RISK</span>`
                    : `<span style="background:rgba(34,197,94,0.2); color:#4ade80; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:700;">ON TRACK</span>`;

                return `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.06); font-size:12px;">
                        <td style="padding:10px 8px; font-weight:600; color:#f1f5f9;">${escapeHtml(ca.courseName)}</td>
                        <td style="padding:10px 8px; text-align:center; color:#94a3b8;">${ca.credit}</td>
                        <td style="padding:10px 8px; text-align:center; font-weight:700; color:${ca.neededForPass > 70 ? '#f87171' : '#f1f5f9'};">${passText}</td>
                        <td style="padding:10px 8px; text-align:center; font-weight:700; color:#60a5fa;">${targetText}</td>
                        <td style="padding:10px 8px; text-align:center; color:#cbd5e1;">~${ca.recommendedWeeklyHours}h / wk</td>
                        <td style="padding:10px 8px; text-align:center;">${riskBadge}</td>
                    </tr>
                `;
            }).join("");

            const recsHtml = (data.recommendations || []).map(r => `
                <div style="margin-bottom:8px; line-height:1.5; font-size:12.5px; color:#cbd5e1;">
                    ${escapeHtml(r).replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ffffff;">$1</strong>')}
                </div>
            `).join("");

            resultsEl.innerHTML = `
                <!-- Recommendations Box -->
                <div style="background:rgba(79, 70, 229, 0.1); border:1px solid rgba(99, 102, 241, 0.25); border-radius:10px; padding:16px; margin-bottom:20px;">
                    <div style="font-weight:700; font-size:13px; color:#a5b4fc; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                        <span>💡</span> AI Coach Action Plan:
                    </div>
                    ${recsHtml}
                </div>

                <!-- Course Breakdown Table -->
                <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead>
                            <tr style="background:rgba(255,255,255,0.04); font-size:11px; text-transform:uppercase; color:#94a3b8;">
                                <th style="padding:8px;">Course</th>
                                <th style="padding:8px; text-align:center;">Credits</th>
                                <th style="padding:8px; text-align:center;">Final to Pass</th>
                                <th style="padding:8px; text-align:center;">Final for ${targetGpa}</th>
                                <th style="padding:8px; text-align:center;">Study Time</th>
                                <th style="padding:8px; text-align:center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>${courseRows || '<tr><td colspan="6" style="padding:16px; text-align:center; color:#94a3b8;">No courses available.</td></tr>'}</tbody>
                    </table>
                </div>
            `;
        }
    } catch (e) {
        if (loadingEl) loadingEl.style.display = "none";
        if (resultsEl) {
            resultsEl.style.display = "block";
            resultsEl.innerHTML = `<div style="padding:20px; text-align:center; color:#f87171;">Could not load AI recommendations right now. Please try again later.</div>`;
        }
    }
}
window.refreshAiCoachAdvice = refreshAiCoachAdvice;

/**
 * Open Smart Syllabus Import Modal
 */
function openSyllabusImportModal() {
    const existing = document.getElementById("syllabusImportModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.className = "modal-overlay is-open";
    modal.id = "syllabusImportModal";
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
        <div class="modal-box" style="max-width:720px; width:100%; max-height:88vh; overflow-y:auto; padding:0; background:#ffffff; border-radius:14px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4); color:#0f172a;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:18px 24px; background:#0f172a; color:#ffffff; border-radius:14px 14px 0 0;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">📑</span>
                    <div>
                        <div style="font-size:16px; font-weight:800;">Smart Syllabus Import</div>
                        <div style="font-size:12px; color:#94a3b8;">Paste your course syllabus / outline to auto-extract exams &amp; deadlines</div>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('syllabusImportModal').remove()" style="background:rgba(255,255,255,0.1); border:none; color:#ffffff; font-size:14px; font-weight:700; width:28px; height:28px; border-radius:50%; cursor:pointer;">✕</button>
            </div>

            <!-- Content Area -->
            <div style="padding:24px;">
                <label style="display:block; font-size:13px; font-weight:700; color:#334155; margin-bottom:6px;">
                    Paste Course Syllabus / Outline Text:
                </label>
                <textarea
                    id="syllabusTextInput"
                    rows="8"
                    placeholder="Example:&#10;Course: CS301 Database Systems&#10;Instructor: Dr. Sarah Jenkins&#10;Credits: 4&#10;Grading: Midterm 30%, Term Project 20%, Final 50%&#10;Midterm Exam Date: 2026-11-20&#10;Project Deadline: 2026-12-15&#10;Final Exam Date: 2027-01-08"
                    style="width:100%; border:1px solid #cbd5e1; border-radius:8px; padding:12px; font-family:monospace; font-size:12.5px; resize:vertical;"
                ></textarea>

                <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:11px; color:#64748b;">Supported: Course name, instructor, credits, grading weights, exam and project dates.</div>
                    <button
                        type="button"
                        onclick="parseSyllabusContent()"
                        style="padding:9px 20px; background:linear-gradient(135deg, #2563eb, #1d4ed8); color:#ffffff; border:none; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer;"
                    >
                        ✨ Parse Syllabus
                    </button>
                </div>

                <div id="syllabusParsePreview" style="margin-top:20px; display:none;"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}
window.openSyllabusImportModal = openSyllabusImportModal;

async function parseSyllabusContent() {
    const text = document.getElementById("syllabusTextInput")?.value || "";
    if (!text.trim()) {
        showToast("Please paste your syllabus text first.", "warning");
        return;
    }

    const previewEl = document.getElementById("syllabusParsePreview");
    if (!previewEl) return;

    previewEl.style.display = "block";
    previewEl.innerHTML = `<div style="text-align:center; padding:18px; color:#64748b;">⏳ Extracting course details and dates...</div>`;

    try {
        const res = await fetch(`${API_URL}/ai/parse-syllabus`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        if (!res.ok) throw new Error("Parse failed");

        const json = await res.json();
        const data = json.data;
        window._pendingSyllabusData = data;

        previewEl.innerHTML = `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                <div style="font-size:14px; font-weight:800; color:#1e293b; margin-bottom:10px;">
                    ✅ Extracted Course &amp; Deadlines Preview
                </div>

                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:14px; font-size:12px;">
                    <div style="background:#ffffff; border:1px solid #cbd5e1; padding:8px; border-radius:6px;">
                        <span style="color:#64748b; font-size:11px;">Course:</span>
                        <div style="font-weight:700; color:#0f172a;">${escapeHtml(data.courseName)}</div>
                    </div>
                    <div style="background:#ffffff; border:1px solid #cbd5e1; padding:8px; border-radius:6px;">
                        <span style="color:#64748b; font-size:11px;">Instructor:</span>
                        <div style="font-weight:700; color:#0f172a;">${escapeHtml(data.instructorName)}</div>
                    </div>
                    <div style="background:#ffffff; border:1px solid #cbd5e1; padding:8px; border-radius:6px;">
                        <span style="color:#64748b; font-size:11px;">Credits &amp; Weights:</span>
                        <div style="font-weight:700; color:#0f172a;">${data.credit} Cr • Mid ${data.midtermWeight}% • Proj ${data.projectWeight}%</div>
                    </div>
                </div>

                <div style="font-size:12px; font-weight:700; color:#334155; margin-bottom:6px;">Detected Deadlines:</div>
                <ul style="margin:0 0 16px 0; padding-left:18px; font-size:12px; color:#475569;">
                    ${(data.exams || []).map(e => `<li>📝 <strong>${escapeHtml(e.examName)}</strong>: ${e.examDate ? toDateText(e.examDate) : 'Date TBD'} (${e.weight}%)</li>`).join("")}
                    ${(data.projects || []).map(p => `<li>🚀 <strong>${escapeHtml(p.projectName)}</strong>: ${p.dueDate ? toDateText(p.dueDate) : 'Date TBD'}</li>`).join("")}
                    ${(data.activities || []).map(a => `<li>📌 <strong>${escapeHtml(a.title)}</strong>: ${a.dueDate ? toDateText(a.dueDate) : 'Date TBD'}</li>`).join("")}
                </ul>

                <button
                    type="button"
                    onclick="confirmImportSyllabus()"
                    style="width:100%; padding:11px; background:linear-gradient(135deg, #16a34a, #15803d); color:#ffffff; font-weight:700; font-size:13px; border:none; border-radius:8px; cursor:pointer;"
                >
                    📥 Confirm &amp; Import to My Courses &amp; Deadlines
                </button>
            </div>
        `;
    } catch (e) {
        previewEl.innerHTML = `<div style="padding:14px; text-align:center; color:#ef4444;">Could not parse text. Please ensure dates and course names are clear.</div>`;
    }
}
window.parseSyllabusContent = parseSyllabusContent;

async function confirmImportSyllabus() {
    const data = window._pendingSyllabusData;
    if (!data) return;

    try {
        const res = await fetch(`${API_URL}/ai/import-syllabus`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error("Import failed");

        const json = await res.json();
        showToast(json.message || "Course and deadlines imported successfully!", "success");

        const modal = document.getElementById("syllabusImportModal");
        if (modal) modal.remove();

        // Refresh current page
        if (window._currentActivePage === "exams" && typeof loadExamsPage === "function") {
            await loadExamsPage();
        } else if (window._currentActivePage === "courses" && typeof loadCourses === "function") {
            await loadCourses();
        }
    } catch (e) {
        showToast("Could not import syllabus. Please try again.", "error");
    }
}
window.confirmImportSyllabus = confirmImportSyllabus;
