// ================================================================
// LIFEINVADER EXAM SYSTEM - FINAL VERSION (NUCLEAR LOGIC FIX + NEW PDF)
// ================================================================

let examData = null;
let allQuestionsData = [];
let timerInterval;
let timeLeft = 15 * 60; 
let token = "";

// İngiltere saatini alma fonksiyonu
function getUKTime(dateObj = new Date()) {
    return dateObj.toLocaleString('en-GB', { timeZone: 'Europe/London' });
}

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token');

    if (!token) { disableStart("Invalid Link!"); return; }
    
    // KONTROL 1: Daha önce "Start"a basıldı mı?
    if (localStorage.getItem('used_' + token)) { 
        disableStart("⚠️ This exam has already been taken!"); 
        return; 
    }

    try {
        const jsonString = decodeURIComponent(escape(atob(token)));
        examData = JSON.parse(jsonString);

        // KONTROL 2: Link oluşturulalı 15 dakika geçti mi?
        const diffMinutes = (new Date().getTime() - examData.time) / 1000 / 60;
        
        if (diffMinutes > 15) { 
            disableStart("⚠️ This link has expired! (15 min limit passed)"); 
            return; 
        }

        const introHTML = `
        <div style="text-align: left; color: #e9ecef; font-size: 13px; line-height: 1.4;">
            <p>Hello <strong>${examData.title} ${examData.candidate}</strong>,</p>
            <p>My Name Is <strong>${examData.admin}</strong> and I will give to you LifeInvader (<strong>Test 1</strong>).</p>
            <ul style="padding-left: 20px; margin: 10px 0;">
                <li>You will have <strong>15 minutes</strong> to edit 7 ADs.</li>
                <li>You will need a minimum of <strong>5 correct answers to pass the test</strong>.</li>
                <li>You can use the LifeInvader <strong>Internal Policy</strong> along with the <strong>Sellable vehicles</strong> list.</li>
                <li>If the ad text is correct, you can leave the text box <strong>EMPTY</strong>.</li>
                <li>Some ADs may need <strong>Rejecting</strong> so keep an eye out for that.</li>
                <li>At the end of each AD please mention the <strong>Category</strong> it goes under in brackets.</li>
                <li>All the best! <img src="LI_TOP.png" style="height:18px; vertical-align:middle;"></li>
            </ul>
        </div>`;
        document.getElementById('intro-text').innerHTML = introHTML;

    } catch (e) {
        console.error(e);
        disableStart("Corrupted Link!");
    }
};

function disableStart(msg) {
    const warning = document.getElementById('expiry-warning');
    warning.innerText = msg;
    warning.style.display = 'block';
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').innerText = "ACCESS DENIED";
    document.getElementById('btn-start').classList.replace('btn-success', 'btn-secondary');
}

function startExam() {
    // START'A BASILDIĞI AN LİNKİ YAK (KİLİTLE)
    localStorage.setItem('used_' + token, 'true');
    
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('exam-container').style.display = 'block';
    loadQuestions();
    timerInterval = setInterval(updateTimer, 1000);
}

function loadQuestions() {
    const fileName = `questions-${examData.cat}.json`;
    fetch(fileName)
        .then(res => res.json())
        .then(data => {
            allQuestionsData = data; 
            const container = document.getElementById('questions-area');
            let htmlContent = "";
            examData.indices.forEach((qIndex, i) => {
                if (data[qIndex]) {
                    htmlContent += `
                    <div class="question-block">
                        <label class="fw-bold text-warning mb-2">Question ${i+1}:</label>
                        <p class="text-white mb-2" style="font-family:'Courier New';">${data[qIndex].q}</p>
                        
                        <div class="row g-2">
                            <div class="col-md-8">
                                <textarea id="answer-text-${i}" class="form-control answer-input" rows="2" placeholder="Ad Text (Leave empty if correct)"></textarea>
                            </div>
                            <div class="col-md-4">
                                <input type="text" id="answer-cat-${i}" class="form-control cat-input" placeholder="Category">
                            </div>
                        </div>
                    </div>`;
                }
            });
            container.innerHTML = htmlContent;
        });
}

