const { db } = require("../database/database");

/**
 * Intelligent Academic Coaching Algorithm
 */
function generateHeuristicAcademicAdvice(courses, targetGpa = 3.0, totalStudyHours = 0) {
    const target = parseFloat(targetGpa) || 3.0;
    const courseAnalyses = [];
    let highRiskCount = 0;
    let totalCredits = 0;

    (courses || []).forEach(c => {
        const mw = Number(c.midtermWeight) || 0;
        const pw = Number(c.projectWeight) || 0;
        const fw = Math.max(0, 100 - mw - pw);
        const passGrade = Number(c.passingGrade) || 60;
        const credit = Number(c.credit) || 1;
        totalCredits += credit;

        const mVal = c.midtermGrade !== null && c.midtermGrade !== "" && c.midtermGrade !== undefined ? Number(c.midtermGrade) : null;
        const pVal = c.projectGrade !== null && c.projectGrade !== "" && c.projectGrade !== undefined ? Number(c.projectGrade) : null;

        const currentEarned = ((mVal || 0) * mw / 100) + ((pVal || 0) * pw / 100);

        // Required final for passing (passGrade)
        let neededForPass = null;
        if (fw > 0) {
            neededForPass = Math.max(0, Math.ceil(((passGrade - currentEarned) / fw) * 100));
        }

        // Required final for target letter grade corresponding to target GPA
        const targetAvg = target >= 3.5 ? 85 : target >= 3.0 ? 75 : 65;
        let neededForTarget = null;
        if (fw > 0) {
            neededForTarget = Math.max(0, Math.ceil(((targetAvg - currentEarned) / fw) * 100));
        }

        const isRisk = neededForPass !== null && (neededForPass > 75 || neededForPass > 100);
        if (isRisk) highRiskCount++;

        // Recommended weekly study hours based on credits and difficulty
        const baseHours = credit * 1.5;
        const extraHours = isRisk ? 2.5 : (neededForTarget && neededForTarget > 70) ? 1.5 : 0.5;
        const recommendedWeeklyHours = Math.round((baseHours + extraHours) * 10) / 10;

        courseAnalyses.push({
            courseName: c.courseName,
            credit,
            midtermGrade: mVal,
            projectGrade: pVal,
            finalWeight: fw,
            neededForPass,
            neededForTarget,
            isRisk,
            recommendedWeeklyHours
        });
    });

    const recommendations = [];

    if (highRiskCount > 0) {
        recommendations.push(`⚠️ You have **${highRiskCount} high-risk course(s)** where passing requires an above-average final score. Prioritize these courses in your weekly study schedule.`);
    } else {
        recommendations.push(`✨ Excellent progress! You are currently on track to pass all your enrolled courses without extreme final score requirements.`);
    }

    courseAnalyses.forEach(ca => {
        if (ca.neededForPass !== null && ca.neededForPass > 100) {
            recommendations.push(`• **${ca.courseName}**: Passing requires >100% on the final based on current weights. Check with your professor about extra credit or makeup options.`);
        } else if (ca.neededForTarget !== null) {
            const finalScoreNote = ca.neededForTarget <= 100 ? `${ca.neededForTarget}` : "95+";
            recommendations.push(`• **${ca.courseName}**: Aim for at least **${finalScoreNote}** on the final to maintain your target GPA of ${target.toFixed(2)}. Dedicate ~**${ca.recommendedWeeklyHours} hours/week**.`);
        }
    });

    const totalRecWeeklyStudy = courseAnalyses.reduce((sum, c) => sum + c.recommendedWeeklyHours, 0);
    recommendations.push(`📅 **Weekly Study Target**: We recommend a total of **${Math.round(totalRecWeeklyStudy)} hours/week** distributed across your courses to comfortably meet your academic goals.`);

    return {
        targetGpa: target,
        totalCredits,
        highRiskCount,
        totalLoggedHours: totalStudyHours,
        recommendedWeeklyHours: Math.round(totalRecWeeklyStudy),
        courseAnalyses,
        recommendations
    };
}

/**
 * Fallback Regex / Pattern Parser for Syllabus Text
 */
