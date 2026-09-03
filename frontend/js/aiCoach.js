/* ==============================================================================
   ACADEMI BUDDY - DRAGGABLE FLOATING AI STUDY BUDDY & SYLLABUS IMPORT MODULE
   ============================================================================== */

let aiChatHistory = [];
let isAiChatOpen = false;
let isAiBubbleDragging = false;

/**
 * Initialize Draggable Floating AI Chat Bubble on all pages
 */
function initAiChatBubble() {
    // Avoid duplicate initialization
    if (document.getElementById("aiChatFloatingRoot")) return;

    const root = document.createElement("div");
    root.id = "aiChatFloatingRoot";
    root.style.bottom = "24px";
    root.style.right = "24px";

    const chip1 = typeof t === "function" ? t("ai_chip_1", "👋 Hello, how are you?") : "👋 Hello, how are you?";
    const chip2 = typeof t === "function" ? t("ai_chip_2", "☕ How can I manage my study time?") : "☕ How can I manage my study time?";
    const chip3 = typeof t === "function" ? t("ai_chip_3", "🎯 Which course should I study most?") : "🎯 Which course should I study most?";
    const chip4 = typeof t === "function" ? t("ai_chip_4", "💻 Help me create a revision plan") : "💻 Help me create a revision plan";
    const welcomeMsg = typeof t === "function" ? t("ai_welcome_msg", "Hello! I am your AI Study Buddy. Feel free to ask anything about your courses, upcoming exams, or study schedule! 😊") : "Hello! I am your AI Study Buddy. Feel free to ask anything about your courses, upcoming exams, or study schedule! 😊";
    const currentAiImage = typeof getThemeAiImageSrc === "function" ? getThemeAiImageSrc() : "photos/ai.jpg";

    root.innerHTML = `
        <!-- Floating Draggable Button -->
        <button id="aiFloatingBubbleBtn" class="ai-floating-bubble-btn" type="button" title="${escapeHtml(typeof t === 'function' ? t('ai_bubble_title', 'Chat with AI Buddy (Draggable)') : 'Chat with AI Buddy (Draggable)')}">
            <img src="${currentAiImage}" alt="AI Chat" class="ai-bubble-img">
        </button>

        <!-- Floating Chat Window -->
        <div id="aiFloatingWindow" class="ai-floating-window is-hidden">
            <!-- Window Header / Drag Handle -->
            <div id="aiWindowHeader" class="ai-window-header" title="${escapeHtml(typeof t === 'function' ? t('ai_drag_tip', 'Hold & drag to move') : 'Hold & drag to move')}">
                <div class="ai-window-title-wrap">
                    <div style="width:36px; height:36px; border-radius:10px; overflow:hidden; border:1.5px solid rgba(255,255,255,0.25); background:#020617; display:flex; align-items:center; justify-content:center;">
                        <img src="${currentAiImage}" alt="AI" class="ai-header-thumb-img" style="width:100%; height:100%; object-fit:cover; object-position:center center; transform:scale(1.35);">
                    </div>
                    <div>
                        <div class="ai-window-title" id="aiWindowTitleText">
                            ${escapeHtml(typeof t === 'function' ? t('ai_header_title', 'AI Buddy') : 'AI Buddy')}
                        </div>
                        <div id="aiModeStatusBadge" class="ai-mode-status-badge">
                            <span class="ai-status-dot online"></span>
                            <span id="aiModeStatusText">Online</span>
                        </div>
                    </div>
                </div>
                <div class="ai-window-controls">
                    <button type="button" class="ai-header-btn" onclick="clearAiChatHistory()" title="Clear Chat">🗑️</button>
                    <button type="button" class="ai-header-btn" onclick="toggleAiChatWindow(false)" title="Close">✕</button>
                </div>
            </div>

            <!-- Suggested Quick Chips -->
            <div class="ai-chips-bar" id="aiChipsBarContainer">
                <button type="button" class="ai-chip-btn" onclick="sendAiChatMessage('${escapeForOnclick(chip1)}')">${escapeHtml(chip1)}</button>
                <button type="button" class="ai-chip-btn" onclick="sendAiChatMessage('${escapeForOnclick(chip2)}')">${escapeHtml(chip2)}</button>
                <button type="button" class="ai-chip-btn" onclick="sendAiChatMessage('${escapeForOnclick(chip3)}')">${escapeHtml(chip3)}</button>
                <button type="button" class="ai-chip-btn" onclick="sendAiChatMessage('${escapeForOnclick(chip4)}')">${escapeHtml(chip4)}</button>
            </div>

            <!-- Chat Messages Area -->
            <div id="aiChatBody" class="ai-chat-body">
                <!-- Initial Welcome -->
                <div class="ai-msg-bubble ai-msg-bot" id="aiWelcomeBubble">
                    ${escapeHtml(welcomeMsg)}
                </div>
            </div>

            <!-- Chat Input Form -->
            <form id="aiChatInputForm" class="ai-chat-input-bar" onsubmit="handleAiChatSubmit(event)">
                <input id="aiChatInputField" class="ai-input-field" type="text" placeholder="${escapeHtml(typeof t === 'function' ? t('ai_input_placeholder', 'Type a message or ask something...') : 'Type a message or ask something...')}" autocomplete="off" />
                <button id="aiChatSendBtn" class="ai-send-btn" type="submit" title="Send">
                    ✈️
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(root);

    // Attach Draggable Behavior
    setupDraggableBubble(root);

    // Immediately synchronize network status (Offline Mood vs Online)
    updateAiMoodBadge(navigator.onLine ? "online" : "offline");
}
window.initAiChatBubble = initAiChatBubble;

// Listen to browser network state changes in real time
window.addEventListener("online", () => {
    if (typeof updateAiMoodBadge === "function") updateAiMoodBadge("online");
});
window.addEventListener("offline", () => {
    if (typeof updateAiMoodBadge === "function") updateAiMoodBadge("offline");
});

/**
 * Toggle Chat Window Open / Close
 */
function toggleAiChatWindow(forceState) {
    const win = document.getElementById("aiFloatingWindow");
    if (!win) return;

    if (typeof forceState === "boolean") {
        isAiChatOpen = forceState;
    } else {
        isAiChatOpen = !isAiChatOpen;
    }

    if (isAiChatOpen) {
        if (typeof reinitAiChatTexts === "function") reinitAiChatTexts();
        // Sync badge immediately when window is opened
        updateAiMoodBadge(navigator.onLine ? "online" : "offline");
        win.classList.remove("is-hidden");
        const input = document.getElementById("aiChatInputField");
        if (input) setTimeout(() => input.focus(), 150);
        const body = document.getElementById("aiChatBody");
        if (body) body.scrollTop = body.scrollHeight;
    } else {
        win.classList.add("is-hidden");
    }
}
window.toggleAiChatWindow = toggleAiChatWindow;

/**
 * Setup Smooth Drag & Drop for Floating Widget
 */
function setupDraggableBubble(rootEl) {
    const btn = document.getElementById("aiFloatingBubbleBtn");
    const header = document.getElementById("aiWindowHeader");

    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;
    let isDragging = false;
    let hasMoved = false;

    function onPointerDown(e) {
        // Only main mouse button or touch
        if (e.button !== undefined && e.button !== 0) return;

        const rect = rootEl.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
        isDragging = true;
        hasMoved = false;

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
        const dx = currentX - startX;
        const dy = currentY - startY;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            hasMoved = true;
            isAiBubbleDragging = true;
        }

        if (hasMoved) {
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            // Boundaries
            const maxW = window.innerWidth - 70;
            const maxH = window.innerHeight - 70;
            newLeft = Math.max(10, Math.min(maxW, newLeft));
            newTop = Math.max(10, Math.min(maxH, newTop));

            rootEl.style.left = `${newLeft}px`;
            rootEl.style.top = `${newTop}px`;
            rootEl.style.right = "auto";
            rootEl.style.bottom = "auto";
        }
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);

        setTimeout(() => {
            isAiBubbleDragging = false;
        }, 80);
    }

    // Attach to button
    if (btn) {
        btn.addEventListener("pointerdown", onPointerDown);
        btn.addEventListener("click", (e) => {
            if (!hasMoved && !isAiBubbleDragging) {
                toggleAiChatWindow();
            }
        });
    }

    // Attach drag to window header as well
    if (header) {
        header.addEventListener("pointerdown", onPointerDown);
    }
}

/**
 * Handle Message Submit
 */
async function handleAiChatSubmit(e) {
    if (e) e.preventDefault();
    const input = document.getElementById("aiChatInputField");
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    input.value = "";
    await sendAiChatMessage(msg);
}
window.handleAiChatSubmit = handleAiChatSubmit;

/**
 * Clear Chat History
 */
function clearAiChatHistory() {
    aiChatHistory = [];
    const chatBody = document.getElementById("aiChatBody");
    if (chatBody) {
        chatBody.innerHTML = `
            <div class="ai-msg-bubble ai-msg-bot">
                ${escapeHtml(typeof t === 'function' ? t('ai_cleared_msg', 'Chat cleared. How can I help you today? 😊') : 'Chat cleared. How can I help you today? 😊')}
            </div>
        `;
    }
}
window.clearAiChatHistory = clearAiChatHistory;

function reinitAiChatTexts() {
    if (typeof t !== "function") return;

    const bubbleBtn = document.getElementById("aiFloatingBubbleBtn");
    if (bubbleBtn) {
        bubbleBtn.title = t("ai_bubble_title", "Chat with AI Buddy (Draggable)");
    }

    const header = document.getElementById("aiWindowHeader");
    if (header) {
        header.title = t("ai_drag_tip", "Hold & drag to move");
    }

    const titleEl = document.getElementById("aiWindowTitleText");
    if (titleEl) {
        titleEl.textContent = t("ai_header_title", "AI Buddy");
    }

    const clearBtn = document.querySelector("#aiFloatingWindow .ai-window-controls .ai-header-btn[onclick*='clearAiChatHistory']");
    if (clearBtn) {
        clearBtn.title = t("ai_clear_chat_tip", "Clear Chat");
    }

    const inputField = document.getElementById("aiChatInputField");
    if (inputField) {
        inputField.placeholder = t("ai_input_placeholder", "Type a message or ask something...");
    }

    const sendBtn = document.getElementById("aiChatSendBtn");
    if (sendBtn) {
        sendBtn.title = t("ai_send_tip", "Send");
    }

    const chipsContainer = document.getElementById("aiChipsBarContainer");
    if (chipsContainer) {
        const chip1 = t("ai_chip_1", "👋 Hello, how are you?");
        const chip2 = t("ai_chip_2", "☕ How can I manage my study time?");
        const chip3 = t("ai_chip_3", "🎯 Which course should I study most?");
        const chip4 = t("ai_chip_4", "💻 Help me create a revision plan");
        chipsContainer.innerHTML = `
            <button type="button" class="ai-chip-btn" onclick="sendAiChatMessage('${escapeForOnclick(chip1)}')">${escapeHtml(chip1)}</button>
            <button type="button" class="ai-chip-btn" onclick="sendAiChatMessage('${escapeForOnclick(chip2)}')">${escapeHtml(chip2)}</button>
            <button type="button" class="ai-chip-btn" onclick="sendAiChatMessage('${escapeForOnclick(chip3)}')">${escapeHtml(chip3)}</button>
            <button type="button" class="ai-chip-btn" onclick="sendAiChatMessage('${escapeForOnclick(chip4)}')">${escapeHtml(chip4)}</button>
        `;
    }

    // Immediately adapt welcome message if chat is at initial state or user has not messaged yet
    const chatBody = document.getElementById("aiChatBody");
    if (chatBody && (!Array.isArray(aiChatHistory) || aiChatHistory.length === 0)) {
        const firstBotBubble = document.getElementById("aiWelcomeBubble") || chatBody.querySelector(".ai-msg-bot");
        if (firstBotBubble) {
            firstBotBubble.textContent = t("ai_welcome_msg", "Hello! I am your AI Study Buddy. Feel free to ask anything about your courses, upcoming exams, or study schedule! 😊");
        }
    }
}
window.reinitAiChatTexts = reinitAiChatTexts;

/**
 * Send Message & Stream / Fetch Reply
 */
async function sendAiChatMessage(userMessage) {
    const chatBody = document.getElementById("aiChatBody");
    const submitBtn = document.getElementById("aiChatSendBtn");
    if (!chatBody) return;

    // Make sure window is open
    if (!isAiChatOpen) toggleAiChatWindow(true);

    // 1. Render User Bubble
    const userBubble = document.createElement("div");
    userBubble.className = "ai-msg-bubble ai-msg-user";
    userBubble.textContent = userMessage;
    chatBody.appendChild(userBubble);

    // Save user message to history
    aiChatHistory.push({ role: "user", text: userMessage });

    // 2. Render Typing Bubble
    const typingBubble = document.createElement("div");
    typingBubble.id = "aiTypingIndicator";
    typingBubble.className = "ai-typing-indicator";
    typingBubble.innerHTML = `<span>⚡</span> ${escapeHtml(typeof t === 'function' ? t('ai_typing', 'AI is thinking...') : 'AI is thinking...')}`;
    chatBody.appendChild(typingBubble);
    chatBody.scrollTop = chatBody.scrollHeight;

    if (submitBtn) submitBtn.disabled = true;

    try {
        const lang = typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "en";
        const res = await fetch(`${API_URL}/ai/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: userMessage, targetGpa: 3.0, history: aiChatHistory, lang })
        });

        const json = await res.json();
        const botReply = json.answer || json.message || (typeof t === "function" && getCurrentLanguage() === "tr" ? "Bağlantıda ufak bir pürüz oldu, tekrar dener misin?" : "Connection error, please try again.");
        const mode = json.mode || (navigator.onLine ? "online" : "offline");

        // Update header indicator
        updateAiMoodBadge(mode);

        aiChatHistory.push({ role: "model", text: botReply });
        typingBubble.remove();

        const botBubble = document.createElement("div");
        botBubble.className = "ai-msg-bubble ai-msg-bot";

        // Add badge inside bubble showing mode
        const badgeHtml = mode === "offline"
            ? `<div class="ai-msg-mode-tag offline">Offline Mood</div>`
            : `<div class="ai-msg-mode-tag online">Online</div>`;

        botBubble.innerHTML = badgeHtml + escapeHtml(botReply)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        chatBody.appendChild(botBubble);
    } catch (err) {
        typingBubble.remove();
        updateAiMoodBadge("offline");
        const errBubble = document.createElement("div");
        errBubble.className = "ai-msg-bubble ai-msg-bot";
        errBubble.innerHTML = `
            <div class="ai-msg-mode-tag offline">Offline Mood</div>
            Şu an internet veya sunucu bağlantın çevrimdışı görünüyor. İnternetini kontrol ettiğinde tekrar deneyebilirsin.
        `;
        chatBody.appendChild(errBubble);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        chatBody.scrollTop = chatBody.scrollHeight;
    }
}
window.sendAiChatMessage = sendAiChatMessage;

