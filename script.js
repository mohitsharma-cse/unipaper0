document.addEventListener("DOMContentLoaded", () => {

    // --------------------------------------------------------
    // UNIPAPER API WIRING
    // --------------------------------------------------------
    // Use relative URLs so all /api/* calls go through the site-server proxy.
    // This keeps cookies same-origin and avoids CORS issues.
    const API_BASE_URL = '';
    const libraryGrid = document.getElementById('library-grid');
    const libraryStatus = document.getElementById('library-status');
    const libraryFilters = document.getElementById('library-category-filters');
    const searchInput = document.querySelector('.search-box input');
    let activeLibraryCategory = '';

    function escapeHtml(value = '') {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function buildQuery(params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query.set(key, value);
            }
        });
        return query.toString();
    }

    async function apiRequest(path, options = {}) {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            credentials: 'include',
            headers: {
                ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
                ...(options.headers || {})
            },
            ...options
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }
        return data;
    }

    function apiGet(path, params = {}) {
        const query = buildQuery(params);
        return apiRequest(`${path}${query ? `?${query}` : ''}`);
    }

    function apiPost(path, body = {}) {
        return apiRequest(path, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    function setLibraryStatus(message, state = '') {
        if (!libraryStatus) return;
        libraryStatus.textContent = message;
        libraryStatus.classList.toggle('library-status-error', state === 'error');
        libraryStatus.classList.toggle('library-status-ok', state === 'ok');
    }

    function scrollToLibrary() {
        document.getElementById('library-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function formatDate(value) {
        if (!value) return 'recent';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'recent';
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function renderLibraryFiles(files = [], context = 'Latest uploaded files') {
        if (!libraryGrid) return;

        if (!files.length) {
            libraryGrid.innerHTML = '<div class="library-empty pixel-border">No matching files found. Try another subject, tag, or category.</div>';
            setLibraryStatus(`${context}: no files found.`, 'error');
            return;
        }

        libraryGrid.innerHTML = files.map((file) => {
            const id = escapeHtml(file._id || file.id || '');
            const title = escapeHtml(file.title || 'Untitled PDF');
            const subject = escapeHtml(file.subject || 'Subject');
            const course = escapeHtml(file.course || 'Course');
            const semester = escapeHtml(file.semester || 'Semester');
            const category = escapeHtml(file.category || 'PDF');
            const folderPath = escapeHtml(file.folderId?.path || file.folderId?.name || 'Library');
            const viewUrl = escapeHtml(file.viewUrl || (id ? `/api/files/${id}/pdf` : file.pdfUrl || '#'));
            const downloadUrl = escapeHtml(file.downloadUrl || (id ? `/api/files/${id}/download` : file.pdfUrl || '#'));
            const downloads = Number(file.downloads || 0).toLocaleString();
            const tags = Array.isArray(file.tags) ? file.tags.slice(0, 5) : [];

            return `
                <article class="library-file-card">
                    <div class="library-card-top">
                        <div class="library-card-icon"><i class="fa-solid fa-file-pdf"></i></div>
                        <span class="library-card-type">${category}</span>
                    </div>
                    <h3 class="library-card-title">${title}</h3>
                    <div class="library-card-meta">
                        <div><strong>${subject}</strong> / ${course} / ${semester}</div>
                        <div class="library-card-path">${folderPath}</div>
                        <div>Uploaded ${escapeHtml(formatDate(file.createdAt))} / ${downloads} downloads</div>
                    </div>
                    <div class="library-card-tags">
                        ${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
                    </div>
                    <div class="library-card-actions">
                        <button class="library-card-action view" type="button" data-file-url="${viewUrl}">VIEW</button>
                        <button class="library-card-action download" type="button" data-download-id="${id}" data-file-url="${downloadUrl}">DOWNLOAD</button>
                    </div>
                </article>
            `;
        }).join('');
        setLibraryStatus(`${context}: ${files.length} file${files.length === 1 ? '' : 's'} loaded from the database.`, 'ok');
    }

    async function loadLibraryFiles({ search = '', browse = false, limit = 48, folderId = '', shouldScroll = true } = {}) {
        if (!libraryGrid) return;
        libraryGrid.innerHTML = '<div class="library-empty pixel-border">Loading files from Unipaper database...</div>';
        setLibraryStatus('Connecting to backend database...');

        try {
            const params = { limit };
            if (activeLibraryCategory) params.category = activeLibraryCategory;
            if (folderId) params.folderId = folderId;

            const data = search
                ? await apiGet('/api/files/search', { ...params, q: search })
                : folderId
                    ? await apiGet(`/api/folders/${folderId}/files`, params)
                    : await apiGet('/api/files', params);

            const label = search
                ? `Search results for "${search}"`
                : (browse ? 'Browse all files' : 'Latest uploaded files');
            renderLibraryFiles(data.files || [], label);
            if (shouldScroll) scrollToLibrary();
        } catch (error) {
            libraryGrid.innerHTML = '<div class="library-empty pixel-border">Backend is not reachable. Start the backend with npm run start:backend and try again.</div>';
            setLibraryStatus(error.message || 'Backend connection failed.', 'error');
        }
    }

    function runHeroSearch() {
        const query = searchInput?.value.trim() || '';
        loadLibraryFiles({ search: query, browse: !query });
    }

    if (libraryGrid) {
        libraryGrid.addEventListener('click', async (event) => {
            const downloadButton = event.target.closest('[data-download-id]');
            const viewButton = event.target.closest('.view');

            if (!viewButton && !downloadButton) return;

            if (downloadButton) {
                const fileId = downloadButton.dataset.downloadId;
                const fallbackUrl = downloadButton.dataset.fileUrl;
                const fileName = downloadButton.closest('article')?.querySelector('.library-card-title')?.textContent?.trim() || 'unipaper-document';
                try {
                    const result = await apiPost(`/api/files/${fileId}/download`);
                    const finalUrl = result.pdfUrl || fallbackUrl;
                    // Anchor click stays inside the user's original click gesture.
                    const link = document.createElement('a');
                    link.href = finalUrl;
                    link.download = fileName + '.pdf';
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (error) {
                    // Fallback: still use anchor on error
                    const link = document.createElement('a');
                    link.href = fallbackUrl;
                    link.download = fileName + '.pdf';
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                return;
            }

            if (viewButton) {
                const pdfUrl = viewButton.dataset.fileUrl;
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    }

    document.getElementById('search-btn')?.addEventListener('click', runHeroSearch);
    
    // Search Suggestions Logic
    const searchSuggestionsContainer = document.getElementById('search-suggestions');
    let suggestionsTimeout;

    searchInput?.addEventListener('input', (event) => {
        const query = event.target.value.trim().toLowerCase();
        
        if (!query) {
            if (searchSuggestionsContainer) searchSuggestionsContainer.style.display = 'none';
            return;
        }

        clearTimeout(suggestionsTimeout);
        suggestionsTimeout = setTimeout(() => {
            if (!searchSuggestionsContainer) return;
            
            // Search allFoldersTree recursively
            const results = [];
            function searchFolders(folders) {
                if (!folders) return;
                for (const f of folders) {
                    if (f.name.toLowerCase().includes(query)) {
                        results.push(f);
                    }
                    if (f.children && f.children.length > 0) {
                        searchFolders(f.children);
                    }
                }
            }
            searchFolders(allFoldersTree);
            
            if (results.length === 0) {
                searchSuggestionsContainer.innerHTML = '<div style="padding:10px; color:#a1a1aa; font-family:\'VT323\', monospace;">No matching folders found... press Enter to search files</div>';
                searchSuggestionsContainer.style.display = 'block';
                return;
            }

            searchSuggestionsContainer.innerHTML = results.slice(0, 10).map((f, i) => {
                const icon = f.icon || SUBJECT_ICONS[f.type] || SUBJECT_ICONS['default'];
                return `
                    <div class="suggestion-item" data-folder-id="${escapeHtml(f._id)}" style="padding:8px 12px; cursor:pointer; font-family:'Inter', sans-serif; display:flex; align-items:center; gap:10px; border-bottom:1px solid #333; transition: background 0.2s;">
                        <span style="font-size:18px;">${icon}</span>
                        <div>
                            <div style="color:#e2e8f0; font-weight:600; font-size:14px;">${escapeHtml(f.name)}</div>
                            <div style="color:#a1a1aa; font-size:12px;">${escapeHtml(f.type.toUpperCase())} ${f.path ? `(${escapeHtml(f.path)})` : ''}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            searchSuggestionsContainer.style.display = 'block';

            // Add hover effects and click listeners
            searchSuggestionsContainer.querySelectorAll('.suggestion-item').forEach((item, index) => {
                item.addEventListener('mouseenter', () => item.style.background = '#222');
                item.addEventListener('mouseleave', () => item.style.background = 'transparent');
                
                item.addEventListener('click', () => {
                    searchSuggestionsContainer.style.display = 'none';
                    searchInput.value = ''; // clear
                    const selectedFolder = results[index];
                    
                    // We need to build the stack for the selected folder to use handleFolderClick properly
                    currentFolderStack = [];
                    // It's a bit tricky to build full stack from a random node if it doesn't have parent links.
                    // For now, just push it and render.
                    handleFolderClick(selectedFolder);
                    document.getElementById('subjects').scrollIntoView({ behavior: 'smooth' });
                });
            });
            
        }, 300);
    });

    // Close suggestions if clicked outside
    document.addEventListener('click', (e) => {
        if (searchSuggestionsContainer && !e.target.closest('.search-box')) {
            searchSuggestionsContainer.style.display = 'none';
        }
    });

    searchInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (searchSuggestionsContainer) searchSuggestionsContainer.style.display = 'none';
            runHeroSearch();
        }
    });

    document.querySelectorAll('.tag').forEach((tag) => {
        tag.addEventListener('click', () => {
            const value = tag.textContent.trim();
            if (searchInput) searchInput.value = value;
            loadLibraryFiles({ search: value });
        });
    });

    document.getElementById('browse-all-btn')?.addEventListener('click', () => loadLibraryFiles({ browse: true }));
    document.getElementById('library-refresh-btn')?.addEventListener('click', () => loadLibraryFiles({ browse: true }));

    libraryFilters?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-category]');
        if (!button) return;
        activeLibraryCategory = button.dataset.category || '';
        libraryFilters.querySelectorAll('.library-filter').forEach((item) => item.classList.toggle('is-active', item === button));
        const query = searchInput?.value.trim() || '';
        loadLibraryFiles({ search: query, browse: !query });
    });

    // --------------------------------------------------------
    // PILL NAV ANIMATION LOGIC
    // --------------------------------------------------------
    const circles = document.querySelectorAll('.hover-circle');
    const tlRefs = [];
    const activeTweenRefs = [];

    const layout = () => {
        circles.forEach((circle, index) => {
            const pill = circle.parentElement;
            const rect = pill.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            if (!h) return;
            const R = ((w * w) / 4 + h * h) / (2 * h);
            const D = Math.ceil(2 * R) + 2;
            const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
            const originY = D - delta;

            circle.style.width = `${D}px`;
            circle.style.height = `${D}px`;
            circle.style.bottom = `-${delta}px`;

            gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` });

            const label = pill.querySelector('.pill-label');
            const white = pill.querySelector('.pill-label-hover');

            if (label) gsap.set(label, { y: 0 });
            if (white) gsap.set(white, { y: h + 12, opacity: 0 });

            if (tlRefs[index]) tlRefs[index].kill();

            const tl = gsap.timeline({ paused: true });
            const easeObj = "power3.out";

            tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease: easeObj }, 0);
            if (label) tl.to(label, { y: -(h + 8), duration: 2, ease: easeObj }, 0);
            if (white) {
                gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
                tl.to(white, { y: 0, opacity: 1, duration: 2, ease: easeObj }, 0);
            }

            tlRefs[index] = tl;

            pill.onmouseenter = () => {
                if (activeTweenRefs[index]) activeTweenRefs[index].kill();
                activeTweenRefs[index] = tlRefs[index].tweenTo(tlRefs[index].duration(), { duration: 0.3, ease: easeObj });
            };
            pill.onmouseleave = () => {
                if (activeTweenRefs[index]) activeTweenRefs[index].kill();
                activeTweenRefs[index] = tlRefs[index].tweenTo(0, { duration: 0.2, ease: easeObj });
            };
        });
    };

    layout();
    window.addEventListener('resize', layout);
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(layout).catch(() => {});
    }

    // --------------------------------------------------------
    // STATS BAR - Live counts from database
    // --------------------------------------------------------
    async function loadLiveStats() {
        try {
            // Use the public /api/files endpoint to get total count
            const [filesData, foldersData] = await Promise.allSettled([
                apiGet('/api/files', { limit: 1 }),
                apiGet('/api/folders')
            ]);

            const totalFiles = filesData.status === 'fulfilled'
                ? (filesData.value.total || filesData.value.files?.length || 0) : 0;

            // Count folders from tree
            let totalFolders = 0;
            function countFolders(nodes) {
                nodes.forEach(n => { totalFolders++; if (n.children?.length) countFolders(n.children); });
            }
            if (foldersData.status === 'fulfilled') {
                countFolders(foldersData.value.folders || []);
            }

            // Map stat-number elements by their label siblings
            document.querySelectorAll('.stat-item').forEach(item => {
                const label = item.querySelector('.stat-label')?.textContent?.toLowerCase() || '';
                const numEl = item.querySelector('.stat-number');
                if (!numEl) return;
                let value = null;
                if (label.includes('pdf') || label.includes('file') || label.includes('material')) value = totalFiles;
                if (label.includes('folder') || label.includes('subject') || label.includes('categor')) value = totalFolders;
                if (value !== null) numEl.setAttribute('data-target', value);
            });
        } catch { /* keep static data-target values */ }

        // Animate all stat numbers on scroll
        const statNumbers = document.querySelectorAll('.stat-number');
        if (statNumbers.length > 0) {
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const target = parseInt(entry.target.getAttribute('data-target')) || 0;
                        let current = 0;
                        const step = () => {
                            current += Math.ceil(target / 60);
                            if (current >= target) { entry.target.textContent = target.toLocaleString(); return; }
                            entry.target.textContent = current.toLocaleString();
                            requestAnimationFrame(step);
                        };
                        step();
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            statNumbers.forEach(stat => observer.observe(stat));
        }
    }
    loadLiveStats();

    // Auto-load latest files on page start (no button click needed)
    loadLibraryFiles({ browse: true, shouldScroll: false });


    // --------------------------------------------------------
    // HIERARCHICAL FOLDER BROWSER (Windows File Explorer Style)
    // --------------------------------------------------------
    const SUBJECT_ICONS = {
        'course': '<i class="fa-solid fa-graduation-cap"></i>',
        'semester': '<i class="fa-regular fa-calendar-days"></i>',
        'subject': '<i class="fa-solid fa-book"></i>',
        'category': '<i class="fa-solid fa-folder"></i>',
        'default': '<i class="fa-solid fa-folder-open"></i>'
    };

    let allFoldersTree = [];
    let currentFolderStack = []; // array of folder objects

    async function initFolderBrowser() {
        const subjectsGrid = document.getElementById('subjects-grid');
        if (!subjectsGrid) return;

        // Add breadcrumbs container right before the grid
        let breadcrumbs = document.getElementById('folder-breadcrumbs');
        if (!breadcrumbs) {
            breadcrumbs = document.createElement('div');
            breadcrumbs.id = 'folder-breadcrumbs';
            breadcrumbs.style.cssText = "font-family:'VT323', monospace; font-size:22px; color:#ffcc00; margin-bottom:20px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;";
            subjectsGrid.parentNode.insertBefore(breadcrumbs, subjectsGrid);
        }

        try {
            const data = await apiGet('/api/folders');
            allFoldersTree = data.folders || [];
            if (!allFoldersTree.length) {
                subjectsGrid.innerHTML = '<div style="color:#a1a1aa; font-family:Inter,sans-serif;">No folders have been created by the admin yet. Check back later!</div>';
                return;
            }
            renderCurrentFolderView();
        } catch (err) {
            subjectsGrid.innerHTML = `<div style="color:#fca5a5;">Failed to load folders: ${err.message}</div>`;
        }
    }

    function renderCurrentFolderView() {
        const subjectsGrid = document.getElementById('subjects-grid');
        const breadcrumbs = document.getElementById('folder-breadcrumbs');
        
        // Build Breadcrumbs
        let breadcrumbHTML = `<span style="cursor:pointer; color:#d4d4d8;" onclick="window.goToFolderLevel(-1)">Root</span>`;
        currentFolderStack.forEach((f, i) => {
            breadcrumbHTML += ` <span style="color:#555;">&gt;</span> <span style="cursor:pointer; color:${i === currentFolderStack.length - 1 ? '#ffcc00' : '#d4d4d8'};" onclick="window.goToFolderLevel(${i})">${escapeHtml(f.name)}</span>`;
        });
        breadcrumbs.innerHTML = breadcrumbHTML;

        // Determine which children to show
        let childrenToShow = allFoldersTree;
        if (currentFolderStack.length > 0) {
            const currentFolder = currentFolderStack[currentFolderStack.length - 1];
            childrenToShow = currentFolder.children || [];
        }

        if (childrenToShow.length === 0) {
            subjectsGrid.innerHTML = '<div style="color:#a1a1aa; font-family:Inter,sans-serif; grid-column: 1 / -1;">This folder is empty. Scroll down to see if there are any files here.</div>';
            return;
        }

        subjectsGrid.innerHTML = childrenToShow.map((f, i) => {
            const icon = f.icon || SUBJECT_ICONS[f.type] || SUBJECT_ICONS['default'];
            const childCount = f.children ? f.children.length : 0;
            return `
                <div class="subject-card folder-card" role="button" tabindex="0"
                     data-folder-id="${escapeHtml(f._id)}"
                     style="opacity:0; transform: translateY(20px);">
                    <div class="sc-icon" style="font-size:28px;">${icon}</div>
                    <div class="sc-name">${escapeHtml(f.name)}</div>
                    <div class="sc-count" style="margin-bottom:0;">${escapeHtml(f.type.toUpperCase())}</div>
                    <span class="sc-tag">${childCount} sub-folders</span>
                </div>
            `;
        }).join('');

        // Attach click handlers to the new cards
        const cards = subjectsGrid.querySelectorAll('.folder-card');
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = Array.from(cards).indexOf(entry.target) * 0.05;
                    gsap.to(entry.target, { opacity: 1, y: 0, duration: 0.4, delay, ease: 'power2.out' });
                    cardObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        cards.forEach((card, index) => {
            cardObserver.observe(card);
            card.addEventListener('click', () => handleFolderClick(childrenToShow[index]));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFolderClick(childrenToShow[index]);
                }
            });
        });
    }

    function handleFolderClick(folderObj) {
        // If it has children, dive deeper
        if (folderObj.children && folderObj.children.length > 0) {
            currentFolderStack.push(folderObj);
            renderCurrentFolderView();
        } else {
            // It's an end-level folder (like Notes). Select it and show files!
            if (searchInput) searchInput.value = '';
            currentFolderStack.push(folderObj);
            renderCurrentFolderView(); // Update breadcrumbs
            loadLibraryFiles({ folderId: folderObj._id, browse: true, shouldScroll: true });
        }
    }

    // Expose breadcrumb navigation to global scope so onclick can use it
    window.goToFolderLevel = function(index) {
        if (index === -1) {
            currentFolderStack = [];
        } else {
            currentFolderStack = currentFolderStack.slice(0, index + 1);
        }
        renderCurrentFolderView();
    };

    initFolderBrowser();

    // --------------------------------------------------------
    // RENDERING REVIEWS CAROUSEL
    // --------------------------------------------------------
    const defaultApprovedReviews = [
        { quote: 'I was honestly lost before exams. UniPapers gave me PYQs and notes in one quick search.', name: 'Aarav Sharma', role: 'B.Tech CSE, 3rd Year' },
        { quote: 'Took one night to become my most-used student website this semester.', name: 'Naina Verma', role: 'BCA, 2nd Year' },
        { quote: 'No more asking five different groups for papers. Everything I needed was already here.', name: 'Rohit Singh', role: 'B.Tech IT, Final Year' },
        { quote: 'The clean layout is what I like most. It feels simple, fast, and made for students.', name: 'Ishita Rao', role: 'B.Com, 2nd Year' },
        { quote: 'I found notes, assignments, and previous papers from one page. That saved me a lot of time.', name: 'Kabir Mehta', role: 'MBA, 1st Year' }
    ];

    const reviewsTrack = document.getElementById('reviews-track');
    let activeReviewIndex = 0;
    let reviewTimer = null;

    function renderReviewsCarousel() {
        if (!reviewsTrack) return;
        reviewsTrack.innerHTML = defaultApprovedReviews.map((r, i) => `
            <div class="review-card" id="review-card-${i}" tabindex="0" role="article">
                <div class="review-card-head">
                    <img class="review-card-photo" src="https://i.pravatar.cc/120?img=${15 + i}" alt="Avatar of ${r.name}">
                    <div class="review-card-role badge">✓ APPROVED STUDENT REVIEW</div>
                </div>
                <p class="review-card-quote">"${r.quote}"</p>
                <p class="review-card-meta">— <span class="author-name">${r.name}</span>, <span class="author-role">${r.role}</span></p>
            </div>
        `).join('');
        updateCarousel();
    }

    async function loadApprovedReviews() {
        if (!reviewsTrack) return;
        const reviewsStatus = document.getElementById('reviews-status');
        try {
            const data = await apiGet('/api/reviews');
            if (Array.isArray(data.reviews) && data.reviews.length > 0) {
                defaultApprovedReviews.splice(0, defaultApprovedReviews.length, ...data.reviews.map((review) => ({
                    quote: review.quote,
                    name: review.name,
                    role: review.role
                })));
                activeReviewIndex = 0;
                renderReviewsCarousel();
                resetTimer();
                if (reviewsStatus) reviewsStatus.textContent = 'Approved reviews are live from the database.';
            }
        } catch (error) {
            if (reviewsStatus) reviewsStatus.textContent = 'Review API is offline, showing sample approved reviews.';
        }
    }

    function updateCarousel() {
        const cards = document.querySelectorAll('.review-card');
        const total = defaultApprovedReviews.length;
        if (!cards.length) return;

        cards.forEach((card, index) => {
            let offset = index - activeReviewIndex;
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            let x = 0, rotate = 0, scale = 1, opacity = 1, zIndex = 5;
            card.classList.remove('is-active', 'is-hidden');

            if (offset === 0) {
                x = 0; rotate = 0; scale = 1; opacity = 1; zIndex = 100;
                card.classList.add('is-active');
            } else if (offset === -1) {
                x = -320; rotate = -6; scale = 0.88; opacity = 0.9; zIndex = 4;
            } else if (offset === 1) {
                x = 320; rotate = 6; scale = 0.88; opacity = 0.9; zIndex = 4;
            } else if (offset === -2) {
                x = -580; rotate = -3; scale = 0.76; opacity = 0.8; zIndex = 3;
            } else if (offset === 2) {
                x = 580; rotate = 3; scale = 0.76; opacity = 0.8; zIndex = 3;
            } else {
                x = offset < 0 ? -650 : 650; rotate = offset < 0 ? -8 : 8; scale = 0.65; opacity = 0; zIndex = 1;
                card.classList.add('is-hidden');
            }

            gsap.to(card, {
                x: x,
                xPercent: -50,
                yPercent: -50,
                rotation: rotate,
                scale: scale,
                opacity: opacity,
                zIndex: zIndex,
                duration: 0.65,
                ease: 'power3.out'
            });
        });
    }

    function nextReview() {
        activeReviewIndex = (activeReviewIndex + 1) % defaultApprovedReviews.length;
        updateCarousel();
        resetTimer();
    }
    function prevReview() {
        activeReviewIndex = (activeReviewIndex - 1 + defaultApprovedReviews.length) % defaultApprovedReviews.length;
        updateCarousel();
        resetTimer();
    }
    function resetTimer() {
        if (reviewTimer) clearInterval(reviewTimer);
        reviewTimer = setInterval(nextReview, 5000);
    }

    if (reviewsTrack) {
        renderReviewsCarousel();
        resetTimer();
        document.getElementById('reviews-next')?.addEventListener('click', nextReview);
        document.getElementById('reviews-prev')?.addEventListener('click', prevReview);
        loadApprovedReviews();

        // Pause auto-advance when user switches tabs (saves CPU/battery)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (reviewTimer) clearInterval(reviewTimer);
            } else {
                resetTimer();
            }
        });
    }

    // --------------------------------------------------------
    // MODALS LOGIC
    // --------------------------------------------------------
    const reviewModalOverlay = document.getElementById('review-modal-overlay');
    const reviewBtn = document.getElementById('post-review-btn');
    const reviewClose = document.getElementById('review-modal-close');
    if (reviewBtn && reviewModalOverlay && reviewClose) {
        reviewBtn.onclick = () => reviewModalOverlay.classList.add('is-active');
        reviewClose.onclick = () => reviewModalOverlay.classList.remove('is-active');
        reviewModalOverlay.onclick = (e) => { if (e.target === reviewModalOverlay) reviewModalOverlay.classList.remove('is-active'); };
    }

    // Terminal review form - multi-step
    const terminalLog = document.getElementById('review-terminal-log');
    const terminalInput = document.getElementById('review-terminal-input');
    const terminalActions = document.getElementById('review-terminal-actions');
    const reviewForm = document.getElementById('review-form');

    const reviewSteps = [
        { key: 'name', prompt: 'Enter your name:' },
        { key: 'role', prompt: 'Your role / year / branch:' },
        { key: 'review', prompt: 'Write your review (max 220 chars):' }
    ];
    let reviewStepIdx = 0;
    const reviewAnswers = {};

    function addTerminalLine(text, cls = '') {
        if (!terminalLog) return;
        const div = document.createElement('div');
        div.className = 'terminal-line ' + cls;
        div.textContent = text;
        terminalLog.appendChild(div);
        terminalLog.scrollTop = terminalLog.scrollHeight;
    }

    function showNextPrompt() {
        if (reviewStepIdx < reviewSteps.length) {
            addTerminalLine('> ' + reviewSteps[reviewStepIdx].prompt, 'terminal-prompt');
            if (terminalInput) {
                terminalInput.placeholder = '';
                terminalInput.value = '';
                terminalInput.focus();
            }
        }
    }

    if (reviewModalOverlay) {
        reviewModalOverlay.addEventListener('click', (e) => {
            if (e.target === reviewModalOverlay) return; // handled above
        });
    }

    // Reset terminal when modal opens
    if (reviewBtn) {
        reviewBtn.addEventListener('click', () => {
            reviewStepIdx = 0;
            Object.keys(reviewAnswers).forEach(k => delete reviewAnswers[k]);
            if (terminalLog) terminalLog.innerHTML = '';
            addTerminalLine('SYS.REVIEW.EXE - UniPapers Review System v1.0', 'terminal-header');
            addTerminalLine('-'.repeat(42), 'terminal-divider');
            showNextPrompt();
            if (terminalActions) terminalActions.hidden = true;
        });
    }

    if (terminalInput) {
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = terminalInput.value.trim();
                if (!val) return;

                addTerminalLine('  ' + val, 'terminal-answer');
                reviewAnswers[reviewSteps[reviewStepIdx].key] = val;
                terminalInput.value = '';
                reviewStepIdx++;

                if (reviewStepIdx < reviewSteps.length) {
                    showNextPrompt();
                } else {
                    addTerminalLine('-'.repeat(42), 'terminal-divider');
                    addTerminalLine('Review ready to submit. Press DONE to send.', 'terminal-success');
                    if (terminalActions) terminalActions.hidden = false;
                    terminalInput.disabled = true;
                }
            }
        });
    }

    document.getElementById('review-reset-btn')?.addEventListener('click', () => {
        reviewStepIdx = 0;
        Object.keys(reviewAnswers).forEach(k => delete reviewAnswers[k]);
        if (terminalLog) terminalLog.innerHTML = '';
        if (terminalInput) { terminalInput.disabled = false; terminalInput.value = ''; }
        if (terminalActions) terminalActions.hidden = true;
        addTerminalLine('SYS.REVIEW.EXE - UniPapers Review System v1.0', 'terminal-header');
        addTerminalLine('-'.repeat(42), 'terminal-divider');
        showNextPrompt();
    });

    if (reviewForm) {
        reviewForm.onsubmit = async (e) => {
            e.preventDefault();
            if (!reviewAnswers.name || !reviewAnswers.role || !reviewAnswers.review) {
                addTerminalLine('! Complete all review steps before submitting.', 'terminal-prompt');
                return;
            }

            addTerminalLine('[TRANSMITTING...]', 'terminal-prompt');

            try {
                await apiPost('/api/reviews', {
                    name: reviewAnswers.name,
                    role: reviewAnswers.role,
                    quote: reviewAnswers.review.slice(0, 220)
                });
                addTerminalLine('OK Review submitted for admin approval!', 'terminal-success');
                const reviewsStatus = document.getElementById('reviews-status');
                if (reviewsStatus) reviewsStatus.textContent = 'Your review was sent to admin. It appears here after approval.';
                setTimeout(() => {
                    reviewModalOverlay?.classList.remove('is-active');
                    // Reset the full terminal state so re-opening works cleanly
                    reviewStepIdx = 0;
                    Object.keys(reviewAnswers).forEach(k => delete reviewAnswers[k]);
                    if (terminalLog) terminalLog.innerHTML = '';
                    if (terminalInput) { terminalInput.disabled = false; terminalInput.value = ''; }
                    if (terminalActions) terminalActions.hidden = true;
                }, 1200);
            } catch (error) {
                addTerminalLine('! Backend rejected the review: ' + error.message, 'terminal-prompt');
                if (terminalInput) terminalInput.disabled = false;
            }
        };
    }

    // Initial file load handled by line ~421: loadLibraryFiles({ browse: true, shouldScroll: false });

    // --------------------------------------------------------
    // CLICK SPARKS ENGINE
    // --------------------------------------------------------
    const clickSparkConfig = { sparkSize: 10, sparkRadius: 15, sparkCount: 8, duration: 400, easing: 'ease-out', extraScale: 1 };
    let clickSparkCanvas = null, clickSparkCtx = null, clickSparkFrame = 0, clickSparkReady = false;
    const clickSparks = [];

    function easeClickSpark(t, easing) {
        if (easing === 'linear') return t;
        if (easing === 'ease-in') return t * t;
        if (easing === 'ease-in-out') return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        return t * (2 - t);
    }

    function ensureClickSparkCanvas() {
        if (clickSparkCanvas) return;
        clickSparkCanvas = document.createElement('canvas');
        clickSparkCanvas.className = 'click-spark-canvas';
        clickSparkCanvas.setAttribute('aria-hidden', 'true');
        Object.assign(clickSparkCanvas.style, { position: 'fixed', top: '0', left: '0', pointerEvents: 'none', zIndex: '9999' });
        document.body.appendChild(clickSparkCanvas);
        clickSparkCtx = clickSparkCanvas.getContext('2d');
    }

    function resizeClickSparkCanvas() {
        if (!clickSparkCanvas) return;
        const dpr = window.devicePixelRatio || 1;
        clickSparkCanvas.width = Math.ceil(window.innerWidth * dpr);
        clickSparkCanvas.height = Math.ceil(window.innerHeight * dpr);
        clickSparkCanvas.style.width = `${window.innerWidth}px`;
        clickSparkCanvas.style.height = `${window.innerHeight}px`;
        clickSparkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawClickSparks(timestamp) {
        if (!clickSparkCtx) { clickSparkFrame = 0; return; }
        clickSparkCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        clickSparkCtx.lineCap = 'round';

        for (let i = clickSparks.length - 1; i >= 0; i--) {
            const spark = clickSparks[i];
            const elapsed = timestamp - spark.startTime;
            if (elapsed >= spark.duration) { clickSparks.splice(i, 1); continue; }

            const progress = elapsed / spark.duration;
            const eased = easeClickSpark(progress, spark.easing);
            const distance = eased * spark.radius * spark.extraScale;
            const lineLength = spark.size * (1 - eased);
            const x1 = spark.x + distance * Math.cos(spark.angle);
            const y1 = spark.y + distance * Math.sin(spark.angle);
            const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
            const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

            clickSparkCtx.globalAlpha = 1 - eased;
            clickSparkCtx.strokeStyle = spark.color;
            clickSparkCtx.lineWidth = 2.5;
            clickSparkCtx.beginPath();
            clickSparkCtx.moveTo(x1, y1);
            clickSparkCtx.lineTo(x2, y2);
            clickSparkCtx.stroke();
            clickSparkCtx.globalAlpha = 1;
        }

        if (clickSparks.length > 0) {
            clickSparkFrame = requestAnimationFrame(drawClickSparks);
        } else {
            clickSparkFrame = 0;
        }
    }

    function queueClickSparks(target, clientX, clientY) {
        if (!clickSparkCtx || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
        const host = target instanceof Element ? target.closest('[data-spark-color]') : null;
        const sparkColor = host?.dataset.sparkColor || '#ffcc00';
        const startTime = performance.now();
        for (let i = 0; i < clickSparkConfig.sparkCount; i++) {
            clickSparks.push({
                x: clientX, y: clientY,
                angle: (2 * Math.PI * i) / clickSparkConfig.sparkCount,
                startTime, color: sparkColor,
                size: clickSparkConfig.sparkSize,
                radius: clickSparkConfig.sparkRadius,
                duration: clickSparkConfig.duration,
                easing: clickSparkConfig.easing,
                extraScale: clickSparkConfig.extraScale
            });
        }
        if (!clickSparkFrame) clickSparkFrame = requestAnimationFrame(drawClickSparks);
    }

    function initClickSparks() {
        if (clickSparkReady) return;
        ensureClickSparkCanvas();
        resizeClickSparkCanvas();
        window.addEventListener('resize', resizeClickSparkCanvas);
        const handler = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            queueClickSparks(e.target, e.clientX, e.clientY);
        };
        document.addEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', handler, true);
        clickSparkReady = true;
    }
    initClickSparks();

    // --------------------------------------------------------
    // REACTIONS ENGINE
    // --------------------------------------------------------
    const reviewReactionOptions = [
        { id: 'love', emoji: '\u2764\ufe0f', label: 'Love' },
        { id: 'fire', emoji: '\ud83d\udd25', label: 'Fire' },
        { id: 'useful', emoji: '\u2705', label: 'Useful' },
        { id: 'wow', emoji: '\ud83d\ude2e', label: 'Wow' },
        { id: 'top', emoji: '\ud83d\ude80', label: 'Top' }
    ];
    const reactionsState = { counts: {}, views: 0 };

    function loadReactionStats() {
        try {
            const raw = localStorage.getItem('unipapersReactions');
            reactionsState.counts = { ...Object.fromEntries(reviewReactionOptions.map(r => [r.id, 0])), ...(raw ? JSON.parse(raw) : {}) };
        } catch (e) {
            reactionsState.counts = Object.fromEntries(reviewReactionOptions.map(r => [r.id, 0]));
        }
        const stored = parseInt(localStorage.getItem('unipapersViews') || '0', 10);
        reactionsState.views = isNaN(stored) ? 0 : stored;
        if (!sessionStorage.getItem('sessionViewed')) {
            reactionsState.views++;
            sessionStorage.setItem('sessionViewed', '1');
            localStorage.setItem('unipapersViews', String(reactionsState.views));
        }
    }

    function renderReactionStats(activeId = '') {
        const grid = document.getElementById('review-reactions-grid');
        const views = document.getElementById('review-view-count');
        if (!grid || !views) return;
        views.textContent = reactionsState.views.toLocaleString();
        grid.innerHTML = reviewReactionOptions.map(r => `
            <button class="review-reaction ${activeId === r.id ? 'is-bumped' : ''}" type="button" data-reaction-id="${r.id}">
                <span class="review-reaction-emoji">${r.emoji}</span>
                <span class="review-reaction-count">${reactionsState.counts[r.id] || 0}</span>
                <span class="review-reaction-label">${r.label}</span>
            </button>
        `).join('');
        grid.querySelectorAll('.review-reaction').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.reactionId;
                if (!id || !(id in reactionsState.counts)) return;
                reactionsState.counts[id]++;
                localStorage.setItem('unipapersReactions', JSON.stringify(reactionsState.counts));
                renderReactionStats(id);
            });
        });
    }

    const reviewGrid = document.getElementById('review-reactions-grid');
    if (reviewGrid) {
        loadReactionStats();
        renderReactionStats();
        // Label the panel so users know counts are local to their browser
        const panel = document.getElementById('review-reactions-panel');
        if (panel) {
            const note = panel.querySelector('.reactions-device-note');
            if (!note) {
                const p = document.createElement('p');
                p.className = 'reactions-device-note';
                p.style.cssText = 'font-size:11px;color:#555;font-family:Inter,sans-serif;text-align:center;margin-top:12px;';
                p.textContent = '* Reaction counts are saved on this device only.';
                panel.appendChild(p);
            }
        }
    }

    // --------------------------------------------------------
    // SHUFFLE TEXT ANIMATION - FIXED VERSION
    // --------------------------------------------------------
    function initShuffleText() { return;
        const el = document.querySelector(".main-title");
        if (!el) return;

        // Store original HTML so we can restore on each hover
        const originalHTML = el.innerHTML;

        function runShuffle() {
            el.innerHTML = originalHTML;
            el.style.visibility = 'hidden';

            // Walk through text nodes, skip BRs
            const processNode = (node) => {
                if (node.nodeType === 3) {
                    const text = node.textContent;
                    const frag = document.createDocumentFragment();
                    for (let i = 0; i < text.length; i++) {
                        const ch = text[i];
                        if (ch === ' ' || ch === '\n') {
                            frag.appendChild(document.createTextNode(ch));
                            continue;
                        }
                        const wrapper = document.createElement('span');
                        wrapper.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;';
                        const strip = document.createElement('span');
                        strip.className = 'shuffle-strip';
                        strip.style.cssText = 'display:inline-block;white-space:nowrap;will-change:transform;';
                        // Build: [scramble1, scramble2, real_char]
                        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!%';
                        for (let k = 0; k < 2; k++) {
                            const s = document.createElement('span');
                            s.className = 'shuffle-char';
                            s.style.cssText = 'display:inline-block;text-align:center;';
                            s.textContent = charset[Math.floor(Math.random() * charset.length)];
                            strip.appendChild(s);
                        }
                        const real = document.createElement('span');
                        real.className = 'shuffle-char';
                        real.style.cssText = 'display:inline-block;text-align:center;';
                        real.textContent = ch;
                        strip.appendChild(real);

                        wrapper.appendChild(strip);
                        frag.appendChild(wrapper);
                    }
                    node.parentNode.replaceChild(frag, node);
                } else if (node.nodeType === 1 && node.tagName !== 'BR') {
                    Array.from(node.childNodes).forEach(processNode);
                }
            };

            Array.from(el.childNodes).forEach(processNode);

            // After layout paint, measure and animate
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    el.style.visibility = 'visible';
                    const strips = el.querySelectorAll('.shuffle-strip');
                    strips.forEach((strip, idx) => {
                        const charEls = strip.querySelectorAll('.shuffle-char');
                        const w = charEls[charEls.length - 1].offsetWidth || 12;
                        strip.parentElement.style.width = w + 'px';
                        charEls.forEach(c => c.style.width = w + 'px');

                        const steps = charEls.length - 1; // 2 scramble chars
                        const startX = -(steps * w);

                        gsap.fromTo(strip,
                            { x: startX },
                            {
                                x: 0,
                                duration: 0.4,
                                ease: 'power3.out',
                                delay: idx * 0.025
                            }
                        );
                    });
                });
            });
        }

        runShuffle();

        // Re-run on hover
        el.addEventListener('mouseenter', () => { runShuffle(); });
    }

    initShuffleText();

    // --------------------------------------------------------
    // SHAPE GRID BACKGROUND - ENHANCED
    // --------------------------------------------------------
    function initShapeGrid() {
        const canvas = document.getElementById("shapegrid-canvas");
        if (!canvas) return;
        const crtScreen = document.getElementById("crt-overlay");
        if (!crtScreen) return;

        const ctx = canvas.getContext("2d");
        const speed = 0.35;
        const squareSize = 36;
        const borderColor = "rgba(255, 204, 0, 0.12)";
        const hoverFillColor = "#ffcc00";
        const hoverTrailAmount = 5;

        const gridOffset = { x: 0, y: 0 };
        let hoveredSquare = null;
        const trailCells = [];
        const cellOpacities = new Map();

        const resizeCanvas = () => {
            canvas.width = crtScreen.offsetWidth;
            canvas.height = crtScreen.offsetHeight;
        };
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        const drawGrid = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
            const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
            const cols = Math.ceil(canvas.width / squareSize) + 3;
            const rows = Math.ceil(canvas.height / squareSize) + 3;

            for (let col = -2; col < cols; col++) {
                for (let row = -2; row < rows; row++) {
                    const sx = col * squareSize + offsetX;
                    const sy = row * squareSize + offsetY;
                    const cellKey = col + "," + row;
                    const alpha = cellOpacities.get(cellKey);

                    if (alpha) {
                        ctx.globalAlpha = alpha * 0.55;
                        ctx.fillStyle = hoverFillColor;
                        ctx.fillRect(sx + 1, sy + 1, squareSize - 2, squareSize - 2);
                        ctx.globalAlpha = 1;
                    }

                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(sx, sy, squareSize, squareSize);
                }
            }

            // Vignette gradient from corners
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / 2
            );
            gradient.addColorStop(0, "rgba(0,0,0,0)");
            gradient.addColorStop(0.6, "rgba(0,0,0,0)");
            gradient.addColorStop(1, "rgba(0,0,0,0.7)");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        };

        const updateCellOpacities = () => {
            const targets = new Map();
            if (hoveredSquare) targets.set(hoveredSquare.x + "," + hoveredSquare.y, 1);
            for (let i = 0; i < trailCells.length; i++) {
                const key = trailCells[i].x + "," + trailCells[i].y;
                if (!targets.has(key)) targets.set(key, (trailCells.length - i) / (trailCells.length + 1));
            }
            for (const [key] of targets) {
                if (!cellOpacities.has(key)) cellOpacities.set(key, 0);
            }
            for (const [key, opacity] of cellOpacities) {
                const target = targets.get(key) || 0;
                const next = opacity + (target - opacity) * 0.18;
                if (next < 0.004) cellOpacities.delete(key);
                else cellOpacities.set(key, next);
            }
        };

        const animate = () => {
            gridOffset.x = (gridOffset.x - speed + squareSize) % squareSize;
            gridOffset.y = (gridOffset.y - speed + squareSize) % squareSize;
            updateCellOpacities();
            drawGrid();
            requestAnimationFrame(animate);
        };

        const getCell = (mouseX, mouseY) => {
            const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
            const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
            return {
                x: Math.floor((mouseX - offsetX) / squareSize),
                y: Math.floor((mouseY - offsetY) / squareSize)
            };
        };

        crtScreen.addEventListener("mousemove", e => {
            const rect = crtScreen.getBoundingClientRect();
            const cell = getCell(e.clientX - rect.left, e.clientY - rect.top);
            if (!hoveredSquare || hoveredSquare.x !== cell.x || hoveredSquare.y !== cell.y) {
                if (hoveredSquare) {
                    trailCells.unshift({ ...hoveredSquare });
                    if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
                }
                hoveredSquare = cell;
            }
        });
        crtScreen.addEventListener("mouseleave", () => {
            if (hoveredSquare) { trailCells.unshift({ ...hoveredSquare }); if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount; }
            hoveredSquare = null;
        });

        animate();
    }
    initShapeGrid();

    // --------------------------------------------------------
    // SECTION FADE-IN ANIMATIONS
    // --------------------------------------------------------
    const sections = document.querySelectorAll('.content-section');
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                gsap.fromTo(entry.target,
                    { opacity: 0, y: 40 },
                    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
                );
                sectionObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05 });
    sections.forEach(s => { s.style.opacity = '0'; sectionObserver.observe(s); });

}); // END DOMContentLoaded


