// ============================================================
// PDF Generator — Adam Afiq Portfolio
// Client-side generation using html2pdf.js (CDN)
// Works entirely on GitHub Pages — no backend required.
// ============================================================

(function () {
  'use strict';

  // ── PDF options ─────────────────────────────────────────
  const PDF_OPTIONS = {
    image: { type: 'jpeg', quality: 0.97 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: '#ffffff',
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  // ── Toast ───────────────────────────────────────────────
  function toast(msg, type) {
    let el = document.getElementById('pdfToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pdfToast';
      Object.assign(el.style, {
        position: 'fixed', bottom: '32px', left: '50%',
        transform: 'translateX(-50%) translateY(10px)',
        background: 'var(--bg-secondary, #18181b)',
        color: 'var(--text-primary, #fafafa)',
        border: '1px solid var(--border, rgba(255,255,255,0.1))',
        borderRadius: '10px', padding: '12px 22px',
        fontSize: '14px', fontWeight: '600',
        fontFamily: 'var(--font, system-ui, sans-serif)',
        zIndex: '9999',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', gap: '10px',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: '0', pointerEvents: 'none',
      });
      document.body.appendChild(el);
    }
    const icons = { loading: '⏳', success: '✅', error: '❌' };
    el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    if (type !== 'loading') {
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(10px)';
      }, 3500);
    }
  }

  // ── Button loading state ────────────────────────────────
  function setLoading(btn, on) {
    if (!btn) return;
    if (on) {
      btn._html = btn.innerHTML;
      btn.disabled = true;
      btn.style.opacity = '0.7';
      const nameEl = btn.querySelector('.download-btn-name');
      if (nameEl) nameEl.textContent = 'Generating PDF…';
    } else {
      btn.innerHTML = btn._html || btn.innerHTML;
      btn.disabled = false;
      btn.style.opacity = '';
    }
  }

  // ── Shared PDF CSS ──────────────────────────────────────
  function baseCSS() {
    return `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      .pdf-root {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, Helvetica, sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #09090b;
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        width: 210mm;
      }
      .tag {
        display: inline-block;
        background: #ede9fe;
        color: #4338ca;
        font-size: 8.5pt;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 4px;
        margin: 2px 2px 2px 0;
      }
      .page-break { page-break-before: always; }
    `;
  }

  // ── Portfolio HTML ──────────────────────────────────────
  function portfolioHTML(projects) {
    const display = projects.length
      ? (projects.filter(p => p.featured).length >= 2
          ? projects.filter(p => p.featured)
          : projects
        ).slice(0, 8)
      : [];

    return `
<style>
${baseCSS()}

/* COVER */
.cover {
  width: 210mm;
  min-height: 297mm;
  background: linear-gradient(150deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%);
  color: #fff;
  padding: 64px 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  page-break-after: always;
}
.cover-logo {
  width: 54px; height: 54px;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  font-size: 22pt; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 52px;
  letter-spacing: -1px;
}
.cover-name { font-size: 36pt; font-weight: 800; letter-spacing: -1px; line-height: 1.1; margin-bottom: 10px; }
.cover-role { font-size: 15pt; font-weight: 300; opacity: 0.8; letter-spacing: 2px; margin-bottom: 36px; }
.cover-tagline { font-size: 11pt; opacity: 0.7; line-height: 1.7; max-width: 360px; margin-bottom: 64px; }
.cover-rule { width: 56px; height: 2px; background: rgba(255,255,255,0.3); margin-bottom: 28px; }
.cover-lbl { font-size: 8.5pt; letter-spacing: 2px; text-transform: uppercase; opacity: 0.45; margin-bottom: 12px; }
.cover-contacts { display: flex; flex-direction: column; gap: 7px; }
.cover-ci { font-size: 10pt; opacity: 0.8; }

/* PAGES */
.pdf-page { width: 210mm; padding: 52px 56px; }

/* Section labels */
.sec-label {
  font-size: 8.5pt; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: #4f46e5; margin-bottom: 8px;
}
.sec-title {
  font-size: 22pt; font-weight: 800; letter-spacing: -0.5px;
  color: #09090b; margin-bottom: 6px; line-height: 1.15;
}
.sec-rule { height: 2px; background: #ede9fe; margin: 20px 0 28px; }

/* About */
.about-p { font-size: 11pt; color: #374151; line-height: 1.78; margin-bottom: 14px; }

/* Stats */
.stats { display: flex; gap: 12px; margin: 32px 0; }
.stat-box {
  flex: 1; background: #f5f3ff; border-radius: 10px;
  padding: 18px 12px; text-align: center;
}
.stat-n { font-size: 22pt; font-weight: 800; color: #4f46e5; line-height: 1; margin-bottom: 5px; }
.stat-l { font-size: 8.5pt; color: #71717a; font-weight: 600; line-height: 1.3; }

/* Skills */
.skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.sg {
  background: #f9fafb; border-left: 3px solid #4f46e5;
  border-radius: 8px; padding: 14px 16px;
}
.sg-title { font-size: 8.5pt; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 9px; }

/* Projects */
.proj-list { display: flex; flex-direction: column; gap: 20px; }
.proj-item { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
.proj-head { padding: 16px 20px; background: #f9fafb; border-bottom: 1px solid #f3f4f6; }
.proj-cat { font-size: 8pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #4f46e5; margin-bottom: 3px; }
.proj-name { font-size: 13pt; font-weight: 800; color: #09090b; }
.proj-body { padding: 14px 20px; }
.proj-desc { font-size: 10pt; color: #4b5563; line-height: 1.7; margin-bottom: 12px; }

/* Experience */
.exp-list { display: flex; flex-direction: column; gap: 28px; }
.exp-item { border-left: 3px solid #4f46e5; padding-left: 20px; page-break-inside: avoid; }
.exp-period { font-size: 8.5pt; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.exp-role { font-size: 13pt; font-weight: 700; color: #09090b; margin-bottom: 2px; }
.exp-company { font-size: 10.5pt; color: #6b7280; margin-bottom: 10px; }
.exp-desc { font-size: 10pt; color: #4b5563; line-height: 1.7; }
.exp-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 10px; }

/* Contact footer */
.contact-footer {
  background: #1e1b4b; color: #fff;
  padding: 52px 56px; min-height: 180px;
}
.cf-label { font-size: 8.5pt; opacity: 0.5; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
.cf-title { font-size: 20pt; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.3px; }
.cf-sub { font-size: 10.5pt; opacity: 0.7; margin-bottom: 28px; }
.cf-grid { display: flex; gap: 48px; }
.cf-item-lbl { font-size: 8.5pt; opacity: 0.45; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.cf-item-val { font-size: 10.5pt; font-weight: 600; }
</style>

<div class="pdf-root">

  <!-- COVER PAGE -->
  <div class="cover">
    <div>
      <div class="cover-logo">AA</div>
      <div class="cover-name">Muhammad Adam Afiq</div>
      <div class="cover-role">Software Developer</div>
      <div class="cover-tagline">
        Building dashboards, monitoring systems, and web applications
        that transform complex data into actionable insights.
      </div>
    </div>
    <div>
      <div class="cover-rule"></div>
      <div class="cover-lbl">Contact</div>
      <div class="cover-contacts">
        <div class="cover-ci">Email: muhdadamafiq@gmail.com</div>
        <div class="cover-ci">GitHub: github.com/muhdadamafiq</div>
        <div class="cover-ci">Location: Malaysia</div>
      </div>
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

    <div class="stats">
      <div class="stat-box"><div class="stat-n">15+</div><div class="stat-l">Projects Completed</div></div>
      <div class="stat-box"><div class="stat-n">3+</div><div class="stat-l">Years Experience</div></div>
      <div class="stat-box"><div class="stat-n">10+</div><div class="stat-l">Satisfied Clients</div></div>
      <div class="stat-box"><div class="stat-n">50+</div><div class="stat-l">Devices Monitored</div></div>
    </div>

    <div class="sec-label" style="margin-top:32px;">Technical Skills</div>
    <div class="sec-rule" style="margin-top:8px;"></div>
    <div class="skills-grid">
      <div class="sg">
        <div class="sg-title">Languages</div>
        <span class="tag">PHP</span><span class="tag">JavaScript</span>
        <span class="tag">Python</span><span class="tag">HTML5</span>
        <span class="tag">CSS3</span><span class="tag">SQL</span>
      </div>
      <div class="sg">
        <div class="sg-title">Databases</div>
        <span class="tag">MySQL</span><span class="tag">SQLite</span>
        <span class="tag">MariaDB</span>
      </div>
      <div class="sg">
        <div class="sg-title">Frameworks &amp; Tools</div>
        <span class="tag">Bootstrap</span><span class="tag">Chart.js</span>
        <span class="tag">Git</span><span class="tag">GitHub</span>
        <span class="tag">REST APIs</span>
      </div>
      <div class="sg">
        <div class="sg-title">Specialisations</div>
        <span class="tag">Dashboards</span><span class="tag">IoT</span>
        <span class="tag">Raspberry Pi</span><span class="tag">SNMP</span>
        <span class="tag">MQTT</span><span class="tag">WebSocket</span>
      </div>
    </div>
  </div>

  <!-- PROJECTS -->
  <div class="pdf-page page-break">
    <div class="sec-label">Portfolio</div>
    <div class="sec-title">Featured Projects</div>
    <div class="sec-rule"></div>

    ${display.length ? `
    <div class="proj-list">
      ${display.map(p => `
        <div class="proj-item">
          <div class="proj-head">
            <div class="proj-cat">${p.category || 'Project'}</div>
            <div class="proj-name">${p.title || ''}</div>
          </div>
          <div class="proj-body">
            <p class="proj-desc">${p.longDescription || p.description || ''}</p>
            <div>${(p.technologies || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : `
    <p style="color:#71717a;font-size:11pt;">
      Visit <strong>github.com/muhdadamafiq</strong> to explore all projects.
    </p>
    `}
  </div>

  <!-- EXPERIENCE -->
  <div class="pdf-page page-break">
    <div class="sec-label">Background</div>
    <div class="sec-title">Experience</div>
    <div class="sec-rule"></div>

    <div class="exp-list">
      <div class="exp-item">
        <div class="exp-period">2023 — Present</div>
        <div class="exp-role">Software Developer</div>
        <div class="exp-company">Freelance / Independent</div>
        <p class="exp-desc">Developing custom monitoring dashboards, internal business tools, and web applications for clients across various industries. Delivering end-to-end solutions from requirements gathering through deployment and ongoing support.</p>
        <div class="exp-tags">
          <span class="tag">Dashboard Development</span><span class="tag">Monitoring Systems</span>
          <span class="tag">IoT Integration</span><span class="tag">Internal Tools</span>
        </div>
      </div>

      <div class="exp-item">
        <div class="exp-period">2021 — 2023</div>
        <div class="exp-role">Junior Software Developer</div>
        <div class="exp-company">Previous Company</div>
        <p class="exp-desc">Built and maintained web-based business applications using PHP and MySQL. Worked closely with operations teams to translate requirements into functional software. Developed reporting modules and data management tools.</p>
        <div class="exp-tags">
          <span class="tag">PHP</span><span class="tag">MySQL</span>
          <span class="tag">Web Applications</span><span class="tag">Reporting</span>
        </div>
      </div>

      <div class="exp-item">
        <div class="exp-period">2017 — 2021</div>
        <div class="exp-role">Diploma in Computer Science</div>
        <div class="exp-company">University / Polytechnic</div>
        <p class="exp-desc">Studied core software development fundamentals including programming, databases, networking, and system design. Developed multiple academic projects covering web application development and basic IoT systems.</p>
        <div class="exp-tags">
          <span class="tag">Computer Science</span><span class="tag">Programming</span>
          <span class="tag">Databases</span><span class="tag">Networking</span>
        </div>
      </div>
    </div>
  </div>

  <!-- CONTACT FOOTER -->
  <div class="contact-footer">
    <div class="cf-label">Get In Touch</div>
    <div class="cf-title">Let's build something together</div>
    <div class="cf-sub">Open to new projects and collaborations.</div>
    <div class="cf-grid">
      <div>
        <div class="cf-item-lbl">Email</div>
        <div class="cf-item-val">muhdadamafiq@gmail.com</div>
      </div>
      <div>
        <div class="cf-item-lbl">GitHub</div>
        <div class="cf-item-val">github.com/muhdadamafiq</div>
      </div>
      <div>
        <div class="cf-item-lbl">Location</div>
        <div class="cf-item-val">Malaysia</div>
      </div>
    </div>
  </div>

</div>`;
  }

  // ── CV HTML ─────────────────────────────────────────────
  function cvHTML() {
    return `
<style>
${baseCSS()}

.cv-root { width: 210mm; background: #fff; }

/* Header */
.cv-header {
  padding: 40px 48px 28px;
  border-bottom: 3px solid #4f46e5;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.cv-name { font-size: 26pt; font-weight: 800; letter-spacing: -0.5px; color: #09090b; margin-bottom: 4px; }
.cv-title { font-size: 12pt; color: #4f46e5; font-weight: 600; }
.cv-contacts { display: flex; flex-direction: column; gap: 5px; text-align: right; }
.cv-ci { font-size: 9.5pt; color: #4b5563; }

/* Two-column body */
.cv-body { display: grid; grid-template-columns: 1.75fr 1fr; }
.cv-main { padding: 32px 28px 40px 48px; border-right: 1px solid #e5e7eb; }
.cv-side { padding: 32px 32px 40px 24px; background: #f9fafb; }

/* Section */
.cv-sec { margin-bottom: 28px; }
.cv-sec-title {
  font-size: 8.5pt; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: #4f46e5;
  margin-bottom: 12px; padding-bottom: 6px;
  border-bottom: 1px solid #ede9fe;
}

/* Summary */
.cv-summary { font-size: 10.5pt; color: #374151; line-height: 1.75; }

/* Experience */
.cv-exp { margin-bottom: 20px; }
.cv-exp:last-child { margin-bottom: 0; }
.cv-exp-period { font-size: 8.5pt; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; }
.cv-exp-role { font-size: 12pt; font-weight: 700; color: #09090b; margin: 3px 0 1px; }
.cv-exp-company { font-size: 10pt; color: #6b7280; margin-bottom: 8px; }
.cv-exp-desc { font-size: 9.5pt; color: #4b5563; line-height: 1.7; }
.cv-exp-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 8px; }

/* Skills */
.cv-skill-grp { margin-bottom: 14px; }
.cv-skill-grp-title { font-size: 9pt; font-weight: 700; color: #374151; margin-bottom: 7px; }

/* Sidebar */
.cv-side-sec { margin-bottom: 22px; }
.cv-side-title {
  font-size: 8.5pt; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: #4f46e5;
  margin-bottom: 10px; padding-bottom: 6px;
  border-bottom: 1px solid #ede9fe;
}
.cv-side-item { font-size: 9.5pt; color: #374151; margin-bottom: 6px; line-height: 1.5; }
.cv-side-lbl { font-size: 8.5pt; color: #6b7280; }
</style>

<div class="cv-root">

  <!-- HEADER -->
  <div class="cv-header">
    <div>
      <div class="cv-name">Muhammad Adam Afiq</div>
      <div class="cv-title">Software Developer</div>
    </div>
    <div class="cv-contacts">
      <div class="cv-ci">muhdadamafiq@gmail.com</div>
      <div class="cv-ci">github.com/muhdadamafiq</div>
      <div class="cv-ci">Malaysia</div>
    </div>
  </div>

  <!-- BODY -->
  <div class="cv-body">

    <!-- MAIN -->
    <div class="cv-main">

      <div class="cv-sec">
        <div class="cv-sec-title">Professional Summary</div>
        <p class="cv-summary">
          Software Developer with 3+ years of experience building dashboards, monitoring systems,
          internal tools, and web applications. Focused on delivering practical, reliable software
          that solves real business problems. Strong track record of end-to-end project delivery
          from requirements gathering through deployment and ongoing support.
        </p>
      </div>

      <div class="cv-sec">
        <div class="cv-sec-title">Work Experience</div>

        <div class="cv-exp">
          <div class="cv-exp-period">2023 — Present</div>
          <div class="cv-exp-role">Software Developer</div>
          <div class="cv-exp-company">Freelance / Independent</div>
          <p class="cv-exp-desc">Developing custom monitoring dashboards, internal business tools, and web applications for clients across various industries. Delivering end-to-end solutions from requirements gathering through deployment.</p>
          <div class="cv-exp-tags">
            <span class="tag">Dashboards</span><span class="tag">Monitoring</span>
            <span class="tag">IoT</span><span class="tag">Internal Tools</span>
          </div>
        </div>

        <div class="cv-exp">
          <div class="cv-exp-period">2021 — 2023</div>
          <div class="cv-exp-role">Junior Software Developer</div>
          <div class="cv-exp-company">Previous Company</div>
          <p class="cv-exp-desc">Built and maintained web-based business applications using PHP and MySQL. Translated business requirements into functional software. Developed reporting modules and data management tools.</p>
          <div class="cv-exp-tags">
            <span class="tag">PHP</span><span class="tag">MySQL</span>
            <span class="tag">Web Apps</span><span class="tag">Reporting</span>
          </div>
        </div>
      </div>

      <div class="cv-sec">
        <div class="cv-sec-title">Technical Skills</div>

        <div class="cv-skill-grp">
          <div class="cv-skill-grp-title">Languages</div>
          <span class="tag">PHP</span><span class="tag">JavaScript</span>
          <span class="tag">Python</span><span class="tag">HTML5</span>
          <span class="tag">CSS3</span><span class="tag">SQL</span>
        </div>

        <div class="cv-skill-grp">
          <div class="cv-skill-grp-title">Databases &amp; Frameworks</div>
          <span class="tag">MySQL</span><span class="tag">SQLite</span>
          <span class="tag">Bootstrap</span><span class="tag">Chart.js</span>
          <span class="tag">Git</span><span class="tag">GitHub</span>
        </div>

        <div class="cv-skill-grp">
          <div class="cv-skill-grp-title">Specialisations</div>
          <span class="tag">Dashboard Dev</span><span class="tag">IoT / Raspberry Pi</span>
          <span class="tag">SNMP</span><span class="tag">MQTT</span>
          <span class="tag">WebSocket</span><span class="tag">REST APIs</span>
        </div>
      </div>
    </div>

    <!-- SIDEBAR -->
    <div class="cv-side">

      <div class="cv-side-sec">
        <div class="cv-side-title">Education</div>
        <div class="cv-side-item" style="font-weight:700;color:#09090b;">Diploma in Computer Science</div>
        <div class="cv-side-item">University / Polytechnic</div>
        <div class="cv-side-item" style="color:#4f46e5;font-weight:600;">2017 — 2021</div>
      </div>

      <div class="cv-side-sec">
        <div class="cv-side-title">Services Offered</div>
        <div class="cv-side-item">Dashboard Development</div>
        <div class="cv-side-item">Monitoring Systems</div>
        <div class="cv-side-item">Internal Tools</div>
        <div class="cv-side-item">Reporting Systems</div>
        <div class="cv-side-item">Web Applications</div>
        <div class="cv-side-item">Automation Solutions</div>
      </div>

      <div class="cv-side-sec">
        <div class="cv-side-title">Key Highlights</div>
        <div class="cv-side-item">15+ projects delivered</div>
        <div class="cv-side-item">10+ satisfied clients</div>
        <div class="cv-side-item">50+ IoT devices monitored</div>
        <div class="cv-side-item">99.9% avg system uptime</div>
      </div>

      <div class="cv-side-sec">
        <div class="cv-side-title">Languages</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:7px;">
          <span class="cv-side-item" style="margin:0;">Malay</span>
          <span class="cv-side-lbl">Native</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span class="cv-side-item" style="margin:0;">English</span>
          <span class="cv-side-lbl">Professional</span>
        </div>
      </div>

      <div class="cv-side-sec">
        <div class="cv-side-title">Contact</div>
        <div class="cv-side-item">muhdadamafiq@gmail.com</div>
        <div class="cv-side-item">github.com/muhdadamafiq</div>
        <div class="cv-side-item">Malaysia</div>
      </div>

    </div>
  </div>
</div>`;
  }

  // ── Core generator ──────────────────────────────────────
  async function generate(type) {
    if (typeof html2pdf === 'undefined') {
      toast('PDF library not ready. Please refresh the page.', 'error');
      return;
    }

    const isPF = type === 'portfolio';
    const btn = document.querySelector(isPF ? '.download-btn-primary' : '.download-btn-secondary');
    setLoading(btn, true);
    toast('Building your PDF — this takes a few seconds…', 'loading');

    let projects = [];
    if (isPF) {
      try {
        const r = await fetch('data/projects.json');
        if (r.ok) projects = await r.json();
      } catch (_) {}
    }

    const container = document.createElement('div');
    container.style.cssText =
      'position:absolute;top:-9999px;left:0;width:794px;background:#fff;z-index:-1;';
    container.innerHTML = isPF ? portfolioHTML(projects) : cvHTML();
    document.body.appendChild(container);

    const opts = {
      ...PDF_OPTIONS,
      filename: isPF ? 'Adam_Afiq_Portfolio.pdf' : 'Adam_Afiq_CV.pdf',
      margin: 0,
    };

    try {
      await html2pdf().set(opts).from(container).save();
      toast('PDF downloaded!', 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      document.body.removeChild(container);
      setLoading(btn, false);
    }
  }

  // ── Public API ──────────────────────────────────────────
  window.downloadPortfolioPDF = () => generate('portfolio');
  window.downloadCVPDF = () => generate('cv');
})();
