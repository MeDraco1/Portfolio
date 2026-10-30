const pages = Array.from(document.querySelectorAll('.page'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const profileMark = document.querySelector('.home-profile-stage img');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Add your Formspree form URL here after creating the endpoint; see CONTACT_FORM_SETUP.md.
const CONTACT_FORM_ENDPOINT = '';
const PAGE_TRANSITION_DURATION = 800;
let pageTransitionCleanup = 0;
let pageTransitionFrame = 0;

prefersReducedMotion.addEventListener?.('change', (event) => {
    if (event.matches) {
        document.querySelectorAll('.page-video').forEach((video) => video.pause());
    } else {
        const activePage = pages.find((page) => page.classList.contains('active'));
        if (activePage) syncPageVideoPlayback(activePage);
    }
});

const profileImageCandidates = [
    'image.png',
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

function syncPageVideoPlayback(activePage) {
    pages.forEach((page) => {
        const video = page.querySelector('.page-video');
        if (!video) return;

        if (page !== activePage || prefersReducedMotion.matches) {
            video.pause();
            return;
        }

        if (video.dataset.deferredSrc) {
            const source = document.createElement('source');
            source.src = video.dataset.deferredSrc;
            source.type = 'video/mp4';
            video.append(source);
            delete video.dataset.deferredSrc;
            video.load();
        }

        if (!video.src && !video.querySelector('source[src]')) return;

        video.muted = true;
        if (video.paused) video.play().catch(() => { });
    });
}

function activatePage(pageId, updateHistory = true, animateOnNavigation = true) {
    const activePage = document.getElementById(pageId) || pages[0];
    if (!activePage) return;

    const previousPage = pages.find((page) => page.classList.contains('active'));
    const pageChanged = previousPage !== activePage;

    if (!pageChanged) {
        syncPageVideoPlayback(activePage);
        navLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.page === activePage.id));
        if (updateHistory) history.replaceState(null, '', `#${activePage.id}`);
        return;
    }

    document.body.classList.toggle('documentary-active', activePage.classList.contains('documentary-page'));

    const shouldAnimate = animateOnNavigation && pageChanged && previousPage && !prefersReducedMotion.matches;

    if (pageTransitionCleanup) window.clearTimeout(pageTransitionCleanup);
    if (pageTransitionFrame) window.cancelAnimationFrame(pageTransitionFrame);
    pages.forEach((page) => page.classList.remove('is-entering', 'is-leaving'));

    pages.forEach((page) => {
        const isActive = page === activePage;
        page.classList.toggle('active', isActive);
        page.setAttribute('aria-hidden', String(!isActive));
        page.inert = !isActive;

    });
    syncPageVideoPlayback(activePage);

    if (shouldAnimate) {
        previousPage.classList.add('is-leaving');
        activePage.classList.add('is-entering');
        pageTransitionFrame = window.requestAnimationFrame(() => {
            pageTransitionFrame = window.requestAnimationFrame(() => {
                activePage.classList.remove('is-entering');
                pageTransitionFrame = 0;
            });
        });
        pageTransitionCleanup = window.setTimeout(() => {
            previousPage.classList.remove('is-leaving');
            pageTransitionCleanup = 0;
        }, PAGE_TRANSITION_DURATION + 40);
    }

    navLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.page === activePage.id));

    if (updateHistory) {
        history.replaceState(null, '', `#${activePage.id}`);
    }

    if (pageChanged) activePage.scrollTop = 0;
}

function initializePageNavigation() {
    pages.forEach((page) => {
        page.querySelector('.page-video')?.addEventListener('error', (event) => {
            event.currentTarget.classList.add('video-unavailable');
        }, { once: true });
    });

    document.querySelectorAll('[data-page]').forEach((trigger) => {
        trigger.addEventListener('click', () => activatePage(trigger.dataset.page));
    });

    const requestedPage = window.location.hash.slice(1);
    activatePage(pages.some((page) => page.id === requestedPage) ? requestedPage : 'page-1', false, false);
}

