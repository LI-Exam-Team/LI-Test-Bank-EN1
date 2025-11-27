let examData = null;
let allQuestionsData = [];
let timerInterval;
let timeLeft = 15 * 60; 
let token = "";

// UK SAATİ ALMA FONKSİYONU
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

        // --- GİRİŞ METNİ GÜNCELLEMESİ (RESİMLİ) ---
        const introHTML = `Hello Miss. or Mr. <strong>${examData.candidate}</strong>,<br>
My Name Is <strong>${examData.admin}</strong> and I will give to you LifeInvader (<strong>Test 1</strong>).<br><br>

<ul style="list-style-type: disc; padding-left: 20px;">
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

// --- DÜZELTİLEN PDF MOTORU (ARTIK BOŞ ÇIKMAYACAK) ---
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
        <div style="margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
            <strong style="color:#555;">Q${i+1}:</strong> ${isCorrect ? '✅' : '❌'} <br>
            <span style="font-size:12px; color:#777;">Your Answer: ${userAnswer || "(Empty)"}</span>
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
        <h2 style="color:green; margin-top:20px;">Result : ${correctCount}/7 (Passed)</h2>
        <p><strong>${examData.title} ${examData.candidate}</strong><br>
        Congratulations🎉, you have passed the test with ${correctCount}/7 correct answers!<br> 
        Welcome to LifeInvader.</p>
        <p>Now, please watch the following videos to understand how to use the discord channels, their purpose, and how to use the PDA:</p>
        <ul>
            <li><a href="https://youtu.be/-Urb1XQpYJI" target="_blank" style="color:blue; text-decoration:underline;">Emails training</a></li>
            <li><a href="https://www.youtube.com/watch?v=4_VSZONyonI&ab_channel=Nor!" target="_blank" style="color:blue; text-decoration:underline;">PDA training</a></li>
        </ul>
        <p>Watch them carefully to get a better understanding of how things work. Only after watching these videos you will receive the appropriate rank to start working.</p>`;
    } else {
        resultMessage = `
        <h2 style="color:red; margin-top:20px;">Result : ${correctCount}/7 (Fail)</h2>
        <p><strong>${examData.title} ${examData.candidate}</strong><br>
        Sorry to tell you, but you've failed the test with ${correctCount}/7 Correct Answers.</p>
        <p>You are eligible to take retest after 4 hours on: <br>
        <strong style="font-size:16px;">${failMsgDate} (City Time)</strong></p>`;
    }

    // PDF İÇERİĞİ
    const pdfContent = `
    <div style="font-family: Arial, sans-serif; padding: 40px; color: black; background: white; width: 100%;">
        
        <div style="text-align:center; margin-bottom:30px;">
            <img src="https://li-exam-team.github.io/LI-Test-Bank-EN1/LILOGO.jpg" style="height: 80px; width: auto;">
            <h1 style="color: #d32f2f; margin: 10px 0;">LifeInvader Exam Result</h1>
            <div style="border-bottom: 2px solid #d32f2f; width: 100%;"></div>
        </div>

        <table style="width:100%; margin-bottom:20px; font-size:14px;">
            <tr>
                <td><strong>Admin:</strong> ${examData.admin}</td>
                <td style="text-align:right;"><strong>Date:</strong> ${examDateStr}</td>
            </tr>
            <tr>
                <td><strong>Candidate:</strong> ${examData.title} ${examData.candidate}</td>
                <td style="text-align:right;"><strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${statusText}</span></td>
            </tr>
        </table>

        <div style="background-color:#f9f9f9; padding:15px; border-radius:5px; margin-bottom:20px;">
            <h3 style="margin-top:0;">Answers Check:</h3>
            ${resultListHTML}
        </div>

        ${resultMessage}

        <div style="margin-top:50px; text-align:center; font-size:12px; color:gray;">
            <hr>
            OFFICIAL LIFEINVADER DOCUMENT
        </div>
    </div>
    `;

    // --- KRİTİK DÜZELTME: GEÇİCİ ELEMENT OLUŞTURMA ---
    // PDF'i ekranda görünmeyen bir elementten değil,
    // anlık oluşturulan bir kapsayıcıdan çekeceğiz.
    
    // 1. Geçici bir div oluştur
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = pdfContent;
    
    // 2. Bu divi sayfanın dışına yerleştir (Görünmez ama render edilebilir)
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '800px'; // A4 genişliği için
    document.body.appendChild(tempContainer);

    var opt = {
        margin:       10,
        filename:     `Result_${examData.candidate.replace(/\s/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true }, // useCORS resimlerin yüklenmesi için önemli
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 3. PDF'i oluştur ve sonra geçici divi sil
    html2pdf().set(opt).from(tempContainer).save().then(() => {
        document.body.removeChild(tempContainer); // Temizlik
        
        document.getElementById('exam-container').innerHTML = `
            <div class="text-center text-white mt-5">
                <img src="LILOGO.jpg" style="height: 100px; border-radius: 10px; margin-bottom: 20px;">
                <h1>Exam Completed</h1>
                <h3 class="text-success">PDF Downloaded Successfully!</h3>
                <p>Please check your downloads folder.</p>
                <p class="text-danger small mt-4">Note: This link is now invalid.</p>
            </div>
        `;
    });
}
