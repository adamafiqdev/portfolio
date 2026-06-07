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

/* ---- COVER ---- */
.pdf-root .cover {
  width: 210mm;
  height: 297mm;
  background: linear-gradient(150deg,#1e1b4b 0%,#312e81 45%,#4338ca 100%);
  color: #fff;
  padding: 64px 56px;
  page-break-after: always;
  overflow: hidden;
  position: relative;
}
.pdf-root .cover-top { margin-bottom: auto; }
.pdf-root .cover-logo {
  width: 54px; height: 54px;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  font-size: 22pt; font-weight: 800;
  text-align: center; line-height: 54px;
  margin-bottom: 52px;
  letter-spacing: -1px;
}
.pdf-root .cover-name {
  font-size: 36pt; font-weight: 800;
  letter-spacing: -1px; line-height: 1.1;
  margin-bottom: 10px;
}
.pdf-root .cover-role {
  font-size: 15pt; font-weight: 300;
  opacity: 0.8; letter-spacing: 2px;
  margin-bottom: 36px;
}
.pdf-root .cover-tagline {
  font-size: 11pt; opacity: 0.7;
  line-height: 1.7; max-width: 360px;
  margin-bottom: 0;
}
.pdf-root .cover-bottom { margin-top: 80px; }
.pdf-root .cover-rule {
  width: 56px; height: 2px;
  background: rgba(255,255,255,0.3);
  margin-bottom: 24px;
}
.pdf-root .cover-lbl {
  font-size: 8.5pt; letter-spacing: 2px;
  text-transform: uppercase; opacity: 0.45;
  margin-bottom: 12px;
}
.pdf-root .cover-ci { font-size: 10pt; opacity: 0.8; margin-bottom: 6px; }

/* ---- PAGE ---- */
.pdf-root .pdf-page { width: 210mm; padding: 52px 56px; }

/* ---- SECTION LABELS ---- */
.pdf-root .sec-label {
  font-size: 8.5pt; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: #4f46e5; margin-bottom: 8px;
}
.pdf-root .sec-title {
  font-size: 22pt; font-weight: 800; letter-spacing: -0.5px;
  color: #09090b; margin-bottom: 6px; line-height: 1.15;
}
.pdf-root .sec-rule { height: 2px; background: #ede9fe; margin: 20px 0 28px; }

/* ---- ABOUT TEXT ---- */
.pdf-root .about-p {
  font-size: 11pt; color: #374151;
  line-height: 1.78; margin-bottom: 14px;
}

/* ---- STATS (table layout for reliable rendering) ---- */
.pdf-root .stats-table {
  display: table; width: 100%;
  table-layout: fixed; border-collapse: separate;
  border-spacing: 12px 0; margin: 32px 0;
}
.pdf-root .stat-cell {
  display: table-cell;
  background: #f5f3ff; border-radius: 10px;
  padding: 18px 12px; text-align: center;
}
.pdf-root .stat-n {
  font-size: 22pt; font-weight: 800;
  color: #4f46e5; line-height: 1;
  margin-bottom: 5px; display: block;
}
.pdf-root .stat-l {
  font-size: 8.5pt; color: #71717a;
  font-weight: 600; line-height: 1.3; display: block;
}

/* ---- SKILLS (table layout) ---- */
.pdf-root .skills-row {
  display: table; width: 100%;
  table-layout: fixed; border-collapse: separate;
  border-spacing: 14px 14px; margin-top: -14px;
}
.pdf-root .sg {
  display: table-cell;
  background: #f9fafb; border-left: 3px solid #4f46e5;
  border-radius: 8px; padding: 14px 16px;
  vertical-align: top;
}
.pdf-root .sg-title {
  font-size: 8.5pt; font-weight: 700; color: #4f46e5;
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 9px; display: block;
}

/* ---- PROJECTS ---- */
.pdf-root .proj-item {
  border: 1px solid #e5e7eb; border-radius: 10px;
  overflow: hidden; margin-bottom: 20px;
  page-break-inside: avoid;
}
.pdf-root .proj-head {
  padding: 16px 20px; background: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
}
.pdf-root .proj-cat {
  font-size: 8pt; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: #4f46e5;
  margin-bottom: 3px; display: block;
}
.pdf-root .proj-name {
  font-size: 13pt; font-weight: 800; color: #09090b; display: block;
}
.pdf-root .proj-body { padding: 14px 20px; }
.pdf-root .proj-desc {
  font-size: 10pt; color: #4b5563;
  line-height: 1.7; margin-bottom: 12px;
}

/* ---- EXPERIENCE ---- */
.pdf-root .exp-item {
  border-left: 3px solid #4f46e5; padding-left: 20px;
  margin-bottom: 28px; page-break-inside: avoid;
}
.pdf-root .exp-item:last-child { margin-bottom: 0; }
.pdf-root .exp-period {
  font-size: 8.5pt; font-weight: 700; color: #4f46e5;
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 4px; display: block;
}
.pdf-root .exp-role {
  font-size: 13pt; font-weight: 700; color: #09090b;
  margin-bottom: 2px; display: block;
}
.pdf-root .exp-company {
  font-size: 10.5pt; color: #6b7280;
  margin-bottom: 10px; display: block;
}
.pdf-root .exp-desc { font-size: 10pt; color: #4b5563; line-height: 1.7; }
.pdf-root .exp-tags { margin-top: 10px; }

/* ---- CONTACT FOOTER ---- */
.pdf-root .contact-footer {
  background: #1e1b4b; color: #fff;
  padding: 52px 56px;
}
.pdf-root .cf-label {
  font-size: 8.5pt; opacity: 0.5; text-transform: uppercase;
  letter-spacing: 2px; margin-bottom: 8px; display: block;
}
.pdf-root .cf-title {
  font-size: 20pt; font-weight: 800;
  margin-bottom: 8px; letter-spacing: -0.3px; display: block;
}
.pdf-root .cf-sub {
  font-size: 10.5pt; opacity: 0.7;
  margin-bottom: 28px; display: block;
}
.pdf-root .cf-grid { display: table; width: 100%; table-layout: fixed; }
.pdf-root .cf-cell { display: table-cell; vertical-align: top; }
.pdf-root .cf-item-lbl {
  font-size: 8.5pt; opacity: 0.45; text-transform: uppercase;
  letter-spacing: 1px; margin-bottom: 4px; display: block;
}
.pdf-root .cf-item-val { font-size: 10.5pt; font-weight: 600; display: block; }
</style>

<div class="pdf-root">

  <!-- COVER PAGE -->
  <div class="cover">
    <div class="cover-logo">AA</div>
    <div class="cover-name">Muhammad Adam Afiq</div>
    <div class="cover-role">Software Developer</div>
    <div class="cover-tagline">
      Building dashboards, monitoring systems, and web applications
      that transform complex data into actionable insights.
    </div>
    <div class="cover-bottom">
      <div class="cover-rule"></div>
      <div class="cover-lbl">Contact</div>
      <div class="cover-ci">Email &nbsp;— muhdadamafiq@gmail.com</div>
      <div class="cover-ci">GitHub — github.com/muhdadamafiq</div>
      <div class="cover-ci">Location — Malaysia</div>
    </div>
  </div>

  <!-- ABOUT + SKILLS -->
  <div class="pdf-page">
    <div class="sec-label">Profile</div>
    <div class="sec-title">About Me</div>
    <div class="sec-rule"></div>

    <p class="about-p">
      I'm <strong>Adam Afiq</strong>, a Software Developer focused on building practical systems
      that solve real business problems. I specialize in <strong>dashboards and monitoring
      applications</strong> that give teams instant visibility into their data,
      <strong>internal tools</strong> that automate workflows, and <strong>web applications</strong>
      built for reliability and usability.
    </p>
    <p class="about-p">
      My approach is straightforward: understand the problem deeply, build a clean solution,
      and deliver something that actually gets used. I care about performance, maintainability,
      and making complex systems feel simple.
    </p>

    <!-- Stats as table for reliable html2canvas rendering -->
    <div class="stats-table">
      <div class="stat-cell"><span class="stat-n">15+</span><span class="stat-l">Projects Completed</span></div>
      <div class="stat-cell"><span class="stat-n">3+</span><span class="stat-l">Years Experience</span></div>
      <div class="stat-cell"><span class="stat-n">10+</span><span class="stat-l">Satisfied Clients</span></div>
      <div class="stat-cell"><span class="stat-n">50+</span><span class="stat-l">Devices Monitored</span></div>
    </div>

    <div class="sec-label" style="margin-top:32px;">Technical Skills</div>
    <div class="sec-rule" style="margin-top:8px;"></div>

    <!-- Skills as table rows for reliable rendering -->
    <div class="skills-row">
      <div class="sg">
        <span class="sg-title">Languages</span>
        <span class="tag">PHP</span><span class="tag">JavaScript</span>
        <span class="tag">Python</span><span class="tag">HTML5</span>
        <span class="tag">CSS3</span><span class="tag">SQL</span>
      </div>
      <div class="sg">
        <span class="sg-title">Frameworks</span>
        <span class="tag">Laravel</span><span class="tag">ReactJS</span>
        <span class="tag">Bootstrap</span><span class="tag">Chart.js</span>
      </div>
    </div>
    <div class="skills-row">
      <div class="sg">
        <span class="sg-title">Databases &amp; DevOps</span>
        <span class="tag">MySQL</span><span class="tag">SQLite</span>
        <span class="tag">Docker</span><span class="tag">Git</span>
        <span class="tag">GitHub</span>
      </div>
      <div class="sg">
        <span class="sg-title">Specialisations</span>
        <span class="tag">Dashboards</span><span class="tag">IoT</span>
        <span class="tag">Raspberry Pi</span><span class="tag">Jetson</span>
        <span class="tag">SNMP</span><span class="tag">MQTT</span>
      </div>
    </div>
  </div>

  <!-- PROJECTS -->
  <div class="pdf-page page-break">
    <div class="sec-label">Portfolio</div>
    <div class="sec-title">Featured Projects</div>
    <div class="sec-rule"></div>

    ${display.length ? display.map(p => `
      <div class="proj-item">
        <div class="proj-head">
          <span class="proj-cat">${p.category || 'Project'}</span>
          <span class="proj-name">${p.title || ''}</span>
        </div>
        <div class="proj-body">
          <p class="proj-desc">${p.longDescription || p.description || ''}</p>
          <div>${(p.technologies || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
        </div>
      </div>
    `).join('') : `
      <p class="about-p">
        Visit <strong>github.com/muhdadamafiq</strong> to explore all projects.
      </p>
    `}
  </div>

  <!-- EXPERIENCE -->
  <div class="pdf-page page-break">
    <div class="sec-label">Background</div>
    <div class="sec-title">Experience</div>
    <div class="sec-rule"></div>

    <div class="exp-item">
      <span class="exp-period">2023 — Present</span>
      <span class="exp-role">Software Developer</span>
      <span class="exp-company">Freelance / Independent</span>
      <p class="exp-desc">Developing custom monitoring dashboards, internal business tools, and web applications for clients across various industries. Delivering end-to-end solutions from requirements gathering through deployment and ongoing support.</p>
      <div class="exp-tags">
        <span class="tag">Dashboard Development</span><span class="tag">Monitoring Systems</span>
        <span class="tag">IoT Integration</span><span class="tag">Internal Tools</span>
      </div>
    </div>

    <div class="exp-item">
      <span class="exp-period">2021 — 2023</span>
      <span class="exp-role">Junior Software Developer</span>
      <span class="exp-company">Previous Company</span>
      <p class="exp-desc">Built and maintained web-based business applications using PHP and MySQL. Worked closely with operations teams to translate requirements into functional software. Developed reporting modules and data management tools.</p>
      <div class="exp-tags">
        <span class="tag">PHP</span><span class="tag">MySQL</span>
        <span class="tag">Web Applications</span><span class="tag">Reporting</span>
      </div>
    </div>

    <div class="exp-item">
      <span class="exp-period">2017 — 2021</span>
      <span class="exp-role">Diploma in Computer Science</span>
      <span class="exp-company">University / Polytechnic</span>
      <p class="exp-desc">Studied core software development fundamentals including programming, databases, networking, and system design. Developed multiple academic projects covering web application development and IoT systems.</p>
      <div class="exp-tags">
        <span class="tag">Computer Science</span><span class="tag">Programming</span>
        <span class="tag">Databases</span><span class="tag">Networking</span>
      </div>
    </div>
  </div>

  <!-- CONTACT FOOTER -->
  <div class="contact-footer">
    <span class="cf-label">Get In Touch</span>
    <span class="cf-title">Let's build something together</span>
    <span class="cf-sub">Open to new projects and collaborations.</span>
    <div class="cf-grid">
      <div class="cf-cell">
        <span class="cf-item-lbl">Email</span>
        <span class="cf-item-val">muhdadamafiq@gmail.com</span>
      </div>
      <div class="cf-cell">
        <span class="cf-item-lbl">GitHub</span>
        <span class="cf-item-val">github.com/muhdadamafiq</span>
      </div>
      <div class="cf-cell">
        <span class="cf-item-lbl">Location</span>
        <span class="cf-item-val">Malaysia</span>
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