function initializeHomeMenu() {
    const menu = document.querySelector('.home-top-nav');
    const toggle = menu?.querySelector('.home-menu-toggle');
    const links = menu?.querySelector('.home-nav-links');
    if (!menu || !toggle || !links) return;

    const setOpen = (isOpen, returnFocus = false) => {
        menu.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
        links.setAttribute('aria-hidden', String(!isOpen));
        links.inert = !isOpen;
        if (returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    links.querySelectorAll('[data-page]').forEach((link) => {
        link.addEventListener('click', () => setOpen(false));
    });
    menu.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
            setOpen(false, true);
        }
    });
    document.addEventListener('pointerdown', (event) => {
        if (!menu.contains(event.target) && toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
}

function initializeContactForm() {
    const form = document.getElementById('direct-contact-form');
    const status = document.getElementById('contact-form-status');
    const submitButton = form?.querySelector('button[type="submit"]');
    if (!form || !status || !submitButton) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.textContent = '';
        status.removeAttribute('data-state');

        if (form.elements.namedItem('_gotcha')?.value) return;

        const nameField = form.elements.namedItem('name');
        const emailField = form.elements.namedItem('email');
        const messageField = form.elements.namedItem('message');
        nameField.value = nameField.value.trim();
        emailField.value = emailField.value.trim();
        messageField.value = messageField.value.trim();

        if (!form.reportValidity()) return;

        let endpoint;
        try {
            endpoint = new URL(CONTACT_FORM_ENDPOINT);
        } catch {
            endpoint = null;
        }
        const endpointIsAllowed = endpoint
            && endpoint.protocol === 'https:'
            && endpoint.hostname === 'formspree.io'
            && /^\/f\/[a-zA-Z0-9_-]+$/.test(endpoint.pathname)
            && !endpoint.search
            && !endpoint.hash;

        if (!endpointIsAllowed) {
            status.dataset.state = 'error';
            status.textContent = 'The contact form is not connected yet. Please use one of the social links for now.';
            return;
        }

        submitButton.disabled = true;
        submitButton.querySelector('span').textContent = 'Sending…';
        status.textContent = 'Sending your message…';
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(endpoint.href, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' },
                credentials: 'omit',
                referrerPolicy: 'no-referrer',
                signal: controller.signal
            });
            if (!response.ok) throw new Error('The contact service could not accept the message.');
            form.reset();
            status.dataset.state = 'success';
            status.textContent = 'Thanks for reaching out. Your message has been sent.';
        } catch {
            status.dataset.state = 'error';
            status.textContent = 'Your message could not be sent. Please try again in a moment.';
        } finally {
            window.clearTimeout(timeout);
            submitButton.disabled = false;
            submitButton.querySelector('span').textContent = 'Send message';
        }
    });
}

function loadProfileImage(index = 0) {
    if (!profileMark || index >= profileImageCandidates.length) return;

    const candidate = profileImageCandidates[index];
    const testImage = new Image();

    testImage.onload = () => {
        profileMark.src = candidate;
    };

    testImage.onerror = () => loadProfileImage(index + 1);
    testImage.src = candidate;
}


