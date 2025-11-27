let examData = null;
let allQuestionsData = [];
let timerInterval;
let timeLeft = 15 * 60; 
let token = "";

// UK SAATİ ALMA
function getUKTime(dateObj = new Date()) {
    return dateObj.toLocaleString('en-GB', { timeZone: 'Europe/London' });
}

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token');

    if (!token) {
        disableStart("Invalid Link!");
        return;
    }

    if (localStorage.getItem('used_' + token)) {
        disableStart("⚠️ This link has already been used!");
        return;
    }

    try {
        const jsonString = decodeURIComponent(escape(atob(token)));
        examData = JSON.parse(jsonString);

        const diffMinutes = (new Date().getTime() - examData.time) / 1000 / 60;
        if (diffMinutes > 30) { 
            disableStart("⚠️ This link has expired (Time limit exceeded)!");
            return;
        }

        // --- GİRİŞ METNİ (SIKILAŞTIRILMIŞ TASARIM) ---
        // Liste boşluklarını (margin) sıfırladık ve satır yüksekliğini azalttık.
        const introHTML = `
        <div style="text-align: left; line-height: 1.4;">
            Hello <strong>${examData.title} ${examData.candidate}</strong>,<br>
            My Name Is <strong>${examData.admin}</strong> and I will give to you LifeInvader (<strong>Test 1</strong>).<br><br>
            
            <ul style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 4px;">You will have <strong>15 minutes</strong> to edit 7 ADs.</li>
                <li style="margin-bottom: 4px;">You will need a minimum of <strong>5 correct answers to pass the test</strong>.</li>
                <li style="margin-bottom: 4px;">You can use the LifeInvader <strong>Internal Policy</strong> along with the <strong>Sellable vehicles - Clothing and items list</strong> to help you with the below.</li>
                <li style="margin-bottom: 4px;">Some ADs may need <strong>Rejecting</strong> so keep an eye out for that.</li>
                <li style="margin-bottom: 4px;">You can copy and paste the numerical symbol here: <strong>№</strong> if you need.</li>
                <li style="margin-bottom: 4px;">At the end of each AD please mention the <strong>Category</strong> it goes under in brackets.</li>
                <li style="margin-bottom: 4px;">All the best! <img src="LI_TOP.png" style="height:18px; vertical-align:middle;"></li>
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
                        <p class="text-white mb-2">${data[qIndex].q}</p>
                        <textarea id="answer-${i}" class="form-control answer-input" rows="2" placeholder="Type your corrected ad here..."></textarea>
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
        alert("TIME IS UP! System is submitting your answers...");
        finishExam();
    } else {
        timeLeft--;
    }
}

// --- KESİN ÇALIŞAN PDF MOTORU ---
function finishExam() {
    clearInterval(timerInterval);
    
    let correctCount = 0;
    let resultListHTML = "";
    
    examData.indices.forEach((qIndex, i) => {
        const userAnswer = document.getElementById(`answer-${i}`).value.trim();
        const correctAnswer = allQuestionsData[qIndex].a.trim();
        const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        
        if (isCorrect) correctCount++;
        
        resultListHTML += `
        <div style="margin-bottom:8px; border-bottom:1px solid #ddd; padding-bottom:4px;">
            <div style="margin-bottom:2px; font-weight:bold;">Q${i+1}: ${isCorrect ? '<span style="color:green">✅ Correct</span>' : '<span style="color:red">❌ Wrong</span>'}</div>
            <div style="font-size:12px; color:#444;"><i>Your Answer:</i> ${userAnswer || "(Empty)"}</div>
            ${!isCorrect ? `<div style="font-size:12px; color:#006400;"><i>Correct:</i> ${correctAnswer}</div>` : ''}
        </div>`;
    });

    const isPassed = correctCount >= 5;
    const now = new Date();
    const examDateStr = now.toLocaleString('en-GB', { timeZone: 'Europe/London' });
    
    let failMsgDate = "";
    if (!isPassed) {
        const retestTime = new Date(now.getTime() + 4*60*60*1000);
        failMsgDate = retestTime.toLocaleString('en-GB', { timeZone: 'Europe/London' });
    }

    let resultMessage = "";
    let statusColor = isPassed ? "green" : "red";
    let statusText = isPassed ? "PASSED" : "FAIL";

    if (isPassed) {
        resultMessage = `
        <h2 style="color:green; margin-top:15px; border-bottom: 2px solid green; display:inline-block;">Result : ${correctCount}/7 (Passed)</h2>
        <p><strong>${examData.title} ${examData.candidate}</strong><br>
        Congratulations🎉, you have passed the test with ${correctCount}/7 correct answers!<br> 
        Welcome to LifeInvader.</p>
        <p style="margin-top:10px;">Please watch the training videos:</p>
        <ul>
            <li><a href="https://youtu.be/-Urb1XQpYJI">Emails training</a></li>
            <li><a href="https://www.youtube.com/watch?v=4_VSZONyonI&ab_channel=Nor!">PDA training</a></li>
        </ul>`;
    } else {
        resultMessage = `
        <h2 style="color:red; margin-top:15px; border-bottom: 2px solid red; display:inline-block;">Result : ${correctCount}/7 (Fail)</h2>
        <p><strong>${examData.title} ${examData.candidate}</strong><br>
        Sorry to tell you, but you've failed the test with ${correctCount}/7 Correct Answers.</p>
        <p>You are eligible to take retest after 4 hours on: <br>
        <strong style="font-size:16px;">${failMsgDate} (City Time)</strong></p>`;
    }

    // PDF İÇERİĞİ (Görünür Katman Tekniği)
    const pdfContent = `
        <div style="text-align:center; margin-bottom:20px;">
            <img src="https://li-exam-team.github.io/LI-Test-Bank-EN1/LILOGO.jpg" style="height: 70px; display:block; margin:0 auto;">
            <h1 style="color: #d32f2f; margin: 5px 0; font-size: 24px;">LifeInvader Exam Result</h1>
            <hr style="border: 1px solid #d32f2f;">
        </div>
        
        <table style="width:100%; margin-bottom:15px; font-size:12px;">
            <tr><td><strong>Admin:</strong> ${examData.admin}</td><td style="text-align:right;"><strong>Date:</strong> ${examDateStr}</td></tr>
            <tr><td><strong>Candidate:</strong> ${examData.title} ${examData.candidate}</td><td style="text-align:right;"><strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${statusText}</span></td></tr>
        </table>

        <div style="background-color:#f8f9fa; padding:15px; border-radius:5px; border:1px solid #eee; margin-bottom:15px;">
            <h3 style="margin-top:0; font-size:16px; border-bottom:1px solid #ccc;">Answers Check:</h3>
            ${resultListHTML}
        </div>

        ${resultMessage}

        <div style="margin-top:30px; text-align:center; font-size:10px; color:gray;">
            <hr>
            OFFICIAL LIFEINVADER DOCUMENT
        </div>
    `;

    // --- YENİ YÖNTEM: OVERLAY (GÖRÜNÜR KATMAN) ---
    // PDF içeriğini ekranın en üstüne, görünür şekilde basıyoruz.
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '99999'; // En üstte
    overlay.style.backgroundColor = 'white'; // Bembeyaz kağıt
    overlay.style.color = 'black';
    overlay.style.padding = '40px';
    overlay.style.overflowY = 'auto'; // Kaydırılabilir
    overlay.style.fontFamily = 'Arial, sans-serif';
    overlay.innerHTML = pdfContent;
    
    document.body.appendChild(overlay);

    var opt = {
        margin:       10,
        filename:     `Result_${examData.candidate.replace(/\s/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // PDF'i oluştur, indir ve sonra kullanıcıya sonucu göster
    html2pdf().set(opt).from(overlay).save().then(() => {
        // İndirme bitince overlay'i silmiyoruz ki kullanıcı da sonucu ekranda görsün.
        // Sadece altına "Kapat" butonu ekleyebiliriz veya sayfayı yenilemesini söyleyebiliriz.
        alert("PDF Downloaded! You can now close this page.");
    });
}
