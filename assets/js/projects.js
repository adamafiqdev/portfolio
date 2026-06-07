/* ============================================================
   PROJECTS.JS — Featured Carousel + Modal
============================================================ */

(function () {
  'use strict';

  const PROJECTS_URL = 'data/projects.json';

  const CAT_ORDER = { 'dashboard': 0, 'internal-tools': 1 };
  const MAX_FEATURED = 6;

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
  let featuredProjects = [];
  let currentIdx = 0;
  let autoTimer = null;
  let modalGalleryIndex = 0;
  let currentModalProject = null;

  // ── DOM References ────────────────────────────────────────
  const track       = document.getElementById('carouselTrack');
  const wrap        = document.getElementById('carouselWrap');
  const prevBtn     = document.getElementById('carouselPrev');
  const nextBtn     = document.getElementById('carouselNext');
  const dotsEl      = document.getElementById('carouselDots');
  const modalOverlay = document.getElementById('projectModal');

  // ── Carousel helpers ──────────────────────────────────────
  function getVisible() {
    const w = window.innerWidth;
    if (w >= 1024) return 3;
    if (w >= 640)  return 2;
    return 1;
  }

  function getCardWidth() {
    if (!wrap) return 300;
    const w = wrap.offsetWidth || wrap.getBoundingClientRect().width;
    if (!w) return 300;
    const gap = 24;
    const vis = getVisible();
    return Math.floor((w - gap * (vis - 1)) / vis);
  }

  function maxIdx() {
    const vis = getVisible();
    return Math.max(0, featuredProjects.length - vis);
  }

  function updateTrack(animate) {
    if (!track) return;
    const gap = 24;
    const cardW = getCardWidth();
    const cards = track.querySelectorAll('.project-card');

    cards.forEach(c => {
      c.style.width      = cardW + 'px';
      c.style.minWidth   = cardW + 'px';
      c.style.maxWidth   = cardW + 'px';
      c.style.flexBasis  = cardW + 'px';
      c.style.flexShrink = '0';
      c.style.flexGrow   = '0';
    });

    // set explicit track width so browser keeps cards in a single row
    track.style.width = cards.length * cardW + (cards.length - 1) * gap + 'px';

    const offset = currentIdx * (cardW + gap);
    track.style.transition = animate === false ? 'none' : 'transform 0.7s cubic-bezier(0.4,0,0.2,1)';
    track.style.transform  = `translateX(-${offset}px)`;

    updateDots();
  }

  function updateDots() {
    if (!dotsEl) return;
    const total = maxIdx() + 1;
    if (dotsEl.children.length !== total) {
      dotsEl.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const d = document.createElement('button');
        d.className = 'carousel-dot' + (i === currentIdx ? ' active' : '');
        d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        d.addEventListener('click', () => goTo(i));
        dotsEl.appendChild(d);
      }
    } else {
      dotsEl.querySelectorAll('.carousel-dot').forEach((d, i) => {
        d.classList.toggle('active', i === currentIdx);
      });
    }
  }

  function goTo(idx) {
    currentIdx = Math.max(0, Math.min(idx, maxIdx()));
    updateTrack(true);
  }

  function slideNext() { goTo(currentIdx >= maxIdx() ? 0 : currentIdx + 1); }
  function slidePrev() { goTo(currentIdx <= 0 ? maxIdx() : currentIdx - 1); }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(slideNext, 4000);
  }

  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  // ── Build Carousel ────────────────────────────────────────
  function buildCarousel(projects) {
    featuredProjects = projects;
    if (!track) return;

    track.innerHTML = projects.map((p, i) => buildCard(p, i)).join('');

    track.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const project = allProjects.find(p => p.id === id);
        if (project) openModal(project);
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') card.click();
      });
    });

    currentIdx = 0;
    // defer one frame so the browser has laid out card widths
    requestAnimationFrame(() => updateTrack(false));

    if (prevBtn) prevBtn.addEventListener('click', () => { slidePrev(); startAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { slideNext(); startAuto(); });

    if (wrap) {
      wrap.addEventListener('mouseenter', stopAuto);
      wrap.addEventListener('mouseleave', startAuto);
      wrap.addEventListener('touchstart', stopAuto, { passive: true });
      wrap.addEventListener('touchend', () => setTimeout(startAuto, 1500), { passive: true });
    }

    startAuto();

    window.addEventListener('resize', () => {
      updateDots();
      updateTrack(false);
    });
  }

  // ── Load Projects ─────────────────────────────────────────
  async function loadProjects() {
    let jsonData = null;
    try {
      const res = await fetch(PROJECTS_URL, { cache: 'no-cache' });
      if (res.ok) jsonData = await res.json();
    } catch (_) {}

    const jsonVersion  = jsonData ? (jsonData._v || 1) : 0;
    const storedVersion = parseInt(localStorage.getItem('portfolio_projects_v') || '0', 10);
    const stored = localStorage.getItem('portfolio_projects');

    if (stored && storedVersion >= jsonVersion) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allProjects = parsed;
          buildCarousel(getFeatured());
          return;
        }
      } catch (_) {}
    }

    allProjects = jsonData ? (jsonData.projects || []) : [];
    if (allProjects.length > 0) {
      localStorage.setItem('portfolio_projects', JSON.stringify(allProjects));
      localStorage.setItem('portfolio_projects_v', String(jsonVersion));
    }

    buildCarousel(getFeatured());
  }

  // ── Get featured (sorted, max 6) ──────────────────────────
  function getFeatured() {
    return allProjects
      .filter(p => p.featured)
      .sort((a, b) => {
        const oa = CAT_ORDER[a.category] ?? 2;
        const ob = CAT_ORDER[b.category] ?? 2;
        return oa !== ob ? oa - ob : (a.order ?? 99) - (b.order ?? 99);
      })
      .slice(0, MAX_FEATURED);
  }

  // ── Build Card ────────────────────────────────────────────
  function buildCard(p) {
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
      <article class="project-card" data-id="${p.id}" role="button" tabindex="0" aria-label="View ${p.title} project details">
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
    const mainImg  = document.getElementById('modalMainImage');
    const thumbsEl = document.getElementById('modalThumbs');
    const countEl  = document.getElementById('modalImageCount');
    const prev     = document.getElementById('modalPrev');
    const next     = document.getElementById('modalNext');

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
    if (prev) { prev.style.display = showNav ? '' : 'none'; prev.onclick = prevGalleryImage; }
    if (next) { next.style.display = showNav ? '' : 'none'; next.onclick = nextGalleryImage; }

    window._modalSetImage    = setImage;
    window._modalScreenshots = screenshots;
  }

  function prevGalleryImage() {
    if (!currentModalProject) return;
    const screens = window._modalScreenshots || [];
    window._modalSetImage((modalGalleryIndex - 1 + screens.length) % screens.length);
  }

  function nextGalleryImage() {
    if (!currentModalProject) return;
    const screens = window._modalScreenshots || [];
    window._modalSetImage((modalGalleryIndex + 1) % screens.length);
  }

  function buildModalFeatures(project) {
    const el = document.getElementById('modalFeatures');
    if (!el) return;
    const features = project.features || [];
    if (!features.length) { el.parentElement.style.display = 'none'; return; }
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
    const demoLink   = document.getElementById('modalDemoLink');
    if (githubLink) {
      githubLink.href = project.githubUrl || '#';
      githubLink.style.display = project.githubUrl ? '' : 'none';
    }
    if (demoLink) {
      demoLink.href = project.demoUrl || '#';
      demoLink.style.display = project.demoUrl ? '' : 'none';
    }
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
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
