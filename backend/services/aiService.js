const { db } = require("../database/database");

/**
 * Intelligent Academic Coaching Algorithm
 */
/**
 * Intelligent Academic Coaching Algorithm
 */
function generateHeuristicAcademicAdvice(courses, targetGpa = 3.0, totalStudyHours = 0) {
    const target = parseFloat(targetGpa) || 3.0;
    const courseAnalyses = [];
    let highRiskCount = 0;
    let safeCount = 0;
    let missingGradesCount = 0;
    let totalCredits = 0;

    // Target average equivalent in 100-point scale
    const targetAvg = target >= 3.8 ? 90 : target >= 3.5 ? 85 : target >= 3.0 ? 75 : target >= 2.5 ? 65 : 60;

    (courses || []).forEach(c => {
        const mw = Number(c.midtermWeight) || 0;
        const pw = Number(c.projectWeight) || 0;
        const fw = Math.max(0, 100 - mw - pw);
        const passGrade = Number(c.passingGrade) || 60;
        const credit = Number(c.credit) || 1;
        totalCredits += credit;

        const hasMidterm = c.midtermGrade !== null && c.midtermGrade !== "" && c.midtermGrade !== undefined;
        const hasProject = c.projectGrade !== null && c.projectGrade !== "" && c.projectGrade !== undefined;
        const mVal = hasMidterm ? Number(c.midtermGrade) : null;
        const pVal = hasProject ? Number(c.projectGrade) : null;

        if (!hasMidterm && mw > 0) missingGradesCount++;

        const currentEarned = ((mVal || 0) * mw / 100) + ((pVal || 0) * pw / 100);

        // Required final for passing (passGrade)
        let neededForPass = null;
        if (fw > 0) {
            neededForPass = Math.max(0, Math.ceil(((passGrade - currentEarned) / fw) * 100));
        }

        // Required final for target GPA
        let neededForTarget = null;
        if (fw > 0) {
            neededForTarget = Math.max(0, Math.ceil(((targetAvg - currentEarned) / fw) * 100));
        }

        // Risk & Status classification
        let status = "ON TRACK";
        let statusClass = "success";
        let priority = "Normal";

        if (neededForPass !== null && neededForPass > 100) {
            status = "CRITICAL";
            statusClass = "danger";
            priority = "Acil / En Yüksek";
            highRiskCount++;
        } else if (neededForPass !== null && neededForPass > 70) {
            status = "HIGH RISK";
            statusClass = "warning";
            priority = "Yüksek";
            highRiskCount++;
        } else if (neededForPass !== null && neededForPass <= 35) {
            status = "SAFE";
            statusClass = "safe";
            priority = "Düşük (Güvende)";
            safeCount++;
        }

        // Priority weighting: Credits * Need
        const needPoints = neededForTarget !== null ? Math.min(neededForTarget, 100) : 50;
        const urgencyScore = (credit * 1.8) + (needPoints * 0.4);

        // Recommended weekly study hours
        const baseHours = credit * 1.2;
        let extraHours = 0.5;
        if (status === "CRITICAL" || status === "HIGH RISK") extraHours = 3.0;
        else if (neededForTarget && neededForTarget > 75) extraHours = 1.5;
        else if (status === "SAFE") extraHours = 0;

        const recommendedWeeklyHours = Math.round((baseHours + extraHours) * 10) / 10;

        courseAnalyses.push({
            id: c.id,
            courseName: c.courseName,
            credit,
            midtermGrade: mVal,
            projectGrade: pVal,
            midtermWeight: mw,
            projectWeight: pw,
            finalWeight: fw,
            neededForPass,
            neededForTarget,
            status,
            statusClass,
            priority,
            urgencyScore,
            isRisk: status === "CRITICAL" || status === "HIGH RISK",
            recommendedWeeklyHours
        });
    });

    // Sort by urgency so the student sees critical and high-credit courses first
    courseAnalyses.sort((a, b) => b.urgencyScore - a.urgencyScore);

    const recommendations = [];

    if (highRiskCount > 0) {
        recommendations.push(`⚠️ **${highRiskCount} dersinizde risk tespit edildi!** Bu dersleri geçmek için finalde yüksek puan almanız gerekiyor. Çalışma planınızda ilk sıraya almalısınız.`);
    } else if (courseAnalyses.length > 0) {
        recommendations.push(`✨ **Tebrikler, durumunuz oldukça iyi!** Kayıtlı tüm derslerinizde geçme şartlarını zorlanmadan karşılama rotasındasınız.`);
    } else {
        recommendations.push(`ℹ️ Henüz notlar tablonuzda kayıtlı ders bulunamadı.`);
    }

    if (missingGradesCount > 0) {
        recommendations.push(`📝 **${missingGradesCount} dersinizin vize/ara notu henüz girilmemiş.** Notlarınızı girdikçe AI Koç hedefinizi çok daha nokta atışı hesaplayacaktır.`);
    }

    // Top priority course advice
    const topUrgent = courseAnalyses[0];
    if (topUrgent) {
        if (topUrgent.neededForTarget !== null && topUrgent.neededForTarget <= 100) {
            recommendations.push(`🎯 **En Çok Odaklanılması Gereken:** **${topUrgent.courseName}** (${topUrgent.credit} Kredi). Hedefinize (${target.toFixed(2)}) ulaşmak için finalden en az **${topUrgent.neededForTarget}** almanız önerilir. Haftada yaklaşık **~${topUrgent.recommendedWeeklyHours} saat** ayırmalısınız.`);
        } else if (topUrgent.neededForTarget !== null && topUrgent.neededForTarget > 100) {
            recommendations.push(`🎯 **Strateji:** **${topUrgent.courseName}** dersinden hedefinizi tutturmak için finalden 95+ almanız ve proje/telafi fırsatlarını değerlendirmeniz gerekebilir.`);
        }
    }

    const totalRecWeeklyStudy = courseAnalyses.reduce((sum, c) => sum + c.recommendedWeeklyHours, 0);
    recommendations.push(`📅 **Haftalık Önerilen Toplam Çalışma:** Hedefinizi rahatça yakalamak için dersleriniz arasında toplam **${Math.round(totalRecWeeklyStudy)} saat/hafta** çalışma dengesi kurmanızı tavsiye ediyoruz.`);

    return {
        targetGpa: target,
        totalCredits,
        highRiskCount,
        safeCount,
        totalCourses: courseAnalyses.length,
        totalLoggedHours: totalStudyHours,
        recommendedWeeklyHours: Math.round(totalRecWeeklyStudy),
        courseAnalyses,
        recommendations
    };
}

/**
 * Intelligent Academic Q&A Chatbot Engine
 */
