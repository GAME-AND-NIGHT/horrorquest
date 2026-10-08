const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isDesktop = !isAndroid && !isIOS && !/Mobile|Tablet/i.test(navigator.userAgent);
const isBudgetAndroid = isAndroid && (navigator.deviceMemory || 6) < 8;

/**
 * Determines whether to load original or optimized video.
 * Rule:
 * - PC / Desktop: 'original' by default
 * - Android: 'original' IF browser is Chrome AND RAM >= 8 GB, otherwise 'optimized'
 * - iOS / other mobile: 'optimized'
 */
function getVideoQuality() {
    const memory = navigator.deviceMemory || 0;
    if (isDesktop) {
        return 'original';
    }
    if (isAndroid) {
        const isChrome = /Chrome\//i.test(navigator.userAgent) && !/Edg|OPR|YaBrowser/i.test(navigator.userAgent);
        if (isChrome && memory >= 8) {
            return 'original';
        }
    }
    return 'optimized';
}

/**
 * Determines video container format:
 * - WebM (VP9 + alpha) for Android / Chromium browsers
 * - MP4 (with chroma key WebGL) for iOS Safari
 */
function getVideoFormat() {
    if (isIOS) {
        return 'mp4';
    }
    return 'webm';
}

/**
 * WebGL chroma processor is ONLY needed for MP4 (which has green/purple background).
 * WebM natively supports alpha transparency directly in HTML5 <video> across Android and Desktop.
 */
function shouldUseWebGLChroma() {
    return getVideoFormat() === 'mp4';
}

/**
 * Maps logical video paths or old URLs to local ./videos/{quality}/{format}/... paths.
 */
function getPlatformVideoSrc(src) {
    if (!src) return '';
    const third = document.getElementById('third');
    if (third) {
        third.style.display = 'none';
        third.style.height = '0';
    }

    const quality = getVideoQuality();
    const format = getVideoFormat();

    // Clean up input src
    let clean = src.trim();
    clean = clean.replace(/https?:\/\/[^\/]+\/sbercat2\/(?:mp4|[0-9]+)\//g, '');
    clean = clean.replace(/\.(?:mp4|webm|mov)$/i, '');
    clean = clean.replace(/^\.?\/?videos\/(?:original|optimized)\/(?:mp4|webm)\//i, '');
    clean = clean.replace(/^\.?\//, '');

    // Legacy file name mappings
    const legacyMap = {
        'cat_1_scen_1_1_fps25': '1station/v1_1',
        'cat_1_scen_1_2_fps25_slojnost': '1station/v1_2',
        'cat_1_scen_1_3_fps25_vpered_kotan': '1station/v1_3',
        'cat_2_scene_25Fps': '2station/ii_start',
        'cat_2_scene_waiting_25Fps 3_1': 'general/wait',
        'cat_2_scene_wrong_station_25Fps 2_1': 'general/lost',
        'cat_2_scene_wrong_station_25Fps': 'general/lost',
        'waiting_coffe_25Fps': 'general/wait',
        'Da_25Fps': '2station/ii_yes',
        'NO_2_25Fps': '2station/ii_no',
        'cat_3_1_scen_25Fps': '3station/iii_start',
        'Scen_5_25fps': '7station/vii_good'
    };

    if (legacyMap[clean]) {
        clean = legacyMap[clean];
    }

    return `./videos/${quality}/${format}/${clean}.${format}`;
}

/**
 * Easter Egg & Waiting Video Management:
 * 6 consecutive wait cycles play normal 'general/wait'.
 * Starting from 7th cycle and onward, plays 'general/wait_song'.
 * When moving to next screen/action, cycle resets.
 */
function getWaitCycles() {
    return parseInt(localStorage.getItem('wait_cycles_count') || '0', 10);
}

function incrementWaitCycle() {
    let count = getWaitCycles() + 1;
    localStorage.setItem('wait_cycles_count', count.toString());
    return count;
}

function resetWaitCycle() {
    localStorage.setItem('wait_cycles_count', '0');
}

function getWaitingVideoPath() {
    const count = getWaitCycles();
    const videoKey = count >= 6 ? 'general/wait_song' : 'general/wait';
    return getPlatformVideoSrc(videoKey);
}

async function startWebcam() {
    const videoElement = document.getElementById('webcam-feed') || document.getElementById('arjs-video');
    if (!videoElement) return;

    let videoConstraints = {
        video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 24, max: 24 }
        },
        audio: false
    };

    if (isBudgetAndroid) {
        videoConstraints.video.width = { ideal: 440 };
        videoConstraints.video.height = { ideal: 480 };
        videoConstraints.video.frameRate = { ideal: 15, max: 15 };
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        videoElement.srcObject = stream;
        window.currentWebcamStream = stream;
    } catch (err) {
        console.error("Error accessing webcam: ", err);
    }
}

function adjustVideoHeight() {
    const videos = document.querySelectorAll('video[id^="sbercat-video"]');
    videos.forEach(video => {
        video.style.height = '100%';
        video.style.objectFit = 'contain';
        video.style.objectPosition = 'top center';
    });
}

document.addEventListener('DOMContentLoaded', adjustVideoHeight);

function stopWebcam() {
    if (window.currentWebcamStream) {
        window.currentWebcamStream.getTracks().forEach(track => track.stop());
        window.currentWebcamStream = null;
    }
}
