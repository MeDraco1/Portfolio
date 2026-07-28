const pages = Array.from(document.querySelectorAll('.page'));
const pageIndicator = document.getElementById('pageIndicator');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
const bgVideo = document.getElementById('bgVideo');
const videoUrlInput = document.getElementById('videoUrl');
const applyVideoBtn = document.getElementById('applyVideo');
const toggleVideoBtn = document.getElementById('toggleVideo');
const profileMark = document.getElementById('profileMark');
const cinematicIntro = document.getElementById('cinematicIntro');
const introVideo = document.getElementById('introVideo');
const portfolioContent = document.getElementById('portfolioContent');
let currentPage = 0;

function initializeCinematicIntro() {
    if (!cinematicIntro || !introVideo || !portfolioContent) return;

    let pageLoaded = document.readyState === 'complete';
    let videoReady = introVideo.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
    let started = false;
    let removed = false;

    // Keep the screen black until the whole page and the intro video are ready.
    introVideo.pause();

    const removeIntro = () => {
        if (removed) return;
        removed = true;
        cinematicIntro.remove();
        portfolioContent.removeAttribute('inert');
        portfolioContent.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.remove('intro-active');
    };

    const revealPortfolio = () => {
        portfolioContent.classList.add('intro-revealed');
        cinematicIntro.classList.add('cinematic-intro--exiting');
        cinematicIntro.addEventListener('transitionend', (event) => {
            if (event.propertyName === 'opacity') removeIntro();
        }, { once: true });
        window.setTimeout(removeIntro, 1000);
    };

    const startIntro = () => {
        if (started || !pageLoaded || !videoReady) return;
        started = true;
        cinematicIntro.classList.add('cinematic-intro--playing');
        introVideo.play().then(() => {
            // Autoplay begins muted for browser compatibility, then restores the intro's audio.
            introVideo.muted = false;
            introVideo.volume = 1;
        }).catch(() => {
            // Keep the lock in place if a browser cannot start the mandatory intro.
        });
    };

    const markVideoReady = () => {
        videoReady = true;
        startIntro();
    };

    if (pageLoaded) {
        startIntro();
    } else {
        window.addEventListener('load', () => {
            pageLoaded = true;
            startIntro();
        }, { once: true });
    }

    if (videoReady) {
        startIntro();
    } else {
        introVideo.addEventListener('canplay', markVideoReady, { once: true });
    }

    introVideo.addEventListener('ended', () => {
        // Hold the final decoded frame, then fade the video itself to black before the page reveal.
        window.setTimeout(() => {
            cinematicIntro.classList.add('cinematic-intro--video-out');
            window.setTimeout(revealPortfolio, 400);
        }, 150);
    }, { once: true });
}

const profileImageCandidates = [
    'profile.png',
    'profile.jpg',
    'profile.jpeg',
    'profile.webp',
    'avatar.png',
    'avatar.jpg',
    'avatar.jpeg',
    'avatar.webp',
    'pfp.png',
    'pfp.jpg',
    'pfp.jpeg',
    'pfp.webp',
    'profile.svg',
    'avatar.svg',
    'pfp.svg'
];

function updatePage(index) {
    currentPage = (index + pages.length) % pages.length;

    pages.forEach((page, i) => {
        const isActive = i === currentPage;
        page.classList.toggle('active', isActive);
        page.setAttribute('aria-hidden', String(!isActive));
    });

    pageIndicator.textContent = `${currentPage + 1} / ${pages.length}`;
}

function applyVideoSource() {
    if (!videoUrlInput || !bgVideo || !toggleVideoBtn) return;

    const src = videoUrlInput.value.trim();

    if (!src) {
        bgVideo.removeAttribute('src');
        bgVideo.load();
        bgVideo.classList.remove('ready');
        toggleVideoBtn.textContent = 'Pause';
        return;
    }

    bgVideo.src = src;
    bgVideo.load();
    bgVideo.classList.add('ready');
    bgVideo.play().catch(() => { });
    toggleVideoBtn.textContent = 'Pause';
}

function toggleVideoPlayback() {
    if (!bgVideo || !toggleVideoBtn || !bgVideo.src) return;

    if (bgVideo.paused) {
        bgVideo.play().catch(() => { });
        toggleVideoBtn.textContent = 'Pause';
    } else {
        bgVideo.pause();
        toggleVideoBtn.textContent = 'Play';
    }
}

function activateArrow(event, direction) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    updatePage(currentPage + direction);
}

function loadProfileImage(index = 0) {
    if (!profileMark || index >= profileImageCandidates.length) return;

    const candidate = profileImageCandidates[index];
    const testImage = new Image();

    testImage.onload = () => {
        profileMark.style.setProperty('--profile-image', `url("${candidate}")`);
        profileMark.classList.add('has-image');
    };

    testImage.onerror = () => loadProfileImage(index + 1);
    testImage.src = candidate;
}

prev.addEventListener('click', () => updatePage(currentPage - 1));
next.addEventListener('click', () => updatePage(currentPage + 1));
prev.addEventListener('keydown', (event) => activateArrow(event, -1));
next.addEventListener('keydown', (event) => activateArrow(event, 1));

applyVideoBtn?.addEventListener('click', applyVideoSource);
toggleVideoBtn?.addEventListener('click', toggleVideoPlayback);

videoUrlInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        applyVideoSource();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') updatePage(currentPage - 1);
    if (event.key === 'ArrowRight') updatePage(currentPage + 1);
});

initializeCinematicIntro();
loadProfileImage();
updatePage(0);
