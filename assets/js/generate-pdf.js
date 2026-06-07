// ============================================================
// PDF Generator — Adam Afiq Portfolio
// Client-side, GitHub Pages compatible (no backend needed).
// Requires html2pdf.js loaded via CDN before this script.
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
  function portfolioHTML(projects, sd) {
    const about    = sd.about    || {};
    const contact  = sd.contact  || {};
    const name     = about.name     || '';
    const role     = about.role     || '';
    const email    = contact.email    || '';
    const github   = contact.github   || '';
    const location = contact.location || '';
    const bio      = about.bio   || [];
    const stats    = about.stats || [];
    const techStack  = sd.techStack  || [];
    const experience = sd.experience || [];
    const initials   = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'AA';

    const featured = projects.filter(p => p.featured);
    const others   = projects.filter(p => !p.featured);
    const display  = [...featured, ...others];

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
  padding: 30px 40px 24px;
  vertical-align: middle;
  border-bottom: 3px solid #2563eb;
}
.pdf-root .pf-header-deco {
  display: table-cell;
  width: 130px;
  background: linear-gradient(150deg, #f97316 0%, #fb923c 50%, #fbbf24 100%);
  text-align: center;
  vertical-align: middle;
  border-bottom: 3px solid #2563eb;
}
.pdf-root .pf-name {
  font-size: 22pt;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #0f172a;
  display: block;
  margin-bottom: 3px;
  line-height: 1.1;
}
.pdf-root .pf-role {
  font-size: 11pt;
  font-weight: 600;
  color: #2563eb;
  display: block;
  margin-bottom: 11px;
}
.pdf-root .pf-contact-row {
  display: table;
  width: 100%;
  table-layout: fixed;
}
.pdf-root .pf-contact-cell {
  display: table-cell;
  font-size: 8pt;
  color: #4b5563;
  vertical-align: top;
}
.pdf-root .pf-deco-mono {
  font-size: 24pt;
  font-weight: 900;
  color: rgba(255,255,255,0.9);
  letter-spacing: -2px;
  display: block;
  line-height: 1;
  margin-bottom: 5px;
}
.pdf-root .pf-deco-lbl {
  font-size: 6.5pt;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.72);
  display: block;
}

/* ---- PROFILE BODY: sidebar (skills) + main (bio + stats) ---- */
.pdf-root .pf-body {
  display: table;
  width: 210mm;
  table-layout: fixed;
}
.pdf-root .pf-sidebar {
  display: table-cell;
  width: 25%;
  padding: 26px 16px 28px 40px;
  border-right: 2px solid #bfdbfe;
  background: #f8fafc;
  vertical-align: top;
}
.pdf-root .pf-main {
  display: table-cell;
  width: 75%;
  padding: 26px 40px 28px 22px;
  vertical-align: top;
}

/* ---- SECTION HEADING ---- */
.pdf-root .pf-sec {
  font-size: 8.5pt;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: #2563eb;
  display: block;
  padding-bottom: 6px;
  border-bottom: 2px solid #bfdbfe;
  margin-bottom: 14px;
}

/* ---- BIO ---- */
.pdf-root .pf-bio {
  font-size: 9.5pt;
  color: #374151;
  line-height: 1.8;
  margin-bottom: 9px;
}

/* ---- SKILL ITEMS (sidebar list) ---- */
.pdf-root .pf-sk-item {
  font-size: 9pt;
  color: #334155;
  display: block;
  margin-bottom: 6px;
  padding-left: 8px;
  border-left: 3px solid #bfdbfe;
}

/* ---- STATS ---- */
.pdf-root .pf-stats {
  display: table;
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 7px 0;
  margin-top: 16px;
}
.pdf-root .pf-stat-cell {
  display: table-cell;
  border-top: 3px solid #2563eb;
  padding: 9px 4px 7px;
  text-align: center;
}
.pdf-root .pf-stat-n {
  font-size: 15pt;
  font-weight: 800;
  color: #1e40af;
  line-height: 1;
  display: block;
  margin-bottom: 4px;
}
.pdf-root .pf-stat-l {
  font-size: 7pt;
  color: #6b7280;
  font-weight: 600;
  line-height: 1.3;
  display: block;
}

/* ---- PAGE ---- */
.pdf-root .pf-page { width: 210mm; padding: 28px 40px 28px; }
.pdf-root .pf-page.page-break { page-break-before: always; padding-top: 36px; }