function updateAiMoodBadge(mode) {
    const badge = document.getElementById("aiModeStatusBadge");
    const text = document.getElementById("aiModeStatusText");
    const dot = badge ? badge.querySelector(".ai-status-dot") : null;
    if (!badge || !text) return;

    if (mode === "offline" || !navigator.onLine) {
        text.textContent = "Offline Mood";
        if (dot) {
            dot.className = "ai-status-dot offline";
        }
    } else {
        text.textContent = "Online";
        if (dot) {
            dot.className = "ai-status-dot online";
        }
    }
}
window.updateAiMoodBadge = updateAiMoodBadge;

// Backward-compatibility shim in case any other script invokes openAiCoachModal
window.openAiCoachModal = function() {
    toggleAiChatWindow(true);
};



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
        <div class="modal-box" style="max-width:720px; width:100%; max-height:88vh; overflow-y:auto; padding:0; background:var(--theme-sidebar-bg, #0f172a); border-radius:14px; border:1px solid var(--theme-sidebar-border, rgba(255,255,255,0.15)); box-shadow:0 25px 50px -12px rgba(0,0,0,0.6), 0 0 25px var(--theme-accent-glow, transparent); color:#f8fafc;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:18px 24px; background:var(--theme-header-bg, #0f172a); color:#ffffff; border-bottom:1px solid var(--theme-header-border, rgba(255,255,255,0.1)); border-radius:14px 14px 0 0;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">📑</span>
                    <div>
                        <div style="font-size:16px; font-weight:800; color:var(--theme-header-title, #ffffff);">${escapeHtml(typeof t === 'function' ? t('syllabus_modal_title', 'Smart Syllabus Import') : 'Smart Syllabus Import')}</div>
                        <div style="font-size:12px; color:var(--theme-active-nav-color, #e2e8f0);">${escapeHtml(typeof t === 'function' ? t('syllabus_modal_subtitle', 'Paste your course syllabus / outline to auto-extract exams & deadlines') : 'Paste your course syllabus / outline to auto-extract exams & deadlines')}</div>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('syllabusImportModal').remove()" style="background:rgba(255,255,255,0.1); border:none; color:#ffffff; font-size:14px; font-weight:700; width:28px; height:28px; border-radius:50%; cursor:pointer;">✕</button>
            </div>

            <!-- Content Area -->
            <div style="padding:24px;">
                <label style="display:block; font-size:13px; font-weight:700; color:var(--theme-header-title, #f8fafc); margin-bottom:6px;">
                    ${escapeHtml(typeof t === 'function' ? t('syllabus_label', 'Paste Course Syllabus / Outline Text:') : 'Paste Course Syllabus / Outline Text:')}
                </label>
                <textarea
                    id="syllabusTextInput"
                    rows="8"
                    placeholder="Example:&#10;Course: CS301 Database Systems&#10;Instructor: Dr. Sarah Jenkins&#10;Credits: 4&#10;Grading: Midterm 30%, Term Project 20%, Final 50%&#10;Midterm Exam Date: 2026-11-20&#10;Project Deadline: 2026-12-15&#10;Final Exam Date: 2027-01-08"
                    style="width:100%; background:rgba(0,0,0,0.3); border:1px solid var(--theme-sidebar-border, #cbd5e1); color:#ffffff; border-radius:8px; padding:12px; font-family:monospace; font-size:12.5px; resize:vertical;"
                ></textarea>

                <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:11px; color:#94a3b8;">${escapeHtml(typeof t === 'function' ? t('syllabus_supported', 'Supported: Course name, instructor, credits, grading weights, exam and project dates.') : 'Supported: Course name, instructor, credits, grading weights, exam and project dates.')}</div>
                    <button
                        type="button"
                        onclick="parseSyllabusContent()"
                        style="padding:9px 20px; background:var(--theme-accent-gradient, linear-gradient(135deg, #2563eb, #1d4ed8)); color:#ffffff; border:none; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; box-shadow:0 3px 10px var(--theme-accent-glow, rgba(0,0,0,0.2));"
                    >
                        ${escapeHtml(typeof t === 'function' ? t('syllabus_parse_btn', '✨ Parse Syllabus') : '✨ Parse Syllabus')}
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
