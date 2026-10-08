function checkOrientation() {
    console.log('orientation')
    const overlay = document.getElementById('orientation-overlay');
    // Show overlay if width is greater than height (landscape orientation)
    if (window.innerWidth > window.innerHeight) {
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

function setupVideoButton(video, createBtnCb, container, overrideTimeout = null, immediate = false) {
    let buttonShown = false;
    const showButton = () => {
        if (!buttonShown) {
            buttonShown = true;
            container.innerHTML = '';
            container.appendChild(createBtnCb());
            window.removeEventListener('offline', showButton);
        }
    };

    // If immediate, show button right away and skip video/timeout listeners
    if (immediate) {
        showButton();
    } else {
        video.addEventListener('ended', showButton, { once: true });

        const setFallbackTimeout = () => {
            if (overrideTimeout) {
                setTimeout(showButton, overrideTimeout);
                return;
            }
            if (video.duration && isFinite(video.duration)) {
                const timeout = (video.duration + 1) * 1000;
                setTimeout(showButton, timeout);
            } else {
                setTimeout(showButton, 7000); // 7 seconds default
            }
        };

        if (video.readyState >= 1) { // HAVE_METADATA
            setFallbackTimeout();
        } else {
            video.addEventListener('loadedmetadata', setFallbackTimeout, { once: true });
        }
    }

    // Always check online status, if already offline, show button.
    // This handles the case where the immediate flag wasn't set,
    // but the network was already down.
    if (!navigator.onLine && !buttonShown) {
        showButton();
    }

    return showButton;
}

function setupInitialNextButton(videoElement, buttonElement, timeout = 0) {
    const showButtonAction = () => {
        if (buttonElement) {
            buttonElement.style.display = 'block';
        }
        videoElement.removeEventListener('ended', showButtonAction);
        videoElement.removeEventListener('stalled', showButtonAction);
        videoElement.removeEventListener('error', showButtonAction);
        window.removeEventListener('offline', showButtonAction);
    };

    if (!navigator.onLine) {
        showButtonAction(); // Show immediately if offline
    } else {
        videoElement.addEventListener('ended', showButtonAction, { once: true });
        videoElement.addEventListener('stalled', showButtonAction, { once: true });
        videoElement.addEventListener('error', showButtonAction, { once: true });
        window.addEventListener('offline', showButtonAction, { once: true });
        if (timeout > 0) {
            setTimeout(showButtonAction, timeout); // Add timeout as fallback for online
        }
    }
}

// Initial check on page load
document.addEventListener('DOMContentLoaded', checkOrientation);
// Re-check on window resize and orientation change events
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
function getUrlParams() {
    const params = {};
    const search = window.location.search.substring(1);
    const pairs = search.split('&');
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        if (pair.length === 2) {
            params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
    }
    return params;
}

function initializeApp(stationConfig, stationNumber) {
    const {
        introVideo,
        waitingVideo,
        newStationVideo,
        wrongStationVideo,
        correctAnswerVideo,
        wrongAnswerVideo,
        nextStation,
        questionPool,
        questionPoolTenn
    } = stationConfig;

    const skipVideoButton = document.getElementById('skipVideoButton');

    function updateSkipButtonVisibility() {
        let shouldShow = false;
        if (activeVideo && !activeVideo.paused && !activeVideo.ended && (activeVideo.dataset.originalSrc || activeVideo.currentSrc)) {
            const currentSrc = activeVideo.dataset.originalSrc || activeVideo.currentSrc;
            const fileName = currentSrc.split('/').pop();

            const isSpecialVideoByFullPath = currentSrc.includes(waitingVideo) ||
                                            currentSrc.includes(correctAnswerVideo) ||
                                            currentSrc.includes(wrongAnswerVideo) ||
                                            (newStationVideo && currentSrc.includes(getPlatformVideoSrc(newStationVideo)));

            const isSpecialVideoByFileName = fileName.includes('waiting') ||
                                             fileName.includes('Da') ||
                                             fileName.includes('NO');

            if (!isSpecialVideoByFullPath && !isSpecialVideoByFileName) {
                shouldShow = true;
            }
        }
        skipVideoButton.style.display = shouldShow ? 'block' : 'none';
    }

    skipVideoButton.addEventListener('click', () => {
        if (activeVideo && !activeVideo.paused && !activeVideo.ended) {
            skipVideoButton.style.display = 'none';
            activeVideo.currentTime = activeVideo.duration;
        }
    });

    const urlParams = getUrlParams();
    const SCENE_UUID = urlParams.uuid || 'faf5826f-6089-42a9-a72c-9e19c95aca05';
    const STATION = stationNumber;

    let activeVideo;
    let currentQuestionAudio = null;
    let onLastQuestion = false;
    let shouldShowNextButtonAfterNewStationVideo = false;

    const startBtn = document.getElementById("startBtn");
    const topAsk = document.getElementById('topAsk');
    const ui = document.getElementById('ui');
    const desc = document.getElementById('desc');
    const controls = document.getElementById('controls');
    const controlskl = document.getElementById('kl');
    const questionCounter = document.getElementById('questionCounter');
    const soundStartBtn = document.getElementById("soundStartBtn");
    const interactionPopup = document.getElementById('interaction-required-popup');
    const interactionBtn = document.getElementById('interaction-btn');
    const blurOverlay = document.getElementById('blur-overlay');
    const soundOverlay = document.getElementById('soundOverlay');
    const videoContainer = document.getElementById('video-container');
    const third = document.getElementById('third');
    const video1 = document.getElementById('sbercat-video-1');
    const video2 = document.getElementById('sbercat-video-2');
    const canvas = document.getElementById('cat-canvas');
    let ctx;

    let questions;
    let currentIndex;
    let sessionBalls;
    let totalBalls = parseInt(localStorage.getItem('total_balls') || '0', 10);

    function handleWrongStation() {
        skipVideoButton.style.display = 'none';
        blurOverlay.style.display = 'block';
        soundOverlay.style.display = 'none';
        controlskl.style.display = 'none';
        questionCounter.style.display = 'none';
        stopAllAudio();

        topAsk.style.display = 'flex';
        topAsk.style.background = '';
        topAsk.style.backdropFilter = '';
        topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px; font-size: 46px; color: #ff3344; letter-spacing: 2px;">ТРЕВОГА: НЕВЕРНЫЙ СЕКТОР!</div><div>Ты отклонился от маршрута и зашёл в опасную зону заражения. Немедленно вернись к предыдущей контрольной точке!</div></div>`;
        fitTextToContainer(topAsk, 44, 10);

        ui.style.display = 'block';
        ui.style.background = 'rgba(255, 255, 255, 0)';
        ui.style.padding = '25px';

        desc.textContent = '';
        controls.innerHTML = '';

        const wrongStationBtn = document.createElement('button');
        wrongStationBtn.id = 'wrongStationBtn';
        wrongStationBtn.className = 'primary';
        wrongStationBtn.textContent = 'ВЕРНУТЬСЯ К МАРШРУТУ';
        wrongStationBtn.style.display = 'none';
        wrongStationBtn.onclick = function () {
            blurOverlay.style.display = 'none';
            window.location.href = 'qr.html';
        };
        controls.appendChild(wrongStationBtn);
        playVideo(wrongStationVideo);
        [...document.querySelectorAll("video")].forEach(v => { v.muted = false; v.volume = 1.0; });
    }

    function fitTextToContainer(container, baseFontSize = 30, minFontSize = 5) {
        const innerDiv = container.firstElementChild;
        if (!innerDiv) return;

        let fontSize = baseFontSize;
        innerDiv.style.fontSize = fontSize + 'px';

        const maxHeight = container.clientHeight;

        while (innerDiv.scrollHeight > maxHeight && fontSize > minFontSize) {
            fontSize -= 5;
            innerDiv.style.fontSize = fontSize + 'px';
        }
    }

    function updateCounter(currentIndex, total) {
        questionCounter.style.display = 'block'
        questionCounter.textContent = `Вопрос ${currentIndex + 1}/${total}`;
    }

    function stopAllAudio() {
        if (currentQuestionAudio) {
            try {
                currentQuestionAudio.pause();
                currentQuestionAudio.currentTime = 0;
            } catch (e) {
                console.error("Could not stop audio", e);
            }
        }
    }

    async function createStatistics(sceneUuid, station, points = null) {
        // Analytics request disabled
        return { status: "success" };
    }



    function playVideo(src, loop = false, forceSound = false, onPlayCallback = null) {
        if (!src) {
            console.error("playVideo called with invalid src");
            return null;
        }
        let nextVideo = (activeVideo === video1) ? video2 : video1;

        const platformSrc = getPlatformVideoSrc(src);
        const videoSrc = (window.preloadedVideoBlobs && window.preloadedVideoBlobs[platformSrc]) || platformSrc;

        nextVideo.dataset.originalSrc = platformSrc; // Store the original source
        nextVideo.dataset.waitCycleTriggered = 'false';

        nextVideo.loop = loop;
        nextVideo.preload = "auto";
        nextVideo.muted = false; // Always keep sound unmuted during and after questions

        // Always set the src to handle blob url changes
        nextVideo.src = videoSrc;

        nextVideo.load();

        nextVideo.addEventListener('canplay', () => {
            nextVideo.play().catch(e => {
                console.warn("Autoplay with sound failed, fallback to muted:", e);
                nextVideo.muted = true;
                nextVideo.play().catch(err => console.error("Video play failed:", err));
            });
        }, { once: true });

        nextVideo.addEventListener('playing', () => {
            if (activeVideo) {
                activeVideo.pause();
                activeVideo.style.display = 'none';
            }
            nextVideo.style.display = 'block';
            activeVideo = nextVideo;

            if (shouldUseWebGLChroma()) {
                canvas.style.display = 'block';
                video1.style.display = 'none';
                video2.style.display = 'none';
            } else {
                canvas.style.display = 'none';
                nextVideo.style.display = 'block';
            }

            if (onPlayCallback) onPlayCallback(nextVideo);
            updateSkipButtonVisibility();
        }, { once: true });

        return nextVideo;
    }
    function saveQuizState(stationNumber, state) {
        try {
            const key = `station_quiz_state_${stationNumber}`;
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.error("Could not save quiz state:", e);
        }
    }

    function loadQuizState(stationNumber) {
        try {
            const key = `station_quiz_state_${stationNumber}`;
            const stateJSON = localStorage.getItem(key);
            return stateJSON ? JSON.parse(stateJSON) : null;
        } catch (e) {
            console.error("Could not load quiz state:", e);
            return null;
        }
    }

    function clearQuizState(stationNumber) {
        const key = `station_quiz_state_${stationNumber}`;
        localStorage.removeItem(key);
    }

    function getAnsweredQuestions(stationNumber) {
        const key = `answered_questions_${stationNumber}`;
        const answeredJSON = localStorage.getItem(key);
        return answeredJSON ? JSON.parse(answeredJSON) : [];
    }

    function addAnsweredQuestions(stationNumber, questionIds) {
        try {
            const key = `answered_questions_${stationNumber}`;
            let answered = getAnsweredQuestions(stationNumber);
            questionIds.forEach(id => {
                if (!answered.includes(id)) {
                    answered.push(id);
                }
            });
            localStorage.setItem(key, JSON.stringify(answered));
        } catch (e) {
            console.error("Could not add answered questions:", e);
        }
    }

    function pickRandomQuestions(p, n) {
        const a = p.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a.slice(0, n);
    }

    function startQuiz() {
        onLastQuestion = false;
        renderQuestion(currentIndex);
    }

    function renderQuestion(idx) {
        if (!questions || idx >= questions.length) return finishQuiz();

        currentIndex = idx;
        saveQuizState(STATION, { questions, currentIndex, sessionBalls });

        const q = questions[idx];
        stopAllAudio();
        updateCounter(idx, questions.length);

        if (activeVideo) {
            activeVideo.muted = false;
            activeVideo.volume = 1.0;
        }

        topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px; font-size: 44px;">${q.title}</div><div>${q.question}</div></div>`;
        fitTextToContainer(topAsk, 44, 10);
        desc.textContent = '';
        ui.style.background = 'rgba(153,255,221,0.01)';
        ui.style.padding = '0';
        controls.innerHTML = '';
        q.options.forEach((opt, i) => {
            const b = document.createElement('button');
            b.className = 'optionBtn';
            b.textContent = (['A)', 'B)', 'C)'][i] || (i + 1) + ')') + ' ' + opt;
            b.addEventListener('click', () => {
                [video1, video2].forEach(v => {
                    v.muted = false;
                    v.volume = 1.0;
                });
                onAnswer(i, idx);
            });
            controls.appendChild(b);
        });

        controlskl.textContent = '';
        controlskl.style.display = 'block';
        const scoreLine2 = document.createElement('p2');
        scoreLine2.style.color = '#ffffff';
        scoreLine2.style.marginTop = '8px';
        scoreLine2.textContent = `Баллы: ${Number(sessionBalls + totalBalls)}`;
        controlskl.appendChild(scoreLine2);
    }

    function onAnswer(selectedIndex, questionIdx) {
        resetWaitCycle();
        const q = questions[questionIdx];
        onLastQuestion = (questionIdx + 1) >= questions.length;

        controls.innerHTML = '';
        ui.style.background = 'rgba(153,255,221,0)';
        ui.style.padding = '0';
        desc.textContent = '';

        if (selectedIndex === q.correctIndex) {
            currentIndex = questionIdx + 1;
            sessionBalls = (sessionBalls || 0) + 1;
            saveQuizState(STATION, { questions, currentIndex, sessionBalls });

            controlskl.querySelector('p2').textContent = `Баллы: ${Number(sessionBalls + totalBalls)}`;
            createStatistics(SCENE_UUID, STATION, 1);
            topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px; font-size: 44px; color: #44ff88; letter-spacing: 2px;">Правильно!</div><div>${q.rightText}</div></div>`;
            fitTextToContainer(topAsk, 44, 10);
            const videoToPrepareButtonFor = playVideo(correctAnswerVideo, false, true); // Sound unmuted

            if (videoToPrepareButtonFor) {
                const createNextButton = () => {
                    const nextBtn = document.createElement('button');
                    nextBtn.className = 'primary';
                    nextBtn.textContent = 'Далее';
                    nextBtn.addEventListener('click', () => {
                        [video1, video2].forEach(v => {
                            v.muted = false;
                            v.volume = 1.0;
                        });
                        resetWaitCycle();
                        if (onLastQuestion) {
                            finishQuiz();
                        } else {
                            playVideo(getWaitingVideoPath(), false);
                            renderQuestion(currentIndex);
                        }
                    });
                    return nextBtn;
                };
                const showNextButtonHandler = setupVideoButton(videoToPrepareButtonFor, createNextButton, controls, 4000, !navigator.onLine);
                window.addEventListener('offline', showNextButtonHandler, { once: true });
            }
        } else {
            currentIndex = questionIdx + 1;
            // Wrong answer: no points awarded, no retries
            saveQuizState(STATION, { questions, currentIndex, sessionBalls });

            controlskl.querySelector('p2').textContent = `Баллы: ${Number(sessionBalls + totalBalls)}`;
            createStatistics(SCENE_UUID, STATION, 0);
            topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px; font-size: 44px; color: #ff3344; letter-spacing: 2px;">Ты ошибся...</div><div>${q.wrongText}</div></div>`;
            fitTextToContainer(topAsk, 44, 10);
            const videoToPrepareButtonFor = playVideo(wrongAnswerVideo, false, true); // Sound unmuted

            if (videoToPrepareButtonFor) {
                const createNextButton = () => {
                    const nextBtn = document.createElement('button');
                    nextBtn.className = 'primary';
                    nextBtn.textContent = 'Далее';
                    nextBtn.addEventListener('click', () => {
                        [video1, video2].forEach(v => {
                            v.muted = false;
                            v.volume = 1.0;
                        });
                        resetWaitCycle();
                        if (onLastQuestion) {
                            finishQuiz();
                        } else {
                            playVideo(getWaitingVideoPath(), false);
                            renderQuestion(currentIndex);
                        }
                    });
                    return nextBtn;
                };
                const showNextButtonHandler = setupVideoButton(videoToPrepareButtonFor, createNextButton, controls, 4000, !navigator.onLine);
                window.addEventListener('offline', showNextButtonHandler, { once: true });
            }
        }
    }

    function finishQuiz() {
        createStatistics(SCENE_UUID, STATION);
        stopAllAudio();
        onLastQuestion = false;
        resetWaitCycle();

        const endVideo = stationConfig.stationEndVideo || stationConfig.waitingVideo || 'general/wait';
        playVideo(endVideo, false);

        topAsk.innerHTML = `<div>
  <div style="text-align: center; padding-bottom: 5px;font-size: 44px;">
    Отличная работа!
  </div>
  <div>Ты прошёл станцию. Твои баллы: ${Number(sessionBalls + totalBalls)}</div>
  ${stationNumber === 6 ? '<div>Вперед на поиски финальной станции!</div>' : ''}
</div>`;
        desc.textContent = '';
        ui.style.background = 'rgba(153,255,221,0)';
        ui.style.padding = '0';
        controls.innerHTML = '';
        const next = document.createElement('button');
        next.className = 'primary';
        next.textContent = stationNumber === 6 ? 'Перейти к финалу' : 'Сканировать следующий код';
        next.addEventListener('click', () => {
            resetWaitCycle();
            totalBalls += sessionBalls;
            localStorage.setItem('total_balls', String(totalBalls));
            localStorage.setItem("currentStation", nextStation);

            const questionIds = questions.map(q => q.id);
            addAnsweredQuestions(STATION, questionIds);
            clearQuizState(STATION);

            stopWebcam();
            if (nextStation === 'final.html') {
                window.location.href = 'final.html';
            } else {
                window.location.href = 'qr.html';
            }
        });
        controls.appendChild(next);
    }

    function setupQuiz(stationConfig, stationNumber, introVideoElement) {
        skipVideoButton.style.display = 'none'; // hidden as requested
        topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px; font-size: 44px; color: #ff3344; letter-spacing: 2px;">ВЫЖИВШИЙ, ТЫ НА МЕСТЕ!</div><div style="align-items: center; display: flex">Ты успешно пробрался через опасную зону.<br>${stationNumber === 2 ? 'Готов начать испытание?' : 'Готов продолжить путь?'}</p></div></div>`;
        desc.textContent = '';
        ui.style.background = 'rgba(153,255,221,0)';
        ui.style.padding = '0';
        createStatistics(SCENE_UUID, STATION);

        if (introVideoElement) {
            setupInitialNextButton(introVideoElement, startBtn);
        } else {
            startBtn.style.display = 'block'; // Fallback if introVideoElement is null
        }

        startBtn.addEventListener('click', () => {
            [video1, video2].forEach(v => {
                v.muted = false;
                v.volume = 1.0;
            });
            resetWaitCycle();
            skipVideoButton.style.display = 'none';
            let qCountLS = parseInt(localStorage.getItem('questionCount'), 10);
            let ageCategory = localStorage.getItem('ageCategory') || localStorage.getItem('difficulty') || '18+';
            if (isNaN(qCountLS) || qCountLS <= 0) qCountLS = 25;
            // 25 total -> 5 per station, 50 -> 10, 100 -> 20 (5 question stations: 2..6)
            let numQuestions = Math.max(1, Math.floor(qCountLS / 5));

            const pool = (ageCategory === '30+' || ageCategory === 'teen')
                ? (stationConfig.questionPool30 || stationConfig.questionPoolTenn)
                : (stationConfig.questionPool18 || stationConfig.questionPool);

            let answeredIds = getAnsweredQuestions(STATION);
            let availableQuestions = pool.filter(q => !answeredIds.includes(q.id));

            if (availableQuestions.length < numQuestions) {
                localStorage.removeItem(`answered_questions_${STATION}`);
                availableQuestions = pool;
            }

            if (numQuestions > availableQuestions.length) numQuestions = availableQuestions.length;

            questions = pickRandomQuestions(availableQuestions, numQuestions);
            currentIndex = 0;
            sessionBalls = 0;

            saveQuizState(STATION, { questions, currentIndex, sessionBalls });

            // Start with waiting video (no loop attribute so ended fires to count cycles)
            playVideo(getWaitingVideoPath(), false);
            startQuiz();
        });
    }



    function stopWebcam() {
        if (window.currentWebcamStream) {
            window.currentWebcamStream.getTracks().forEach(track => track.stop());
            window.currentWebcamStream = null;
        }
    }


    let webglProcessor;

    function applyChromaKey(videoElement) {
        if (!shouldUseWebGLChroma() || !webglProcessor || !videoElement.videoWidth) return;

        const cropPercent = 0;
        const crop = {
            x: 0,
            y: cropPercent,
            width: 1,
            height: 1 - cropPercent
        };

        const keyingOptions = {
            threshold: (stationNumber === 2 ? 22 : 29) / 255.0,
            max_green: 180.0 / 255.0
        };

        webglProcessor.render(videoElement, crop, keyingOptions);
    }

    function renderLoop() {
        if (activeVideo && !activeVideo.paused && !activeVideo.ended) {
                applyChromaKey(activeVideo);
        }
        // updateSkipButtonVisibility();
        requestAnimationFrame(renderLoop);
    }
    startBtn.style.display = "none";
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    if (!shouldUseWebGLChroma()) {
        canvas.style.display = 'none';
    } else {
        webglProcessor = new WebGLVideoProcessor(canvas);
    }

    video1.src = getWaitingVideoPath();

    activeVideo = video1;

    function videoEndedCallback(videoElement) {
        const videoSource = decodeURIComponent(videoElement.dataset.originalSrc || videoElement.currentSrc || "");
        
        if (videoSource.includes('cat_2_scene_wrong_station') || videoSource.includes('lost')) {
            const wrongBtn = document.getElementById("wrongStationBtn");
            if (wrongBtn) wrongBtn.style.display = "block";
        }
        
        // --- Start of Robust Check Fix ---
        const correctAnswerFileName = (correctAnswerVideo || '').split('/').pop().replace('.mp4', '').replace('.webm', '');
        const videoSourceFileName = videoSource.split('/').pop().split('.')[0];
        
        if (onLastQuestion && newStationVideo && videoSourceFileName.includes(correctAnswerFileName)) {
        // --- End of Robust Check Fix ---
            onLastQuestion = false;
            shouldShowNextButtonAfterNewStationVideo = true;
            playVideo(newStationVideo, false, true);
            return;
        }

        if (shouldShowNextButtonAfterNewStationVideo && videoSource.includes((newStationVideo || '').replace(".mp4", ""))) {
            shouldShowNextButtonAfterNewStationVideo = false;
            playVideo(getWaitingVideoPath(), false);
            const nextBtn = document.createElement('button');
            nextBtn.className = 'primary';
            nextBtn.textContent = 'Далее';
            nextBtn.addEventListener('click', finishQuiz);
            controls.innerHTML = '';
            controls.appendChild(nextBtn);
            return;
        }
        
        playVideo(getWaitingVideoPath(), false);
    }

    [video1, video2].forEach(v => {
        const handleLoopOrEnded = () => {
            const src = decodeURIComponent(v.dataset.originalSrc || v.currentSrc || "");
            if (src.includes('wait')) {
                incrementWaitCycle();
                const nextWaitSrc = getWaitingVideoPath();
                const isSong = nextWaitSrc.includes('wait_song');
                playVideo(nextWaitSrc, false, isSong);
                return;
            }
            videoEndedCallback(v);
        };

        v.addEventListener('ended', function () {
            if (this.dataset.waitCycleTriggered === 'true') {
                this.dataset.waitCycleTriggered = 'false';
                return;
            }
            handleLoopOrEnded();
        });

        v.addEventListener('timeupdate', function () {
            const src = decodeURIComponent(this.dataset.originalSrc || this.currentSrc || "");
            if (src.includes('wait') && this.duration && this.currentTime >= this.duration - 0.2) {
                if (this.dataset.waitCycleTriggered !== 'true') {
                    this.dataset.waitCycleTriggered = 'true';
                    handleLoopOrEnded();
                }
            }
        });
    });
    
    const currentFile = window.location.pathname.split('/').pop();
    let expectedStation = localStorage.getItem('currentStation');

    if ((currentFile !== expectedStation && expectedStation) || !expectedStation) {
        interactionPopup.style.display = 'flex';
        interactionBtn.onclick = () => {
            interactionPopup.style.display = 'none';
            handleWrongStation();
        };
    } else {
        const savedState = loadQuizState(STATION);
        if (savedState) {
            // If there's a saved state, change the initial button to "Continue"
            soundStartBtn.textContent = 'Продолжить';
            soundStartBtn.addEventListener('click', () => {
                resetWaitCycle();
                [...document.querySelectorAll("video")].forEach(v => v.muted = false);
                soundOverlay.style.display = 'none';

                questions = savedState.questions;
                currentIndex = savedState.currentIndex || 0;
                sessionBalls = (savedState.sessionBalls !== undefined) ? savedState.sessionBalls : 0;

                if (currentIndex >= questions.length) {
                    finishQuiz();
                } else {
                    playVideo(getWaitingVideoPath(), false);
                    renderQuestion(currentIndex);
                }
            });
        } else {
            // Otherwise, set up the normal flow for a new game
            soundStartBtn.addEventListener("click", () => {
                resetWaitCycle();
                [...document.querySelectorAll("video")].forEach(v => v.muted = false);
                soundOverlay.style.display = "none";
                const introVideoElement = playVideo(introVideo, false);
                setupQuiz(stationConfig, stationNumber, introVideoElement);
            });
        }
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            if (activeVideo && !activeVideo.paused) {
                activeVideo.pause();
            }
        } else {
            if (activeVideo) {
                if (activeVideo.paused) {
                    activeVideo.play().catch(e => console.error("Video play failed on visibility change:", e));
                }

                const isVideoNearEnd = activeVideo.duration > 0 && (activeVideo.duration - activeVideo.currentTime < 0.5);

                if (activeVideo.ended || isVideoNearEnd) {
                    videoEndedCallback(activeVideo);

                    const videoSource = activeVideo.dataset.originalSrc || activeVideo.currentSrc || "";
                    if (shouldShowNextButtonAfterNewStationVideo && videoSource.includes(newStationVideo.replace(".mp4", ""))) {
                        if (!document.querySelector('#controls .primary')) {
                            shouldShowNextButtonAfterNewStationVideo = false;
                            const nextBtn = document.createElement('button');
                            nextBtn.className = 'primary';
                            nextBtn.textContent = 'Далее';
                            nextBtn.addEventListener('click', finishQuiz);
                            controls.innerHTML = '';
                            controls.appendChild(nextBtn);
                        }
                    }
                }
            }
        }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', stopWebcam);

    startWebcam();
    if (shouldUseWebGLChroma()) {
        renderLoop();
    }
}
