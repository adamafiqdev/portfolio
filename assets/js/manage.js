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
    // Keep the version key in sync so projects.js knows this data is current.
    const v = localStorage.getItem('portfolio_projects_v') || '1';
    localStorage.setItem('portfolio_projects_v', v);
  }

  function load() {
    // Check version against projects.json before trusting localStorage.
    fetch('data/projects.json')
      .then(r => r.json())
      .then(data => {
        const jsonVersion = data._v || 1;
        const storedVersion = parseInt(localStorage.getItem('portfolio_projects_v') || '0', 10);
        const raw = localStorage.getItem(STORAGE_KEY);

        if (raw && storedVersion >= jsonVersion) {
          try {
            projects = JSON.parse(raw);
            renderSidebar();
            showWelcome();
            return;
          } catch (_) {}
        }

        // Re-seed from JSON (first visit or version bump).
        projects = data.projects || [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        localStorage.setItem('portfolio_projects_v', String(jsonVersion));
        renderSidebar();
        showWelcome();
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) projects = JSON.parse(raw);
        } catch (_) { projects = []; }
        renderSidebar();
        showWelcome();
      });
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

  // ── String helpers ────────────────────────────────────────
  function escHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(str) {
    return (str || '').replace(/"/g, '&quot;');
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
  function iconChevUp() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`;
  }
  function iconChevDown() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
  }

  // ══════════════════════════════════════════════════════════
  //  SITE SECTION EDITORS
  // ══════════════════════════════════════════════════════════

  const SITE_KEY   = 'portfolio_site';
  const SITE_V_KEY = 'portfolio_site_v';
  let siteData        = {};
  let siteJsonVersion = 1;
  let currentSection  = 'projects';

  async function loadSiteData() {
    let jsonData = null;
    try {
      const r = await fetch('data/site.json');
      if (r.ok) jsonData = await r.json();
    } catch (_) {}

    siteJsonVersion = jsonData?._v || 1;
    const storedV   = parseInt(localStorage.getItem(SITE_V_KEY) || '0', 10);
    const stored    = localStorage.getItem(SITE_KEY);

    if (stored && storedV >= siteJsonVersion) {
      try { siteData = JSON.parse(stored); return; } catch (_) {}
    }

    siteData = jsonData || {};
    if (Object.keys(siteData).length) {
      localStorage.setItem(SITE_KEY, JSON.stringify(siteData));
      localStorage.setItem(SITE_V_KEY, String(siteJsonVersion));
    }
  }

  function saveSiteData() {
    localStorage.setItem(SITE_KEY, JSON.stringify(siteData));
    localStorage.setItem(SITE_V_KEY, String(siteJsonVersion));
    showToast('Saved! Refresh the portfolio page to see changes.');
  }

  function switchSection(sec) {
    currentSection = sec;
    const sidebar  = document.getElementById('manageSidebar');
    const body     = document.getElementById('manageBody');
    document.querySelectorAll('.snav-btn').forEach(b => b.classList.toggle('active', b.dataset.sec === sec));

    if (sec === 'projects') {
      if (sidebar) sidebar.style.display = '';
      body?.classList.remove('no-sidebar');
      selectedId = null;
      renderSidebar();
      showWelcome();
    } else {
      if (sidebar) sidebar.style.display = 'none';
      body?.classList.add('no-sidebar');
      const panel = document.getElementById('managePanel');
      if (!panel) return;
      switch (sec) {
        case 'about':      panel.innerHTML = renderAboutEditor();   bindAboutEditor();   break;
        case 'services':   panel.innerHTML = renderServicesEditor(); bindServicesEditor();break;
        case 'techstack':  panel.innerHTML = renderTechEditor();    bindTechEditor();    break;
        case 'experience': panel.innerHTML = renderExpEditor();     bindExpEditor();     break;
        case 'contact':    panel.innerHTML = renderContactEditor(); bindContactEditor(); break;
      }
    }
  }

  // ── Service icon map ──────────────────────────────────────
  const SVC_ICON_OPTS = [
    ['grid',       'Grid (Dashboard)'],
    ['activity',   'Activity (Monitoring)'],
    ['tool',       'Tool (Internal Tools)'],
    ['file-text',  'File (Reporting)'],
    ['globe',      'Globe (Web Apps)'],
    ['terminal',   'Terminal (Automation)'],
    ['database',   'Database'],
    ['code',       'Code'],
    ['bar-chart',  'Bar Chart'],
    ['cpu',        'CPU'],
    ['users',      'Users'],
    ['layers',     'Layers'],
    ['settings',   'Settings'],
  ].map(([k, v]) => `<option value="${k}">${v}</option>`).join('');

  // ── ABOUT EDITOR ──────────────────────────────────────────
  function renderAboutEditor() {
    const a     = siteData.about || {};
    const bio   = a.bio   || ['', ''];
    const stats = a.stats || [];
    return `<div class="manage-panel">
      <div class="panel-header">
        <div><h2 class="panel-title">About Me</h2><p class="panel-subtitle">Edit bio, stats, and experience badge</p></div>
        <button class="btn btn-primary" id="saveAboutBtn">${iconSave()} Save Changes</button>
      </div>
      <div class="form-section">
        <div class="form-section-title">Bio Text &nbsp;<span style="font-size:11px;font-weight:400;color:var(--text-muted)">(HTML supported — use &lt;strong&gt; for bold)</span></div>
        <div class="form-group">
          <label class="form-label">Paragraph 1</label>
          <textarea class="form-control" id="aboutBio1Input" rows="4">${escHtml(bio[0] || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Paragraph 2</label>
          <textarea class="form-control" id="aboutBio2Input" rows="3">${escHtml(bio[1] || '')}</textarea>
        </div>
      </div>
      <div class="form-section">
        <div class="form-section-title">Experience Badge</div>
        <div style="max-width:180px">
          <div class="form-group">
            <label class="form-label">Years of Experience</label>
            <input class="form-control" type="number" id="aboutYearsInput" value="${a.yearsExperience ?? 3}" min="0" max="99">
          </div>
        </div>
      </div>
      <div class="form-section">
        <div class="form-section-title">Statistics (4 stat cards)</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${stats.map((s, i) => `
            <div style="display:flex;gap:10px;align-items:flex-end">
              <div class="form-group" style="flex:0 0 90px;margin:0">
                <label class="form-label">Number</label>
                <input class="form-control" type="text" id="statTarget${i}" value="${escAttr(String(s.target ?? 0))}">
              </div>
              <div class="form-group" style="flex:0 0 80px;margin:0">
                <label class="form-label">Suffix</label>
                <input class="form-control" type="text" id="statSuffix${i}" value="${escAttr(s.suffix || '+')}">
              </div>
              <div class="form-group" style="flex:1;margin:0">
                <label class="form-label">Label</label>
                <input class="form-control" type="text" id="statLabel${i}" value="${escAttr(s.label || '')}">
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="saveAboutBtn2">${iconSave()} Save Changes</button>
      </div>
    </div>`;
  }

  function bindAboutEditor() {
    const doSave = () => {
      if (!siteData.about) siteData.about = {};
      const a = siteData.about;
      a.bio = [
        document.getElementById('aboutBio1Input')?.value || '',
        document.getElementById('aboutBio2Input')?.value || '',
      ];
      a.yearsExperience = parseInt(document.getElementById('aboutYearsInput')?.value || '3', 10);
      (a.stats || []).forEach((s, i) => {
        const tv = document.getElementById(`statTarget${i}`)?.value ?? '';
        const n  = parseFloat(tv);
        s.target = isNaN(n) ? tv : n;
        s.suffix = document.getElementById(`statSuffix${i}`)?.value || '+';
        s.label  = document.getElementById(`statLabel${i}`)?.value  || '';
      });
      saveSiteData();
    };
    document.getElementById('saveAboutBtn')?.addEventListener('click', doSave);
    document.getElementById('saveAboutBtn2')?.addEventListener('click', doSave);
  }

  // ── SERVICES EDITOR ───────────────────────────────────────
  function renderServicesEditor() {
    const svcs = siteData.services || [];
    return `<div class="manage-panel">
      <div class="panel-header">
        <div><h2 class="panel-title">Services</h2><p class="panel-subtitle">Edit the cards in the "What I Build" section</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" id="addSvcBtn">${iconPlus()} Add</button>
          <button class="btn btn-primary" id="saveSvcBtn">${iconSave()} Save</button>
        </div>
      </div>
      <div id="svcList">${renderSvcList(svcs)}</div>
      <div class="form-actions" style="margin-top:4px;border-top:none">
        <button class="btn btn-primary" id="saveSvcBtn2">${iconSave()} Save Changes</button>
        <button class="btn btn-secondary btn-sm" id="addSvcBtn2">${iconPlus()} Add Service</button>
      </div>
    </div>`;
  }

  function renderSvcList(svcs) {
    if (!svcs.length) return `<div style="text-align:center;padding:32px;color:var(--text-muted)">No services. Click "Add" to create one.</div>`;
    return svcs.map((s, i) => `
      <div class="section-item-card">
        <div class="section-item-header">
          <div class="section-item-num">${i + 1}</div>
          <span class="section-item-title">${escHtml(s.title || 'Service')}</span>
          <div class="section-item-actions">
            <button class="icon-btn svc-up" data-i="${i}" title="Move up"${i === 0 ? ' disabled style="opacity:.3"' : ''}>${iconChevUp()}</button>
            <button class="icon-btn svc-dn" data-i="${i}" title="Move down"${i === svcs.length - 1 ? ' disabled style="opacity:.3"' : ''}>${iconChevDown()}</button>
            <button class="icon-btn danger svc-del" data-i="${i}" title="Delete">${iconTrash()}</button>
          </div>
        </div>
        <div class="section-item-body">
          <div class="form-row" style="margin-bottom:10px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Title</label>
              <input class="form-control svc-title" type="text" data-i="${i}" value="${escAttr(s.title || '')}">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Icon</label>
              <select class="form-control svc-icon" data-i="${i}">${SVC_ICON_OPTS.replace(`value="${s.icon || 'grid'}"`, `value="${s.icon || 'grid'}" selected`)}</select>
            </div>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Description</label>
            <textarea class="form-control svc-desc" rows="2" data-i="${i}">${escHtml(s.desc || '')}</textarea>
          </div>
        </div>
      </div>`).join('');
  }

  function bindServicesEditor() {
    const readSvcs = () => {
      const svcs = siteData.services || [];
      document.querySelectorAll('.svc-title').forEach(el => { const i = +el.dataset.i; if (svcs[i]) svcs[i].title = el.value; });
      document.querySelectorAll('.svc-icon').forEach(el  => { const i = +el.dataset.i; if (svcs[i]) svcs[i].icon  = el.value; });
      document.querySelectorAll('.svc-desc').forEach(el  => { const i = +el.dataset.i; if (svcs[i]) svcs[i].desc  = el.value; });
    };
    const rebuild = () => { document.getElementById('svcList').innerHTML = renderSvcList(siteData.services || []); bindServicesEditor(); };
    const doSave  = () => { readSvcs(); saveSiteData(); };
    const doAdd   = () => {
      readSvcs();
      (siteData.services = siteData.services || []).push({ id: 'svc-' + Date.now(), title: 'New Service', desc: '', icon: 'grid' });
      rebuild();
    };
    document.getElementById('saveSvcBtn')?.addEventListener('click', doSave);
    document.getElementById('saveSvcBtn2')?.addEventListener('click', doSave);
    document.getElementById('addSvcBtn')?.addEventListener('click', doAdd);
    document.getElementById('addSvcBtn2')?.addEventListener('click', doAdd);
    document.querySelectorAll('.svc-up').forEach(btn => btn.addEventListener('click', () => {
      readSvcs(); const i = +btn.dataset.i; const a = siteData.services;
      if (i > 0) { [a[i-1], a[i]] = [a[i], a[i-1]]; rebuild(); }
    }));
    document.querySelectorAll('.svc-dn').forEach(btn => btn.addEventListener('click', () => {
      readSvcs(); const i = +btn.dataset.i; const a = siteData.services;
      if (i < a.length - 1) { [a[i], a[i+1]] = [a[i+1], a[i]]; rebuild(); }
    }));
    document.querySelectorAll('.svc-del').forEach(btn => btn.addEventListener('click', () => {
      readSvcs(); siteData.services.splice(+btn.dataset.i, 1); rebuild();
    }));
  }

  // ── TECH STACK EDITOR ─────────────────────────────────────
  function renderTechEditor() {
    const techs = siteData.techStack || [];
    return `<div class="manage-panel">
      <div class="panel-header">
        <div><h2 class="panel-title">Tech Stack</h2><p class="panel-subtitle">Manage the icons in "Tools I Work With"</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" id="addTechBtn">${iconPlus()} Add</button>
          <button class="btn btn-primary" id="saveTechBtn">${iconSave()} Save</button>
        </div>
      </div>
      <div class="instruction-box" style="margin-bottom:14px">
        <strong>Icon options:</strong> Paste an icon URL from any CDN, OR click <strong>Upload PNG</strong> to upload any image from your computer. Uploaded images are stored in your browser.
      </div>
      <div id="techList">${renderTechList(techs)}</div>
      <div class="form-actions" style="margin-top:4px;border-top:none">
        <button class="btn btn-primary" id="saveTechBtn2">${iconSave()} Save Changes</button>
        <button class="btn btn-secondary btn-sm" id="addTechBtn2">${iconPlus()} Add Technology</button>
      </div>
    </div>`;
  }

  function renderTechList(techs) {
    if (!techs.length) return `<div style="text-align:center;padding:32px;color:var(--text-muted)">No technologies. Click "Add".</div>`;
    return techs.map((t, i) => {
      const src  = t.iconDataUrl || t.iconUrl || '';
      const preview = t.iconDataUrl || t.iconUrl
        ? `<img src="${escAttr(src)}" alt="${escAttr(t.name)}" style="width:36px;height:36px;object-fit:contain" onerror="this.style.display='none'">`
        : t.emoji ? `<span style="font-size:26px">${escHtml(t.emoji)}</span>`
        : `<span style="font-size:20px;color:var(--text-muted)">?</span>`;
      return `
        <div class="section-item-card tech-item-card">
          <div class="tech-item-row">
            <div class="tech-icon-preview" id="techPrev${i}">${preview}</div>
            <div style="flex:1;min-width:0">
              <div class="form-row" style="margin-bottom:8px">
                <div class="form-group" style="margin:0">
                  <label class="form-label">Name</label>
                  <input class="form-control tech-nm" type="text" data-i="${i}" value="${escAttr(t.name || '')}">
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Emoji (if no icon)</label>
                  <input class="form-control tech-em" type="text" data-i="${i}" value="${escAttr(t.emoji || '')}" placeholder="🍓">
                </div>
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Icon URL &nbsp;<span style="font-size:10px;color:var(--text-muted);font-weight:400">(cleared when you upload a PNG)</span></label>
                <div style="display:flex;gap:6px">
                  <input class="form-control tech-url" type="text" data-i="${i}" value="${escAttr(t.iconUrl || '')}" placeholder="https://cdn.jsdelivr.net/...">
                  <button class="btn btn-secondary btn-sm tech-upload" type="button" data-i="${i}" style="white-space:nowrap;flex-shrink:0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Upload PNG
                  </button>
                  ${t.iconDataUrl ? `<button class="btn btn-danger btn-sm tech-clr" type="button" data-i="${i}" title="Remove uploaded image">✕</button>` : ''}
                </div>
                ${t.iconDataUrl ? `<p class="form-hint" style="color:var(--green)">✓ Custom image uploaded</p>` : ''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0">
              <button class="icon-btn tech-up" data-i="${i}" title="Move up"${i === 0 ? ' disabled style="opacity:.3"' : ''}>${iconChevUp()}</button>
              <button class="icon-btn tech-dn" data-i="${i}" title="Move down"${i === techs.length - 1 ? ' disabled style="opacity:.3"' : ''}>${iconChevDown()}</button>
              <button class="icon-btn danger tech-del" data-i="${i}" title="Delete">${iconTrash()}</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function bindTechEditor() {
    const readTechs = () => {
      const t = siteData.techStack || [];
      document.querySelectorAll('.tech-nm').forEach(el  => { const i = +el.dataset.i; if (t[i]) t[i].name     = el.value; });
      document.querySelectorAll('.tech-em').forEach(el  => { const i = +el.dataset.i; if (t[i]) t[i].emoji    = el.value; });
      document.querySelectorAll('.tech-url').forEach(el => { const i = +el.dataset.i; if (t[i]) t[i].iconUrl  = el.value; });
    };
    const rebuild = () => { document.getElementById('techList').innerHTML = renderTechList(siteData.techStack || []); bindTechEditor(); };
    const doSave  = () => { readTechs(); saveSiteData(); };
    const doAdd   = () => {
      readTechs();
      (siteData.techStack = siteData.techStack || []).push({ id: 'tech-' + Date.now(), name: 'New Tech', iconUrl: '', iconDataUrl: '', emoji: '' });
      rebuild();
    };
    document.getElementById('saveTechBtn')?.addEventListener('click', doSave);
    document.getElementById('saveTechBtn2')?.addEventListener('click', doSave);
    document.getElementById('addTechBtn')?.addEventListener('click', doAdd);
    document.getElementById('addTechBtn2')?.addEventListener('click', doAdd);

    // Upload PNG
    document.querySelectorAll('.tech-upload').forEach(btn => {
      btn.addEventListener('click', () => {
        readTechs();
        const i   = +btn.dataset.i;
        const inp = document.createElement('input');
        inp.type  = 'file';
        inp.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
        inp.addEventListener('change', () => {
          const file = inp.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = e => {
            const dataUrl = e.target.result;
            if (siteData.techStack?.[i]) {
              siteData.techStack[i].iconDataUrl = dataUrl;
              siteData.techStack[i].iconUrl     = '';
            }
            const prev = document.getElementById(`techPrev${i}`);
            if (prev) prev.innerHTML = `<img src="${dataUrl}" style="width:36px;height:36px;object-fit:contain">`;
            showToast('Image loaded — click Save to apply.');
            rebuild();
          };
          reader.readAsDataURL(file);
        });
        inp.click();
      });
    });

    // Clear uploaded image
    document.querySelectorAll('.tech-clr').forEach(btn => {
      btn.addEventListener('click', () => {
        readTechs();
        const i = +btn.dataset.i;
        if (siteData.techStack?.[i]) siteData.techStack[i].iconDataUrl = '';
        rebuild();
      });
    });

    // Move up/down/delete
    document.querySelectorAll('.tech-up').forEach(btn => btn.addEventListener('click', () => {
      readTechs(); const i = +btn.dataset.i; const a = siteData.techStack;
      if (i > 0) { [a[i-1], a[i]] = [a[i], a[i-1]]; rebuild(); }
    }));
    document.querySelectorAll('.tech-dn').forEach(btn => btn.addEventListener('click', () => {
      readTechs(); const i = +btn.dataset.i; const a = siteData.techStack;
      if (i < a.length - 1) { [a[i], a[i+1]] = [a[i+1], a[i]]; rebuild(); }
    }));
    document.querySelectorAll('.tech-del').forEach(btn => btn.addEventListener('click', () => {
      readTechs(); siteData.techStack.splice(+btn.dataset.i, 1); rebuild();
    }));

    // Live URL preview
    document.querySelectorAll('.tech-url').forEach(el => {
      el.addEventListener('input', () => {
        const i    = +el.dataset.i;
        const prev = document.getElementById(`techPrev${i}`);
        if (prev && el.value) prev.innerHTML = `<img src="${escAttr(el.value)}" style="width:36px;height:36px;object-fit:contain" onerror="this.style.display='none'">`;
      });
    });
  }

  // ── EXPERIENCE EDITOR ─────────────────────────────────────
  function renderExpEditor() {
    const exps = siteData.experience || [];
    return `<div class="manage-panel">
      <div class="panel-header">
        <div><h2 class="panel-title">Experience</h2><p class="panel-subtitle">Edit work history and education timeline</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" id="addExpBtn">${iconPlus()} Add Entry</button>
          <button class="btn btn-primary" id="saveExpBtn">${iconSave()} Save</button>
        </div>
      </div>
      <div id="expList">${renderExpList(exps)}</div>
      <div class="form-actions" style="margin-top:4px;border-top:none">
        <button class="btn btn-primary" id="saveExpBtn2">${iconSave()} Save Changes</button>
        <button class="btn btn-secondary btn-sm" id="addExpBtn2">${iconPlus()} Add Entry</button>
      </div>
    </div>`;
  }

  function renderExpList(exps) {
    if (!exps.length) return `<div style="text-align:center;padding:32px;color:var(--text-muted)">No entries. Click "Add Entry".</div>`;
    return exps.map((e, i) => `
      <div class="section-item-card">
        <div class="section-item-header">
          <div class="section-item-num">${i + 1}</div>
          <span class="section-item-title">${escHtml(e.role || 'Entry')}${e.company ? ' — ' + escHtml(e.company) : ''}</span>
          <div class="section-item-actions">
            <button class="icon-btn exp-up" data-i="${i}" title="Move up"${i === 0 ? ' disabled style="opacity:.3"' : ''}>${iconChevUp()}</button>
            <button class="icon-btn exp-dn" data-i="${i}" title="Move down"${i === exps.length - 1 ? ' disabled style="opacity:.3"' : ''}>${iconChevDown()}</button>
            <button class="icon-btn danger exp-del" data-i="${i}" title="Delete">${iconTrash()}</button>
          </div>
        </div>
        <div class="section-item-body">
          <div class="form-row" style="margin-bottom:10px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Period</label>
              <input class="form-control exp-period" type="text" data-i="${i}" value="${escAttr(e.period || '')}" placeholder="2023 — Present">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Role / Title</label>
              <input class="form-control exp-role" type="text" data-i="${i}" value="${escAttr(e.role || '')}">
            </div>
          </div>
          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label">Company / Institution</label>
            <input class="form-control exp-company" type="text" data-i="${i}" value="${escAttr(e.company || '')}">
          </div>
          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label">Description</label>
            <textarea class="form-control exp-desc" rows="3" data-i="${i}">${escHtml(e.desc || '')}</textarea>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Tags <span style="font-weight:400;color:var(--text-muted)">(comma-separated)</span></label>
            <input class="form-control exp-tags" type="text" data-i="${i}" value="${escAttr((e.tags || []).join(', '))}" placeholder="PHP, MySQL, Reporting">
          </div>
        </div>
      </div>`).join('');
  }

  function bindExpEditor() {
    const readExps = () => {
      const e = siteData.experience || [];
      document.querySelectorAll('.exp-period').forEach(el  => { const i = +el.dataset.i; if (e[i]) e[i].period  = el.value; });
      document.querySelectorAll('.exp-role').forEach(el    => { const i = +el.dataset.i; if (e[i]) e[i].role    = el.value; });
      document.querySelectorAll('.exp-company').forEach(el => { const i = +el.dataset.i; if (e[i]) e[i].company = el.value; });
      document.querySelectorAll('.exp-desc').forEach(el    => { const i = +el.dataset.i; if (e[i]) e[i].desc    = el.value; });
      document.querySelectorAll('.exp-tags').forEach(el    => { const i = +el.dataset.i; if (e[i]) e[i].tags    = el.value.split(',').map(t => t.trim()).filter(Boolean); });
    };
    const rebuild = () => { document.getElementById('expList').innerHTML = renderExpList(siteData.experience || []); bindExpEditor(); };
    const doSave  = () => { readExps(); saveSiteData(); };
    const doAdd   = () => {
      readExps();
      (siteData.experience = siteData.experience || []).push({ id: 'exp-' + Date.now(), period: '', role: '', company: '', desc: '', tags: [] });
      rebuild();
    };
    document.getElementById('saveExpBtn')?.addEventListener('click', doSave);
    document.getElementById('saveExpBtn2')?.addEventListener('click', doSave);
    document.getElementById('addExpBtn')?.addEventListener('click', doAdd);
    document.getElementById('addExpBtn2')?.addEventListener('click', doAdd);
    document.querySelectorAll('.exp-up').forEach(btn => btn.addEventListener('click', () => {
      readExps(); const i = +btn.dataset.i; const a = siteData.experience;
      if (i > 0) { [a[i-1], a[i]] = [a[i], a[i-1]]; rebuild(); }
    }));
    document.querySelectorAll('.exp-dn').forEach(btn => btn.addEventListener('click', () => {
      readExps(); const i = +btn.dataset.i; const a = siteData.experience;
      if (i < a.length - 1) { [a[i], a[i+1]] = [a[i+1], a[i]]; rebuild(); }
    }));
    document.querySelectorAll('.exp-del').forEach(btn => btn.addEventListener('click', () => {
      readExps(); siteData.experience.splice(+btn.dataset.i, 1); rebuild();
    }));
  }

  // ── CONTACT EDITOR ────────────────────────────────────────
  function renderContactEditor() {
    const c = siteData.contact || {};
    return `<div class="manage-panel">
      <div class="panel-header">
        <div><h2 class="panel-title">Get In Touch</h2><p class="panel-subtitle">Edit contact details, form endpoint, and status</p></div>
        <button class="btn btn-primary" id="saveContactBtn">${iconSave()} Save Changes</button>
      </div>
      <div class="form-section">
        <div class="form-section-title">Contact Details</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input class="form-control" type="email" id="ctEmail" value="${escAttr(c.email || '')}" placeholder="you@email.com">
          </div>
          <div class="form-group">
            <label class="form-label">GitHub (without https://)</label>
            <input class="form-control" type="text" id="ctGithub" value="${escAttr(c.github || '')}" placeholder="github.com/username">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Location</label>
            <input class="form-control" type="text" id="ctLocation" value="${escAttr(c.location || '')}" placeholder="Malaysia">
          </div>
          <div class="form-group">
            <label class="form-label">Response Time</label>
            <input class="form-control" type="text" id="ctResponse" value="${escAttr(c.responseTime || '24 hours')}" placeholder="24 hours">
          </div>
        </div>
      </div>
      <div class="form-section">
        <div class="form-section-title">Contact Form</div>
        <div class="form-group">
          <label class="form-label">Form Action URL</label>
          <input class="form-control" type="url" id="ctFormAction" value="${escAttr(c.formAction || '')}" placeholder="https://formspree.io/f/YOUR_ID">
          <p class="form-hint">Sign up at <strong>formspree.io</strong> for a free form endpoint, then paste your endpoint URL here.</p>
        </div>
      </div>
      <div class="form-section">
        <div class="form-section-title">Availability Status</div>
        <div class="form-group">
          <label class="form-label">Status badge text (shown at the top of the portfolio)</label>
          <input class="form-control" type="text" id="ctAvail" value="${escAttr(c.availability || 'Available for new projects')}" placeholder="Available for new projects">
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="saveContactBtn2">${iconSave()} Save Changes</button>
      </div>
    </div>`;
  }

  function bindContactEditor() {
    const doSave = () => {
      if (!siteData.contact) siteData.contact = {};
      const c        = siteData.contact;
      c.email        = document.getElementById('ctEmail')?.value.trim()      || '';
      c.github       = document.getElementById('ctGithub')?.value.trim()     || '';
      c.location     = document.getElementById('ctLocation')?.value.trim()   || '';
      c.responseTime = document.getElementById('ctResponse')?.value.trim()   || '24 hours';
      c.formAction   = document.getElementById('ctFormAction')?.value.trim() || '';
      c.availability = document.getElementById('ctAvail')?.value.trim()      || 'Available for new projects';
      saveSiteData();
    };
    document.getElementById('saveContactBtn')?.addEventListener('click', doSave);
    document.getElementById('saveContactBtn2')?.addEventListener('click', doSave);
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

  // Load site section data in background; bind nav once ready
  loadSiteData().then(() => {
    document.querySelectorAll('.snav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchSection(btn.dataset.sec));
    });
  });

})();