function updateTimer() {
    const timerBox = document.getElementById('timer-box');
    let m = Math.floor(timeLeft / 60);
    let s = timeLeft % 60;
    
    // Süre 1 dakikadan az kalınca rengi kırmızı yap (Görsel Uyarı)
    if (timeLeft < 60) {
        timerBox.style.color = "red";
        timerBox.classList.add("shake"); // Son saniyelerde titret
    }

    timerBox.innerText = `${m}:${s < 10 ? '0'+s : s}`;
    
    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        finishExam(); 
    } else {
        timeLeft--;
    }
}

// --- YARDIMCI VE MANTIK FONKSİYONLARI ---

// 1. Cevap Ayrıştırma (Eski fonksiyon korundu)
function parseAnswerString(fullStr) {
    const lastParen = fullStr.lastIndexOf('(');
    if (lastParen > -1) {
        return {
            text: fullStr.substring(0, lastParen).trim(),
            cat: fullStr.substring(lastParen).replace(/[()]/g, '').trim()
        };
    }
    return { text: fullStr.trim(), cat: "" };
}

// 2. Kategori Temizleyici (Tolerans için)
function cleanCategory(str) {
    if (!str) return "";
    // Parantezleri kaldır, harf olmayan her şeyi sil, küçük harfe çevir
    return str.replace(/[()]/g, '').replace(/[^a-zA-Z]/g, '').toLowerCase();
}

// 3. Gelişmiş Rejected Kontrolü (NÜKLEER TEMİZLİK MODU)
function checkRejectionMatch(userAnswer, correctAnswer) {
    let u = userAnswer.toLowerCase();
    let c = correctAnswer.toLowerCase();

    // Sadece Rejected sorularında devreye girer
    if (!c.startsWith("reject")) return false;

    // KURAL A: Blacklist Kontrolü (Hala Zorunlu)
    const requiresBlacklist = c.includes("blacklist");
    const userHasBlacklist = u.includes("blacklist");
    
    // Eğer cevap Blacklist gerektiriyor ama kullanıcı yazmadıysa -> YANLIŞ
    if (requiresBlacklist && !userHasBlacklist) return false; 

    // KURAL B: Nükleer Temizlik (Nuclear Stripping)
    // Amacımız: Harfler ve rakamlar hariç her şeyi (boşluklar, noktalar, bağlaçlar) yok etmek.
    function nuclearStrip(text) {
        return text
            // 1. Kritik Eş anlamlılar (Synonyms)
            .replace(/can\s*not/g, "cannot")       // "can not" -> "cannot" (Bitişik yap)
            .replace(/\b(admin|admins|god|gods)\b/g, "gods") // Admin -> gods (Eşitle)
            
            // 2. Gereksiz Kelimeleri At
            .replace(/rejected|reject/g, "")       
            .replace(/blacklisted|blacklist/g, "") 
            .replace(/reason/g, "") 
            
            // 3. Bağlaçları At (ve, veya, and, or) - Listeleme farklarını yok etmek için
            .replace(/\b(and|or)\b/g, "")
            
            // 4. Sembolleri, Noktalamayı ve BOŞLUKLARI At
            // [^a-z0-9] demek harf ve rakam OLMAYAN her şeyi sil demek.
            // Bu; nokta, virgül, &, +, -, :, ve tüm boşlukları siler.
            .replace(/[^a-z0-9]/g, ""); 
    }

    const uClean = nuclearStrip(u);
    const cClean = nuclearStrip(c);

    // İNİSİYATİF: Kullanıcı sadece "Rejected" yazıp bıraktıysa ve sebep belirtmediyse
    if (uClean === "" || uClean.length < 3) return true; 

    // Artık elimizde sadece "cannotpromotefoodhealthitems" gibi saf bir metin var. Karşılaştır:
    return uClean === cClean;
}

