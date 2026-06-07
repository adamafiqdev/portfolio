// ============================================================
// PDF Generator — Adam Afiq Portfolio
// Client-side, GitHub Pages compatible (no backend needed).
// Requires html2pdf.js loaded via CDN before this script.
//
// Fixes applied vs naive approach:
//  1. Container is placed in normal document flow (covered by
//     loading overlay) — html2canvas cannot render elements at
//     top:-9999px reliably.
//  2. CSS resets are scoped to .pdf-root so they don't bleed
//     into the page's own styles and corrupt rendering.
//  3. Main structural layouts use display:table / table-cell
//     instead of flex/grid — html2canvas support is much more
//     reliable for table rendering.
// ============================================================

(function () {
  'use strict';

  // ── Loading overlay ──────────────────────────────────────
  function showOverlay() {
    const el = document.createElement('div');
    el.id = 'pdfOverlay';
    el.style.cssText = [
      'position:fixed;inset:0;z-index:9998;',
      'background:rgba(9,9,11,0.92);',
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
      'display:flex;flex-direction:column;',
      'align-items:center;justify-content:center;gap:16px;',
    ].join('');
    el.innerHTML = `
      <div id="pdfSpinner" style="
        width:44px;height:44px;
        border:3px solid rgba(99,102,241,0.25);
        border-top-color:#6366f1;
        border-radius:50%;
        animation:pdfSpin 0.75s linear infinite;
      "></div>
      <div style="color:#fafafa;font-size:15px;font-weight:700;font-family:system-ui,sans-serif;">
        Generating PDF…
      </div>
      <div style="color:#71717a;font-size:13px;font-family:system-ui,sans-serif;">
        Building pages from your portfolio data
      </div>
      <style>@keyframes pdfSpin{to{transform:rotate(360deg)}}</style>
    `;
    document.body.appendChild(el);
    return el;
  }

  function removeOverlay() {
    const el = document.getElementById('pdfOverlay');
    if (el) el.remove();
  }

  // ── Toast ────────────────────────────────────────────────
  function toast(msg, type) {
    let el = document.getElementById('pdfToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pdfToast';
      el.style.cssText = [
        'position:fixed;bottom:32px;left:50%;',
        'transform:translateX(-50%) translateY(12px);',
        'background:#18181b;color:#fafafa;',
        'border:1px solid rgba(255,255,255,0.1);',
        'border-radius:10px;padding:12px 22px;',
        'font-size:14px;font-weight:600;',
        'font-family:system-ui,sans-serif;',
        'z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.5);',
        'display:flex;align-items:center;gap:10px;',
        'transition:opacity 0.3s ease,transform 0.3s ease;',
        'opacity:0;pointer-events:none;',
      ].join('');
      document.body.appendChild(el);
    }
    const icons = { loading: '⏳', success: '✅', error: '❌' };
    el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    if (type !== 'loading') {
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(12px)';
      }, 3500);
    }
  }

  // ── Button state ─────────────────────────────────────────
  function setLoading(btn, on) {
    if (!btn) return;
    if (on) {
      btn._savedHtml = btn.innerHTML;
      btn.disabled = true;
      btn.style.opacity = '0.65';
      const lbl = btn.querySelector('.download-btn-name');
      if (lbl) lbl.textContent = 'Generating…';
    } else {
      if (btn._savedHtml) btn.innerHTML = btn._savedHtml;
      btn.disabled = false;
      btn.style.opacity = '';
    }
  }

  // ── Shared PDF CSS ───────────────────────────────────────
  // IMPORTANT: All resets are scoped to .pdf-root so they do
  // NOT override the portfolio page's own styles while the
  // container is temporarily in the DOM.
  function baseCSS() {
    return `
      .pdf-root, .pdf-root * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .pdf-root { margin:0; padding:0; }
      .pdf-root h1,.pdf-root h2,.pdf-root h3,
      .pdf-root h4,.pdf-root p,.pdf-root ul,
      .pdf-root li,.pdf-root div,.pdf-root span {
        margin:0; padding:0;
      }
      .pdf-root {
        font-family: -apple-system, BlinkMacSystemFont,
          'Segoe UI', Arial, Helvetica, sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #09090b;
        background: #ffffff;
        width: 210mm;
      }
      .pdf-root .tag {
        display: inline-block;
        background: #ede9fe;
        color: #4338ca;
        font-size: 8.5pt;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 4px;
        margin: 2px 2px 2px 0;
      }
      .pdf-root .page-break { page-break-before: always; }
    `;
  }

  // ── Portfolio HTML ───────────────────────────────────────
  function portfolioHTML(projects) {
    const display = (
      projects.filter(p => p.featured).length >= 2
        ? projects.filter(p => p.featured)
        : projects
    ).slice(0, 8);

    return `<style>
${baseCSS()}

/* ---- HEADER ---- */
.pdf-root .pf-header {
  display: table;
  width: 210mm;
  table-layout: fixed;
}
.pdf-root .pf-header-main {
  display: table-cell;
  padding: 34px 44px 26px;
  vertical-align: middle;
  border-bottom: 3px solid #2563eb;
}
.pdf-root .pf-header-deco {
  display: table-cell;
  width: 148px;
  background: linear-gradient(150deg, #f97316 0%, #fb923c 50%, #fbbf24 100%);
  text-align: center;
  vertical-align: middle;
  border-bottom: 3px solid #2563eb;
}
.pdf-root .pf-name {
  font-size: 23pt;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #0f172a;
  display: block;
  margin-bottom: 4px;
  line-height: 1.1;
}
.pdf-root .pf-role {
  font-size: 12pt;
  font-weight: 600;
  color: #2563eb;
  display: block;
  margin-bottom: 13px;
}
.pdf-root .pf-contact-row {
  display: table;
  width: 100%;
  table-layout: fixed;
}
.pdf-root .pf-contact-cell {
  display: table-cell;
  font-size: 8.5pt;
  color: #4b5563;
  vertical-align: top;
}
.pdf-root .pf-deco-mono {
  font-size: 28pt;
  font-weight: 900;
  color: rgba(255,255,255,0.9);
  letter-spacing: -2px;
  display: block;
  line-height: 1;
  margin-bottom: 5px;
}
.pdf-root .pf-deco-lbl {
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.72);
  display: block;
}

/* ---- PAGE ---- */
.pdf-root .pf-page { width: 210mm; padding: 30px 44px 22px; }
.pdf-root .pf-page.page-break { page-break-before: always; }

/* ---- SECTION HEADING ---- */
.pdf-root .pf-sec {
  font-size: 9pt;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: #2563eb;
  display: block;
  padding-bottom: 7px;
  border-bottom: 2px solid #bfdbfe;
  margin-bottom: 16px;
}
.pdf-root .pf-sec-gap { margin-top: 20px; }

/* ---- BIO ---- */
.pdf-root .pf-bio {
  font-size: 10.5pt;
  color: #374151;
  line-height: 1.8;
  margin-bottom: 10px;
}

/* ---- STATS ---- */
.pdf-root .pf-stats {
  display: table;
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 10px 0;
  margin: 18px 0 24px;
}
.pdf-root .pf-stat-cell {
  display: table-cell;
  border-top: 3px solid #2563eb;
  padding: 10px 6px 8px;
  text-align: center;
}
.pdf-root .pf-stat-n {
  font-size: 18pt;
  font-weight: 800;
  color: #1e40af;
  line-height: 1;
  display: block;
  margin-bottom: 4px;
}
.pdf-root .pf-stat-l {
  font-size: 7.5pt;
  color: #6b7280;
  font-weight: 600;
  line-height: 1.3;
  display: block;
}

/* ---- SKILLS ---- */
.pdf-root .pf-sk-row {
  display: table;
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 11px 11px;
  margin-top: -11px;
}
.pdf-root .pf-sk-cell {
  display: table-cell;
  vertical-align: top;
  border-left: 3px solid #2563eb;
  padding: 12px 14px;
  background: #f8fafc;
}
.pdf-root .pf-sk-cat {
  font-size: 8pt;
  font-weight: 700;
  color: #1e40af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  padding-bottom: 6px;
  border-bottom: 1px solid #dbeafe;
  margin-bottom: 8px;
}
.pdf-root .pf-sk-item {
  font-size: 9pt;
  color: #334155;
  display: block;
  margin-bottom: 4px;
}

/* ---- PROJECTS ---- */
.pdf-root .pf-proj {
  margin-bottom: 18px;
  page-break-inside: avoid;
  padding: 13px 15px;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #2563eb;
  background: #fafafa;
}
.pdf-root .pf-proj-meta {
  display: table;
  width: 100%;
  table-layout: fixed;
  margin-bottom: 5px;
}
.pdf-root .pf-proj-meta-l { display: table-cell; vertical-align: middle; }
.pdf-root .pf-proj-meta-r {
  display: table-cell;
  width: 90px;
  text-align: right;
  vertical-align: middle;
}
.pdf-root .pf-proj-cat {
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #2563eb;
  display: block;
}
.pdf-root .pf-proj-name {
  font-size: 11.5pt;
  font-weight: 700;
  color: #0f172a;
  display: block;
  margin-top: 2px;
}
.pdf-root .pf-proj-desc {
  font-size: 9.5pt;
  color: #4b5563;
  line-height: 1.75;
  margin-bottom: 7px;
}
.pdf-root .pf-proj-tech {
  font-size: 8pt;
  color: #1e40af;
  font-weight: 600;
}

/* ---- EXPERIENCE ---- */
.pdf-root .pf-exp {
  margin-bottom: 18px;
  page-break-inside: avoid;
}
.pdf-root .pf-exp:last-child { margin-bottom: 0; }
.pdf-root .pf-exp-hdr {
  display: table;
  width: 100%;
  table-layout: fixed;
  margin-bottom: 5px;
}
.pdf-root .pf-exp-hdr-l { display: table-cell; vertical-align: top; }
.pdf-root .pf-exp-hdr-r {
  display: table-cell;
  width: 112px;
  text-align: right;
  vertical-align: top;
}
.pdf-root .pf-exp-role {
  font-size: 11.5pt;
  font-weight: 700;
  color: #0f172a;
  display: block;
  margin-bottom: 1px;
}
.pdf-root .pf-exp-co {
  font-size: 9.5pt;
  color: #4b5563;
  display: block;
}
.pdf-root .pf-exp-period {
  font-size: 7.5pt;
  font-weight: 700;
  color: #1e40af;
  background: #dbeafe;
  padding: 3px 8px;
  display: inline-block;
}
.pdf-root .pf-exp-desc {
  font-size: 9.5pt;
  color: #4b5563;
  line-height: 1.78;
  margin-top: 6px;
}
.pdf-root .pf-exp-tags {
  margin-top: 6px;
  font-size: 8pt;
  color: #6b7280;
  font-style: italic;
}
.pdf-root .pf-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 14px 0;
}

/* ---- FOOTER ---- */
.pdf-root .pf-footer {
  padding: 22px 44px 30px;
  background: #eff6ff;
  border-top: 2px solid #bfdbfe;
}
.pdf-root .pf-footer-title {
  font-size: 13pt;
  font-weight: 800;
  color: #1e40af;
  display: block;
  margin-bottom: 4px;
}
.pdf-root .pf-footer-sub {
  font-size: 9.5pt;
  color: #4b5563;
  margin-bottom: 14px;
  display: block;
}
.pdf-root .pf-footer-row {
  display: table;
  width: 100%;
  table-layout: fixed;
}
.pdf-root .pf-footer-col { display: table-cell; vertical-align: top; }
.pdf-root .pf-footer-lbl {
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #6b7280;
  display: block;
  margin-bottom: 3px;
}
.pdf-root .pf-footer-val {
  font-size: 9.5pt;
  font-weight: 600;
  color: #1e40af;
  display: block;
}
</style>

<div class="pdf-root">

  <!-- HEADER -->
  <div class="pf-header">
    <div class="pf-header-main">
      <span class="pf-name">Muhammad Adam Afiq</span>
      <span class="pf-role">Software Developer</span>
      <div class="pf-contact-row">
        <span class="pf-contact-cell">muhdadamafiq@gmail.com</span>
        <span class="pf-contact-cell">github.com/muhdadamafiq</span>
        <span class="pf-contact-cell">Malaysia</span>
      </div>
    </div>
    <div class="pf-header-deco">
      <span class="pf-deco-mono">AA</span>
      <span class="pf-deco-lbl">Portfolio</span>
    </div>
  </div>

  <!-- PROFILE + SKILLS -->
  <div class="pf-page">
    <span class="pf-sec">Profile</span>
    <p class="pf-bio">I'm <strong>Adam Afiq</strong>, a Software Developer focused on building practical systems that solve real business problems. I specialise in <strong>dashboards and monitoring applications</strong> that give teams instant visibility into their data, <strong>internal tools</strong> that automate workflows, and <strong>web applications</strong> built for reliability and usability.</p>
    <p class="pf-bio">My approach is straightforward: understand the problem deeply, build a clean solution, and deliver something that actually gets used. I care about performance, maintainability, and making complex systems feel simple.</p>

    <div class="pf-stats">
      <div class="pf-stat-cell">
        <span class="pf-stat-n">15+</span>
        <span class="pf-stat-l">Projects Completed</span>
      </div>
      <div class="pf-stat-cell">
        <span class="pf-stat-n">3+</span>
        <span class="pf-stat-l">Years Experience</span>
      </div>
      <div class="pf-stat-cell">
        <span class="pf-stat-n">10+</span>
        <span class="pf-stat-l">Satisfied Clients</span>
      </div>
      <div class="pf-stat-cell">
        <span class="pf-stat-n">50+</span>
        <span class="pf-stat-l">Devices Monitored</span>
      </div>
    </div>

    <span class="pf-sec pf-sec-gap">Technical Skills</span>
    <div class="pf-sk-row">
      <div class="pf-sk-cell">
        <span class="pf-sk-cat">Languages</span>
        <span class="pf-sk-item">PHP</span>
        <span class="pf-sk-item">JavaScript</span>
        <span class="pf-sk-item">Python</span>
        <span class="pf-sk-item">HTML5 / CSS3</span>
        <span class="pf-sk-item">SQL</span>
      </div>
      <div class="pf-sk-cell">
        <span class="pf-sk-cat">Frameworks</span>
        <span class="pf-sk-item">Laravel</span>
        <span class="pf-sk-item">ReactJS</span>
        <span class="pf-sk-item">Bootstrap</span>
        <span class="pf-sk-item">Chart.js</span>
      </div>
    </div>
    <div class="pf-sk-row">
      <div class="pf-sk-cell">
        <span class="pf-sk-cat">Databases &amp; DevOps</span>
        <span class="pf-sk-item">MySQL</span>
        <span class="pf-sk-item">SQLite</span>
        <span class="pf-sk-item">Docker</span>
        <span class="pf-sk-item">Git / GitHub</span>
      </div>
      <div class="pf-sk-cell">
        <span class="pf-sk-cat">Specialisations</span>
        <span class="pf-sk-item">Dashboards &amp; Monitoring</span>
        <span class="pf-sk-item">IoT / Raspberry Pi</span>
        <span class="pf-sk-item">Jetson (NVIDIA)</span>
        <span class="pf-sk-item">SNMP / MQTT / WebSocket</span>
      </div>
    </div>
  </div>

  <!-- PROJECTS -->
  <div class="pf-page page-break">
    <span class="pf-sec">Featured Projects</span>

    ${display.length ? display.map(p => `
      <div class="pf-proj">
        <div class="pf-proj-meta">
          <div class="pf-proj-meta-l">
            <span class="pf-proj-cat">${p.category || 'Project'}</span>
            <span class="pf-proj-name">${p.title || ''}</span>
          </div>
        </div>
        <p class="pf-proj-desc">${p.longDescription || p.description || ''}</p>
        <span class="pf-proj-tech">Tech: ${(p.technologies || []).join(' &middot; ')}</span>
      </div>
    `).join('') : `
      <p class="pf-bio">Visit <strong>github.com/muhdadamafiq</strong> to explore all projects.</p>
    `}
  </div>

  <!-- EXPERIENCE -->
  <div class="pf-page page-break">
    <span class="pf-sec">Experience &amp; Background</span>

    <div class="pf-exp">
      <div class="pf-exp-hdr">
        <div class="pf-exp-hdr-l">
          <span class="pf-exp-role">Software Developer</span>
          <span class="pf-exp-co">Freelance / Independent</span>
        </div>
        <div class="pf-exp-hdr-r"><span class="pf-exp-period">2023 — Present</span></div>
      </div>
      <p class="pf-exp-desc">Developing custom monitoring dashboards, internal business tools, and web applications for clients across various industries. Delivering end-to-end solutions from requirements gathering through deployment and ongoing support.</p>
      <div class="pf-exp-tags">Dashboard Development &middot; Monitoring Systems &middot; IoT Integration &middot; Internal Tools</div>
    </div>
    <div class="pf-divider"></div>

    <div class="pf-exp">
      <div class="pf-exp-hdr">
        <div class="pf-exp-hdr-l">
          <span class="pf-exp-role">Junior Software Developer</span>
          <span class="pf-exp-co">Previous Company</span>
        </div>
        <div class="pf-exp-hdr-r"><span class="pf-exp-period">2021 — 2023</span></div>
      </div>
      <p class="pf-exp-desc">Built and maintained web-based business applications using PHP and MySQL. Worked closely with operations teams to translate requirements into functional software. Developed reporting modules and data management tools.</p>
      <div class="pf-exp-tags">PHP &middot; MySQL &middot; Web Applications &middot; Reporting</div>
    </div>
    <div class="pf-divider"></div>

    <div class="pf-exp">
      <div class="pf-exp-hdr">
        <div class="pf-exp-hdr-l">
          <span class="pf-exp-role">Diploma in Computer Science</span>
          <span class="pf-exp-co">University / Polytechnic</span>
        </div>
        <div class="pf-exp-hdr-r"><span class="pf-exp-period">2017 — 2021</span></div>
      </div>
      <p class="pf-exp-desc">Studied core software development fundamentals including programming, databases, networking, and system design. Developed multiple academic projects covering web application development and IoT systems.</p>
      <div class="pf-exp-tags">Computer Science &middot; Programming &middot; Databases &middot; Networking</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="pf-footer">
    <span class="pf-footer-title">Let's Build Something Together</span>
    <span class="pf-footer-sub">Open to new projects and collaborations. Feel free to reach out.</span>
    <div class="pf-footer-row">
      <div class="pf-footer-col">
        <span class="pf-footer-lbl">Email</span>
        <span class="pf-footer-val">muhdadamafiq@gmail.com</span>
      </div>
      <div class="pf-footer-col">
        <span class="pf-footer-lbl">GitHub</span>
        <span class="pf-footer-val">github.com/muhdadamafiq</span>
      </div>
      <div class="pf-footer-col">
        <span class="pf-footer-lbl">Location</span>
        <span class="pf-footer-val">Malaysia</span>
      </div>
    </div>
  </div>

</div>`;
  }

  // ── CV HTML ──────────────────────────────────────────────
  function cvHTML() {
    return `<style>
${baseCSS()}

/* ---- HEADER ---- */
.pdf-root .cv-header {
  display: table; width: 100%; table-layout: fixed;
  padding: 40px 48px 28px;
  border-bottom: 3px solid #4f46e5;
}
.pdf-root .cv-header-left { display: table-cell; vertical-align: top; }
.pdf-root .cv-header-right {
  display: table-cell; vertical-align: top; text-align: right;
  width: 38%;
}
.pdf-root .cv-name {
  font-size: 26pt; font-weight: 800; letter-spacing: -0.5px;
  color: #09090b; margin-bottom: 4px; display: block;
}
.pdf-root .cv-title { font-size: 12pt; color: #4f46e5; font-weight: 600; display: block; }
.pdf-root .cv-ci { font-size: 9.5pt; color: #4b5563; margin-bottom: 4px; display: block; }

/* ---- TWO-COLUMN BODY (table layout) ---- */
.pdf-root .cv-body {
  display: table; width: 100%; table-layout: fixed;
}
.pdf-root .cv-main {
  display: table-cell; width: 62%;
  padding: 32px 28px 40px 48px;
  border-right: 1px solid #e5e7eb;
  vertical-align: top;
}
.pdf-root .cv-side {
  display: table-cell; width: 38%;
  padding: 32px 24px 40px 24px;
  background: #f9fafb;
  vertical-align: top;
}

/* ---- SECTION ---- */
.pdf-root .cv-sec { margin-bottom: 26px; }
.pdf-root .cv-sec:last-child { margin-bottom: 0; }
.pdf-root .cv-sec-title {
  font-size: 8.5pt; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: #4f46e5;
  margin-bottom: 12px; padding-bottom: 6px;
  border-bottom: 1px solid #ede9fe; display: block;
}

/* ---- SUMMARY ---- */
.pdf-root .cv-summary { font-size: 10.5pt; color: #374151; line-height: 1.75; }

/* ---- EXPERIENCE ---- */
.pdf-root .cv-exp { margin-bottom: 18px; }
.pdf-root .cv-exp:last-child { margin-bottom: 0; }
.pdf-root .cv-exp-period {
  font-size: 8.5pt; font-weight: 700; color: #4f46e5;
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 2px; display: block;
}
.pdf-root .cv-exp-role {
  font-size: 12pt; font-weight: 700; color: #09090b;
  margin-bottom: 1px; display: block;
}
.pdf-root .cv-exp-company {
  font-size: 10pt; color: #6b7280;
  margin-bottom: 7px; display: block;
}
.pdf-root .cv-exp-desc { font-size: 9.5pt; color: #4b5563; line-height: 1.7; }
.pdf-root .cv-exp-tags { margin-top: 8px; }

/* ---- SKILLS ---- */
.pdf-root .cv-skill-grp { margin-bottom: 14px; }
.pdf-root .cv-skill-grp:last-child { margin-bottom: 0; }
.pdf-root .cv-skill-grp-title {
  font-size: 9pt; font-weight: 700; color: #374151;
  margin-bottom: 7px; display: block;
}

/* ---- SIDEBAR ---- */
.pdf-root .cv-side-sec { margin-bottom: 20px; }
.pdf-root .cv-side-sec:last-child { margin-bottom: 0; }
.pdf-root .cv-side-title {
  font-size: 8.5pt; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: #4f46e5;
  margin-bottom: 10px; padding-bottom: 6px;
  border-bottom: 1px solid #ede9fe; display: block;
}
.pdf-root .cv-side-item {
  font-size: 9.5pt; color: #374151;
  margin-bottom: 6px; display: block;
}
.pdf-root .cv-lang-row { display: table; width: 100%; margin-bottom: 7px; }
.pdf-root .cv-lang-name { display: table-cell; font-size: 9.5pt; color: #374151; }
.pdf-root .cv-lang-level { display: table-cell; text-align: right; font-size: 9pt; color: #6b7280; }
</style>

<div class="pdf-root">

  <!-- HEADER -->
  <div class="cv-header">
    <div class="cv-header-left">
      <span class="cv-name">Muhammad Adam Afiq</span>
      <span class="cv-title">Software Developer</span>
    </div>
    <div class="cv-header-right">
      <span class="cv-ci">muhdadamafiq@gmail.com</span>
      <span class="cv-ci">github.com/muhdadamafiq</span>
      <span class="cv-ci">Malaysia</span>
    </div>
  </div>

  <!-- BODY -->
  <div class="cv-body">

    <!-- MAIN COLUMN -->
    <div class="cv-main">

      <div class="cv-sec">
        <span class="cv-sec-title">Professional Summary</span>
        <p class="cv-summary">
          Software Developer with 3+ years of experience building dashboards, monitoring systems,
          internal tools, and web applications. Focused on delivering practical, reliable software
          that solves real business problems. Strong track record of end-to-end project delivery
          from requirements gathering through deployment and ongoing support.
        </p>
      </div>

      <div class="cv-sec">
        <span class="cv-sec-title">Work Experience</span>

        <div class="cv-exp">
          <span class="cv-exp-period">2023 — Present</span>
          <span class="cv-exp-role">Software Developer</span>
          <span class="cv-exp-company">Freelance / Independent</span>
          <p class="cv-exp-desc">Developing custom monitoring dashboards, internal business tools, and web applications for clients across various industries. Delivering end-to-end solutions from requirements gathering through deployment.</p>
          <div class="cv-exp-tags">
            <span class="tag">Dashboards</span><span class="tag">Monitoring</span>
            <span class="tag">IoT</span><span class="tag">Internal Tools</span>
          </div>
        </div>

        <div class="cv-exp">
          <span class="cv-exp-period">2021 — 2023</span>
          <span class="cv-exp-role">Junior Software Developer</span>
          <span class="cv-exp-company">Previous Company</span>
          <p class="cv-exp-desc">Built and maintained web-based business applications using PHP and MySQL. Translated business requirements into functional software. Developed reporting modules and data management tools.</p>
          <div class="cv-exp-tags">
            <span class="tag">PHP</span><span class="tag">MySQL</span>
            <span class="tag">Web Apps</span><span class="tag">Reporting</span>
          </div>
        </div>
      </div>

      <div class="cv-sec">
        <span class="cv-sec-title">Technical Skills</span>

        <div class="cv-skill-grp">
          <span class="cv-skill-grp-title">Languages</span>
          <span class="tag">PHP</span><span class="tag">JavaScript</span>
          <span class="tag">Python</span><span class="tag">HTML5</span>
          <span class="tag">CSS3</span><span class="tag">SQL</span>
        </div>

        <div class="cv-skill-grp">
          <span class="cv-skill-grp-title">Frameworks &amp; Libraries</span>
          <span class="tag">Laravel</span><span class="tag">ReactJS</span>
          <span class="tag">Bootstrap</span><span class="tag">Chart.js</span>
        </div>

        <div class="cv-skill-grp">
          <span class="cv-skill-grp-title">Databases &amp; DevOps</span>
          <span class="tag">MySQL</span><span class="tag">SQLite</span>
          <span class="tag">Docker</span><span class="tag">Git</span><span class="tag">GitHub</span>
        </div>

        <div class="cv-skill-grp">
          <span class="cv-skill-grp-title">Specialisations</span>
          <span class="tag">Dashboard Dev</span><span class="tag">IoT / Raspberry Pi</span>
          <span class="tag">Jetson Nano</span><span class="tag">SNMP</span>
          <span class="tag">MQTT</span><span class="tag">WebSocket</span>
        </div>
      </div>

    </div>

    <!-- SIDEBAR COLUMN -->
    <div class="cv-side">

      <div class="cv-side-sec">
        <span class="cv-side-title">Education</span>
        <span class="cv-side-item" style="font-weight:700;color:#09090b;">Diploma in Computer Science</span>
        <span class="cv-side-item">University / Polytechnic</span>
        <span class="cv-side-item" style="color:#4f46e5;font-weight:600;">2017 — 2021</span>
      </div>

      <div class="cv-side-sec">
        <span class="cv-side-title">Services Offered</span>
        <span class="cv-side-item">Dashboard Development</span>
        <span class="cv-side-item">Monitoring Systems</span>
        <span class="cv-side-item">Internal Tools</span>
        <span class="cv-side-item">Reporting Systems</span>
        <span class="cv-side-item">Web Applications</span>
        <span class="cv-side-item">Automation Solutions</span>
      </div>

      <div class="cv-side-sec">
        <span class="cv-side-title">Key Highlights</span>
        <span class="cv-side-item">15+ projects delivered end-to-end</span>
        <span class="cv-side-item">10+ satisfied clients</span>
        <span class="cv-side-item">50+ IoT devices monitored</span>
        <span class="cv-side-item">99.9% avg system uptime</span>
      </div>

      <div class="cv-side-sec">
        <span class="cv-side-title">Languages</span>
        <div class="cv-lang-row">
          <span class="cv-lang-name">Malay</span>
          <span class="cv-lang-level">Native</span>
        </div>
        <div class="cv-lang-row">
          <span class="cv-lang-name">English</span>
          <span class="cv-lang-level">Professional</span>
        </div>
      </div>

      <div class="cv-side-sec">
        <span class="cv-side-title">Contact</span>
        <span class="cv-side-item">muhdadamafiq@gmail.com</span>
        <span class="cv-side-item">github.com/muhdadamafiq</span>
        <span class="cv-side-item">Malaysia</span>
      </div>

    </div>
  </div>

</div>`;
  }

  // ── Core generator ───────────────────────────────────────
  async function generate(type) {
    if (typeof html2pdf === 'undefined') {
      toast('PDF library not loaded — check your internet connection and refresh.', 'error');
      return;
    }

    const isPF = type === 'portfolio';
    const btn = document.querySelector(isPF ? '.download-btn-primary' : '.download-btn-secondary');
    setLoading(btn, true);

    const overlay = showOverlay();

    // Load projects only for portfolio.
    // Mirror the same version-aware logic used in projects.js:
    // if localStorage version >= JSON version, use localStorage (may have
    // manage.html edits); otherwise re-seed from the deployed JSON.
    let projects = [];
    if (isPF) {
      let jsonData = null;
      try {
        const r = await fetch('data/projects.json');
        if (r.ok) jsonData = await r.json();
      } catch (_) {}

      const jsonVersion = jsonData ? (jsonData._v || 1) : 0;
      const storedVersion = parseInt(localStorage.getItem('portfolio_projects_v') || '0', 10);
      const stored = localStorage.getItem('portfolio_projects');

      if (stored && storedVersion >= jsonVersion) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) projects = parsed;
        } catch (_) {}
      }
      if (!projects.length && jsonData) {
        projects = jsonData.projects || [];
      }
    }

    // Append container to body in normal document flow.
    // The loading overlay (position:fixed) covers it visually
    // while html2canvas can still render it from the DOM.
    const container = document.createElement('div');
    container.style.cssText = 'width:794px;background:#fff;margin:0;padding:0;';
    container.innerHTML = isPF ? portfolioHTML(projects) : cvHTML();
    document.body.appendChild(container);

    // Give the browser TWO paint cycles to lay out & render the
    // injected HTML before html2canvas captures it.
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, 250));

    const opts = {
      margin: 0,
      filename: isPF ? 'Adam_Afiq_Portfolio.pdf' : 'Adam_Afiq_CV.pdf',
      image: { type: 'jpeg', quality: 0.97 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
        logging: false,
        // scrollX/scrollY = 0 so html2canvas doesn't shift the
        // capture based on the user's current page scroll.
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    try {
      await html2pdf().set(opts).from(container).save();
      toast('PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('[PDF Generator] Error:', err);
      toast('Generation failed — please try again.', 'error');
    } finally {
      document.body.removeChild(container);
      removeOverlay();
      setLoading(btn, false);
    }
  }

  // ── Public API ───────────────────────────────────────────
  window.downloadPortfolioPDF = () => generate('portfolio');
  window.downloadCVPDF        = () => generate('cv');

})();
