// ============================================================
// SITE-DATA.JS — Applies portfolio section data to index.html
// Reads from localStorage first (manage.html live-edit layer),
// falls back to data/site.json. Must load BEFORE main.js so
// data-target values are set before the counter animation runs.
// ============================================================

(function () {
  'use strict';

  const SITE_KEY   = 'portfolio_site';
  const SITE_V_KEY = 'portfolio_site_v';
  const SITE_URL   = 'data/site.json';

  // ── Icon map for service cards ───────────────────────────
  const ICONS = {
    grid:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    activity:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    tool:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
    'file-text':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    globe:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
    terminal:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9l3 3-3 3M13 15h3"/></svg>`,
    database:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    code:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    'bar-chart':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
    cpu:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
    users:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
    layers:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    settings:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  };

  // ── IntersectionObserver for reveal animations ───────────
  function observeReveal(container) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    container.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
  }

  // ── Apply functions ──────────────────────────────────────
  function applyAbout(about) {
    if (!about) return;

    const bio1 = document.getElementById('aboutBio1');
    const bio2 = document.getElementById('aboutBio2');
    if (bio1 && about.bio?.[0] !== undefined) bio1.innerHTML = about.bio[0];
    if (bio2 && about.bio?.[1] !== undefined) bio2.innerHTML = about.bio[1];

    const yearsEl = document.querySelector('.about-badge-num');
    if (yearsEl && about.yearsExperience !== undefined) {
      yearsEl.dataset.target = about.yearsExperience;
      yearsEl.textContent = about.yearsExperience + '+';
    }

    if (about.stats) {
      const cards = document.querySelectorAll('.stat-card');
      about.stats.forEach((s, i) => {
        if (!cards[i]) return;
        const numEl = cards[i].querySelector('.stat-num');
        const lblEl = cards[i].querySelector('.stat-label');
        if (numEl) {
          numEl.dataset.target = s.target;
          numEl.dataset.suffix = s.suffix || '';
          numEl.textContent = '0' + (s.suffix || '');
        }
        if (lblEl) lblEl.textContent = s.label || '';
      });

      const downloadStats = document.querySelector('.download-stats');
      if (downloadStats) {
        downloadStats.innerHTML = about.stats.map((s, i) => `
          ${i > 0 ? '<div class="download-stat-sep" aria-hidden="true"></div>' : ''}
          <div class="download-stat">
            <span class="download-stat-num">${s.target}${s.suffix || ''}</span>
            <span class="download-stat-label">${s.label || ''}</span>
          </div>`).join('');
      }
    }
  }

  function applyServices(services) {
    const grid = document.getElementById('servicesGrid');
    if (!grid || !services?.length) return;
    const delays = ['', 'reveal-delay-1', 'reveal-delay-2'];
    grid.innerHTML = services.map((s, i) => `
      <div class="service-card reveal ${delays[i % 3]}">
        <div class="service-icon">${ICONS[s.icon] || ICONS.grid}</div>
        <h3 class="service-title">${s.title || ''}</h3>
        <p class="service-desc">${s.desc || ''}</p>
      </div>`).join('');
    observeReveal(grid);
  }

  function applyTechStack(techStack) {
    const grid = document.getElementById('techGrid');
    if (!grid || !techStack?.length) return;
    const delays = ['', 'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3', 'reveal-delay-4'];
    grid.innerHTML = techStack.map((t, i) => {
      let iconHTML;
      if (t.iconDataUrl) {
        iconHTML = `<img src="${t.iconDataUrl}" alt="${t.name}" loading="lazy">`;
      } else if (t.iconUrl) {
        iconHTML = `<img src="${t.iconUrl}" alt="${t.name}" loading="lazy">`;
      } else if (t.emoji) {
        iconHTML = `<span style="font-size:32px;color:var(--text-secondary)">${t.emoji}</span>`;
      } else {
        iconHTML = `<span style="font-size:28px;color:var(--text-muted)">?</span>`;
      }
      return `
        <div class="tech-item reveal ${delays[i % 5]}">
          <div class="tech-icon">${iconHTML}</div>
          <span class="tech-name">${t.name || ''}</span>
        </div>`;
    }).join('');
    observeReveal(grid);
  }

  function applyExperience(experience) {
    const timeline = document.getElementById('experienceTimeline');
    if (!timeline || !experience?.length) return;
    timeline.innerHTML = experience.map((e, i) => {
      const tags = (e.tags || []).map(t => `<span class="timeline-tag">${t}</span>`).join('');
      return `
        <div class="timeline-item reveal reveal-delay-${Math.min(i + 1, 4)}">
          <div class="timeline-dot"><div class="timeline-dot-inner"></div></div>
          <div class="timeline-content">
            <div class="timeline-period">${e.period || ''}</div>
            <div class="timeline-role">${e.role || ''}</div>
            <div class="timeline-company">${e.company || ''}</div>
            <p class="timeline-desc">${e.desc || ''}</p>
            <div class="timeline-tags">${tags}</div>
          </div>
        </div>`;
    }).join('');
    observeReveal(timeline);
  }

  function applyContact(contact) {
    if (!contact) return;
    const emailEl    = document.getElementById('contactEmail');
    const githubEl   = document.getElementById('contactGithub');
    const locationEl = document.getElementById('contactLocation');
    const formEl     = document.getElementById('contactForm');
    const badgeEl    = document.getElementById('heroBadgeText');
    if (emailEl    && contact.email    != null) emailEl.textContent    = contact.email;
    if (githubEl   && contact.github   != null) githubEl.textContent   = contact.github;
    if (locationEl && contact.location != null) locationEl.textContent = contact.location;
    if (formEl     && contact.formAction)        formEl.action          = contact.formAction;
    if (badgeEl    && contact.availability != null) badgeEl.textContent = contact.availability;
  }

  function applyAll(data) {
    if (!data) return;
    if (data.about)      applyAbout(data.about);
    if (data.services)   applyServices(data.services);
    if (data.techStack)  applyTechStack(data.techStack);
    if (data.experience) applyExperience(data.experience);
    if (data.contact)    applyContact(data.contact);
  }

  // ── Load & apply ─────────────────────────────────────────
  // Step 1: synchronous localStorage read — must happen before
  // main.js so data-target values are in place for counter anim.
  const storedRaw = localStorage.getItem(SITE_KEY);
  if (storedRaw) {
    try { applyAll(JSON.parse(storedRaw)); } catch (_) {}
  }

  // Step 2: async fetch to check version and re-seed if needed.
  fetch(SITE_URL, { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : null)
    .then(jsonData => {
      if (!jsonData) return;
      const jsonV   = jsonData._v || 1;
      const storedV = parseInt(localStorage.getItem(SITE_V_KEY) || '0', 10);

      if (storedV < jsonV || !storedRaw) {
        localStorage.setItem(SITE_KEY, JSON.stringify(jsonData));
        localStorage.setItem(SITE_V_KEY, String(jsonV));
        applyAll(jsonData);
      }
    })
    .catch(() => {});

})();
