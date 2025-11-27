let examData = null;
let allQuestionsData = [];
let timerInterval;
let timeLeft = 15 * 60; 
let token = "";

function getUKTime(dateObj = new Date()) {
    return dateObj.toLocaleString('en-GB', { timeZone: 'Europe/London' });
}

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token');

    if (!token) { disableStart("Invalid Link!"); return; }
    if (localStorage.getItem('used_' + token)) { disableStart("⚠️ This link has already been used!"); return; }

    try {
        const jsonString = decodeURIComponent(escape(atob(token)));
        examData = JSON.parse(jsonString);

        const diffMinutes = (new Date().getTime() - examData.time) / 1000 / 60;
        if (diffMinutes > 30) { disableStart("⚠️ This link has expired!"); return; }

        const introHTML = `
        <div style="text-align: left; color: #e9ecef; font-size: 13px; line-height: 1.2;">
            <p style="margin-bottom: 8px;">Hello <strong>${examData.title} ${examData.candidate}</strong>,</p>
            <p style="margin-bottom: 8px;">My Name Is <strong>${examData.admin}</strong> and I will give to you LifeInvader (<strong>Test 1</strong>).</p>
            <ul style="padding-left: 15px; margin: 0;">
                <li style="margin-bottom: 3px;">You will have <strong>15 minutes</strong> to edit 7 ADs.</li>
                <li style="margin-bottom: 3px;">You will need a minimum of <strong>5 correct answers to pass the test</strong>.</li>
                <li style="margin-bottom: 3px;">Strict grading: Punctuation and casing must be exact!</li>
                <li style="margin-bottom: 3px;">Enter the <strong>Ad Text</strong> in the large box and the <strong>Category</strong> in the small box.</li>
                <li style="margin-bottom: 3px;">You can copy and paste the numerical symbol here: <strong>№</strong> if you need.</li>
                <li style="margin-bottom: 0;">All the best! <img src="LI_TOP.png" style="height:14px; vertical-align:middle;"></li>
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
                                <textarea id="answer-text-${i}" class="form-control answer-input" rows="2" placeholder="Corrected Ad Text (Exact match required)"></textarea>
                            </div>
                            <div class="col-md-4">
                                <input type="text" id="answer-cat-${i}" class="form-control cat-input" placeholder="Category (e.g. Auto)">
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
    timerBox.innerText = `${m}:${s < 10 ? '0'+s : s}`;
    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        alert("TIME IS UP! Submitting...");
        finishExam();
    } else {
        timeLeft--;
    }
}

// --- AYRIŞTIRILMIŞ PUANLAMA MOTORU ---
function finishExam() {
    clearInterval(timerInterval);
    
    let correctCount = 0;
    let resultListHTML = "";
    
    examData.indices.forEach((qIndex, i) => {
        // Kullanıcının Cevapları
        const userAdText = document.getElementById(`answer-text-${i}`).value.trim();
        const userCatText = document.getElementById(`answer-cat-${i}`).value.trim();
        
        // Veritabanındaki "Cevap (Kategori)" yapısını parçalayalım
        const fullCorrectAnswer = allQuestionsData[qIndex].a.trim();
        
        // Son parantezi bulup ayıralım
        const lastParenIndex = fullCorrectAnswer.lastIndexOf('(');
        
        let correctAdText = "";
        let correctCatText = "";

        if (lastParenIndex > -1) {
            correctAdText = fullCorrectAnswer.substring(0, lastParenIndex).trim();
            correctCatText = fullCorrectAnswer.substring(lastParenIndex).replace(/[()]/g, '').trim();
        } else {
            // Eğer veritabanında kategori parantez içinde değilse (Nadir durum)
            correctAdText = fullCorrectAnswer;
            correctCatText = ""; 
        }

        // --- PUANLAMA ---
        // 1. Reklam Metni Kontrolü (ÇOK KATI - Birebir Eşleşme)
        const isAdCorrect = userAdText === correctAdText;

        // 2. Kategori Kontrolü (ESNEK - Parantez sil, küçük harf yap)
        const cleanUserCat = userCatText.replace(/[()]/g, '').toLowerCase().trim();
        const cleanCorrectCat = correctCatText.toLowerCase().trim();
        const isCatCorrect = cleanUserCat === cleanCorrectCat;

        // İkisi de doğruysa puan ver
        const isTotalCorrect = isAdCorrect && isCatCorrect;
        
        if (isTotalCorrect) correctCount++;
        
        // PDF Detayları
        let feedbackHTML = "";
        if (!isTotalCorrect) {
            feedbackHTML = `<div style="font-size:9px; color:#555; margin-top:2px;">`;
            
            if (!isAdCorrect) {
                feedbackHTML += `<div><strong>Ad Text:</strong> <span style="color:red">${userAdText || "EMPTY"}</span> <br> <span style="color:green">Expected: ${correctAdText}</span></div>`;
            } else {
                feedbackHTML += `<div><strong>Ad Text:</strong> <span style="color:green">✅ Correct</span></div>`;
            }

            if (!isCatCorrect) {
                feedbackHTML += `<div style="margin-top:2px;"><strong>Cat:</strong> <span style="color:red">${userCatText || "EMPTY"}</span> -> <span style="color:green">${correctCatText}</span></div>`;
            } else {
                feedbackHTML += `<div><strong>Cat:</strong> <span style="color:green">✅ Correct</span></div>`;
            }
            feedbackHTML += `</div>`;
        }

        resultListHTML += `
        <div style="margin-bottom:6px; border-bottom:1px solid #ccc; padding-bottom:4px;">
            <div style="font-weight:bold; font-size:11px;">Q${i+1}: ${isTotalCorrect ? '<span style="color:green">✅ PASSED</span>' : '<span style="color:red">❌ FAILED</span>'}</div>
            ${feedbackHTML}
        </div>`;
    });

    const isPassed = correctCount >= 5;
    const now = new Date();
    const examDateStr = now.toLocaleString('en-GB', { timeZone: 'Europe/London' });
    
    let resultMessage = "";
    let statusColor = isPassed ? "green" : "red";
    let statusText = isPassed ? "PASSED" : "FAIL";

    if (isPassed) {
        resultMessage = `
        <h3 style="color:green; margin-top:10px;">Result : ${correctCount}/7 (Passed)</h3>
        <p style="font-size:11px;"><strong>${examData.title} ${examData.candidate}</strong><br>
        Congratulations, you have passed the test!</p>`;
    } else {
        const retestTime = new Date(now.getTime() + 4*60*60*1000);
        const failMsgDate = retestTime.toLocaleString('en-GB', { timeZone: 'Europe/London' });
        resultMessage = `
        <h3 style="color:red; margin-top:10px;">Result : ${correctCount}/7 (Fail)</h3>
        <p style="font-size:11px;"><strong>${examData.title} ${examData.candidate}</strong><br>
        Sorry, you failed.</p>
        <p style="font-size:11px;">Retest: <strong>${failMsgDate}</strong></p>`;
    }

    const pdfContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: white; color: black; width: 750px; margin: 0 auto;">
        <div style="text-align:center; margin-bottom:10px;">
            <img src="https://li-exam-team.github.io/LI-Test-Bank-EN1/LILOGO.jpg" style="height: 60px;">
            <h2 style="color: #d32f2f; margin: 5px 0;">LifeInvader Exam Result</h2>
            <hr style="margin: 5px 0;">
        </div>
        <table style="width:100%; margin-bottom:10px; font-size:11px;">
            <tr><td><strong>Admin:</strong> ${examData.admin}</td><td style="text-align:right;">${examDateStr}</td></tr>
            <tr><td><strong>Candidate:</strong> ${examData.title} ${examData.candidate}</td><td style="text-align:right; font-weight:bold; color:${statusColor}">${statusText}</td></tr>
        </table>
        <div style="background-color:#f9f9f9; padding:10px; border:1px solid #eee; margin-bottom:10px;">
            <h4 style="margin-top:0; margin-bottom:5px;">Detailed Analysis:</h4>
            ${resultListHTML}
        </div>
        ${resultMessage}
        <div style="margin-top:20px; text-align:center; font-size:9px; color:gray;">OFFICIAL LIFEINVADER DOCUMENT</div>
    </div>
    `;

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '99999';
    overlay.style.backgroundColor = 'white';
    overlay.innerHTML = pdfContent;
    document.body.appendChild(overlay);

    var opt = {
        margin: 5,
        filename: `Result_${examData.candidate.replace(/\s/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        enableLinks: true
    };

    html2pdf().set(opt).from(overlay).save().then(() => {
        document.body.removeChild(overlay);
        document.getElementById('exam-container').innerHTML = `
            <div class="text-center text-white mt-5">
                <h1>Exam Completed</h1>
                <h3 class="text-success">PDF Downloaded!</h3>
            </div>
        `;
    });
}