/* ---- PROJECT CARDS (alternating image/details) ---- */
.pdf-root .pf-proj-row {
  width: 100%;
  margin-bottom: 16px;
  page-break-inside: avoid;
  border-collapse: collapse;
}
.pdf-root .pf-proj-details {
  border: 1px solid #e2e8f0;
  border-left: 4px solid #2563eb;
  background: #fafafa;
  padding: 13px 14px;
  height: 150px;
}
.pdf-root .pf-proj-details-full {
  border: 1px solid #e2e8f0;
  border-left: 4px solid #2563eb;
  background: #fafafa;
  padding: 13px 16px;
  margin-bottom: 16px;
  page-break-inside: avoid;
}
.pdf-root .pf-proj-img-wrap {
  border: 1px solid #e2e8f0;
  height: 150px;
  overflow: hidden;
  background: #eff6ff;
}
.pdf-root .pf-proj-img-wrap img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}
.pdf-root .pf-proj-cat {
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #2563eb;
  display: block;
  margin-bottom: 3px;
}
.pdf-root .pf-proj-name {
  font-size: 10pt;
  font-weight: 700;
  color: #0f172a;
  display: block;
  margin-bottom: 5px;
}
.pdf-root .pf-proj-desc {
  font-size: 8pt;
  color: #4b5563;
  line-height: 1.65;
  margin-bottom: 6px;
}
.pdf-root .pf-proj-tech {
  font-size: 7.5pt;
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
  font-size: 11pt;
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
  padding: 20px 40px 28px;
  background: #eff6ff;
  border-top: 2px solid #bfdbfe;
}
.pdf-root .pf-footer-title {
  font-size: 12pt;
  font-weight: 800;
  color: #1e40af;
  display: block;
  margin-bottom: 4px;
}
.pdf-root .pf-footer-sub {
  font-size: 9pt;
  color: #4b5563;
  margin-bottom: 12px;
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
      <span class="pf-name">${name}</span>
      <span class="pf-role">${role}</span>
    </div>
    <div class="pf-header-deco">
      <span class="pf-deco-mono">${initials}</span>
      <span class="pf-deco-lbl">Portfolio</span>
    </div>
  </div>

  <!-- PROFILE BODY: LEFT = Technical Skills, RIGHT = Bio + Stats -->
  <div class="pf-body">

    <div class="pf-sidebar">
      <span class="pf-sec">Contact</span>
      ${email    ? `<span class="pf-sk-item" style="font-size:8pt;word-break:break-all">${email}</span>`    : ''}
      ${github   ? `<span class="pf-sk-item" style="font-size:8pt">${github}</span>`   : ''}
      ${location ? `<span class="pf-sk-item" style="font-size:8pt">${location}</span>` : ''}

      <span class="pf-sec" style="margin-top:20px">Technical Skills</span>
      ${techStack.map(t => `<span class="pf-sk-item">${t.name}</span>`).join('')}
    </div>

    <div class="pf-main">
      <span class="pf-sec">Profile</span>
      ${bio.map(p => `<p class="pf-bio">${p}</p>`).join('')}
      <div class="pf-stats">
        ${stats.map(s => `
          <div class="pf-stat-cell">
            <span class="pf-stat-n">${s.target}${s.suffix || ''}</span>
            <span class="pf-stat-l">${s.label}</span>
          </div>`).join('')}
      </div>

      <span class="pf-sec" style="margin-top:22px">Experience &amp; Background</span>
      ${experience.map((exp, i) => `
        <div class="pf-exp">
          <div class="pf-exp-hdr">
            <div class="pf-exp-hdr-l">
              <span class="pf-exp-role">${exp.role || ''}</span>
              <span class="pf-exp-co">${exp.company || ''}</span>
            </div>
            <div class="pf-exp-hdr-r"><span class="pf-exp-period">${exp.period || ''}</span></div>
          </div>
          <p class="pf-exp-desc">${exp.desc || ''}</p>
          ${exp.tags && exp.tags.length ? `<div class="pf-exp-tags">${exp.tags.join(' &middot; ')}</div>` : ''}
        </div>
        ${i < experience.length - 1 ? '<div class="pf-divider"></div>' : ''}
      `).join('')}
    </div>

  </div>

  <!-- PROJECTS: alternating image/details cards -->
  <div class="pf-page page-break">
    <span class="pf-sec">Featured Projects</span>

    ${(() => {
      if (!display.length) return `<p class="pf-bio">Visit <strong>${github || 'GitHub'}</strong> to explore all projects.</p>`;
      let imgIdx = 0;
      return display.map(p => {
        const hasImage = !!p.coverImage;
        const descShort = (p.description || '').length > 130 ? (p.description || '').slice(0, 130) + '…' : (p.description || '');
        const descFull  = (p.description || '').length > 220 ? (p.description || '').slice(0, 220) + '…' : (p.description || '');
        const techList  = (p.technologies || []).slice(0, 6).join(' &middot; ');

        if (!hasImage) {
          return `
            <div class="pf-proj-details-full">
              <span class="pf-proj-cat">${p.category || ''}</span>
              <span class="pf-proj-name">${p.title || ''}</span>
              <p class="pf-proj-desc" style="margin-bottom:7px">${descFull}</p>
              <span class="pf-proj-tech">${techList}</span>
            </div>`;
        }

        const isEven = imgIdx % 2 === 0;
        imgIdx++;

        const detailsCell = `
          <div class="pf-proj-details">
            <span class="pf-proj-cat">${p.category || ''}</span>
            <span class="pf-proj-name">${p.title || ''}</span>
            <p class="pf-proj-desc">${descShort}</p>
            <span class="pf-proj-tech">${techList}</span>
          </div>`;
        const imageCell = `<div class="pf-proj-img-wrap"><img src="${p.coverImage}" alt=""></div>`;

        const leftContent  = isEven ? detailsCell : imageCell;
        const rightContent = isEven ? imageCell   : detailsCell;
        const leftW  = isEven ? '75%' : '25%';
        const rightW = isEven ? '25%' : '75%';
        return `
          <table class="pf-proj-row" style="table-layout:fixed;width:100%">
            <tr>
              <td style="width:${leftW};vertical-align:top;padding-right:7px">${leftContent}</td>
              <td style="width:${rightW};vertical-align:top;padding-left:7px">${rightContent}</td>
            </tr>
          </table>`;
      }).join('');
    })()}
  </div>

  <!-- FOOTER: own page, pinned to bottom via table vertical-align -->
  <!-- 267mm = A4 (297mm) minus top+bottom margins (15mm each) -->
  <div style="page-break-before:always;display:table;width:210mm;min-height:267mm;table-layout:fixed;">
    <div style="display:table-cell;vertical-align:bottom;">
      <div class="pf-footer">
        <span class="pf-footer-title">Let's Build Something Together</span>
        <span class="pf-footer-sub">Open to new projects and collaborations. Feel free to reach out.</span>
        <div class="pf-footer-row">
          ${email    ? `<div class="pf-footer-col"><span class="pf-footer-lbl">Email</span><span class="pf-footer-val">${email}</span></div>`       : ''}
          ${github   ? `<div class="pf-footer-col"><span class="pf-footer-lbl">GitHub</span><span class="pf-footer-val">${github}</span></div>`      : ''}
          ${location ? `<div class="pf-footer-col"><span class="pf-footer-lbl">Location</span><span class="pf-footer-val">${location}</span></div>` : ''}
        </div>
      </div>
    </div>
  </div>

</div>`;
  }

  // ── CV HTML ──────────────────────────────────────────────
  function cvHTML(sd) {
    const about    = sd.about    || {};
    const contact  = sd.contact  || {};
    const name     = about.name     || '';
    const role     = about.role     || '';
    const email    = contact.email    || '';
    const github   = contact.github   || '';
    const location = contact.location || '';
    const bio      = about.bio   || [];
    const stats    = about.stats || [];
    const techStack  = sd.techStack  || [];
    const experience = sd.experience || [];
    const services   = sd.services   || [];

    // Strip HTML tags for plain-text summary paragraph
    const summary = bio.map(p => p.replace(/<[^>]+>/g, '')).join(' ');

    // Separate work experience from education entries
    const eduKeywords = /diploma|bachelor|master|phd|degree/i;
    const uniKeywords = /university|polytechnic|college|school|institute/i;
    const workExp = experience.filter(e => !eduKeywords.test(e.role || '') && !uniKeywords.test(e.company || ''));
    const eduExp  = experience.filter(e =>  eduKeywords.test(e.role || '') ||  uniKeywords.test(e.company || ''));

    return `<style>
${baseCSS()}

/* ---- HEADER ---- */
.pdf-root .cv-header {
  display: table; width: 100%; table-layout: fixed;
  padding: 36px 48px 28px;
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

/* ---- TWO-COLUMN BODY ---- */
.pdf-root .cv-body {
  display: table; width: 100%; table-layout: fixed;
}
.pdf-root .cv-main {
  display: table-cell; width: 62%;
  padding: 32px 28px 36px 48px;
  border-right: 1px solid #e5e7eb;
  vertical-align: top;
}
.pdf-root .cv-side {
  display: table-cell; width: 38%;
  padding: 32px 24px 36px 24px;
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
      <span class="cv-name">${name}</span>
      <span class="cv-title">${role}</span>
    </div>
    <div class="cv-header-right">
      ${email    ? `<span class="cv-ci">${email}</span>`    : ''}
      ${github   ? `<span class="cv-ci">${github}</span>`   : ''}
      ${location ? `<span class="cv-ci">${location}</span>` : ''}
    </div>
  </div>

  <!-- BODY -->
  <div class="cv-body">

    <!-- MAIN COLUMN -->
    <div class="cv-main">

      <div class="cv-sec">
        <span class="cv-sec-title">Professional Summary</span>
        <p class="cv-summary">${summary}</p>
      </div>

      <div class="cv-sec">
        <span class="cv-sec-title">Work Experience</span>
        ${workExp.map(exp => `
          <div class="cv-exp">
            <span class="cv-exp-period">${exp.period || ''}</span>
            <span class="cv-exp-role">${exp.role || ''}</span>
            <span class="cv-exp-company">${exp.company || ''}</span>
            <p class="cv-exp-desc">${exp.desc || ''}</p>
            ${exp.tags && exp.tags.length ? `<div class="cv-exp-tags">${exp.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="cv-sec">
        <span class="cv-sec-title">Technical Skills</span>
        <div class="cv-skill-grp">
          ${techStack.map(t => `<span class="tag">${t.name}</span>`).join('')}
        </div>
      </div>

    </div>

    <!-- SIDEBAR COLUMN -->
    <div class="cv-side">

      ${eduExp.length ? `
        <div class="cv-side-sec">
          <span class="cv-side-title">Education</span>
          ${eduExp.map(e => `
            <span class="cv-side-item" style="font-weight:700;color:#09090b;">${e.role || ''}</span>
            <span class="cv-side-item">${e.company || ''}</span>
            ${e.period ? `<span class="cv-side-item" style="color:#4f46e5;font-weight:600;">${e.period}</span>` : ''}
          `).join('')}
        </div>
      ` : ''}

      ${services.length ? `
        <div class="cv-side-sec">
          <span class="cv-side-title">Services Offered</span>
          ${services.map(s => `<span class="cv-side-item">${s.title}</span>`).join('')}
        </div>
      ` : ''}

      ${stats.length ? `
        <div class="cv-side-sec">
          <span class="cv-side-title">Key Highlights</span>
          ${stats.map(s => `<span class="cv-side-item">${s.target}${s.suffix || ''} ${s.label}</span>`).join('')}
        </div>
      ` : ''}

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
        ${email    ? `<span class="cv-side-item">${email}</span>`    : ''}
        ${github   ? `<span class="cv-side-item">${github}</span>`   : ''}
        ${location ? `<span class="cv-side-item">${location}</span>` : ''}
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

    // ── Load site.json with version-aware localStorage logic ──
    let siteData = {};
    try {
      let jsonSiteData = null;
      try {
        const r = await fetch('data/site.json');
        if (r.ok) jsonSiteData = await r.json();
      } catch (_) {}

      const jsonVersion   = jsonSiteData ? (jsonSiteData._v || 1) : 0;
      const storedVersion = parseInt(localStorage.getItem('portfolio_site_v') || '0', 10);
      const stored        = localStorage.getItem('portfolio_site');

      if (stored && storedVersion >= jsonVersion) {
        try { siteData = JSON.parse(stored); } catch (_) {}
      }
      if (!Object.keys(siteData).length && jsonSiteData) {
        siteData = jsonSiteData;
      }
    } catch (_) {}

    // ── Load projects.json (portfolio only) ──────────────────
    let projects = [];
    if (isPF) {
      let jsonData = null;
      try {
        const r = await fetch('data/projects.json');
        if (r.ok) jsonData = await r.json();
      } catch (_) {}

      const jsonVersion   = jsonData ? (jsonData._v || 1) : 0;
      const storedVersion = parseInt(localStorage.getItem('portfolio_projects_v') || '0', 10);
      const stored        = localStorage.getItem('portfolio_projects');

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

    // Append container in normal document flow so html2canvas can render it.
    // The loading overlay (position:fixed) covers it visually.
    const container = document.createElement('div');
    container.style.cssText = 'width:794px;background:#fff;margin:0;padding:0;';
    container.innerHTML = isPF ? portfolioHTML(projects, siteData) : cvHTML(siteData);
    document.body.appendChild(container);

    // Give the browser TWO paint cycles to lay out & render before capture.
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, 250));

    const opts = {
      margin: [15, 0, 15, 0], // 15mm top/bottom spacing on every A4 page
      filename: isPF ? 'Adam_Afiq_Portfolio.pdf' : 'Adam_Afiq_CV.pdf',
      image: { type: 'jpeg', quality: 0.97 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
        logging: false,
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
