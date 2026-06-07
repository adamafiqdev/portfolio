/* ============================================================
   MANAGE.JS — Project Manager (localStorage CRUD + JSON Export)
============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'portfolio_projects';

  const CATEGORIES = [
    { key: 'monitoring', label: 'Monitoring' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'internal-tools', label: 'Internal Tools' },
    { key: 'web-app', label: 'Web Application' },
    { key: 'automation', label: 'Automation' },
    { key: 'reporting', label: 'Reporting' },
    { key: 'other', label: 'Other' },
  ];

  let projects = [];
  let selectedId = null;
  let editingTechTags = [];
  let editingScreenshots = [];
  let sidebarSearch = '';
  let pendingDeleteId = null;

  // ── Storage ───────────────────────────────────────────────
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        projects = JSON.parse(raw);
        return;
      }
    } catch (_) {}

    fetch('data/projects.json')
      .then(r => r.json())
      .then(data => {
        projects = data.projects || [];
        save();
        renderSidebar();
        showWelcome();
      })
      .catch(() => { projects = []; });
  }

  // ── Helpers ───────────────────────────────────────────────
  function generateId() {
    return 'project-' + Date.now().toString(36);
  }

  function getCategoryLabel(key) {
    return CATEGORIES.find(c => c.key === key)?.label || key;
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  // ── Sidebar ───────────────────────────────────────────────
  function renderSidebar() {
    const list = document.getElementById('projectList');
    const countEl = document.getElementById('projectCount');
    if (!list) return;

    const filtered = projects.filter(p =>
      !sidebarSearch || p.title.toLowerCase().includes(sidebarSearch.toLowerCase())
    );

    if (countEl) countEl.textContent = `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`;

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-list">
          <p>📂</p>
          <p>${sidebarSearch ? 'No projects match your search' : 'No projects yet.<br>Click "Add Project" to start.'}</p>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(p => {
      const thumb = p.coverImage
        ? `<img src="${p.coverImage}" alt="" onerror="this.style.display='none'">`
        : '💻';
      return `
        <div class="project-list-item${p.id === selectedId ? ' active' : ''}" data-id="${p.id}">
          <div class="project-list-thumb">${thumb}</div>
          <div class="project-list-info">
            <div class="project-list-title">${p.title}</div>
            <div class="project-list-cat">${getCategoryLabel(p.category)}</div>
          </div>
          <div class="project-list-actions">
            <button class="icon-btn danger" data-action="delete" data-id="${p.id}" title="Delete project">
              ${iconTrash()}
            </button>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.project-list-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('[data-action]')) return;
        selectProject(item.dataset.id);
      });
    });

    list.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        confirmDelete(btn.dataset.id);
      });
    });
  }

  function selectProject(id) {
    selectedId = id;
    const project = projects.find(p => p.id === id);
    renderSidebar();
    if (project) showEditForm(project);
  }

  // ── Welcome / Empty State ─────────────────────────────────
  function showWelcome() {
    const panel = document.getElementById('managePanel');
    if (!panel) return;
    selectedId = null;
    renderSidebar();
    panel.innerHTML = `
      <div class="welcome-screen">
        <div class="welcome-icon">🗂️</div>
        <h2 class="welcome-title">Portfolio Project Manager</h2>
        <p class="welcome-desc">Select a project from the sidebar to edit it, or click <strong>Add Project</strong> to create a new one.</p>
        <button class="btn btn-primary" id="welcomeAddBtn">
          ${iconPlus()} Add Project
        </button>
      </div>`;
    document.getElementById('welcomeAddBtn')?.addEventListener('click', showNewForm);
  }

  // ── Forms ─────────────────────────────────────────────────
  function showNewForm() {
    selectedId = null;
    renderSidebar();
    renderForm(null);
  }

  function showEditForm(project) {
    renderForm(project);
  }

  function renderForm(project) {
    const panel = document.getElementById('managePanel');
    if (!panel) return;

    const isNew = !project;
    editingTechTags = project ? [...(project.technologies || [])] : [];
    editingScreenshots = project ? [...(project.screenshots || [])] : [];
    const cover = project?.coverImage || '';
    if (cover && !editingScreenshots.includes(cover) && cover) {
      editingScreenshots.unshift(cover);
    }

    const categoryOptions = CATEGORIES.map(c =>
      `<option value="${c.key}"${project?.category === c.key ? ' selected' : ''}>${c.label}</option>`
    ).join('');

    panel.innerHTML = `
      <div class="manage-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">${isNew ? 'New Project' : 'Edit Project'}</h2>
            <p class="panel-subtitle">${isNew ? 'Fill in the details below to add a new project' : `Editing: ${project.title}`}</p>
          </div>
          ${!isNew ? `<button class="btn btn-danger btn-sm" id="deleteBtn">${iconTrash()} Delete</button>` : ''}
        </div>

        <form id="projectForm" novalidate>
          <!-- Basic Info -->
          <div class="form-section">
            <div class="form-section-title">Basic Information</div>
            <div class="form-group">
              <label class="form-label" for="f-title">Project Title <span class="required">*</span></label>
              <input class="form-control" id="f-title" type="text" placeholder="e.g. Network Monitoring Dashboard" value="${project?.title || ''}" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="f-category">Category</label>
                <select class="form-control" id="f-category">${categoryOptions}</select>
              </div>
              <div class="form-group">
                <label class="form-label" for="f-date">Date (YYYY-MM)</label>
                <input class="form-control" id="f-date" type="text" placeholder="e.g. 2024-03" value="${project?.date || ''}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="f-desc">Short Description <span class="required">*</span></label>
              <textarea class="form-control" id="f-desc" rows="2" placeholder="One or two sentences shown on the project card...">${project?.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="f-longdesc">Full Description</label>
              <textarea class="form-control" id="f-longdesc" rows="4" placeholder="Detailed description shown in the project modal...">${project?.longDescription || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="f-features">Key Features (one per line)</label>
              <textarea class="form-control" id="f-features" rows="4" placeholder="Real-time monitoring&#10;Automated alerting&#10;Historical trend analysis">${(project?.features || []).join('\n')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="f-featured">
                <input type="checkbox" id="f-featured" style="margin-right:6px" ${project?.featured ? 'checked' : ''}>
                Featured project (shown prominently)
              </label>
            </div>
          </div>

          <!-- Images -->
          <div class="form-section">
            <div class="form-section-title">Project Images</div>
            <div class="instruction-box" style="margin-bottom:14px">
              <strong>How images work:</strong> Enter the relative path to your image file (e.g., <code>assets/projects/project-1/cover.jpg</code>).
              Physically place your image files in the <code>assets/projects/</code> folder before pushing to GitHub.
              The first image is used as the cover image.
            </div>
            <div class="images-manager" id="imagesManager"></div>
            <button type="button" class="add-image-btn" id="addImageBtn" style="margin-top:8px">
              ${iconPlus()} Add Image Path
            </button>
          </div>

          <!-- Tech Stack -->
          <div class="form-section">
            <div class="form-section-title">Technology Stack</div>
            <div class="tech-builder">
              <div class="tech-input-row">
                <input class="tech-input" id="techInput" type="text" placeholder="e.g. JavaScript, PHP, MySQL...">
                <button type="button" class="btn btn-secondary btn-sm" id="addTechBtn">${iconPlus()} Add</button>
              </div>
              <div class="tech-tags-display" id="techTagsDisplay"></div>
            </div>
          </div>

          <!-- Links -->
          <div class="form-section">
            <div class="form-section-title">Project Links</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="f-github">GitHub URL</label>
                <input class="form-control" id="f-github" type="url" placeholder="https://github.com/..." value="${project?.githubUrl || ''}">
              </div>
              <div class="form-group">
                <label class="form-label" for="f-demo">Live Demo URL</label>
                <input class="form-control" id="f-demo" type="url" placeholder="https://..." value="${project?.demoUrl || ''}">
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="form-section">
            <div class="form-section-title">Display Tags</div>
            <div class="form-group">
              <label class="form-label" for="f-tags">Tags (comma-separated)</label>
              <input class="form-control" id="f-tags" type="text" placeholder="e.g. Dashboard, Real-time, Monitoring" value="${(project?.tags || []).join(', ')}">
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              ${iconSave()} ${isNew ? 'Create Project' : 'Save Changes'}
            </button>
            <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
          </div>
        </form>
      </div>`;

    // Render images and tags
    renderImagesManager();
    renderTechTags();

    // Events
    document.getElementById('addImageBtn')?.addEventListener('click', addImageEntry);
    document.getElementById('addTechBtn')?.addEventListener('click', addTechTag);
    document.getElementById('techInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addTechTag(); }
    });
    document.getElementById('cancelBtn')?.addEventListener('click', () => {
      if (selectedId) {
        const p = projects.find(p => p.id === selectedId);
        if (p) showEditForm(p);
      } else {
        showWelcome();
      }
    });
    document.getElementById('deleteBtn')?.addEventListener('click', () => {
      if (project) confirmDelete(project.id);
    });
    document.getElementById('projectForm')?.addEventListener('submit', handleFormSubmit);
  }

  // ── Images Manager ────────────────────────────────────────
  function renderImagesManager() {
    const container = document.getElementById('imagesManager');
    if (!container) return;

    container.innerHTML = editingScreenshots.map((path, i) => `
      <div class="image-entry" data-index="${i}">
        <div class="image-preview">
          <img src="${path}" alt="" onerror="this.style.display='none'">
          ${!path ? '🖼️' : ''}
        </div>
        ${i === 0 ? `<span class="image-type-badge">COVER</span>` : `<span class="image-type-badge" style="background:var(--bg-primary);color:var(--text-muted)">IMG ${i + 1}</span>`}
        <input class="image-path-input" type="text" placeholder="assets/projects/project-id/image.jpg" value="${path}" data-index="${i}">
        <button type="button" class="icon-btn danger" data-remove="${i}" title="Remove image">${iconTrash()}</button>
      </div>`).join('');

    container.querySelectorAll('.image-path-input').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.index, 10);
        editingScreenshots[idx] = input.value.trim();
        const preview = input.closest('.image-entry').querySelector('.image-preview img');
        if (preview) { preview.src = input.value; preview.style.display = ''; }
      });
    });

    container.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.remove, 10);
        editingScreenshots.splice(idx, 1);
        renderImagesManager();
      });
    });
  }

  function addImageEntry() {
    editingScreenshots.push('');
    renderImagesManager();
    const inputs = document.querySelectorAll('.image-path-input');
    inputs[inputs.length - 1]?.focus();
  }

  // ── Tech Tags ─────────────────────────────────────────────
  function renderTechTags() {
    const display = document.getElementById('techTagsDisplay');
    if (!display) return;
    display.innerHTML = editingTechTags.map((tag, i) => `
      <span class="tech-tag-pill">
        ${tag}
        <button type="button" data-remove="${i}" title="Remove">×</button>
      </span>`).join('');

    display.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        editingTechTags.splice(parseInt(btn.dataset.remove, 10), 1);
        renderTechTags();
      });
    });
  }

  function addTechTag() {
    const input = document.getElementById('techInput');
    if (!input) return;
    const values = input.value.split(',').map(v => v.trim()).filter(Boolean);
    values.forEach(v => { if (!editingTechTags.includes(v)) editingTechTags.push(v); });
    input.value = '';
    renderTechTags();
    input.focus();
  }

  // ── Form Submit ───────────────────────────────────────────
  function handleFormSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('f-title')?.value.trim();
    const desc = document.getElementById('f-desc')?.value.trim();

    if (!title) {
      document.getElementById('f-title')?.classList.add('error');
      showToast('Project title is required', 'error');
      return;
    }

    document.getElementById('f-title')?.classList.remove('error');

    const coverImage = editingScreenshots[0] || '';
    const screenshots = [...editingScreenshots];

    const project = {
      id: selectedId || generateId(),
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      category: document.getElementById('f-category')?.value || 'other',
      date: document.getElementById('f-date')?.value.trim() || '',
      description: desc,
      longDescription: document.getElementById('f-longdesc')?.value.trim() || '',
      features: (document.getElementById('f-features')?.value || '')
        .split('\n').map(l => l.trim()).filter(Boolean),
      featured: document.getElementById('f-featured')?.checked || false,
      coverImage,
      screenshots,
      technologies: [...editingTechTags],
      tags: (document.getElementById('f-tags')?.value || '')
        .split(',').map(t => t.trim()).filter(Boolean),
      githubUrl: document.getElementById('f-github')?.value.trim() || '',
      demoUrl: document.getElementById('f-demo')?.value.trim() || '',
      status: 'completed',
    };

    const existingIdx = projects.findIndex(p => p.id === project.id);
    if (existingIdx >= 0) {
      projects[existingIdx] = project;
      showToast(`"${project.title}" updated successfully`);
    } else {
      projects.push(project);
      showToast(`"${project.title}" created successfully`);
    }

    selectedId = project.id;
    save();
    renderSidebar();
  }

  // ── Delete ────────────────────────────────────────────────
  function confirmDelete(id) {
    pendingDeleteId = id;
    const project = projects.find(p => p.id === id);
    const overlay = document.getElementById('confirmOverlay');
    const titleEl = document.getElementById('confirmTitle');
    const descEl = document.getElementById('confirmDesc');
    if (!overlay) return;
    if (titleEl) titleEl.textContent = 'Delete Project?';
    if (descEl) descEl.textContent = `This will permanently remove "${project?.title || 'this project'}" from your portfolio manager. You can re-add it later.`;
    overlay.classList.add('open');
  }

  function executeDelete() {
    if (!pendingDeleteId) return;
    const project = projects.find(p => p.id === pendingDeleteId);
    projects = projects.filter(p => p.id !== pendingDeleteId);
    save();
    showToast(`"${project?.title || 'Project'}" deleted`);
    if (selectedId === pendingDeleteId) {
      selectedId = null;
      showWelcome();
    } else {
      renderSidebar();
    }
    pendingDeleteId = null;
    document.getElementById('confirmOverlay')?.classList.remove('open');
  }

  // ── JSON Export ───────────────────────────────────────────
  function exportJSON() {
    const data = { projects };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('projects.json downloaded — copy it to your data/ folder');
  }

  // ── JSON Import ───────────────────────────────────────────
  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.projects) throw new Error('Invalid format');
          projects = data.projects;
          save();
          selectedId = null;
          renderSidebar();
          showWelcome();
          showToast(`Imported ${projects.length} project${projects.length !== 1 ? 's' : ''} successfully`);
        } catch (err) {
          showToast('Invalid JSON file — expected { projects: [...] }', 'error');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  // ── Theme Toggle ──────────────────────────────────────────
  const html = document.documentElement;
  const themeBtn = document.getElementById('themeToggleManage');
  const saved = localStorage.getItem('theme') || 'dark';
  html.setAttribute('data-theme', saved);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      themeBtn.title = next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    });
  }

  // ── SVG Icons ─────────────────────────────────────────────
  function iconPlus() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  }
  function iconTrash() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
  }
  function iconSave() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;
  }

  // ── Init ──────────────────────────────────────────────────
  document.getElementById('addProjectBtn')?.addEventListener('click', showNewForm);
  document.getElementById('exportBtn')?.addEventListener('click', exportJSON);
  document.getElementById('importBtn')?.addEventListener('click', importJSON);

  document.getElementById('confirmOk')?.addEventListener('click', executeDelete);
  document.getElementById('confirmCancel')?.addEventListener('click', () => {
    pendingDeleteId = null;
    document.getElementById('confirmOverlay')?.classList.remove('open');
  });

  const sidebarSearchInput = document.getElementById('sidebarSearch');
  sidebarSearchInput?.addEventListener('input', () => {
    sidebarSearch = sidebarSearchInput.value;
    renderSidebar();
  });

  load();
  showWelcome();

})();
