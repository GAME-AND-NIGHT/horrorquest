// scanner.js - High-performance Resident Evil QR Scanner

const SCAN_INTERVAL_MS = 250;

const video = document.getElementById('video');
const qrCanvas = document.getElementById('qr-canvas');
const qrCtx = qrCanvas ? qrCanvas.getContext('2d', { willReadFrequently: true }) : null;

let scanLoopId = null;
let mediaStream = null;
let isStartingCamera = false;
let restartTimeout = null;

function checkOrientation() {
    const overlay = document.getElementById('orientation-overlay');
    if (!overlay) return;
    if (window.innerWidth > window.innerHeight) {
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', checkOrientation);
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);

function forceRestart() {
    if (restartTimeout) return;
    restartTimeout = setTimeout(() => {
        restartTimeout = null;
        startCamera();
    }, 500);
}

function stopCamera() {
    if (scanLoopId) {
        clearInterval(scanLoopId);
        scanLoopId = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
            try { track.stop(); } catch (e) {}
        });
        mediaStream = null;
    }

    if (video) {
        video.pause();
        video.srcObject = null;
    }
}

async function startCamera() {
    if (isStartingCamera) return;
    isStartingCamera = true;

    try {
        stopCamera();

        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30, max: 30 }
            },
            audio: false
        });

        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.muted = true;
        video.srcObject = mediaStream;

        await video.play();

        const track = mediaStream.getVideoTracks()[0];
        if (track) {
            track.addEventListener("ended", forceRestart);
            track.addEventListener("mute", forceRestart);
        }

        startScanningLoop();

    } catch (err) {
        console.error("Camera access failed:", err);
        const cameraAccessEl = document.getElementById('camera-access-required');
        if (cameraAccessEl) {
            cameraAccessEl.style.display = 'block';
        }
    }

    isStartingCamera = false;
}

function startScanningLoop() {
    if (scanLoopId) {
        clearInterval(scanLoopId);
    }

    scanLoopId = setInterval(() => {
        if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight || document.visibilityState !== 'visible') {
            return;
        }
        if (!mediaStream || (mediaStream.getVideoTracks()[0] && mediaStream.getVideoTracks()[0].readyState !== "live")) {
            forceRestart();
            return;
        }

        if (qrCanvas.width !== video.videoWidth || qrCanvas.height !== video.videoHeight) {
            qrCanvas.width = video.videoWidth;
            qrCanvas.height = video.videoHeight;
        }

        qrCtx.drawImage(video, 0, 0, qrCanvas.width, qrCanvas.height);

        try {
            const img = qrCtx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
            const code = jsQR(img.data, img.width, img.height, {
                inversionAttempts: "dontInvert"
            });

            if (code && code.data) {
                stopCamera();
                // Visual feedback: brief sound or redirect
                window.location.href = code.data;
            }
        } catch (err) {
            console.error("QR Scan error:", err);
        }
    }, SCAN_INTERVAL_MS);
}

function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        startCamera();
    } else {
        stopCamera();
    }
}

function init() {
    startCamera();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', stopCamera);
    window.addEventListener('beforeunload', stopCamera);
}

init();