// --- FİNAL PUANLAMA MOTORU (GÜNCELLENMİŞ PDF ÇIKTISI) ---
function finishExam() {
    clearInterval(timerInterval);
    document.getElementById('exam-container').style.display = 'none';
    
    let correctCount = 0;
    let resultListHTML = "";
    
    examData.indices.forEach((qIndex, i) => {
        const userAdText = document.getElementById(`answer-text-${i}`).value.trim();
        const userCatText = document.getElementById(`answer-cat-${i}`).value.trim();
        const questionItem = allQuestionsData[qIndex];
        const possibleAnswersRaw = questionItem.a.split(" or ");
        
        let isQuestionPassed = false;
        let finalCorrectObj = null; 

        // --- CEVAP KONTROL DÖNGÜSÜ ---
        for (let rawOption of possibleAnswersRaw) {
            const correctObj = parseAnswerString(rawOption);
            finalCorrectObj = correctObj; 

            let isTextMatch = false;
            let isCatMatch = false;

            // ADIM 1: METİN KONTROLÜ
            if (correctObj.text.toLowerCase().startsWith("reject")) {
                if (checkRejectionMatch(userAdText, correctObj.text)) {
                    isTextMatch = true;
                }
            } else {
                if (userAdText === correctObj.text) {
                    isTextMatch = true;
                }
            }

            // ADIM 2: KATEGORİ KONTROLÜ
            const uCat = cleanCategory(userCatText);
            const cCat = cleanCategory(correctObj.cat);

            if (uCat === cCat) {
                isCatMatch = true;
            } else if (correctObj.text.toLowerCase().startsWith("reject") && (uCat === "" || uCat === "rejected")) {
                isCatMatch = true;
            }

            if (isTextMatch && isCatMatch) {
                isQuestionPassed = true;
                break; 
            }
        }

        if (isQuestionPassed) correctCount++;
        
        // --- HTML RAPORLAMA KISMI ---
        let adTextDisplay = "";
        let isTextVisualCorrect = false;

        if (finalCorrectObj.text.toLowerCase().startsWith("reject")) {
             if (checkRejectionMatch(userAdText, finalCorrectObj.text)) isTextVisualCorrect = true;
        } else {
            if (userAdText === finalCorrectObj.text) isTextVisualCorrect = true;
        }

        if (isTextVisualCorrect) {
            adTextDisplay = `<span style="color:green; font-weight:bold;">${userAdText}</span>`;
        } else {
            adTextDisplay = `<span style="color:red; text-decoration:line-through;">${userAdText || "(Empty)"}</span> <br><span style="color:green; font-size:10px;">Expected: ${finalCorrectObj.text}</span>`;
        }

        let catDisplay = "";
        const uCatVisual = cleanCategory(userCatText);
        const cCatVisual = cleanCategory(finalCorrectObj.cat);
        let isCatCorrect = (uCatVisual === cCatVisual);
        
        if (finalCorrectObj.text.toLowerCase().startsWith("reject") && (uCatVisual === "" || uCatVisual === "rejected")) {
            isCatCorrect = true;
        }

        if (isCatCorrect) {
            catDisplay = `<span style="color:green; font-weight:bold;">${userCatText || "(Correct)"}</span>`;
        } else {
            catDisplay = `<span style="color:red; text-decoration:line-through;">${userCatText || "(Empty)"}</span> <span style="color:green; font-size:10px;">(Expected: ${finalCorrectObj.cat})</span>`;
        }

        resultListHTML += `
        <div style="margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:5px;">
            <div style="font-weight:bold; font-size:11px; color:#333;">
                Q${i+1}: ${isQuestionPassed ? '✅' : '❌'}
            </div>
            <div style="font-size:10px; margin-left:15px; margin-top:2px;">
                <strong>Input:</strong> ${adTextDisplay}<br>
                <strong>Cat:</strong> ${catDisplay}
            </div>
        </div>`;
    });

    // --- SONUÇ HESAPLAMA VE PDF ÇIKTISI (GÜNCELLENMİŞ) ---
    const isPassed = correctCount >= 5;
    const now = new Date();
    const examDateStr = now.toLocaleString('en-GB', { timeZone: 'Europe/London' });

    let resultMessage = "";
    let statusColor = isPassed ? "green" : "red";
    let statusText = isPassed ? "PASSED" : "FAIL";

    // UK Saat Dilimi Hesabı
    const ukTimeStr = now.toLocaleString('en-US', { timeZone: 'Europe/London' });
    const ukDate = new Date(ukTimeStr);
    const retestDate = new Date(ukDate.getTime() + 4*60*60*1000); // 4 Saat Ekle
    
    // Tarih Formatı (DD.MM.YYYY HH:MM)
    const dd = String(retestDate.getDate()).padStart(2, '0');
    const mm = String(retestDate.getMonth() + 1).padStart(2, '0');
    const yyyy = retestDate.getFullYear();
    const formattedDate = `${dd}.${mm}.${yyyy}`;
    
    const hh = String(retestDate.getHours()).padStart(2, '0');
    const min = String(retestDate.getMinutes()).padStart(2, '0');
    const formattedTime = `${hh}:${min}`;

    if (isPassed) {
        resultMessage = `
        <div style="margin-top: 20px; text-align: center;">
            <h3 style="color:green; margin: 0;">Result : ${correctCount}/7</h3>
            <h3 style="color:green; margin: 5px 0 15px 0;">Passed</h3>
            
            <p style="font-size:12px; margin-bottom: 15px;">
                Congratulations🎉 ${examData.title} ${examData.candidate}, you have passed the test with ${correctCount}/7 correct answers!<br>
                Welcome to LifeInvader.
            </p>

            <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; text-align: left; font-size: 11px; border: 1px solid #dee2e6;">
                <p style="margin-bottom: 8px;">Now, please watch the following videos to understand how to use the discord channels, their purpose, and how to use the PDA:</p>
                <ul style="margin-bottom: 8px; padding-left: 20px;">
                    <li><a href="https://youtu.be/-Urb1XQpYJI" target="_blank" style="color: #0d6efd; font-weight: bold; text-decoration: underline;">Emails training</a></li>
                    <li><a href="https://www.youtube.com/watch?v=4_VSZONyonI&ab_channel=Nor!" target="_blank" style="color: #0d6efd; font-weight: bold; text-decoration: underline;">PDA training</a></li>
                </ul>
                <p style="margin: 0;">Watch them carefully to get a better understanding of how things work. Only after watching these videos you will receive the appropriate rank to start working.</p>
            </div>
        </div>`;
    } else {
        resultMessage = `
        <div style="margin-top: 20px; text-align: center;">
            <h3 style="color:red; margin: 0;">Result : ${correctCount}/7</h3>
            <h3 style="color:red; margin: 5px 0 15px 0;">Fail</h3>
            
            <p style="font-size:12px; line-height: 1.6;">
                ${examData.title} ${examData.candidate} So sorry to tell you, but you've failed the test with ${correctCount}/7 Correct Answers.<br>
                You are eligible to take restest after 4 hours on <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong> (UK saati ile) city time.
            </p>
        </div>`;
    }

    const reportHTML = `
    <div id="final-report-view" style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; background-color: #ffffff; color: #000000; width: 100%; max-width: 800px; margin: 0 auto;">
        <div style="text-align:center; margin-bottom:15px;">
            <img src="https://li-exam-team.github.io/LI-Test-Bank-EN1/LILOGO.jpg" style="height: 50px; width: auto; display:block; margin: 0 auto;">
            <h2 style="color: #d32f2f; margin: 10px 0 5px 0;">LifeInvader Exam Result</h2>
            <hr style="margin: 5px 0; border: 1px solid #d32f2f;">
        </div>
        
        <table style="width:100%; margin-bottom:15px; font-size:11px; border-collapse: collapse;">
            <tr>
                <td><strong>Admin:</strong> ${examData.admin}</td>
                <td style="text-align:right;">${examDateStr}</td>
            </tr>
            <tr>
                <td><strong>Candidate:</strong> ${examData.title} ${examData.candidate}</td>
                <td style="text-align:right; font-weight:bold; color:${statusColor}">${statusText}</td>
            </tr>
        </table>
        
        <div style="background-color:#fcfcfc; padding:15px; border-radius:5px; border:1px solid #eee; margin-bottom:15px;">
            <h5 style="margin-top:0; margin-bottom:10px; border-bottom:1px solid #ccc; padding-bottom: 5px;">Answers Detail:</h5>
            ${resultListHTML}
        </div>

        ${resultMessage}
        
        <div style="margin-top:30px; text-align:center; font-size:9px; color:gray;">
            <hr style="margin-bottom: 5px;">
            OFFICIAL LIFEINVADER DOCUMENT
        </div>
        
        <div style="text-align:center; margin-top:20px;">
            <p style="color: green; font-weight: bold; font-size: 14px;">✅ Exam Completed. Downloading PDF...</p>
        </div>
    </div>`;

    document.body.innerHTML = reportHTML;
    document.body.style.backgroundColor = "white"; 

    setTimeout(() => {
        const element = document.getElementById('final-report-view');
        var opt = {
            margin:       10,
            filename:     `Result_${examData.candidate.replace(/\s/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            enableLinks:  true
        };
        html2pdf().set(opt).from(element).save();
    }, 500);
}
