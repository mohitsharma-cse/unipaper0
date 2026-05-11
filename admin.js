document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------
    // API HELPERS
    // --------------------------------------------------------
    const API_BASE_URL = '';

    const statusBox = document.getElementById('admin-status');
    const loginPanel = document.getElementById('login-panel');
    const dashboard = document.getElementById('admin-dashboard');
    const logoutButton = document.getElementById('admin-logout-btn');
    const foldersList = document.getElementById('folders-list');
    const folderParent = document.getElementById('folder-parent');
    const fileFolder = document.getElementById('file-folder');
    const filesList = document.getElementById('admin-files-list');
    const reviewsList = document.getElementById('admin-reviews-list');
    const adminTeamList = document.getElementById('admin-team-list');
    let activeReviewStatus = '';
    let currentAdmin = null;
    let permissionCatalog = [
        'dashboard:read',
        'folders:read',
        'folders:write',
        'folders:delete',
        'files:read',
        'files:write',
        'files:delete',
        'reviews:read',
        'reviews:moderate',
        'admins:read',
        'admins:write',
        'audit:read'
    ];
    let rolePresets = {
        read_only: ['dashboard:read', 'folders:read', 'files:read', 'reviews:read'],
        writer: ['dashboard:read', 'folders:read', 'folders:write', 'files:read', 'files:write', 'reviews:read'],
        manager: ['dashboard:read', 'folders:read', 'folders:write', 'folders:delete', 'files:read', 'files:write', 'files:delete', 'reviews:read', 'reviews:moderate', 'audit:read'],
        admin: ['dashboard:read', 'folders:read', 'folders:write', 'folders:delete', 'files:read', 'files:write', 'files:delete', 'reviews:read', 'reviews:moderate', 'audit:read'],
        super_admin: ['*']
    };

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

    function setStatus(message, state = '') {
        if (!statusBox) return;
        statusBox.textContent = message;
        statusBox.classList.toggle('is-error', state === 'error');
        statusBox.classList.toggle('is-ok', state === 'ok');
    }

    function hasPermission(permission) {
        const permissions = currentAdmin?.permissions || [];
        return currentAdmin?.role === 'super_admin' || permissions.includes('*') || permissions.includes(permission);
    }

    function applyPermissionVisibility() {
        document.querySelectorAll('[data-permission-section]').forEach((section) => {
            const permission = section.dataset.permissionSection;
            section.classList.toggle('admin-hidden', Boolean(permission) && !hasPermission(permission));
        });
    }

    function formatPermission(permission) {
        const [area, action] = permission.split(':');
        return `${area.toUpperCase()} / ${action.toUpperCase()}`;
    }

    function renderPermissionGrid(selected = rolePresets.read_only) {
        const grid = document.getElementById('admin-permission-grid');
        if (!grid) return;
        const selectedSet = new Set(selected.includes('*') ? permissionCatalog : selected);
        const disabled = selected.includes('*');

        grid.innerHTML = permissionCatalog.map((permission) => `
            <label class="admin-permission-pill">
                <input type="checkbox" value="${escapeHtml(permission)}" ${selectedSet.has(permission) ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
                <span>${escapeHtml(formatPermission(permission))}</span>
            </label>
        `).join('');
    }

    function selectedAdminPermissions() {
        const role = document.getElementById('new-admin-role')?.value || 'read_only';
        if (role === 'super_admin') return ['*'];
        return Array.from(document.querySelectorAll('#admin-permission-grid input:checked')).map((input) => input.value);
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

    function apiJson(path, method, body = {}) {
        return apiRequest(path, {
            method,
            body: JSON.stringify(body)
        });
    }

    function showLoggedIn() {
        loginPanel?.classList.add('admin-hidden');
        dashboard?.classList.remove('admin-hidden');
        logoutButton?.classList.remove('admin-hidden');
        applyPermissionVisibility();
        setStatus('', ''); // Clear the checking session message
    }

    function showLoggedOut() {
        loginPanel?.classList.remove('admin-hidden');
        dashboard?.classList.add('admin-hidden');
        logoutButton?.classList.add('admin-hidden');
    }

    function formatDate(value) {
        if (!value) return 'recent';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'recent';
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function renderStats(stats = {}) {
        const grid = document.getElementById('admin-stats-grid');
        if (!grid) return;
        const items = [
            ['Files', stats.totalFiles || 0],
            ['Folders', stats.totalFolders || 0],
            ['Downloads', stats.totalDownloads || 0],
            ['This Month', stats.recentUploads || 0]
        ];
        grid.innerHTML = items.map(([label, value]) => `
            <div class="admin-stat-card">
                <strong>${Number(value).toLocaleString()}</strong>
                <span>${escapeHtml(label)}</span>
            </div>
        `).join('');
    }

    function renderFolderOptions(folders = []) {
        const options = folders.map((folder) => `<option value="${escapeHtml(folder._id)}">${escapeHtml(folder.path || folder.name)}</option>`).join('');
        if (folderParent) {
            folderParent.innerHTML = `<option value="">Root folder</option>${options}`;
        }
        renderCascadingFolderOptions(folders);
    }

    let allAdminFolders = [];
    function renderCascadingFolderOptions(folders) {
        allAdminFolders = folders;
        const container = document.getElementById('cascading-selects');
        if (!container) return;
        
        // Build map for quick lookup
        const folderMap = new Map();
        const rootFolders = [];
        
        folders.forEach(f => {
            f.children = [];
            folderMap.set(f._id, f);
        });
        
        folders.forEach(f => {
            if (f.parent && folderMap.has(f.parent)) {
                folderMap.get(f.parent).children.push(f);
            } else {
                rootFolders.push(f);
            }
        });

        // Store global variables for the form
        window.adminFolderTree = rootFolders;
        window.adminFolderMap = folderMap;
        
        // Reset and render first level
        container.innerHTML = '';
        renderSelectLevel(rootFolders, 0, container);
    }

    function renderSelectLevel(foldersArray, levelIndex, container) {
        // Remove any selects at or after this level
        const existingSelects = Array.from(container.querySelectorAll('select'));
        existingSelects.forEach((sel, idx) => {
            if (idx >= levelIndex) sel.remove();
        });

        // Clear hidden inputs if we change a higher level
        document.getElementById('file-folder').value = '';
        document.getElementById('file-course').value = '';
        document.getElementById('file-semester').value = '';
        document.getElementById('file-subject').value = '';
        document.getElementById('file-category').value = '';

        if (!foldersArray || foldersArray.length === 0) {
            // Leaf node reached! 
            // We can determine the selected folder from the previous select.
            if (levelIndex > 0) {
                const prevSelect = existingSelects[levelIndex - 1];
                if (prevSelect && prevSelect.value) {
                    const selectedFolder = window.adminFolderMap.get(prevSelect.value);
                    if (selectedFolder) fillHiddenFieldsFromFolder(selectedFolder);
                }
            }
            return;
        }

        const select = document.createElement('select');
        select.className = 'admin-select';
        select.style.width = 'auto';
        select.innerHTML = '<option value="">-- Select --</option>' + 
            foldersArray.map(f => `<option value="${escapeHtml(f._id)}">${escapeHtml(f.name)}</option>`).join('');
        
        select.addEventListener('change', (e) => {
            const val = e.target.value;
            if (!val) {
                // Remove subsequent selects if they reset this one
                renderSelectLevel([], levelIndex + 1, container);
                return;
            }
            const folder = window.adminFolderMap.get(val);
            if (folder) {
                // Even if it has children, user MIGHT want to upload here, so we set the hidden fields.
                fillHiddenFieldsFromFolder(folder);
                renderSelectLevel(folder.children, levelIndex + 1, container);
            }
        });

        container.appendChild(select);
    }

    function fillHiddenFieldsFromFolder(folder) {
        document.getElementById('file-folder').value = folder._id;
        const parts = (folder.path || folder.name).split('/').map(s => s.trim());
        
        let category = 'Notes'; // Default to satisfy Mongoose enum
        const validCategories = ['Notes', 'Assignments', 'PYQ', 'Syllabus'];
        for (const p of parts) {
            const matched = validCategories.find(c => c.toLowerCase() === p.toLowerCase());
            if (matched) category = matched;
        }

        document.getElementById('file-course').value = parts[0] || 'B.Tech';
        document.getElementById('file-semester').value = parts.length > 1 ? parts[1] : 'General';
        document.getElementById('file-subject').value = parts.length > 2 ? parts[2] : 'General';
        document.getElementById('file-category').value = category;
    }

    function renderManageSelectLevel(foldersArray, levelIndex, container) {
        const existingSelects = Array.from(container.querySelectorAll('select'));
        existingSelects.forEach((sel, idx) => {
            if (idx >= levelIndex) sel.remove();
        });

        document.getElementById('manage-file-folder').value = '';

        if (!foldersArray || foldersArray.length === 0) {
            if (levelIndex > 0) {
                const prevSelect = existingSelects[levelIndex - 1];
                if (prevSelect && prevSelect.value) {
                    document.getElementById('manage-file-folder').value = prevSelect.value;
                }
            }
            loadFiles();
            return;
        }

        const select = document.createElement('select');
        select.className = 'admin-select';
        select.style.width = 'auto';
        select.innerHTML = '<option value="">-- Select --</option>' + 
            foldersArray.map(f => `<option value="${escapeHtml(f._id)}">${escapeHtml(f.name)}</option>`).join('');
        
        select.addEventListener('change', (e) => {
            const val = e.target.value;
            if (!val) {
                if (levelIndex > 0) {
                    document.getElementById('manage-file-folder').value = existingSelects[levelIndex - 1].value;
                }
                renderManageSelectLevel([], levelIndex + 1, container);
                return;
            }
            const folder = window.adminFolderMap.get(val);
            if (folder) {
                document.getElementById('manage-file-folder').value = folder._id;
                renderManageSelectLevel(folder.children, levelIndex + 1, container);
            }
            loadFiles();
        });

        container.appendChild(select);
    }

    function renderFolders(folders = []) {
        if (!foldersList) return;
        if (!folders.length) {
            foldersList.innerHTML = '<div class="admin-list-item"><div class="admin-list-meta">No folders yet. Create B.Tech, semesters, subjects, and categories first.</div></div>';
            return;
        }
        const canRename = hasPermission('folders:write');
        const canDelete = hasPermission('folders:delete');
        foldersList.innerHTML = folders.map((folder) => `
            <article class="admin-list-item">
                <div class="admin-list-item-head">
                    <div>
                        <div class="admin-list-title">${escapeHtml(folder.name)}</div>
                        <div class="admin-list-meta">${escapeHtml(folder.path)} / ${escapeHtml(folder.type)}</div>
                    </div>
                    <div class="admin-mini-actions">
                        ${canRename ? `<button class="admin-mini-btn yellow" type="button" data-rename-folder="${escapeHtml(folder._id)}" data-folder-name="${escapeHtml(folder.name)}">RENAME</button>` : ''}
                        ${canDelete ? `<button class="admin-mini-btn warn" type="button" data-delete-folder="${escapeHtml(folder._id)}">DELETE</button>` : ''}
                    </div>
                </div>
            </article>
        `).join('');
    }

    function renderFiles(files = []) {
        if (!filesList) return;
        if (!files.length) {
            filesList.innerHTML = '<div class="admin-list-item"><div class="admin-list-meta">No files found.</div></div>';
            return;
        }
        const canRename = hasPermission('files:write');
        const canDelete = hasPermission('files:delete');
        filesList.innerHTML = files.map((file) => `
            <article class="admin-list-item">
                <div class="admin-list-item-head">
                    <div>
                        <div class="admin-list-title">${escapeHtml(file.title)}</div>
                        <div class="admin-list-meta">
                            ${escapeHtml(file.category)} / ${escapeHtml(file.subject)} / ${escapeHtml(file.semester)}<br>
                            ${escapeHtml(file.folderId?.path || 'No folder')} / ${Number(file.downloads || 0).toLocaleString()} downloads / ${formatDate(file.createdAt)}
                        </div>
                    </div>
                    <div class="admin-mini-actions">
                        <button class="admin-mini-btn ok" type="button" data-open-url="${escapeHtml(file.pdfUrl)}">VIEW</button>
                        ${canRename ? `<button class="admin-mini-btn yellow" type="button" data-rename-file="${escapeHtml(file._id)}" data-file-title="${escapeHtml(file.title)}">RENAME</button>` : ''}
                        ${canDelete ? `<button class="admin-mini-btn warn" type="button" data-delete-file="${escapeHtml(file._id)}">DELETE</button>` : ''}
                    </div>
                </div>
            </article>
        `).join('');
    }

    function renderReviews(reviews = []) {
        if (!reviewsList) return;
        if (!reviews.length) {
            reviewsList.innerHTML = '<div class="admin-list-item"><div class="admin-list-meta">No reviews in this filter.</div></div>';
            return;
        }
        const canModerate = hasPermission('reviews:moderate');
        reviewsList.innerHTML = reviews.map((review) => `
            <article class="admin-list-item">
                <div class="admin-list-item-head">
                    <div>
                        <div class="admin-list-title">${escapeHtml(review.name)}</div>
                        <div class="admin-list-meta">${escapeHtml(review.role)} / ${escapeHtml(review.status)} / ${formatDate(review.createdAt)}</div>
                        <div class="admin-list-meta">"${escapeHtml(review.quote)}"</div>
                    </div>
                    <div class="admin-mini-actions">
                        ${canModerate && review.status !== 'approved' ? `<button class="admin-mini-btn ok" type="button" data-review-status="approved" data-review-id="${escapeHtml(review._id)}">APPROVE</button>` : ''}
                        ${canModerate && review.status !== 'rejected' ? `<button class="admin-mini-btn" type="button" data-review-status="rejected" data-review-id="${escapeHtml(review._id)}">REJECT</button>` : ''}
                        ${canModerate ? `<button class="admin-mini-btn warn" type="button" data-delete-review="${escapeHtml(review._id)}">DELETE</button>` : ''}
                    </div>
                </div>
            </article>
        `).join('');
    }

    function renderAdmins(admins = []) {
        if (!adminTeamList) return;
        if (!admins.length) {
            adminTeamList.innerHTML = '<div class="admin-list-item"><div class="admin-list-meta">No admin accounts found.</div></div>';
            return;
        }

        const canManageAdmins = hasPermission('admins:write');
        adminTeamList.innerHTML = admins.map((admin) => {
            const isSelf = currentAdmin && String(admin.id) === String(currentAdmin.id);
            const permissions = admin.permissions?.includes('*') ? ['FULL POWER'] : (admin.permissions || []).map(formatPermission);
            return `
                <article class="admin-list-item admin-account-card">
                    <div class="admin-list-item-head">
                        <div>
                            <div class="admin-list-title">${escapeHtml(admin.username)} <span class="admin-role-badge">${escapeHtml(admin.role.replaceAll('_', ' ').toUpperCase())}</span></div>
                            <div class="admin-list-meta">${escapeHtml(admin.email)} / ${escapeHtml(admin.status)} / last login ${formatDate(admin.lastLoginAt)}</div>
                            <div class="admin-permission-summary">
                                ${permissions.slice(0, 8).map((permission) => `<span>${escapeHtml(permission)}</span>`).join('')}
                                ${permissions.length > 8 ? `<span>+${permissions.length - 8} more</span>` : ''}
                            </div>
                        </div>
                        <div class="admin-mini-actions">
                            ${canManageAdmins ? `<button class="admin-mini-btn" type="button" data-admin-preset="read_only" data-admin-id="${escapeHtml(admin.id)}">READ ONLY</button>` : ''}
                            ${canManageAdmins ? `<button class="admin-mini-btn yellow" type="button" data-admin-preset="writer" data-admin-id="${escapeHtml(admin.id)}">WRITER</button>` : ''}
                            ${canManageAdmins ? `<button class="admin-mini-btn ok" type="button" data-admin-preset="manager" data-admin-id="${escapeHtml(admin.id)}">MANAGER</button>` : ''}
                            ${canManageAdmins ? `<button class="admin-mini-btn ok" type="button" data-admin-preset="super_admin" data-admin-id="${escapeHtml(admin.id)}">FULL</button>` : ''}
                            ${canManageAdmins && !isSelf ? `<button class="admin-mini-btn" type="button" data-admin-toggle-status="${escapeHtml(admin.id)}" data-admin-status="${admin.status === 'active' ? 'suspended' : 'active'}">${admin.status === 'active' ? 'SUSPEND' : 'ACTIVATE'}</button>` : ''}
                            ${canManageAdmins && !isSelf ? `<button class="admin-mini-btn warn" type="button" data-delete-admin="${escapeHtml(admin.id)}">DELETE</button>` : ''}
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    async function loadStats() {
        const data = await apiGet('/api/admin/stats');
        renderStats(data.stats);
    }

    async function loadFolders() {
        const data = await apiGet('/api/admin/folders');
        const folders = data.folders || [];
        renderFolderOptions(folders);
        renderFolders(folders);
        renderCascadingFolderOptions(folders);
        
        // Also initialize manage container if present
        const manageContainer = document.getElementById('manage-cascading-selects');
        if (manageContainer && window.adminFolderTree) {
            manageContainer.innerHTML = '';
            renderManageSelectLevel(window.adminFolderTree, 0, manageContainer);
        }
    }

    async function loadFiles() {
        const search = document.getElementById('admin-file-search')?.value.trim() || '';
        const folderId = document.getElementById('manage-file-folder')?.value || '';
        const data = await apiGet('/api/admin/files', { limit: 50, search, folderId });
        renderFiles(data.files);
    }

    async function loadReviews() {
        const params = { limit: 50 };
        if (activeReviewStatus) params.status = activeReviewStatus;
        const data = await apiGet('/api/admin/reviews', params);
        renderReviews(data.reviews);
    }

    async function loadAdmins() {
        if (!hasPermission('admins:read')) return;
        const data = await apiGet('/api/admin/admins');
        permissionCatalog = data.permissionCatalog || permissionCatalog;
        rolePresets = data.rolePresets || rolePresets;
        renderPermissionGrid(rolePresets[document.getElementById('new-admin-role')?.value || 'read_only']);
        renderAdmins(data.admins);
    }

    async function loadDashboard() {
        try {
            const tasks = [];
            if (hasPermission('dashboard:read')) tasks.push(loadStats());
            if (hasPermission('folders:read')) tasks.push(loadFolders());
            if (hasPermission('files:read')) tasks.push(loadFiles());
            if (hasPermission('reviews:read')) tasks.push(loadReviews());
            if (hasPermission('admins:read')) tasks.push(loadAdmins());
            await Promise.all(tasks);
        } catch (error) {
            setStatus(error.message || 'Dashboard data failed to load. Please refresh or log in again.', 'error');
        }
    }

    document.getElementById('admin-login-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus('Logging in...');
        try {
            const data = await apiJson('/api/auth/login', 'POST', {
                email: document.getElementById('admin-email').value.trim(),
                password: document.getElementById('admin-password').value
            });
            currentAdmin = data.user;
            showLoggedIn();
            await loadDashboard();
        } catch (error) {
            setStatus(error.message, 'error');
        }
    });

    logoutButton?.addEventListener('click', async () => {
        await apiJson('/api/auth/logout', 'POST');
        location.reload();
    });

    document.getElementById('new-admin-role')?.addEventListener('change', (event) => {
        renderPermissionGrid(rolePresets[event.target.value] || rolePresets.read_only);
    });

    document.getElementById('admin-team-refresh')?.addEventListener('click', () => {
        loadAdmins().catch((error) => setStatus(error.message, 'error'));
    });

    document.getElementById('admin-create-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!hasPermission('admins:write')) {
            setStatus('You do not have permission to create admins.', 'error');
            return;
        }

        const body = {
            username: document.getElementById('new-admin-username').value.trim(),
            email: document.getElementById('new-admin-email').value.trim(),
            password: document.getElementById('new-admin-password').value,
            role: document.getElementById('new-admin-role').value,
            permissions: selectedAdminPermissions(),
            status: 'active'
        };

        setStatus('Creating admin account...');
        try {
            await apiJson('/api/admin/admins', 'POST', body);
            event.target.reset();
            renderPermissionGrid(rolePresets.read_only);
            await loadAdmins();
            setStatus('Admin account created.', 'ok');
        } catch (error) {
            setStatus(error.message, 'error');
        }
    });

    adminTeamList?.addEventListener('click', async (event) => {
        const presetButton = event.target.closest('[data-admin-preset]');
        const statusButton = event.target.closest('[data-admin-toggle-status]');
        const deleteButton = event.target.closest('[data-delete-admin]');

        try {
            if (presetButton) {
                const role = presetButton.dataset.adminPreset;
                if (role === 'super_admin' && currentAdmin?.role !== 'super_admin') {
                    setStatus('Only a super admin can grant full power.', 'error');
                    return;
                }
                setStatus('Updating admin powers...');
                await apiJson(`/api/admin/admins/${presetButton.dataset.adminId}`, 'PUT', {
                    role,
                    permissions: rolePresets[role] || rolePresets.read_only
                });
                await loadAdmins();
                setStatus('Admin powers updated.', 'ok');
                return;
            }

            if (statusButton) {
                setStatus('Updating admin status...');
                await apiJson(`/api/admin/admins/${statusButton.dataset.adminToggleStatus}`, 'PUT', {
                    status: statusButton.dataset.adminStatus
                });
                await loadAdmins();
                setStatus('Admin status updated.', 'ok');
                return;
            }

            if (deleteButton) {
                if (!confirm('Delete this admin account?')) return;
                setStatus('Deleting admin account...');
                await apiJson(`/api/admin/admins/${deleteButton.dataset.deleteAdmin}`, 'DELETE');
                await loadAdmins();
                setStatus('Admin account deleted.', 'ok');
            }
        } catch (error) {
            setStatus(error.message, 'error');
        }
    });

    document.getElementById('folder-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const body = {
            name: document.getElementById('folder-name').value.trim(),
            type: document.getElementById('folder-type').value,
            parent: document.getElementById('folder-parent').value || null,
            icon: document.getElementById('folder-icon')?.value.trim() || '<i class="fa-solid fa-folder"></i>'
        };
        setStatus('Creating folder...');
        try {
            await apiJson('/api/admin/folders', 'POST', body);
            event.target.reset();
            await loadFolders();
            setStatus('Folder created.', 'ok');
        } catch (error) {
            setStatus(error.message, 'error');
        }
    });

    foldersList?.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('[data-delete-folder]');
        const renameButton = event.target.closest('[data-rename-folder]');
        
        if (renameButton) {
            const oldName = renameButton.dataset.folderName;
            const newName = prompt('Enter new folder name:', oldName);
            if (!newName || newName === oldName) return;
            
            setStatus('Renaming folder...');
            try {
                await apiJson(`/api/admin/folders/${renameButton.dataset.renameFolder}`, 'PUT', { name: newName });
                await loadFolders();
                setStatus('Folder renamed.', 'ok');
            } catch (error) {
                setStatus(error.message, 'error');
            }
            return;
        }

        if (deleteButton) {
            if (!confirm('Delete this folder AND all its contents? This cannot be undone.')) return;
            setStatus('Deleting folder...');
            try {
                await apiJson(`/api/admin/folders/${deleteButton.dataset.deleteFolder}`, 'DELETE');
                await Promise.all([loadFolders(), loadStats(), loadFiles()]);
                setStatus('Folder deleted.', 'ok');
            } catch (error) {
                setStatus(error.message, 'error');
            }
        }
    });

    document.getElementById('file-upload-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const fileInput = document.getElementById('file-pdf');
        const pdf = fileInput.files[0];
        
        if (!document.getElementById('file-folder').value) {
            setStatus('Please select a folder hierarchy for the file.', 'error');
            return;
        }

        if (!pdf) {
            setStatus('Choose a PDF before upload.', 'error');
            return;
        }
        const formData = new FormData();
        formData.append('title', document.getElementById('file-title').value.trim());
        formData.append('course', document.getElementById('file-course').value.trim() || 'B.Tech');
        formData.append('semester', document.getElementById('file-semester').value.trim());
        formData.append('subject', document.getElementById('file-subject').value.trim());
        formData.append('category', document.getElementById('file-category').value);
        formData.append('folderId', document.getElementById('file-folder').value);
        formData.append('tags', document.getElementById('file-tags').value.trim());
        formData.append('pdf', pdf);

        setStatus('Uploading PDF to UploadThing...');
        try {
            await apiRequest('/api/admin/files', { method: 'POST', body: formData });
            event.target.reset();
            // Also reset cascading folders visually
            const container = document.getElementById('cascading-selects');
            if (container && window.adminFolderTree) {
                container.innerHTML = '';
                renderSelectLevel(window.adminFolderTree, 0, container);
            }
            
            await Promise.all([loadFiles(), loadStats()]);
            setStatus('PDF uploaded and saved in MongoDB.', 'ok');
        } catch (error) {
            setStatus(error.message, 'error');
        }
    });

    const fileSearchInput = document.getElementById('admin-file-search');
    let fileSearchTimer = null;
    fileSearchInput?.addEventListener('input', () => {
        if (fileSearchTimer) clearTimeout(fileSearchTimer);
        fileSearchTimer = setTimeout(() => {
            loadFiles().catch((error) => setStatus(error.message, 'error'));
        }, 350);
    });
    document.getElementById('admin-files-refresh')?.addEventListener('click', () => {
        loadFiles().catch((error) => setStatus(error.message, 'error'));
    });
    fileSearchInput?.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (fileSearchTimer) clearTimeout(fileSearchTimer);
            loadFiles().catch((error) => setStatus(error.message, 'error'));
        }
    });

    filesList?.addEventListener('click', async (event) => {
        const openButton = event.target.closest('[data-open-url]');
        const deleteButton = event.target.closest('[data-delete-file]');
        const renameButton = event.target.closest('[data-rename-file]');
        
        if (openButton) {
            window.open(openButton.dataset.openUrl, '_blank', 'noopener');
            return;
        }
        
        if (renameButton) {
            const oldTitle = renameButton.dataset.fileTitle;
            const newTitle = prompt('Enter new file title:', oldTitle);
            if (!newTitle || newTitle === oldTitle) return;
            
            setStatus('Renaming file...');
            try {
                await apiJson(`/api/admin/files/${renameButton.dataset.renameFile}`, 'PUT', { title: newTitle });
                await loadFiles();
                setStatus('File renamed.', 'ok');
            } catch (error) {
                setStatus(error.message, 'error');
            }
            return;
        }

        if (!deleteButton) return;
        if (!confirm('Delete this PDF from database and storage?')) return;
        setStatus('Deleting file...');
        try {
            await apiJson(`/api/admin/files/${deleteButton.dataset.deleteFile}`, 'DELETE');
            await Promise.all([loadFiles(), loadStats()]);
            setStatus('File deleted.', 'ok');
        } catch (error) {
            setStatus(error.message, 'error');
        }
    });

    document.getElementById('review-tabs')?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-status]');
        if (!button) return;
        activeReviewStatus = button.dataset.status || '';
        document.querySelectorAll('.admin-tab').forEach((tab) => tab.classList.toggle('is-active', tab === button));
        loadReviews().catch((error) => setStatus(error.message, 'error'));
    });

    // Review Moderation Actions (Event Delegation)
    document.addEventListener('click', async (event) => {
        const statusButton = event.target.closest('[data-review-status]');
        const deleteButton = event.target.closest('[data-delete-review]');
        
        if (!statusButton && !deleteButton) return;

        try {
            if (statusButton) {
                const reviewId = statusButton.dataset.reviewId;
                const newStatus = statusButton.dataset.reviewStatus;
                setStatus('Updating review...');
                await apiJson(`/api/admin/reviews/${reviewId}`, 'PATCH', { status: newStatus });
                await loadReviews();
                setStatus(`Review marked as ${newStatus}.`, 'ok');
            } else if (deleteButton) {
                const reviewId = deleteButton.dataset.deleteReview;
                if (!confirm('Are you sure you want to permanently delete this review?')) return;
                setStatus('Deleting review...');
                await apiRequest(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
                await loadReviews();
                setStatus('Review deleted successfully.', 'ok');
            }
        } catch (error) {
            setStatus(error.message, 'error');
        }
    });

    // Icon Picker UI
    const iconModal = document.getElementById('icon-picker-modal');
    const openIconPicker = document.getElementById('open-icon-picker');
    const closeIconPicker = document.getElementById('close-icon-picker');
    const iconGrid = document.getElementById('icon-grid');
    const folderIconInput = document.getElementById('folder-icon');
    const selectedIconPreview = document.getElementById('selected-icon-preview');

    const unipaperIcons = [
        'fa-graduation-cap', 'fa-school', 'fa-book', 'fa-book-open', 'fa-file-pdf', 'fa-folder', 'fa-folder-tree', 'fa-layer-group', 'fa-magnifying-glass', 'fa-filter', 'fa-tags', 'fa-download', 'fa-eye', 'fa-cloud-arrow-up', 'fa-cloud-arrow-down', 'fa-database',
        'fa-code', 'fa-laptop-code', 'fa-server', 'fa-microchip', 'fa-network-wired', 'fa-terminal', 'fa-bug', 'fa-shield-halved', 'fa-user-shield', 'fa-user-plus', 'fa-user-pen', 'fa-user-lock', 'fa-users-gear', 'fa-key', 'fa-lock', 'fa-unlock',
        'fa-chart-line', 'fa-chart-pie', 'fa-chart-simple', 'fa-square-poll-vertical', 'fa-gauge-high', 'fa-clock', 'fa-calendar-days', 'fa-bell', 'fa-atom', 'fa-flask', 'fa-dna', 'fa-calculator', 'fa-square-root-variable', 'fa-compass-drafting', 'fa-gears', 'fa-wrench',
        'fa-brain', 'fa-robot', 'fa-lightbulb', 'fa-rocket', 'fa-wand-magic-sparkles', 'fa-star', 'fa-fire', 'fa-circle-check', 'fa-clipboard-list', 'fa-list-check', 'fa-pen-to-square', 'fa-trash-can', 'fa-arrows-rotate', 'fa-box-archive', 'fa-copy', 'fa-share-nodes'
    ];

    if (iconModal && openIconPicker) {
        unipaperIcons.forEach(icon => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'icon-grid-btn';
            btn.style.cssText = 'background:#1a1a1a; border:1px solid #333; color:#ffcc00; font-size:20px; padding:15px 10px; cursor:pointer; border-radius:4px; transition:all 0.2s;';
            btn.innerHTML = `<i class="fa-solid ${icon}"></i>`;
            btn.onclick = () => {
                const iconHtml = `<i class="fa-solid ${icon}"></i>`;
                folderIconInput.value = iconHtml;
                selectedIconPreview.innerHTML = iconHtml;
                iconModal.style.display = 'none';
            };
            btn.onmouseover = () => { btn.style.background = '#333'; btn.style.borderColor = '#ffcc00'; };
            btn.onmouseout = () => { btn.style.background = '#1a1a1a'; btn.style.borderColor = '#333'; };
            iconGrid.appendChild(btn);
        });

        openIconPicker.onclick = () => { iconModal.style.display = 'flex'; };
        closeIconPicker.onclick = () => { iconModal.style.display = 'none'; };
        window.onclick = (e) => { if (e.target === iconModal) iconModal.style.display = 'none'; };
    }


    async function boot() {
        try {
            await apiGet('/api/ready');
            setStatus('Backend is online. Checking admin session...', 'ok');
            try {
                const data = await apiGet('/api/auth/me');
                currentAdmin = data.user;
            } catch (error) {
                showLoggedOut();
                setStatus('Backend is online. Login as admin to manage files.', 'ok');
                return;
            }
            showLoggedIn();
            await loadDashboard();
        } catch (error) {
            showLoggedOut();
            setStatus('Backend is offline. Start it with npm run start:backend.', 'error');
        }
    }

    renderPermissionGrid(rolePresets.read_only);
    boot();
});