function parseSyllabusHeuristic(rawText) {
    const text = String(rawText || "");
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    let courseName = "New Course";
    let instructorName = "-";
    let credit = 3;
    let passingGrade = 60;
    let midtermWeight = 30;
    let projectWeight = 20;

    const exams = [];
    const projects = [];
    const activities = [];

    // Course Name detection
    for (const line of lines) {
        const cnMatch = line.match(/(?:course\s*(?:name|title)?|ders\s*ad[ıi]?)\s*[:=-]\s*([A-Za-z0-9\s-]{3,50})/i);
        if (cnMatch) {
            courseName = cnMatch[1].trim();
            break;
        }
        if (/^[A-Z]{2,4}\s*\d{3,4}\b/.test(line)) {
            courseName = line.slice(0, 40).trim();
            break;
        }
    }

    // Instructor detection
    for (const line of lines) {
        const instMatch = line.match(/(?:instructor|lecturer|professor|hoca|öğretim\s*üyesi)\s*[:=-]\s*([A-Za-z\s.]{3,40})/i);
        if (instMatch) {
            instructorName = instMatch[1].trim();
            break;
        }
    }

    // Credits detection
    for (const line of lines) {
        const crMatch = line.match(/(?:credit|credits|kredi|ects|akts)\s*[:=-]?\s*(\d{1,2})/i);
        if (crMatch) {
            const val = parseInt(crMatch[1], 10);
            if (val >= 1 && val <= 10) credit = val;
            break;
        }
    }

    // Weights detection
    const mwMatch = text.match(/midterm[^\d]*(\d{1,2})\s*%/i);
    if (mwMatch) midtermWeight = parseInt(mwMatch[1], 10);

    const pwMatch = text.match(/project[^\d]*(\d{1,2})\s*%/i);
    if (pwMatch) projectWeight = parseInt(pwMatch[1], 10);

    // Exams & Date detection
    const dateRegex = /\b(202\d[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]202\d)\b/;

    lines.forEach(line => {
        const lower = line.toLowerCase();
        const dateMatch = line.match(dateRegex);
        const dateStr = dateMatch ? normalizeExtractedDate(dateMatch[1]) : "";

        if (lower.includes("midterm") || lower.includes("vize")) {
            exams.push({
                examName: "Midterm Exam",
                examType: "midterm",
                examDate: dateStr,
                weight: midtermWeight
            });
        } else if (lower.includes("final") || lower.includes("final exam")) {
            exams.push({
                examName: "Final Exam",
                examType: "final",
                examDate: dateStr,
                weight: Math.max(0, 100 - midtermWeight - projectWeight)
            });
        } else if (lower.includes("project") || lower.includes("term project") || lower.includes("proje")) {
            projects.push({
                projectName: line.slice(0, 50).trim(),
                dueDate: dateStr,
                description: "Imported from Syllabus"
            });
        } else if (lower.includes("quiz") || lower.includes("assignment") || lower.includes("homework") || lower.includes("ödev")) {
            activities.push({
                title: line.slice(0, 50).trim(),
                dueDate: dateStr,
                type: lower.includes("quiz") ? "quiz" : "homework"
            });
        }
    });

    if (!exams.some(e => e.examType === "midterm")) {
        exams.push({ examName: "Midterm Exam", examType: "midterm", examDate: "", weight: midtermWeight });
    }
    if (!exams.some(e => e.examType === "final")) {
        exams.push({ examName: "Final Exam", examType: "final", examDate: "", weight: Math.max(0, 100 - midtermWeight - projectWeight) });
    }

    return {
        courseName,
        instructorName,
        credit,
        passingGrade,
        midtermWeight,
        projectWeight,
        exams,
        projects,
        activities
    };
}

function normalizeExtractedDate(raw) {
    if (!raw) return "";
    const parts = raw.split(/[-/.]/);
    if (parts.length !== 3) return "";
    if (parts[0].length === 4) {
        const m = parts[1].padStart(2, "0");
        const d = parts[2].padStart(2, "0");
        return `${parts[0]}-${m}-${d}`;
    } else {
        const d = parts[0].padStart(2, "0");
        const m = parts[1].padStart(2, "0");
        return `${parts[2]}-${m}-${d}`;
    }
}

module.exports = {
    generateHeuristicAcademicAdvice,
    parseSyllabusHeuristic
};