async function answerAcademicQuestion({ student = {}, courses = [], exams = [], todos = [], totalHours = 0, targetGpa = 3.0, question = "", history = [], lang = "en" }) {
    const qTrim = question.trim();
    const qLower = qTrim.toLowerCase();
    const target = parseFloat(targetGpa) || 3.0;

    // Check if Gemini API key exists in environment
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        try {
            const geminiAnswer = await callGeminiLLM({ student, courses, exams, todos, totalHours, targetGpa: target, question: qTrim, history, apiKey: geminiKey, lang });
            if (geminiAnswer && geminiAnswer.trim()) {
                return {
                    answer: geminiAnswer,
                    mode: "online",
                    provider: "Online"
                };
            }
        } catch (llmErr) {
            console.warn("Gemini LLM Call failed, falling back to smart rule engine:", llmErr.message);
        }
    }

    // Advanced context-aware Turkish Conversational & Academic Advisor Engine (Offline Mood)
    const localAnswer = generateRichChatResponse({ student, courses, exams, todos, totalHours, targetGpa: target, question: qTrim, qLower, history });
    return {
        answer: localAnswer,
        mode: "offline",
        provider: "Offline Mood"
    };
}

function normalizeTrText(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findMatchedCourse(courses, qNorm) {
    if (!courses || courses.length === 0) return null;

    // 1. Direct normalized name match
    for (const c of courses) {
        if (!c.courseName) continue;
        const cNorm = normalizeTrText(c.courseName);
        if (cNorm && (qNorm.includes(cNorm) || cNorm.includes(qNorm))) return c;
    }

    // 2. Bilingual dictionary & synonym mapping (Turkish & English common course aliases)
    const synonymMap = [
        { terms: ['web', 'programming', 'programlama', 'web dev', 'web tasarim', 'web programlama', 'web programming'], nameMatch: ['web'] },
        { terms: ['system', 'sistem', 'analiz', 'analysis', 'tasarim', 'design'], nameMatch: ['system', 'sistem'] },
        { terms: ['image', 'goruntu', 'processing', 'isleme', 'lab', 'laboratuvar'], nameMatch: ['image', 'goruntu'] },
        { terms: ['algorithm', 'algoritma', 'algoritmalar', 'ceng 301'], nameMatch: ['algorithm', 'algoritma'] },
        { terms: ['database', 'veritabani', 'veri tabani', 'db', 'vt', 'sql'], nameMatch: ['database', 'veritabani', 'veri tabani'] },
        { terms: ['testing', 'test', 'swe 204', 'yazilim test'], nameMatch: ['testing', 'test'] },
        { terms: ['math', 'matematik', 'calculus', 'mat'], nameMatch: ['math', 'matematik', 'calculus'] },
        { terms: ['physics', 'fizik'], nameMatch: ['physics', 'fizik'] },
        { terms: ['network', 'ag', 'aglar', 'networks'], nameMatch: ['network', 'ag'] }
    ];

    for (const c of courses) {
        if (!c.courseName) continue;
        const cNorm = normalizeTrText(c.courseName);
        for (const entry of synonymMap) {
            const courseInGroup = entry.nameMatch.some(nm => cNorm.includes(nm));
            if (courseInGroup) {
                const queryInGroup = entry.terms.some(t => {
                    const r = new RegExp('(^|\\s)' + t + '($|\\s)');
                    return r.test(qNorm) || qNorm.includes(t);
                });
                if (queryInGroup) {
                    return c;
                }
            }
        }
    }

    // 3. Significant word overlap (parts of courseName >= 3 characters)
    for (const c of courses) {
        if (!c.courseName) continue;
        const cNorm = normalizeTrText(c.courseName);
        const parts = cNorm.split(' ').filter(p => p.length >= 3 && !['and', 've', 'ile', 'the', 'for'].includes(p));
        const qWords = qNorm.split(' ');
        for (const part of parts) {
            if (qWords.some(qw => qw === part || (qw.startsWith(part) && qw.length <= part.length + 3) || (part.startsWith(qw) && qw.length >= 3))) {
                return c;
            }
        }
    }

    // 4. Contextual reference if user says 'bu ders / dersi / dersten' and has a single course
    if (courses.length === 1 && /(?:^|\s)(ders|dersten|dersi|dersim|bu ders|dersin)(?:$|\s)/.test(qNorm)) {
        return courses[0];
    }

    return null;
}

function getSubjectPedagogicalAdvice(courseName) {
    const cNorm = normalizeTrText(courseName);
    if (cNorm.includes('web')) {
        return [
            '**Kod Yazmadan Öğrenilmez:** Dokümana saatlerce bakmak yerine editörde hemen ufak denemeler yap. Flexbox/Grid ile 2 kutuyu yan yana getir, form elementlerini kurcala.',
            '**Hocalar DOM ve Event Sorar:** Sınavlarda ve projelerde neredeyse kesin `addEventListener` (tıklama, form submit), `document.createElement` ve `fetch` ile API’den veri çekip listeleme çıkar. Bunların taslağını ezberine al.',
            '**DevTools Hayat Kurtarır:** Tarayıcıda `F12` > Console ve Network sekmelerini açık tut. Hatanın nerede patladığını görerek pratik yaparsan sınavda syntax hatası yapmazsın.',
            '**Lab Kodlarını Baştan Yaz:** Derste gösterilen lab örneklerini kenara koyup sıfırdan bakmadan yazmayı dene, eksiklerini anında görürsün.'
        ];
    } else if (cNorm.includes('system') || cNorm.includes('sistem')) {
        return [
            '**UML Diyagramlarının Mantığı:** Use Case, Sequence ve Class diyagramlarının standart oklarını ve aktörlerini karıştırma. Hocalar genelde okların yönüne ve tipine puan kırar.',
            '**Vaka Analizi (Case Study):** Sınavda %90 gerçek bir senaryo verip (ör. kütüphane otomasyonu, yemek sipariş app) gereksinimleri çıkarmanı isterler. Fonksiyonel vs fonksiyonel olmayan gereksinim ayrımını iyi yap.',
            '**Agile & SDLC:** Waterfall vs Scrum farkları, sprint mantığı ve kullanıcı hikayeleri (User Stories) cepte olsun, sınavda banko soru gelir.'
        ];
    } else if (cNorm.includes('image') || cNorm.includes('goruntu')) {
        return [
            '**Her Şey Bir Matris:** Görüntü dediğin piksel matrisidir kanka. Konvolüsyon (convolution) ve filtre uygulamasını kağıt üstünde 3x3 matrisle elle çarpmayı kesinlikle dene, sınavda elle çözdürürler.',
            '**Filtrelerin Amacını Bil:** Sobel/Prewitt kenar bulur, Gaussian Blur gürültü temizler ve yumuşatır, Histogram Eşitleme kontrastı açar. Neden kullanıldıklarını bil yeter.',
            '**Lab Parametreleri:** OpenCV veya kodlama sınavı varsa fonksiyonların (threshold, kernel size, blur) parametrelerini kafanda oturt.'
        ];
    } else if (cNorm.includes('algorithm') || cNorm.includes('algoritma')) {
        return [
            '**Big-O Takibi:** İç içe döngüleri ve recursive fonksiyonları görünce `O(n)`, `O(n log n)`, `O(n²)` analizini adımlarla açıklamayı bil.',
            '**Ağaçları ve Grafları Çiz:** BST (Binary Search Tree) ekleme/çıkarma, BFS/DFS gezinmelerini kafandan yapma; bir kağıda ağaç çizip adım adım takip et.',
            '**Algoritma Mantığı:** Sıralama algoritmalarını (Merge/Quick Sort) ezberleme, diziyi ikiye bölüp nasıl birleştirdiğini gözünde canlandır.'
        ];
    } else if (cNorm.includes('data') || cNorm.includes('veri') || cNorm.includes('db')) {
        return [
            '**SQL JOIN Pratiği:** `INNER JOIN`, `LEFT JOIN`, `GROUP BY` ve `HAVING` sorgularını elle yazabilecek kadar pratik yap.',
            '**Normalizasyon Kuralları:** 1NF, 2NF, 3NF kurallarını bir örnek tablo üzerinden tek tek anlatacak kadar iyi kavra.',
            '**ER Diyagramları:** Tablolar arası 1-to-N, N-to-M ilişkileri ve Foreign Key bağlarını net çiz.'
        ];
    } else if (cNorm.includes('math') || cNorm.includes('matematik') || cNorm.includes('calculus') || cNorm.includes('lineer') || cNorm.includes('linear')) {
        return [
            '**Sadece Okuyarak Matematik Öğrenilmez:** Çözümlü örneğe bakıp "anladım" demek en büyük tuzaktır. Çözümü kapatıp temiz bir kağıda soruyu baştan sona kendin çözmeyi dene.',
            '**Temel Teorem ve Formül Kağıdı Hazırla:** Türev-integral kuralları, matris determinantı, özdeğerler (eigenvalues) gibi kritik formülleri tek bir A4 kağıda yazıp masana as.',
            '**Adım Adım İşlem Pratiği:** Hocalar ara adımlara da puan verir. İşlem atlamadan, gerekçesini belirterek (ör. L\'Hopital kuralı, kısmi integrasyon) yazma alışkanlığı kazan.',
            '**Hocanın Çözdüğü Soruların Varyasyonları:** Derste tahtaya yazılan veya slayttaki örneklerin sayılarını değiştirerek çöz; sınav soruları genelde o soru tiplerinin hafif makyajlanmış halidir.'
        ];
    } else if (cNorm.includes('physics') || cNorm.includes('fizik')) {
        return [
            '**Serbest Cisim Diyagramı (FBD):** Kuvvetleri doğru çizmeden fiziği çözemezsin. Önce cismin üzerindeki tüm vektörleri (yerçekimi, sürtünme, normal kuvvet) kağıda dök.',
            '**Birim Takibi:** Formüllerde SI birim sistemine (metre, saniye, kilogram) dikkat et; en çok puan birim dönüşümlerinden kaybedilir.',
            '**Formülü Ezberleme, Mantığını Anla:** Enerjinin korunumu, momentum ve Newton kanunlarının ana mantığını kavrarsan formülü hatırlayamasan bile çıkarabilirsin.'
        ];
    } else if (cNorm.includes('network') || cNorm.includes('ag')) {
        return [
            '**OSI & TCP/IP Katmanları:** Her katmanın görevini ve hangi protokollerin (HTTP, TCP, UDP, IP, ARP) hangi katmanda çalıştığını net öğren.',
            '**Subnetting Hesaplamaları:** IP adresleme, CIDR notasyonu ve alt ağ maskesi hesaplarını kağıt üzerinde hızlıca yapabilecek kadar pratik yap; sınavın banko sorusudur.',
            '**Packet Tracer / Wireshark:** Paketlerin nasıl iletildiğini ve handshake (3-way handshake) süreçlerini görselleştirerek çalış.'
        ];
    } else if (cNorm.includes('ai') || cNorm.includes('yapay') || cNorm.includes('machine') || cNorm.includes('ogrenme')) {
        return [
            '**Matematiksel Altyapı:** Gradyan inişi (Gradient Descent), kayıp fonksiyonları (Loss Functions) ve aktivasyon fonksiyonlarının grafiklerini iyi bil.',
            '**Aşırı Öğrenme (Overfitting) Önleme:** Regularization, Dropout, Cross-Validation kavramlarını ve modelin ezberleyip ezberlemediğini nasıl anlayacağını iyi kavra.',
            '**Metrikler:** Accuracy, Precision, Recall ve F1-Score farkını vaka sorularında hocalar kesinlikle sorar.'
        ];
    }
    return [
        '**Konu Haritası Çıkar:** Slaytları baştan sona okumak yerine ana başlıkları A4 kağıda akış şeması gibi özetle.',
        '**Çıkmış Sınav Soruları:** Hocanın önceki yıllarda sorduğu soruları veya slayt sonlarındaki problemleri çöz; hocaların soru tarzı genelde benzer kalır.',
        '**Kendi Kendine Anlat:** Konuyu hiç bilmeyen birine anlatıyormuş gibi sesli özetle, nerede tıkandığını hemen yakalarsın.'
    ];
}

function generateRichChatResponse({ student, courses, exams, todos, totalHours, targetGpa, question, qLower, history }) {
    const sName = student?.name ? student.name.split(" ")[0] : "";
    const nameP = sName ? ` ${sName}` : "";
    const qNorm = normalizeTrText(question);

    // ── 1. GREETINGS & CASUAL CHAT (Naber, nasılsın, günaydın, selam vb.) ─────────
    const isNaber = /(?:^|\s)(naber|n aber|ne haber|nbr|napiyon|ne yapiyorsun|ne var ne yok)(?:$|\s)/.test(qNorm);
    const isNasilsin = /(?:^|\s)(nasilsin|nasil gidiyor|iyi misin|keyifler nasil|durumlar nasil)(?:$|\s)/.test(qNorm);
    const isSelam = /(?:^|\s)(selam|selamlar|merhaba|merhabalar|slm|mrb|hey|hello|hi)(?:$|\s)/.test(qNorm);
    const isGunaydin = /(?:^|\s)(gunaydin|gunaydın)(?:$|\s)/.test(qNorm);
    const isIyiGunler = /(?:^|\s)(iyi gunler|iyi gunler|tunaydin)(?:$|\s)/.test(qNorm);
    const isIyiAksamlar = /(?:^|\s)(iyi aksamlar|iyi geceler)(?:$|\s)/.test(qNorm);
    const isKolayGelsin = /(?:^|\s)(kolay gelsin|iyi calismalar)(?:$|\s)/.test(qNorm);
    const isTesekkur = /(?:^|\s)(tesekkur|tesekkurler|sag ol|sagol|eyvallah|adamsin|harikasin|supersin|kral)(?:$|\s)/.test(qNorm);
    const isGorusuruz = /(?:^|\s)(gorusuruz|bay bay|bye|hoscakal|kendine iyi bak)(?:$|\s)/.test(qNorm);

    // 1A. User says they are good & asking how the bot is: "iyiyim sen nasılsın", "bende iyi senden naber" vb.
    const isUserGoodAndAsking = /(?:^|\s)(iyiyim|iyi|bende iyi|ben de iyi|yuvarlanip|idare eder)(?:.*)(sen nasilsin|senden naber|sen nasil|senden ne haber|sen napıyorsun)(?:$|\s)/.test(qNorm) ||
        (/(iyiyim|bende iyi|ben de iyi)/.test(qNorm) && /(sen nasilsin|senden naber|sen ne|siz nasilsiniz)/.test(qNorm));

    if (isUserGoodAndAsking) {
        return `İyi olduğuna çok sevindim${nameP}! Ben de gayet iyiyim, teşekkür ederim. Bugün derslerle ilgili kafana takılan bir şey var mı, nasıl yardımcı olabilirim?`;
    }

    // 1B. User just asked "nasılsın", "nasıl gidiyor"
    if (isNasilsin) {
        return `İyiyim${nameP}, teşekkür ederim! Derslerin ve notların takibindeyim. Senin günün nasıl geçiyor, çalışmalar yolunda mı?`;
    }

    // 1C. User asked "naber"
    if (isNaber) {
        return `İyilik${nameP}, bildiğin gibi dersler ve sınav hazırlıklarıyla ilgileniyorum! Sende ne var ne yok, nasıl gidiyor?`;
    }

    if (isGunaydin) {
        return `Günaydın${nameP}! ☀️ Umarım verimli ve güzel bir gün olur. Bugün hangi derse odaklanıyoruz?`;
    }
    if (isIyiGunler) {
        return `İyi günler${nameP}! Ders çalışma stratejisi, sınav tüyoları ya da kafana takılan herhangi bir soru için buradayım.`;
    }
    if (isIyiAksamlar) {
        return `İyi akşamlar${nameP}! Günün yorgunluğunu atarken yarının planını yapabiliriz ya da dinlenmene bakabilirsin.`;
    }
    if (isKolayGelsin) {
        return `Çok teşekkürler${nameP}, sana da kolay gelsin! Derslerle ilgili ne zaman yardıma ihtiyacın olursa buradayım.`;
    }
    if (isTesekkur) {
        return `Rica ederim${nameP}, her zaman! Derslerle veya sınavlarla ilgili aklına ne takılırsa sorabilirsin.`;
    }
    if (isGorusuruz) {
        return `Görüşmek üzere${nameP}! Kendine iyi bak, iyi çalışmalar! 👋`;
    }

    // 1D. User just said "selam", "merhaba"
    if (isSelam) {
        return `Selam${nameP}, hoş geldin! Bugün dersler veya çalışma planınla ilgili neye bakalım?`;
    }

    // ── 2. IDENTITY & CAPABILITIES (Kimsin, ne yaparsın?) ──────────────────────
    if (/(?:^|\s)(kimsin|sen kimsin|ne yapabilirsin|nesin|gorevin ne|neler yaparsin)(?:$|\s)/.test(qNorm)) {
        return `Ben senin akademik çalışma arkadaşınım! 🎓\n\n` +
            `Derslerini, sınav taktiklerini ve geçme notlarını senin için yakından takip ederim:\n` +
            `• Ders notlarına bakıp hangi dersten ve finalden kaç alman gerektiğini hesaplarım.\n` +
            `• Kredilerine ve notlarına göre en dengeli çalışma sırasını çıkarırım.\n` +
            `• Web, Algoritma, Sistem Analizi, Görüntü İşleme gibi dersler için sınav ve mülakat tüyoları veririm.\n` +
            `• Zorlandığında veya bunaldığında moral verir, çalışma stratejisi oluşturmana destek olurum! 😊`;
    }

    // ── 3. EMOTIONAL, CLASS LEVEL & MOTIVATIONAL (Sıkıldım, 3. sınıf çok zor, bunaldım vb.) ──
    const isClassDifficulty = /(?:^|\s)(3|ucuncu|3\.|3sinif|4|dorduncu|sinif|donem|universite)\s*(?:sinif|donem)?\s*(cok zor|zor|nasil|nasil olucak|nasil olacak|gecer|biter|bitecek)(?:$|\s)/.test(qNorm) ||
        /(sinif cok zor|donem cok zor|dersler cok zor|okul cok zor|cok zor nasil)/.test(qNorm);

    if (isClassDifficulty) {
        return `Hiç stres yapma${nameP}! Düzenli ve planlı çalıştığında hepsi yoluna girecek. Şu an zorlanman da gayet normal; bölümün en yoğun, proje ve teknik derslerin biriktiği dönemindesin.\n\n` +
            `Önemli olan her şeyi aynı anda halletmeye çalışıp kendini tüketmemek. Konuları haftalık küçük hedeflere böleceğiz. Takıldığın ya da gözünde büyüyen dersi söyle, beraber en mantıklı çalışma planını çıkaralım! 💪`;
    }

    const isBored = /(?:^|\s)(sikildim|sikildim ya|bunaldim|yoruldum|tuketildim|moralim bozuk|canim sikkin|biktim)(?:$|\s)/.test(qNorm) ||
        /(sikil|bunal|bik|yorul|moralim|canim sik|motivasyon)/.test(qNorm);

    if (isBored) {
        const empatheticResponses = [
            `Hiç stres yapma, düzenli gidince her şey hallolur! Şu an yorulmuş veya bunalmış hissetmen çok insani ve normal. Biraz mola ver, kafanı dağıt. İnan hepsi yoluna girecek. ☕\n\n` +
            `Arkadaşça bir öneri: Ekranı biraz kapatıp hava alabilirsin. Kafan dinlenince derslere hafif hafif tekrar bakarız, ben buradayım!`,

            `Seni çok iyi anlıyorum${nameP}. Dönem ortasında vize ve projeler üst üste gelince böyle hissetmek çok doğal. Bugünlük kendine biraz izin verip dinlenebilirsin. Yarın taze bir zihinle devam ederiz. Yanındayım!`,

            `Böyle dönemler hepimizde oluyor. Önemli olan kendine fazla yüklenmemek. Ağır konuları şimdilik bir kenara bırakıp biraz zihnini dinlendir, ne zaman istersen buradayım!`
        ];
        return empatheticResponses[Math.floor(Math.random() * empatheticResponses.length)];
    }

    // ── 4. SPECIFIC COURSE INQUIRY (Ders bazlı analiz & Pedagojik Tavsiye) ─────
    const matchedCourse = findMatchedCourse(courses, qNorm);

    if (matchedCourse) {
        const mw = Number(matchedCourse.midtermWeight) || 0;
        const pw = Number(matchedCourse.projectWeight) || 0;
        const fw = Math.max(0, 100 - mw - pw);
        const passGrade = Number(matchedCourse.passingGrade) || 60;
        const mVal = matchedCourse.midtermGrade !== null && matchedCourse.midtermGrade !== undefined ? Number(matchedCourse.midtermGrade) : null;
        const pVal = matchedCourse.projectGrade !== null && matchedCourse.projectGrade !== undefined ? Number(matchedCourse.projectGrade) : null;
        const fVal = matchedCourse.finalGrade !== null && matchedCourse.finalGrade !== undefined ? Number(matchedCourse.finalGrade) : null;
        const current = ((mVal || 0) * mw / 100) + ((pVal || 0) * pw / 100);

        let finalToPass = fw > 0 ? Math.max(0, Math.ceil(((passGrade - current) / fw) * 100)) : 0;
        const targetCutoff = targetGpa >= 3.8 ? 90 : targetGpa >= 3.5 ? 85 : targetGpa >= 3.0 ? 75 : 65;
        let finalForTarget = fw > 0 ? Math.max(0, Math.ceil(((targetCutoff - current) / fw) * 100)) : 0;

        // Check if user is explicitly asking for advice / how to study / how to pass
        const isAskingAdvice = /(?:^|\s)(oneri|tavsiye|tuyo|nasil|gecerim|calis|calismaliyim|gecmek|strateji|ne yapmaliyim|yardim)(?:$|\s)/.test(qNorm) ||
            /(oneri|tavsiye|nasil gecerim|nasil calis|ne yapayim)/.test(qNorm);

        let res = `📌 **${matchedCourse.courseName}** için durum analizi ve tüyolarım:\n\n`;

        // Situation 1: Final grade is already completed
        if (fVal !== null) {
            const totalScore = Math.round(current + (fVal * fw / 100));
            const isPassed = totalScore >= passGrade;
            res += `🎉 Bu dersin finalini vermişsin zaten! (Vize: **${mVal ?? '-'}**, Final: **${fVal}**)\n`;
            res += `• **Dönem Sonu Notun:** **${totalScore}** / 100 (${isPassed ? '✅ Dersi Rahatça Geçmişsin, Tebrikler!' : '⚠️ Geçme notunun biraz altında kalmış'})\n\n`;
            
            if (isAskingAdvice) {
                res += `🚀 **Bu Konuda Kendini Geliştirmek & Mülakatlar İçin Tüyolar:**\n`;
                const subjectTips = getSubjectPedagogicalAdvice(matchedCourse.courseName);
                subjectTips.forEach(tip => {
                    res += `• ${tip}\n`;
                });
                res += `\n💡 **Arkadaş Tavsiyesi:** Dersi geçmiş olsan da bu konular sektörde veya sonraki projelerde çok işine yarayacak. Boş zamanında küçük denemeler yapmaya devam et bence!`;
            } else {
                res += `💡 **Gelişim İpucu:** Bu dersteki başarın diğer derslerin için de harika bir moral. Bilgileri taze tutmak için ufak projeler yapmaya devam edebilirsin.\n`;
            }
            return res;
        }

        // Situation 2: Ongoing course - Current standing
        res += `• **Kredi:** ${matchedCourse.credit} | **Geçme Barajı:** ${passGrade}\n`;
        res += `• **Ağırlıklar:** Vize %${mw}, Proje %${pw}, Final %${fw}\n`;
        res += `• **Şu Anki Notların:** Vize: **${mVal !== null ? mVal : 'Henüz girilmedi'}** | Proje: **${pVal !== null ? pVal : 'Yok / Girilmedi'}**\n\n`;

        if (mVal !== null) {
            if (finalToPass <= 0) {
                res += `🎉 **Müthişsin Kanka:** Vize ve proje notun öyle iyi ki dersi geçmeyi şimdiden garantilemişsin! Finalden 0 alsan dahi bu dersten geçiyorsun, kafan rahat olsun.\n`;
            } else if (finalToPass > 100) {
                res += `⚠️ **Kritik Eşik:** Vize biraz düşük kaldığı için geçmek için finalden 100'ün üstü gerekiyor görünüyor. Bence hocayla hemen konuş, ek ödev veya telafi imkanı var mı yokla.\n`;
            } else {
                res += `🎯 **Dersi Geçmek İçin:** Finalden en az **${finalToPass}** alman yetiyor, gayet makul ve yapılabilir bir hedef!\n`;
            }

            if (finalForTarget <= 100 && finalForTarget > 0) {
                res += `🌟 **${targetGpa.toFixed(2)} Hedef Ortalaman İçin:** Finalden **${finalForTarget}** ve üzeri yaparsan harf notun A/B bandına oturur, genel ortalaman fırlar.\n`;
            }
        } else {
            res += `ℹ️ Vize notun henüz girilmemiş. Vizeyi olabildiğince yüksek tutarsan finalde çok rahat edersin.\n`;
        }

        // Add deep subject-specific pedagogical advice if asked or helpful
        const subjectTips = getSubjectPedagogicalAdvice(matchedCourse.courseName);
        res += `\n🚀 **Bu Derse Özel Sınav ve Çalışma Taktiklerim:**\n`;
        subjectTips.forEach(tip => {
            res += `• ${tip}\n`;
        });

        res += `\n💡 **Haftalık Öneri:** Bu ders ${matchedCourse.credit} kredi, yani haftada ~${Math.max(2, matchedCourse.credit * 1.5)} saat odaklanırsan rahatça yüksek notla kapatırsın.`;
        return res;
    }

    // ── 5. PRIORITY & STUDY STRATEGY (Hangi derse çalışayım?) ───────────────────
    if (/(?:^|\s)(hangi ders|oncelik|hangisine calis|nereye odaklan|hangisi onemli|siralamasi|calisma sirasi)(?:$|\s)/.test(qNorm) ||
        /(hangi ders|oncelik|hangisine calis)/.test(qNorm)) {
        if (!courses.length) {
            return "Şu anda Notlar sayfanda kayıtlı ders görünmüyor. Derslerini eklediğinde en akıllıca çalışma sıralamasını hemen çıkarırım!";
        }

        const sorted = [...courses].sort((a, b) => {
            const aNeed = (Number(a.credit) || 1) * (100 - (Number(a.midtermGrade) || 50));
            const bNeed = (Number(b.credit) || 1) * (100 - (Number(b.midtermGrade) || 50));
            return bNeed - aNeed;
        });

        const top = sorted[0];
        let res = `🎯 **Bence En Çok Asılman Gereken Ders:** **${top.courseName}**\n\n`;
        res += `**Neden mi?**\n`;
        res += `• Kredisi: **${top.credit}** (Genel ortalamana etkisi çok büyük)\n`;
        res += `• Vize durumu: **${top.midtermGrade !== null ? top.midtermGrade : 'Not girilmemiş / kritik'}**\n\n`;
        res += `📚 **Önerdiğim Çalışma Sıralaması:**\n`;
        sorted.slice(0, 4).forEach((c, idx) => {
            const finalW = Math.max(0, 100 - (c.midtermWeight || 30) - (c.projectWeight || 20));
            res += `${idx + 1}. **${c.courseName}** — ${c.credit} Kredi (Vize: ${c.midtermGrade ?? '-'}, Final Etkisi: %${finalW})\n`;
        });
        res += `\n💡 **Kanka Tüyosu:** Kredisi yüksek olan dersin finalinden 5-10 puan fazla almak, düşük kredili derse göre ortalamanı iki kat daha hızlı uçurur!`;
        return res;
    }

    // ── 6. TARGET GPA ADVICE (Hedefime nasıl ulaşırım?) ─────────────────────────
    if (/(?:^|\s)(gpa|ortalama|hedef|nasil yap|nasil ulas|tuttur|yukselt)(?:$|\s)/.test(qNorm) ||
        /(gpa|ortalama|hedefimi)/.test(qNorm)) {
        if (!courses.length) {
            return "Hedef analizi yapabilmem için önce Notlar sayfandan derslerini girmen lazım.";
        }

        let res = `🎯 **Hedef Dönem Ortalaman: ${targetGpa.toFixed(2)}**\n\n`;
        res += `Bunu tutturmak için 3 pratik hile:\n\n`;
        res += `1. **Yüksek Kredili Dersleri B+/A Bandında Tut:** 3 ve 4 kredilik dersler genel ortalamanın lokomotifidir.\n`;
        res += `2. **Finallerin Gücünü Kullan:** Vizeler istediğin gibi geçmediyse bile dert etme; finaller %50-%60 etkili olduğu için her şeyi tersine çevirebilirsin!\n`;
        res += `3. **Düzenli Blok Çalışma:** Toplam kayıtlı ${courses.length} dersin var (Şu ana kadar sisteme ${totalHours} saat çalışma kaydetmişsin). Haftada 3-4 gün odaklanma seansı koysan rahatça hedefin üstüne çıkarsın.\n\n`;
        res += `İstediğin bir dersin adını yaz, o dersten tam kaç alman gerektiğini hemen hesaplayayım!`;
        return res;
    }

    // ── 7. EXAMS & DEADLINES (Sınavlar ve ödevler) ──────────────────────────────
    if (/(?:^|\s)(sinav|deadline|odev|tarih|teslim|yaklasan)(?:$|\s)/.test(qNorm) ||
        /(sinav|deadline|odev|yaklasan)/.test(qNorm)) {
        let res = `📅 **Takviminde Neler Var Bakalım:**\n\n`;
        if (exams.length > 0) {
            res += `📝 **Yaklaşan Sınavlar:**\n`;
            exams.slice(0, 4).forEach(e => {
                res += `• **${e.examName}**: ${e.examDate ? e.examDate : 'Tarih belli değil'} (${e.examType || 'sınav'})\n`;
            });
            res += "\n";
        } else {
            res += `📝 Yakın tarihte kayıtlı sınavın yok, süper!\n\n`;
        }

        if (todos.length > 0) {
            res += `📌 **Bekleyen Ödev ve Teslimler:**\n`;
            todos.slice(0, 4).forEach(t => {
                res += `• ${t.title} (Son Tarih: ${t.dueDate || 'Belirtilmedi'})\n`;
            });
        } else {
            res += `📌 Bekleyen ödevin de yok, kafan rahat!`;
        }
        return res;
    }

    // ── 8. STUDY TIPS & SUBJECT-SPECIFIC HOW TO STUDY ──────────────────────────
    // Check if user is asking how to study / tips / recommendations for a subject
    const isAskingHowToStudy = /(calis|calismaliyim|calissam|nasil calis|nasil ogren|taktik|tuyo|strateji|ne yapayim|yardim|oneri|onerirsin|tavsiye|ipucu|nasil)/.test(qNorm);

    if (isAskingHowToStudy || /(nasil hallederim|nasil gecerim|nasil yapayim|ogrenmek istiyorum|icin ne oner)/.test(qNorm)) {
        // Matematik / Calculus / Lineer Cebir / Diferansiyel
        if (qNorm.includes('matemat') || qNorm.includes('calculus') || qNorm.includes('math') || qNorm.includes('lineer') || qNorm.includes('diferansiyel') || qNorm.includes('cebir') || qNorm.includes('integral') || qNorm.includes('turev')) {
            const mathTips = getSubjectPedagogicalAdvice('matematik');
            return `📐 **Matematik Dersi İçin Çalışma Taktiklerim:**\n\n` +
                mathTips.map(t => `• ${t}`).join('\n') +
                `\n\n💡 **Özet Strateji:** Matematikte konuyu videodan izleyip "anladım" demek en büyük tuzaktır. Kalemi kağıdı alıp çözümü kapatarak soruyu baştan sona kendin çıkarana kadar pratik yapmalısın. Zorlandığın belirli bir konu varsa yaz, birlikte bakalım!`;
        }

        // Fizik
        if (qNorm.includes('fizi') || qNorm.includes('physics')) {
            const physicsTips = getSubjectPedagogicalAdvice('fizik');
            return `⚡ **Fizik Dersi İçin Çalışma Taktiklerim:**\n\n` +
                physicsTips.map(t => `• ${t}`).join('\n') +
                `\n\n💡 **Özet Strateji:** Formülleri ezberlemeye çalışma; olayın fiziksel mantığını ve serbest cisim diyagramını (kuvvet yönlerini) kağıda doğru çizmeyi alışkanlık haline getir!`;
        }

        // Kimya
        if (qNorm.includes('kimya') || qNorm.includes('chemistry')) {
            return `🧪 **Kimya Dersi İçin Çalışma Taktiklerim:**\n\n` +
                `• **Mol ve Stokiyometri Temeli:** Kimyadaki hesaplama sorularının neredeyse tamamı mol kavramına dayanır. Birim dönüşümlerini ve oran-orantıyı refleks haline getir.\n` +
                `• **Periyodik Tablo Trendleri:** Elektronegatiflik, iyonlaşma enerjisi ve atom yarıçapı gibi periyodik özelliklerin soldan sağa ve yukarıdan aşağıya nasıl değiştiğini mantığıyla kavra.\n` +
                `• **Tepkime Denkleştirme:** Kağıt üzerinde bol bol redoks ve asit-baz tepkimesi denkleştirme alıştırması yap.\n\n` +
                `💡 **Özet Strateji:** Kimya hem ezber hem de matematiksel işlem içerir. Konu özetlerini çıkardıktan sonra bol soru çözerek pekiştirmelisin.`;
        }

        // Biyoloji
        if (qNorm.includes('biyoloji') || qNorm.includes('biology')) {
            return `🧬 **Biyoloji Dersi İçin Çalışma Taktiklerim:**\n\n` +
                `• **Kavram Haritaları & Şemalar:** Hücre döngüsü, fotosentez veya genetik süreçleri dümdüz metin olarak okuma; süreçleri gösteren renkli akış şemaları çiz.\n` +
                `• **Terim Sözlüğü:** Latince kökenli karmaşık terimlerin anlamlarını ufak not kağıtlarına (flashcard) yazarak aralıklarla tekrar et.\n` +
                `• **Sistemler Arası İlişki:** Canlı sistemlerinin birbiriyle nasıl bağlantılı çalıştığını bütünsel olarak kavramaya çalış.\n\n` +
                `💡 **Özet Strateji:** Biyoloji görsel hafızayla çok daha rahat öğrenilir. Çizim yaparak çalışmak başarıyı katlar!`;
        }

        // İstatistik & Olasılık
        if (qNorm.includes('istatistik') || qNorm.includes('olasilik') || qNorm.includes('probability') || qNorm.includes('statistics')) {
            return `📊 **Olasılık ve İstatistik İçin Çalışma Taktiklerim:**\n\n` +
                `• **Dağılımların Karakteristiği:** Binom, Poisson ve Normal Dağılımın hangi senaryolarda kullanıldığını çok net ayırt et.\n` +
                `• **Hipotez Testleri:** p-value, Z-test, T-test adımlarını ve sıfır hipotezini (H0) ne zaman reddedeceğini adım adım formül kağıdına dök.\n` +
                `• **Örnek Soruları İrdele:** Sorudaki hikayeyi matematiksel değişkenlere (n, p, μ, σ) dönüştürme pratiği yap.`;
        }

        // Algoritma ve Veri Yapıları
        if (qNorm.includes('algoritm') || qNorm.includes('algorithm') || qNorm.includes('veri yapilari') || qNorm.includes('data structure')) {
            const algoTips = getSubjectPedagogicalAdvice('algoritma');
            return `🧩 **Algoritma ve Veri Yapıları İçin Çalışma Taktiklerim:**\n\n` +
                algoTips.map(t => `• ${t}`).join('\n') +
                `\n\n💡 **Özet Strateji:** Kodu ezberleme. Bir kağıt al, diziyi ve döngü değişkenlerini adım adım elle çizip çalıştır (trace et)!`;
        }

        // Veritabanı / SQL
        if (qNorm.includes('veritaban') || qNorm.includes('database') || qNorm.includes('sql') || qNorm.includes('db')) {
            const dbTips = getSubjectPedagogicalAdvice('veritabani');
            return `🗄️ **Veritabanı (Database) Dersi İçin Çalışma Taktiklerim:**\n\n` +
                dbTips.map(t => `• ${t}`).join('\n') +
                `\n\n💡 **Özet Strateji:** SQL sorgularını ezberleme; tabloları zihninde somutlaştırıp JOIN ve GROUP BY mantığını pratik yaparak kavra.`;
        }

        // Sistem Analizi
        if (qNorm.includes('sistem') || qNorm.includes('system') || qNorm.includes('analiz') || qNorm.includes('uml')) {
            const sysTips = getSubjectPedagogicalAdvice('system');
            return `🏗️ **Sistem Analizi ve Tasarımı İçin Çalışma Taktiklerim:**\n\n` +
                sysTips.map(t => `• ${t}`).join('\n') +
                `\n\n💡 **Özet Strateji:** UML diyagramlarında aktörler ile fonksiyonel gereksinim ayrımına odaklan; sınavda banko puan getirir!`;
        }

        // Görüntü İşleme
        if (qNorm.includes('goruntu') || qNorm.includes('image')) {
            const imgTips = getSubjectPedagogicalAdvice('image');
            return `🖼️ **Görüntü İşleme Dersi İçin Çalışma Taktiklerim:**\n\n` +
                imgTips.map(t => `• ${t}`).join('\n') +
                `\n\n💡 **Özet Strateji:** Görüntünün piksel matrislerinden ibaret olduğunu unutma. 3x3 filtre çarpmalarını elle kağıtta dene!`;
        }

        // Web Programlama
        if (qNorm.includes('web') || qNorm.includes('programla') || qNorm.includes('kodla') || qNorm.includes('yazilim')) {
            const webTips = getSubjectPedagogicalAdvice('web');
            return `💻 **Yazılım & Web Programlama İçin Çalışma Taktiklerim:**\n\n` +
                webTips.map(t => `• ${t}`).join('\n') +
                `\n\n💡 **Özet Strateji:** Sadece video veya doküman izleyerek yazılım öğrenilmez. Editörü açıp küçük denemeler yapmalı ve tarayıcı Console sekmesini sürekli kontrol etmelisin.`;
        }

        // Genel Ders Çalışma Stratejisi
        return `📚 **Bu Dersi En Verimli Şekilde Çalışmak İçin Stratejim:**\n\n` +
            `• **1. Konu Özetini Çıkar:** Slaytları baştan sona ezberlemeye çalışma. Ana kavramları ve formülleri tek sayfalık bir özet kağıdına dök.\n` +
            `• **2. Çıkmış Soruları İncele:** Üniversitede hocaların soru tarzı genelde sabittir. Geçmiş sınav soruları ve slayt sonu problemlerini mutlaka çöz.\n` +
            `• **3. Feynman Tekniği (Sesli Anlatım):** Konuyu sanki hiç bilmeyen bir arkadaşına anlatıyormuş gibi sesli özetle; nerede tıkandığını anında fark edersin.\n` +
            `• **4. Odaklanma Seansı:** 50 dakika kesintisiz çalışıp 10 dakika mola vererek zihnini dinlendir.\n\n` +
            `Bu dersin tam adını ya da zorlandığın spesifik konuyu yazarsan, sana çok daha detaylı nokta atışı tüyolar verebilirim!`;
    }

    if (/(?:^|\s)(calisma|saat|tavsiye|oneri|tuyo|ezber|teknik)(?:$|\s)/.test(qNorm) ||
        /(calisma teknigi|ders calisma|calisma taktik)/.test(qNorm)) {
        return `💡 **Verimli Ders Çalışma İçin Hayat Kurtaran Taktikler:**\n\n` +
            `• **50/10 Kuralı:** Masaya oturunca 50 dakika boyunca telefonunu ve dikkat dağıtıcıları tamamen kapat. Sonra 10 dakika zihnini dinlendir.\n` +
            `• **Kendi Kendine Sesli Anlat:** Konuyu sesli olarak odada birine anlatıyormuş gibi özetle. Tıkandığın noktayı açıp hemen slayttan kontrol et.\n` +
            `• **Çıkmış Sınav Soruları:** Hocanın geçmiş yıllarda sorduğu soruları bulmaya çalış; üniversitede soru tipleri genelde korunur.\n` +
            `• **Düzenli Tekrar:** Haftalık küçük tekrarlar finallerde sabahlamanın önüne geçer.\n\n` +
            `Özel olarak merak ettiğin bir ders veya konu varsa adını söyle, ona göre nokta atışı tüyo vereyim!`;
    }

    // ── 9. DEFAULT NATURAL CONVERSATIONAL RESPONSE ─────────────────────────────
    const qClean = question.trim();
    if (qClean.length < 5) {
        return `Dinliyorum${nameP}! Dersler, sınavlar ya da aklına takılan herhangi bir konu için buradayım, ne sormak istersin?`;
    }

    // If the question seems to be about a lesson or topic not in the standard list
    if (qNorm.includes('ders') || qNorm.includes('sinav') || qNorm.includes('hoca') || qNorm.includes('not') || qNorm.includes('final')) {
        return `Bu dersle ilgili konuyu veya tam olarak hangi kısmında zorlandığını biraz daha açabilir misin? Sana özel en verimli çalışma tekniğini ve sınav tüyolarını hemen çıkarayım!`;
    }

    return `Anladım${nameP}! Sormak istediğin ders, sınav hazırlığı veya çalışma planınla ilgili ayrıntı verirsen hemen yardımcı olabilirim. Nasıl destek olmamı istersin?`;
}


async function callGeminiLLM({ student = {}, courses, exams, todos, totalHours, targetGpa, question, history = [], apiKey, lang = "en" }) {
    const studentName = student.name || "Student";
    const langNames = {
        tr: "Türkçe (Turkish)",
        en: "English",
        de: "Deutsch (German)",
        es: "Español (Spanish)",
        fr: "Français (French)",
        it: "Italiano (Italian)",
        ru: "Русский (Russian)",
        ko: "한국어 (Korean)",
        ja: "日本語 (Japanese)",
        ar: "العربية (Arabic)"
    };
    const targetLang = langNames[lang] || "English";

    const recentHistoryText = Array.isArray(history) && history.length > 0
        ? "\nRecent Conversation History:\n" + history.slice(-6).map(h => `${h.role === "user" ? "Student" : "AI Buddy"}: ${h.text}`).join("\n")
        : "";

    const prompt = `You are a smart, friendly, motivating AI Academic Study Buddy (AI Buddy) for university students.
Student Name: ${studentName}
(Internal Context: Department: ${student.department || "-"}, Grade Level: ${student.gradeLevel || "-"}, Target GPA: ${targetGpa}, Study Time Logged: ${totalHours}h)

Student's Real Courses:
${JSON.stringify(courses.map(c => ({
        name: c.courseName,
        credits: c.credit,
        midterm: c.midtermGrade,
        project: c.projectGrade,
        passingGrade: c.passingGrade,
        midtermWeight: c.midtermWeight,
        projectWeight: c.projectWeight
    })))}

Upcoming Exams: ${JSON.stringify(exams.map(e => ({ exam: e.examName, date: e.examDate, type: e.examType })))}
Pending Assignments/Tasks: ${JSON.stringify(todos.map(t => ({ task: t.title, dueDate: t.dueDate })))}
${recentHistoryText}
Student's Current Message: "${question}"

COMMUNICATION, TONE & SCOPE RULES:
1. NATURAL, FRIENDLY YET RESPECTFUL TONE (DOĞAL, DOSTANE AMA ÖLÇÜLÜ/SAYGILI):
   - Speak naturally like a smart, warm, supportive university study partner sitting next to the student in the library.
   - Be friendly and encouraging, but NOT overly informal, silly, flippant, or slangy (asla laubali olma; ölçülü, samimi ve saygılı ol).
   - Talk like a real human friend: avoid robotic, rigid, or template-like sentences.

2. NEVER REPEAT DEPARTMENT / GRADE LEVEL CONSTANTLY (SÜREKLİ BÖLÜM/SINIF BİLGİSİ VERME):
   - DO NOT constantly state or recite the student's grade or department in your answers (e.g. NEVER say "4. sınıf Bilgisayar Mühendisliği öğrencisi olarak...", "Bilgisayar Mühendisliği okuyan biri olarak...", "As a 4th-year student...").
   - The student already knows their own department and grade. Use this context internally ONLY to calibrate the technical depth of your answers, never to repeat it mechanically to the student.

3. CASUAL GREETINGS & STRICTLY SECULAR ACADEMIC GREETINGS:
   - When the student says "selam", "merhaba", "hi", "hello", "hey":
     Respond ONLY with modern, secular, friendly academic greetings (e.g. "Selam!", "Merhaba!", "Hoş geldin!", "Hello!", "Hi!").
   - STRICTLY FORBIDDEN: NEVER use religious or traditional ritual phrases (e.g. NEVER say "Aleykümselam", "İnşallah", "Maşallah", "Allah", "Eyvallah", "Selamün aleyküm", etc.).
   - If the student asked how you are doing: Answer politely and ask about their studies.
   - For casual greetings, KEEP IT TO 1-2 SHORT, NATURAL, WARM SENTENCES (e.g., "Selam! Hoş geldin, bugün hangi derse veya konuya bakalım?"). Never dump full course tables for simple greetings.

4. OUTPUT LANGUAGE & ADAPTIVE MULTILINGUAL BEHAVIOR:
   - DEFAULT LANGUAGE: Start conversations in the user's selected system interface language: ${targetLang}.
   - USER'S EXPLICIT LANGUAGE PREFERENCE / INPUT LANGUAGE OVERRIDE:
     * If the student asks you to speak or respond in another language (e.g. "benimle Türkçe konuş", "speak in Turkish", "sprechen Sie Deutsch", "habla español", etc.), you MUST IMMEDIATELY ADAPT and respond entirely in that requested language!
     * If the student writes their question in a different language than the interface default, answer them fluently and naturally in the language they used or requested.
     * The system interface language (${targetLang}) is the initial default, but the student's language choice or message language always takes precedence.

5. CONCISE FOR DIRECT QUESTIONS & STRUCTURED FOR STUDY PLANS:
   - Answer directly and concisely for specific questions (when is exam, credits, etc.).
   - Provide well-structured, clear, motivating guidance when asked how to study, revise, or solve a problem.`;

    const fastModels = [
        "gemini-3.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite"
    ];

    for (const modelName of fastModels) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: AbortSignal.timeout(8000),
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: 800,
                        temperature: 0.7
                    }
                })
            });

            if (res.ok) {
                const data = await res.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text && text.trim()) {
                    return text.trim();
                }
            }
        } catch (err) {
            console.warn(`Model ${modelName} fetch failed/timed out:`, err.message);
        }
    }

    throw new Error("Tüm hızlı Gemini modelleri zaman aşımına uğradı.");
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
    parseSyllabusHeuristic,
    answerAcademicQuestion,
    generateRichChatResponse
};