function initializePhilosophyPage() {
    const config = window.PHILOSOPHY_CONFIG || { entries: [], videoSrc: '' };
    const videos = Array.from(document.querySelectorAll('.philosophy-video'));
    const overlays = Array.from(document.querySelectorAll('.philosophy-overlay'));

    videos.forEach((video) => {
        if (typeof config.videoSrc === 'string' && config.videoSrc.trim()) {
            video.dataset.deferredSrc = config.videoSrc.trim();
            if (typeof config.videoPosition === 'string' && config.videoPosition.trim()) {
                video.style.objectPosition = config.videoPosition.trim();
            }
        }
    });
    const activePage = pages.find((page) => page.classList.contains('active'));
    if (activePage) syncPageVideoPlayback(activePage);
    if (typeof config.videoOverlay === 'string' && config.videoOverlay.trim()) {
        overlays.forEach((overlay) => { overlay.style.background = config.videoOverlay; });
    }

    const entries = (Array.isArray(config.entries) ? config.entries : []).map((entry, index) => ({
        ...entry,
        id: typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `entry-${index + 1}`
    }));
    const reflectionList = document.getElementById('reflection-list');
    const quoteList = document.getElementById('quote-list');
    const philosophyArchiveList = document.getElementById('philosophy-archive-list');
    const quotesArchiveList = document.getElementById('quotes-archive-list');
    const seeMorePhilosophies = document.getElementById('see-more-philosophies');
    const seeMoreQuotes = document.getElementById('see-more-quotes');
    const PREVIEW_COUNT = 3;
    const LONG_PIECE_THRESHOLD = 700;
    const getTypeLabel = (type) => ({ quote: 'Quote', essay: 'Essay', poem: 'Poem', reflection: 'Reflection' }[type] || 'Reflection');

    const renderMeta = (entry) => {
        const meta = document.createElement('div');
        meta.className = 'entry-meta';
        const type = document.createElement('span');
        type.className = 'entry-type';
        type.textContent = getTypeLabel(entry.type);
        meta.append(type);
        ['category', 'date'].forEach((key) => {
            if (typeof entry[key] === 'string' && entry[key].trim()) {
                const value = document.createElement('span');
                value.textContent = entry[key];
                meta.append(value);
            }
        });
        return meta;
    };
    const makeEmpty = (message) => {
        const empty = document.createElement('p');
        empty.className = 'empty-writing';
        empty.textContent = message;
        return empty;
    };
    const openFullReading = (entry) => {
        const title = document.getElementById('reading-title');
        const content = document.getElementById('reading-content');
        const meta = document.getElementById('reading-meta');
        if (!title || !content || !meta) return;
        const readingBack = document.querySelector('#page-5 .reading-back');
        const sourcePage = pages.find((page) => page.classList.contains('active'))?.id;
        if (readingBack && ['page-4', 'page-6'].includes(sourcePage)) {
            readingBack.dataset.page = sourcePage;
        }
        title.textContent = entry.title || getTypeLabel(entry.type);
        content.textContent = entry.content || '';
        meta.replaceChildren(...renderMeta(entry).childNodes);
        const query = new URLSearchParams({ reading: entry.id });
        history.pushState(null, '', `${window.location.pathname}?${query.toString()}#page-5`);
        activatePage('page-5', false);
    };
    const createReflectionCard = (entry) => {
        const contentText = typeof entry.content === 'string' ? entry.content : '';
        const trimmed = contentText.trim();
        const isLong = contentText.length >= LONG_PIECE_THRESHOLD;
        const details = document.createElement('details');
        details.className = 'writing-card';
        const summary = document.createElement('summary');
        summary.className = 'writing-summary';
        summary.append(renderMeta(entry));
        const title = document.createElement('h3');
        title.textContent = entry.title || getTypeLabel(entry.type);
        summary.append(title);
        const preview = document.createElement('p');
        preview.className = 'writing-preview';
        if (isLong) {
            const excerpt = trimmed.slice(0, 230).replace(/\s+\S*$/, '');
            preview.textContent = `${excerpt}...`;
        } else if (trimmed.length > 220) {
            const excerpt = trimmed.slice(0, 180).replace(/\s+\S*$/, '');
            preview.textContent = `${excerpt}...`;
        } else {
            preview.textContent = 'Open to read this entry.';
        }
        summary.append(preview);
        details.append(summary);
        if (isLong) {
            const action = document.createElement('button');
            action.className = 'entry-action';
            action.type = 'button';
            action.textContent = 'Read the full piece';
            action.addEventListener('click', () => openFullReading(entry));
            details.append(action);
        } else {
            const fullText = document.createElement('p');
            fullText.className = 'writing-expanded';
            fullText.textContent = trimmed;
            details.append(fullText);
        }
        return details;
    };
    const createQuoteCard = (entry) => {
        const article = document.createElement('article');
        article.className = 'quote-card';
        const quote = document.createElement('blockquote');
        quote.textContent = entry.content || '';
        article.append(quote, renderMeta(entry));
        return article;
    };
    const renderItems = (container, items, renderer, emptyMessage) => {
        if (!container) return;
        container.replaceChildren();
        if (!items.length) {
            container.append(makeEmpty(emptyMessage));
            return;
        }
        items.forEach((entry) => container.append(renderer(entry)));
    };

    const reflections = entries.filter((entry) => ['reflection', 'essay', 'poem'].includes(entry.type));
    const quotes = entries.filter((entry) => entry.type === 'quote');
    renderItems(reflectionList, reflections.slice(0, PREVIEW_COUNT), createReflectionCard, 'Your philosophies and reflections will appear here when you add them in philosophy-data.js.');
    renderItems(philosophyArchiveList, reflections, createReflectionCard, 'Your philosophies and reflections will appear here when you add them in philosophy-data.js.');
    renderItems(quoteList, quotes.slice(0, PREVIEW_COUNT), createQuoteCard, 'Your quotes will appear here when you add them in philosophy-data.js.');
    renderItems(quotesArchiveList, quotes, createQuoteCard, 'Your quotes will appear here when you add them in philosophy-data.js.');
    if (seeMorePhilosophies) seeMorePhilosophies.hidden = reflections.length <= PREVIEW_COUNT;
    if (seeMoreQuotes) seeMoreQuotes.hidden = quotes.length <= PREVIEW_COUNT;

    const renderLocationReading = () => {
        const entryId = new URLSearchParams(window.location.search).get('reading');
        const entry = entries.find((item) => item.id === entryId);
        if (!entry || entry.type === 'quote') return;
        const title = document.getElementById('reading-title');
        const content = document.getElementById('reading-content');
        const meta = document.getElementById('reading-meta');
        if (title && content && meta) {
            title.textContent = entry.title || getTypeLabel(entry.type);
            content.textContent = entry.content || '';
            meta.replaceChildren(...renderMeta(entry).childNodes);
        }
    };
    window.syncPortfolioLocation = () => {
        const requestedPage = window.location.hash.slice(1);
        if (!pages.some((page) => page.id === requestedPage)) return;
        if (requestedPage === 'page-5') renderLocationReading();
        if (requestedPage === 'page-10' && !renderDocumentaryReader()) {
            history.replaceState(null, '', `${window.location.pathname}#page-9`);
            activatePage('page-9', false);
            return;
        }
        activatePage(requestedPage, false);
    };
    renderLocationReading();
}

