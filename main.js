const pages = Array.from(document.querySelectorAll('.page'));
const pageIndicator = document.getElementById('pageIndicator');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
const bgVideo = document.getElementById('bgVideo');
const videoUrlInput = document.getElementById('videoUrl');
const applyVideoBtn = document.getElementById('applyVideo');
const toggleVideoBtn = document.getElementById('toggleVideo');
const profileMark = document.getElementById('profileMark');
let currentPage = 0;

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

loadProfileImage();
updatePage(0);
