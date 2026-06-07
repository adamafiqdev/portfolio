/* ============================================================
   PROJECTS.JS — Load, Render, Filter, Search, Modal
============================================================ */

(function () {
  'use strict';

  const PROJECTS_URL = 'data/projects.json';

  const CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'monitoring', label: 'Monitoring' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'internal-tools', label: 'Internal Tools' },
    { key: 'web-app', label: 'Web Apps' },
    { key: 'automation', label: 'Automation' },
    { key: 'reporting', label: 'Reporting' },
  ];

  let allProjects = [];
  let activeCategory = 'all';
  let searchQuery = '';
  let modalGalleryIndex = 0;
  let currentModalProject = null;

  // ── DOM References ────────────────────────────────────────
  const grid = document.getElementById('projectsGrid');
  const filterContainer = document.getElementById('filterTabs');
  const searchInput = document.getElementById('projectSearch');
  const modalOverlay = document.getElementById('projectModal');

  // ── Fetch Projects ────────────────────────────────────────
  async function loadProjects() {
    // Always fetch projects.json to check _v (version).
    // If the version stored in localStorage is older, the JSON file has been
    // updated (new projects deployed) and we must re-seed from it.
    // If the version matches, localStorage may contain manage.html edits that
    // haven't been deployed yet — use those so live edits stay visible.
    let jsonData = null;
    try {
      const res = await fetch(PROJECTS_URL);
      if (res.ok) jsonData = await res.json();
    } catch (_) {}

    const jsonVersion = jsonData ? (jsonData._v || 1) : 0;
    const storedVersion = parseInt(localStorage.getItem('portfolio_projects_v') || '0', 10);
    const stored = localStorage.getItem('portfolio_projects');

    if (stored && storedVersion >= jsonVersion) {
      // localStorage is at least as new as the deployed JSON — use it so
      // manage.html edits are reflected without needing a re-deploy.
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allProjects = parsed;
          buildFilters();
          renderProjects();
          return;
        }
      } catch (_) {}
    }

    // Version mismatch (or no localStorage) — seed from the fetched JSON.
    allProjects = jsonData ? (jsonData.projects || []) : [];
    if (allProjects.length > 0) {
      localStorage.setItem('portfolio_projects', JSON.stringify(allProjects));
      localStorage.setItem('portfolio_projects_v', String(jsonVersion));
    }

    buildFilters();
    renderProjects();
  }

  // ── Build Filter Tabs ─────────────────────────────────────
  function buildFilters() {
    if (!filterContainer) return;

    const usedCategories = new Set(allProjects.map(p => p.category));
    const visible = CATEGORIES.filter(c => c.key === 'all' || usedCategories.has(c.key));

    filterContainer.innerHTML = visible.map(c => `
      <button class="filter-tab${c.key === activeCategory ? ' active' : ''}"
              data-cat="${c.key}">
        ${c.label}
      </button>
    `).join('');

    filterContainer.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        filterContainer.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProjects();
      });
    });
  }

  // ── Filter & Search Logic ─────────────────────────────────
  function getFiltered() {
    return allProjects.filter(p => {
      const matchCat = activeCategory === 'all' || p.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.technologies || []).some(t => t.toLowerCase().includes(q)) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }

  // ── Render Project Cards ──────────────────────────────────
  function renderProjects() {
    if (!grid) return;
    const projects = getFiltered();

    if (!projects.length) {
      grid.innerHTML = `
        <div class="no-projects reveal">
          <p style="font-size:32px;margin-bottom:12px;">🔍</p>
          <p style="font-size:16px;font-weight:600;margin-bottom:6px;">No projects found</p>
          <p style="font-size:14px;color:var(--text-muted);">Try a different search or filter</p>
        </div>`;
      return;
    }

    grid.innerHTML = projects.map((p, i) => buildCard(p, i)).join('');

    grid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const project = allProjects.find(p => p.id === id);
        if (project) openModal(project);
      });
    });

    // Re-observe new reveal elements
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  function buildCard(p, index) {
    const delay = (index % 3) * 100;
    const cover = p.coverImage
      ? `<img src="${p.coverImage}" alt="${p.title}" loading="lazy" onerror="this.parentElement.classList.add('no-img')">`
      : '';

    const techTags = (p.technologies || []).slice(0, 4).map(t =>
      `<span class="project-tag">${t}</span>`
    ).join('');
    const extraCount = (p.technologies || []).length - 4;
    const extraTag = extraCount > 0 ? `<span class="project-tag">+${extraCount}</span>` : '';

    const githubBtn = p.githubUrl
      ? `<a href="${p.githubUrl}" target="_blank" rel="noopener" class="project-link-btn" onclick="event.stopPropagation()">
           ${iconGitHub()} GitHub
         </a>` : '';

    const demoBtn = p.demoUrl
      ? `<a href="${p.demoUrl}" target="_blank" rel="noopener" class="project-link-btn" onclick="event.stopPropagation()">
           ${iconExternal()} Demo
         </a>` : '';

    const categoryLabel = CATEGORIES.find(c => c.key === p.category)?.label || p.category;

    return `
      <article class="project-card reveal" data-id="${p.id}" style="transition-delay:${delay}ms" role="button" tabindex="0" aria-label="View ${p.title} project details">
        <div class="project-cover">
          ${cover}
          ${!cover ? `<div class="project-cover-placeholder"><div class="project-cover-icon">💻</div></div>` : ''}
          <div class="project-overlay">
            <span class="project-overlay-text">${iconEye()} View Details</span>
          </div>
        </div>
        <div class="project-body">
          <span class="project-category-badge">${categoryLabel}</span>
          <h3 class="project-title">${p.title}</h3>
          <p class="project-desc">${p.description || ''}</p>
          <div class="project-tags">${techTags}${extraTag}</div>
          <div class="project-footer">
            <div class="project-links">${githubBtn}${demoBtn}</div>
            <span class="view-details-btn">${iconChevronRight()} Details</span>
          </div>
        </div>
      </article>`;
  }

  // ── Search ────────────────────────────────────────────────
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        renderProjects();
      }, 250);
    });
  }

  // ── Modal ─────────────────────────────────────────────────
  function openModal(project) {
    if (!modalOverlay) return;
    currentModalProject = project;
    modalGalleryIndex = 0;

    document.getElementById('modalTitle').textContent = project.title;
    document.getElementById('modalCategoryBadge').textContent =
      CATEGORIES.find(c => c.key === project.category)?.label || project.category;
    document.getElementById('modalDescription').textContent = project.longDescription || project.description || '';

    buildModalGallery(project);
    buildModalFeatures(project);
    buildModalTech(project);
    buildModalLinks(project);

    document.body.style.overflow = 'hidden';
    modalOverlay.classList.add('open');
    document.addEventListener('keydown', handleModalKey);
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleModalKey);
    currentModalProject = null;
  }

  function handleModalKey(e) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') prevGalleryImage();
    if (e.key === 'ArrowRight') nextGalleryImage();
  }

  function buildModalGallery(project) {
    const screenshots = project.screenshots || (project.coverImage ? [project.coverImage] : []);
    const mainImg = document.getElementById('modalMainImage');
    const thumbsEl = document.getElementById('modalThumbs');
    const countEl = document.getElementById('modalImageCount');
    const prevBtn = document.getElementById('modalPrev');
    const nextBtn = document.getElementById('modalNext');

    function setImage(index) {
      modalGalleryIndex = index;
      const src = screenshots[index] || '';
      mainImg.src = src;
      mainImg.alt = project.title + ' screenshot ' + (index + 1);
      if (countEl) countEl.textContent = `${index + 1} / ${screenshots.length}`;
      thumbsEl.querySelectorAll('.modal-thumb').forEach((t, i) => {
        t.classList.toggle('active', i === index);
      });
    }

    if (mainImg) {
      mainImg.src = screenshots[0] || '';
      mainImg.alt = project.title;
      mainImg.onerror = () => { mainImg.style.display = 'none'; };
    }

    if (thumbsEl) {
      thumbsEl.innerHTML = screenshots.map((src, i) => `
        <div class="modal-thumb${i === 0 ? ' active' : ''}" data-index="${i}">
          <img src="${src}" alt="Screenshot ${i + 1}" loading="lazy">
        </div>`).join('');

      thumbsEl.querySelectorAll('.modal-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => setImage(parseInt(thumb.dataset.index, 10)));
      });
    }

    if (countEl) countEl.textContent = `1 / ${screenshots.length}`;

    const showNav = screenshots.length > 1;
    if (prevBtn) {
      prevBtn.style.display = showNav ? '' : 'none';
      prevBtn.onclick = prevGalleryImage;
    }
    if (nextBtn) {
      nextBtn.style.display = showNav ? '' : 'none';
      nextBtn.onclick = nextGalleryImage;
    }

    window._modalSetImage = setImage;
    window._modalScreenshots = screenshots;
  }

  function prevGalleryImage() {
    if (!currentModalProject) return;
    const screens = window._modalScreenshots || [];
    const newIdx = (modalGalleryIndex - 1 + screens.length) % screens.length;
    window._modalSetImage(newIdx);
  }

  function nextGalleryImage() {
    if (!currentModalProject) return;
    const screens = window._modalScreenshots || [];
    const newIdx = (modalGalleryIndex + 1) % screens.length;
    window._modalSetImage(newIdx);
  }

  function buildModalFeatures(project) {
    const el = document.getElementById('modalFeatures');
    if (!el) return;
    const features = project.features || [];
    if (!features.length) {
      el.parentElement.style.display = 'none';
      return;
    }
    el.parentElement.style.display = '';
    el.innerHTML = features.map(f => `<div class="modal-feature-item">${f}</div>`).join('');
  }

  function buildModalTech(project) {
    const el = document.getElementById('modalTechTags');
    if (!el) return;
    el.innerHTML = (project.technologies || [])
      .map(t => `<span class="modal-tech-tag">${t}</span>`)
      .join('');
  }

  function buildModalLinks(project) {
    const githubLink = document.getElementById('modalGithubLink');
    const demoLink = document.getElementById('modalDemoLink');

    if (githubLink) {
      if (project.githubUrl) {
        githubLink.href = project.githubUrl;
        githubLink.style.display = '';
      } else {
        githubLink.style.display = 'none';
      }
    }

    if (demoLink) {
      if (project.demoUrl) {
        demoLink.href = project.demoUrl;
        demoLink.style.display = '';
      } else {
        demoLink.style.display = 'none';
      }
    }
  }

  // ── Modal Event Listeners ─────────────────────────────────
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  const closeBtn = document.getElementById('modalClose');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // ── SVG Icons ─────────────────────────────────────────────
  function iconGitHub() {
    return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`;
  }

  function iconExternal() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>`;
  }

  function iconEye() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }

  function iconChevronRight() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
  }

  // ── Init ──────────────────────────────────────────────────
  loadProjects();

})();