function initializeWritingCopyProtection() {
    const pageSurface = '#portfolioContent';
    const editableSurface = 'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]';
    const getSelectionElement = () => {
        const node = window.getSelection()?.anchorNode;
        return node instanceof Element ? node : node?.parentElement || null;
    };
    const isEditable = (target) => target instanceof Element && Boolean(target.closest(editableSurface));

    document.addEventListener('selectstart', (event) => {
        if (!(event.target instanceof Element) || !event.target.closest(pageSurface) || isEditable(event.target)) return;
        event.preventDefault();
    }, true);

    ['copy', 'cut'].forEach((eventName) => {
        document.addEventListener(eventName, (event) => {
            const eventTarget = event.target instanceof Element ? event.target : null;
            if (isEditable(eventTarget)) return;
            const selectionTarget = getSelectionElement();
            const source = eventTarget?.closest(pageSurface) ? eventTarget : selectionTarget;
            if (source?.closest(pageSurface) && !isEditable(source)) event.preventDefault();
        }, true);
    });
}

function createDocumentaryBody(section) {
    const fragment = document.createDocumentFragment();

    if (Array.isArray(section.scenes) && section.scenes.length) {
        const sceneDirections = document.createElement('div');
        sceneDirections.className = 'documentary-scene-directions';
        section.scenes.forEach((text) => {
            const paragraph = document.createElement('p');
            paragraph.className = 'documentary-scene-direction';
            paragraph.textContent = text;
            sceneDirections.append(paragraph);
        });
        fragment.append(sceneDirections);
    }

    if (Array.isArray(section.narrator) && section.narrator.length) {
        const label = document.createElement('p');
        label.className = 'documentary-narrator-label';
        label.textContent = 'NARRATOR:';
        const narration = document.createElement('div');
        narration.className = 'documentary-narration';
        section.narrator.forEach((text) => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            narration.append(paragraph);
        });
        fragment.append(label, narration);
    }

    (Array.isArray(section.paragraphs) ? section.paragraphs : []).forEach((text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        fragment.append(paragraph);
    });

    if (section.closingScene) {
        const paragraph = document.createElement('p');
        paragraph.className = 'documentary-closing-scene';
        paragraph.textContent = section.closingScene;
        fragment.append(paragraph);
    }
    if (section.closingLine) {
        const closingLine = document.createElement('blockquote');
        closingLine.className = 'documentary-closing-line';
        closingLine.textContent = section.closingLine;
        fragment.append(closingLine);
    }

    return fragment;
}

