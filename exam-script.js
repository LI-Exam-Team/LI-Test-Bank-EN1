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

        // Giriş Metni (Resimli ve Formatlı)
        const introHTML = `Hello <strong>${examData.title} ${examData.candidate}</strong>,<br>
My Name Is <strong>${examData.admin}</strong> and I will give to you LifeInvader (<strong>Test 1</strong>).<br><br>

<ul style="list-style-type: disc; padding-left: 20px; text-align:left;">
    <li>You will have <strong>15 minutes</strong> to edit 7 ADs.</li>
    <li>You will need a minimum of <strong>5 correct answers to pass the test</strong>.</li>
    <li>You can use the LifeInvader <strong>Internal Policy</strong> along with the <strong>Sellable vehicles - Clothing and items list</strong> to help you with the below.</li>
    <li>Some ADs may need <strong>Rejecting</strong> so keep an eye out for that.</li>
    <li>You can copy and paste the numerical symbol here: <strong>№</strong> if you need.</li>
    <li>At the end of each AD please mention the <strong>Category</strong> it goes under in brackets.</li>
    <li>All the best! <img src="LI_TOP.png" style="height:20px; vertical-align:middle;"></li>
</ul>`;

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

// --- FİNAL PDF MOTORU ---
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
        <div style="margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:5px;">
            <div style="margin-bottom:5px;"><strong>Q${i+1}:</strong> ${isCorrect ? '<span style="color:green">✅ Correct</span>' : '<span style="color:red">❌ Wrong</span>'}</div>
            <div style="font-size:12px; color:#555;"><i>Your Answer:</i> ${userAnswer || "(Empty)"}</div>
            ${!isCorrect ? `<div style="font-size:12px; color:green;"><i>Correct:</i> ${correctAnswer}</div>` : ''}
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
        <h2 style="color:green; margin-top:20px;">Result : ${correctCount}/7 (Passed)</h2>
        <p><strong>${examData.title} ${examData.candidate}</strong><br>
        Congratulations, you have passed the test with ${correctCount}/7 correct answers!<br> 
        Welcome to LifeInvader.</p>
        <p>Please watch the training videos:</p>
        <ul>
            <li><a href="https://youtu.be/-Urb1XQpYJI">Emails training</a></li>
            <li><a href="https://www.youtube.com/watch?v=4_VSZONyonI&ab_channel=Nor!">PDA training</a></li>
        </ul>`;
    } else {
        // Fail Tarihi Hesapla
        const retestTime = new Date(now.getTime() + 4*60*60*1000);
        const failMsgDate = retestTime.toLocaleString('en-GB', { timeZone: 'Europe/London' });

        resultMessage = `
        <h2 style="color:red; margin-top:20px;">Result : ${correctCount}/7 (Fail)</h2>
        <p><strong>${examData.title} ${examData.candidate}</strong><br>
        Sorry to tell you, but you've failed the test with ${correctCount}/7 Correct Answers.</p>
        <p>You are eligible to take retest after 4 hours on: <br>
        <strong style="font-size:16px;">${failMsgDate} (City Time)</strong></p>`;
    }

    // PDF İçeriği
    const pdfContent = `
    <div style="font-family: Arial, sans-serif; padding: 30px; background: white; color: black; border: 5px solid #333;">
        <div style="text-align:center; margin-bottom:20px;">
            <img src="https://li-exam-team.github.io/LI-Test-Bank-EN1/LILOGO.jpg" style="height: 80px;">
            <h1 style="color: #d32f2f;">LifeInvader Exam Result</h1>
            <hr>
        </div>
        <table style="width:100%; margin-bottom:20px;">
            <tr><td><strong>Admin:</strong> ${examData.admin}</td><td style="text-align:right;">${examDateStr}</td></tr>
            <tr><td><strong>Candidate:</strong> ${examData.title} ${examData.candidate}</td><td style="text-align:right; font-weight:bold; color:${statusColor}">${statusText}</td></tr>
        </table>
        <h3>Answers Check:</h3>
        ${resultListHTML}
        <hr>
        ${resultMessage}
        <div style="margin-top:30px; text-align:center; font-size:12px; color:gray;">OFFICIAL LIFEINVADER DOCUMENT</div>
    </div>
    `;

    // --- YENİ YÖNTEM: Ekrana Basıp Çekme ---
    const overlay = document.createElement('div');
    overlay.id = 'pdf-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '10000';
    overlay.style.background = 'white';
    overlay.style.overflowY = 'scroll';
    overlay.innerHTML = pdfContent;
    document.body.appendChild(overlay);

    var opt = {
        margin:       10,
        filename:     `Result_${examData.candidate.replace(/\s/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // PDF'i oluştur, kaydet ve sonra overlay'i kaldır
    html2pdf().set(opt).from(overlay).save().then(() => {
        document.body.removeChild(overlay);
        document.getElementById('exam-container').innerHTML = `
            <div class="text-center text-white mt-5">
                <h1>Exam Completed</h1>
                <h3 class="text-success">PDF Downloaded!</h3>
            </div>`;
    });
}