function renderDocumentaryReader(sectionNumber = new URLSearchParams(window.location.search).get('chapter')) {
    const script = window.DOCUMENTARY_SCRIPT;
    const section = script?.sections?.find((item) => item.number === sectionNumber);
    const page = document.getElementById('page-10');
    const label = document.getElementById('documentary-reader-label');
    const number = document.getElementById('documentary-reader-number');
    const title = document.getElementById('documentary-reader-title');
    const content = document.getElementById('documentary-reader-content');
    if (!section || section.type !== 'chapter' || !page || !label || !number || !title || !content) return false;

    page.setAttribute('aria-labelledby', 'documentary-reader-title');
    label.textContent = section.type === 'chapter' ? `CHAPTER ${section.number}` : section.type.toUpperCase();
    number.textContent = section.number;
    title.textContent = section.title;
    content.replaceChildren(createDocumentaryBody(section));
    return true;
}

function openDocumentarySection(sectionNumber) {
    const section = window.DOCUMENTARY_SCRIPT?.sections?.find((item) => item.number === sectionNumber);
    if (!section || section.type !== 'chapter') return;

    const query = new URLSearchParams(window.location.search);
    query.delete('reading');
    query.set('chapter', section.number);
    history.pushState({ documentaryReader: true }, '', `${window.location.pathname}?${query.toString()}#page-10`);
    renderDocumentaryReader(section.number);
    activatePage('page-10', false);
}

function initializeDocumentaryPage() {
    const script = window.DOCUMENTARY_SCRIPT;
    const chapterContainer = document.getElementById('documentary-chapters');
    const subtitle = document.querySelector('.documentary-subtitle');
    const documentaryPage = document.getElementById('page-9');
    if (!script || !chapterContainer || !Array.isArray(script.sections) || !documentaryPage) return;

    if (typeof script.subtitle === 'string' && subtitle) subtitle.textContent = script.subtitle;

    const fragment = document.createDocumentFragment();
    script.sections.forEach((section, index) => {
        const article = document.createElement('article');
        article.className = `documentary-chapter documentary-section--${section.type}`;
        article.id = `documentary-part-${section.number}`;
        article.setAttribute('aria-labelledby', `documentary-heading-${section.number}`);
        article.dataset.chapter = section.number;

        const rail = document.createElement('div');
        rail.className = 'documentary-chapter-rail';
        const railLabel = document.createElement('span');
        railLabel.textContent = section.type === 'chapter' ? 'CHAPTER' : section.type.toUpperCase();
        const railNumber = document.createElement('strong');
        railNumber.textContent = section.number;
        const railLine = document.createElement('i');
        railLine.setAttribute('aria-hidden', 'true');
        rail.append(railLabel, railNumber, railLine);

        const copy = document.createElement('div');
        copy.className = 'documentary-chapter-copy';
        const label = document.createElement('p');
        label.className = 'documentary-chapter-label';
        label.textContent = section.type === 'chapter' ? `CHAPTER ${section.number}` : section.type.toUpperCase();
        const heading = document.createElement('h2');
        heading.id = `documentary-heading-${section.number}`;
        heading.textContent = section.title;
        const titleRow = document.createElement('div');
        titleRow.className = 'documentary-title-row';
        titleRow.append(heading);
        if (section.type === 'chapter') {
            const readButton = document.createElement('button');
            readButton.className = 'documentary-read-button';
            readButton.type = 'button';
            const sectionName = section.type === 'chapter' ? 'chapter' : section.type;
            readButton.setAttribute('aria-label', `Read ${sectionName}: ${section.title}`);
            const buttonLabel = document.createElement('span');
            buttonLabel.textContent = `Read ${sectionName}`;
            const buttonArrow = document.createElement('span');
            buttonArrow.setAttribute('aria-hidden', 'true');
            buttonArrow.textContent = '\u2192';
            readButton.append(buttonLabel, buttonArrow);
            readButton.addEventListener('click', () => openDocumentarySection(section.number));
            titleRow.append(readButton);
        }
        copy.append(label, titleRow);

        if (section.type === 'prologue' || section.type === 'epilogue') {
            const body = document.createElement('div');
            body.className = 'documentary-inline-body';
            body.append(createDocumentaryBody(section));
            copy.append(body);
        }

        article.append(rail, copy);
        fragment.append(article);
    });
    chapterContainer.replaceChildren(fragment);

    chapterContainer.querySelectorAll('.documentary-chapter').forEach((chapter, index) => {
        chapter.style.setProperty('--chapter-reveal-delay', `${Math.min(index * 70, 280)}ms`);
    });

    document.getElementById('documentary-reader-back')?.addEventListener('click', () => {
        if (history.state?.documentaryReader) {
            history.back();
            return;
        }
        history.replaceState(null, '', `${window.location.pathname}#page-9`);
        activatePage('page-9', false);
    });

    const readerIsActive = document.getElementById('page-10')?.classList.contains('active');
    if (readerIsActive && !renderDocumentaryReader()) {
        history.replaceState(null, '', `${window.location.pathname}#page-9`);
        activatePage('page-9', false, false);
    } else if (!readerIsActive) {
        renderDocumentaryReader();
    }
}

function initializeBoxInteractions() {
    const selector = [
        '.home-page .home-intro-card', '.home-page .home-work-preview', '.home-page .home-profile',
        '.home-page .home-project-row', '.stats-panel', '.skills-intro-card', '.stack-showcase',
        '.skills-page .tech', '.skills-page .project', '.contact-panel', '.contact-intro-card',
        '.contact-item', '.writing-card', '.quote-card', '.reading-article', '.category-list > *',
        '.direct-contact-note', '.direct-contact-form', '.documentary-chapter', '.documentary-reader-article'
    ].join(',');
    const ledObserver = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => entries.forEach((entry) => {
            entry.target.dataset.ledVisible = String(entry.isIntersecting);
        }), { rootMargin: '32px' })
        : null;

    const decorate = (root) => {
        if (root.matches?.(selector) && !root.hasAttribute('data-led-edge')) addEdge(root);
        root.querySelectorAll?.(selector).forEach((card) => {
            if (!card.hasAttribute('data-led-edge')) addEdge(card);
        });
    };
    const addEdge = (card) => {
        card.setAttribute('data-led-edge', 'true');
        const glow = document.createElement('span');
        glow.className = 'box-pointer-glow';
        glow.setAttribute('aria-hidden', 'true');
        const edge = document.createElement('span');
        edge.className = 'box-led-edge';
        edge.setAttribute('aria-hidden', 'true');
        card.append(glow, edge);
        if (ledObserver) ledObserver.observe(card);
        else card.dataset.ledVisible = 'true';
    };

    decorate(document);
    const content = document.getElementById('portfolioContent');
    if (content && 'MutationObserver' in window) {
        const observer = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
            if (node instanceof Element && !node.classList.contains('box-pointer-glow') && !node.classList.contains('box-led-edge')) decorate(node);
        })));
        observer.observe(content, { childList: true, subtree: true });
    }

    let frame = 0;
    let hoveredCard = null;
    let pointerX = 0;
    let pointerY = 0;
    document.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse') return;
        const card = event.target instanceof Element ? event.target.closest('[data-led-edge]') : null;
        if (!card) return;
        hoveredCard = card;
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
            frame = 0;
            if (!hoveredCard?.isConnected) return;
            const bounds = hoveredCard.getBoundingClientRect();
            hoveredCard.style.setProperty('--cursor-x', `${pointerX - bounds.left}px`);
            hoveredCard.style.setProperty('--cursor-y', `${pointerY - bounds.top}px`);
        });
    }, { passive: true });
}

window.addEventListener('hashchange', () => window.syncPortfolioLocation?.());
window.addEventListener('popstate', () => window.syncPortfolioLocation?.());

loadProfileImage();
initializePageNavigation();
initializeHomeMenu();
initializeContactForm();
initializePhilosophyPage();
initializeDocumentaryPage();
initializeWritingCopyProtection();
initializeBoxInteractions();

