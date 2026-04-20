/**
 * admin.js — Vincent Ochanji Portfolio
 * ======================================
 * Inline admin panel: login, edit-mode toggle, section editors (hero, about,
 * skills, contact, footer), project & experience CRUD, image uploads —
 * all via AJAX, zero page navigation needed.
 *
 * Exposed on window as `AdminPanel` so onclick="" attributes work.
 */

'use strict';

const AdminPanel = {

  editMode: false,
  _currentProfile: null,

  // ── Utilities ──────────────────────────────────────────────────────────────

  esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  async _req(method, url, body = null) {
    const opts = { method, credentials: 'same-origin' };
    if (body instanceof FormData) {
      opts.body = body;
    } else if (body !== null) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    try {
      const res = await fetch(url, opts);
      return await res.json();
    } catch {
      return { status: 'error', message: 'Network error — please try again.' };
    }
  },

  _get(url)        { return this._req('GET',    url); },
  _post(url, body) { return this._req('POST',   url, body); },
  _put(url, body)  { return this._req('PUT',    url, body); },
  _delete(url)     { return this._req('DELETE', url); },


  // ── Login / logout ─────────────────────────────────────────────────────────

  openLoginModal() {
    document.getElementById('admin-login-modal').classList.add('active');
    setTimeout(() => document.getElementById('admin-username')?.focus(), 60);
  },

  closeLoginModal() {
    document.getElementById('admin-login-modal').classList.remove('active');
    document.getElementById('admin-login-error').textContent = '';
    document.getElementById('admin-password').value = '';
  },

  async login() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorEl  = document.getElementById('admin-login-error');
    const btn      = document.getElementById('admin-login-btn');

    btn.textContent = 'Logging in…';
    btn.disabled    = true;
    errorEl.textContent = '';

    const r = await this._post('/admin/api/login', { username, password });
    if (r.status === 'ok') {
      window.location.reload();
    } else {
      errorEl.textContent = r.message || 'Invalid credentials.';
      btn.textContent = 'Login';
      btn.disabled    = false;
    }
  },

  async logout() {
    await this._post('/admin/api/logout', {});
    window.location.reload();
  },


  // ── Edit mode ──────────────────────────────────────────────────────────────

  toggleEditMode(checked) {
    this.editMode = checked;
    document.body.classList.toggle('admin-edit-mode', checked);
  },


  // ── CV upload ──────────────────────────────────────────────────────────────

  openUploadCV() {
    const body = `
      <div class="form-group">
        <label>Upload CV / Resume (PDF, DOC, or DOCX — max 5 MB)</label>
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:.5rem">
          <label class="admin-btn" style="cursor:pointer">
            <i class="fas fa-file-upload"></i> Choose file
            <input type="file" accept=".pdf,.doc,.docx" style="display:none"
                   id="cv-file-input">
          </label>
          <span id="cv-file-name" style="color:var(--text-muted);font-size:.85rem">No file chosen</span>
        </div>
        <p id="cv-current" style="margin-top:.75rem;font-size:.8rem;color:var(--text-muted)"></p>
      </div>`;

    this.openModal('Upload CV', body, 'Upload', async () => {
      const input = document.getElementById('cv-file-input');
      if (!input.files || !input.files[0]) {
        this._modalError('Please choose a file first.'); return;
      }
      const fd = new FormData();
      fd.append('file', input.files[0]);
      const r = await this._post('/admin/api/cv', fd);
      if (r.status !== 'ok') { this._modalError(r.message); return; }
      this.closeModal();
      // Update Download CV button in hero if present
      const dlBtn = document.querySelector('.cv-download-btn');
      if (dlBtn) { dlBtn.href = r.url; dlBtn.style.display = ''; }
      else { window.location.reload(); }
    });

    // Show filename on select
    setTimeout(() => {
      const inp = document.getElementById('cv-file-input');
      if (inp) inp.addEventListener('change', () => {
        document.getElementById('cv-file-name').textContent =
          inp.files[0]?.name || 'No file chosen';
      });
    }, 80);
  },


  // ── Shared modal ───────────────────────────────────────────────────────────

  openModal(title, bodyHTML, saveLabel, onSave) {
    document.getElementById('admin-modal-title').textContent = title;
    document.getElementById('admin-modal-body').innerHTML    = bodyHTML;
    document.getElementById('modal-save-btn').textContent    = saveLabel || 'Save';
    document.getElementById('modal-save-btn').onclick        = onSave;
    document.getElementById('modal-error').textContent       = '';
    document.getElementById('admin-modal').classList.add('active');

    const first = document.getElementById('admin-modal-body')
                           .querySelector('input, textarea, select');
    if (first) setTimeout(() => first.focus(), 60);
  },

  closeModal() {
    document.getElementById('admin-modal').classList.remove('active');
    document.getElementById('modal-error').textContent = '';
  },

  _modalError(msg) {
    document.getElementById('modal-error').textContent = msg || 'Something went wrong.';
  },


  // ── Image upload helper ────────────────────────────────────────────────────

  /**
   * Renders an upload widget in the modal body.
   * @param {string} fieldId    - id for the hidden URL input
   * @param {string} previewId  - id for the preview img element
   * @param {string} currentUrl - existing image URL (or '')
   * @param {string} label      - label text shown above the widget
   */
  _uploadWidget(fieldId, previewId, currentUrl, label) {
    const hasImg = currentUrl && currentUrl.length > 0;
    const imgTag = hasImg
      ? `<img id="${previewId}-img" src="${this.esc(currentUrl)}" alt="preview">`
      : `<span class="upload-placeholder"><i class="fas fa-user"></i></span>`;

    return `
      <div class="form-group">
        <label>${label}</label>
        <input type="hidden" id="${fieldId}" value="${this.esc(currentUrl)}">
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
          <div class="upload-preview" id="${previewId}">${imgTag}</div>
          <div class="upload-controls">
            <label class="admin-btn" style="cursor:pointer">
              <i class="fas fa-upload"></i> Upload photo
              <input type="file" accept="image/*" style="display:none"
                     onchange="AdminPanel._handleUpload(this,'${fieldId}','${previewId}')">
            </label>
            ${hasImg ? `<button type="button" class="admin-btn admin-btn-danger"
                         onclick="AdminPanel._clearImage('${fieldId}','${previewId}')">
                         <i class="fas fa-times"></i> Remove
                       </button>` : ''}
          </div>
        </div>
      </div>`;
  },

  async _handleUpload(input, fieldId, previewId) {
    if (!input.files || !input.files[0]) return;
    const preview = document.getElementById(previewId);

    // Show spinner while uploading
    preview.innerHTML = '<span class="upload-spinner"><i class="fas fa-spinner fa-spin"></i></span>';

    const fd = new FormData();
    fd.append('file', input.files[0]);
    const r = await this._post('/admin/api/upload', fd);

    if (r.status === 'ok') {
      document.getElementById(fieldId).value = r.url;
      preview.innerHTML = `<img id="${previewId}-img" src="${this.esc(r.url)}" alt="preview">`;
    } else {
      preview.innerHTML = '<span class="upload-placeholder"><i class="fas fa-exclamation-triangle"></i></span>';
      this._modalError(r.message || 'Upload failed.');
    }
  },

  _clearImage(fieldId, previewId) {
    document.getElementById(fieldId).value = '';
    document.getElementById(previewId).innerHTML =
      '<span class="upload-placeholder"><i class="fas fa-user"></i></span>';
  },


  // ── Profile section editors ────────────────────────────────────────────────

  async openEditSection(section) {
    const profile = await this._get('/admin/api/profile');
    if (!profile || profile.status === 'error') {
      alert('Could not load profile data.'); return;
    }
    this._currentProfile = profile;

    const map = {
      hero:    ['Edit Hero Section',    () => this._heroForm(profile),    () => this._saveHero()],
      about:   ['Edit About Section',   () => this._aboutForm(profile),   () => this._saveAbout()],
      skills:  ['Edit Skills & Stack',  () => this._skillsForm(profile),  () => this._saveSkills()],
      contact: ['Edit Contact Details', () => this._contactForm(profile), () => this._saveContact()],
      footer:  ['Edit Footer',          () => this._footerForm(profile),  () => this._saveFooter()],
    };

    const entry = map[section];
    if (!entry) return;
    const [title, htmlFn, handler] = entry;
    this.openModal(title, htmlFn(), 'Save Changes', handler);
  },

  // ── Hero ───────────────────────────────────────────────────────────────────

  _heroForm(p) {
    return `
      <div class="form-group">
        <label>Greeting line</label>
        <input type="text" id="m-greeting" value="${this.esc(p.hero?.greeting ?? '')}">
      </div>
      <div class="form-group">
        <label>Your name</label>
        <input type="text" id="m-name" value="${this.esc(p.name ?? '')}">
      </div>
      <div class="form-group">
        <label>Role / title line</label>
        <input type="text" id="m-role" value="${this.esc(p.title ?? '')}">
      </div>
      <div class="form-group">
        <label>Tagline</label>
        <textarea id="m-tagline" rows="3">${this.esc(p.hero?.tagline ?? '')}</textarea>
      </div>`;
  },

  async _saveHero() {
    const p = this._currentProfile;
    p.hero          = p.hero || {};
    p.name          = document.getElementById('m-name').value.trim();
    p.title         = document.getElementById('m-role').value.trim();
    p.hero.greeting = document.getElementById('m-greeting').value.trim();
    p.hero.tagline  = document.getElementById('m-tagline').value.trim();

    const r = await this._post('/admin/api/profile', p);
    if (r.status !== 'ok') { this._modalError(r.message); return; }
    this._applyHero(p);
    this.closeModal();
  },

  // ── About ──────────────────────────────────────────────────────────────────

  _aboutForm(p) {
    const bio = p.about?.bio || ['', ''];
    const s   = p.about?.social || {};
    return `
      ${this._uploadWidget('m-avatar-url', 'avatar-preview', p.avatar || '', 'Profile photo')}
      <div class="form-group">
        <label>Bio — paragraph 1</label>
        <textarea id="m-bio-0" rows="4">${this.esc(bio[0] ?? '')}</textarea>
      </div>
      <div class="form-group">
        <label>Bio — paragraph 2</label>
        <textarea id="m-bio-1" rows="4">${this.esc(bio[1] ?? '')}</textarea>
      </div>
      <p class="form-section-label">Social Links</p>
      <div class="form-group">
        <label>LinkedIn URL</label>
        <input type="url" id="m-linkedin" value="${this.esc(s.linkedin ?? '')}">
      </div>
      <div class="form-group">
        <label>GitHub URL</label>
        <input type="url" id="m-github" value="${this.esc(s.github ?? '')}">
      </div>
      <div class="form-group">
        <label>Email address</label>
        <input type="email" id="m-email" value="${this.esc(s.email ?? '')}">
      </div>`;
  },

  async _saveAbout() {
    const p = this._currentProfile;
    p.avatar = document.getElementById('m-avatar-url').value.trim() || null;
    p.about  = p.about || {};
    p.about.bio = [
      document.getElementById('m-bio-0').value.trim(),
      document.getElementById('m-bio-1').value.trim(),
    ];
    p.about.social = {
      linkedin: document.getElementById('m-linkedin').value.trim(),
      github:   document.getElementById('m-github').value.trim(),
      email:    document.getElementById('m-email').value.trim(),
    };

    const r = await this._post('/admin/api/profile', p);
    if (r.status !== 'ok') { this._modalError(r.message); return; }
    this._applyAbout(p);
    this.closeModal();
  },

  // ── Skills ─────────────────────────────────────────────────────────────────

  _skillsForm(p) {
    const groups = (p.skills || []).map((g, i) => this._skillGroupHTML(i, g)).join('');
    return `
      <div id="m-skill-groups">${groups}</div>
      <button type="button" class="admin-btn" style="margin-bottom:.5rem"
              onclick="AdminPanel.addSkillGroup()">
        <i class="fas fa-plus"></i> Add Group
      </button>`;
  },

  _skillGroupHTML(i, g = {}) {
    return `
      <div class="skill-group-editor" data-gidx="${i}">
        <div class="skill-group-header">
          <span>Group ${i + 1}</span>
          <button type="button" class="admin-btn admin-btn-small admin-btn-danger"
                  onclick="this.closest('.skill-group-editor').remove()">Remove</button>
        </div>
        <div class="form-group">
          <label>Category name</label>
          <input type="text" class="sg-category" value="${this.esc(g.category ?? '')}">
        </div>
        <div class="form-group">
          <label>Font Awesome icon (e.g. fa-database)</label>
          <input type="text" class="sg-icon" value="${this.esc(g.icon ?? 'fa-code')}">
        </div>
        <div class="form-group">
          <label>Skills (comma-separated)</label>
          <input type="text" class="sg-tags" value="${this.esc((g.tags || []).join(', '))}">
        </div>
      </div>`;
  },

  addSkillGroup() {
    const container = document.getElementById('m-skill-groups');
    const idx = container.querySelectorAll('.skill-group-editor').length;
    const wrap = document.createElement('div');
    wrap.innerHTML = this._skillGroupHTML(idx);
    container.appendChild(wrap.firstElementChild);
  },

  async _saveSkills() {
    const p = this._currentProfile;
    p.skills = Array.from(
      document.querySelectorAll('#m-skill-groups .skill-group-editor')
    ).map(g => ({
      category: g.querySelector('.sg-category').value.trim(),
      icon:     g.querySelector('.sg-icon').value.trim(),
      tags:     g.querySelector('.sg-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    }));

    const r = await this._post('/admin/api/profile', p);
    if (r.status !== 'ok') { this._modalError(r.message); return; }
    this._applySkills(p);
    this.closeModal();
  },

  // ── Contact ────────────────────────────────────────────────────────────────

  _contactForm(p) {
    const c = p.contact || {};
    return `
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="m-contact-email" value="${this.esc(c.email ?? '')}">
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" id="m-contact-location" value="${this.esc(c.location ?? '')}">
      </div>
      <div class="form-group">
        <label>LinkedIn URL</label>
        <input type="url" id="m-contact-linkedin" value="${this.esc(c.linkedin ?? '')}">
      </div>
      <div class="form-group">
        <label>GitHub URL</label>
        <input type="url" id="m-contact-github" value="${this.esc(c.github ?? '')}">
      </div>
      <div class="form-group">
        <label>WhatsApp Number (with country code, e.g. +254712345678)</label>
        <input type="tel" id="m-contact-whatsapp" value="${this.esc(c.whatsapp ?? '')}">
      </div>`;
  },

  async _saveContact() {
    const p = this._currentProfile;
    p.contact = {
      email:    document.getElementById('m-contact-email').value.trim(),
      location: document.getElementById('m-contact-location').value.trim(),
      linkedin: document.getElementById('m-contact-linkedin').value.trim(),
      github:   document.getElementById('m-contact-github').value.trim(),
      whatsapp: document.getElementById('m-contact-whatsapp').value.trim(),
    };

    const r = await this._post('/admin/api/profile', p);
    if (r.status !== 'ok') { this._modalError(r.message); return; }
    this._applyContact(p);
    this.closeModal();
  },

  // ── Footer ─────────────────────────────────────────────────────────────────

  _footerForm(p) {
    const c = p.contact || {};
    return `
      <div class="form-group">
        <label>Display name</label>
        <input type="text" id="m-footer-name" value="${this.esc(p.name ?? '')}">
      </div>
      <div class="form-group">
        <label>Tagline / role</label>
        <input type="text" id="m-footer-title" value="${this.esc(p.title ?? '')}">
      </div>
      <p class="form-section-label">Footer social links</p>
      <div class="form-group">
        <label>LinkedIn URL</label>
        <input type="url" id="m-footer-linkedin" value="${this.esc(c.linkedin ?? '')}">
      </div>
      <div class="form-group">
        <label>GitHub URL</label>
        <input type="url" id="m-footer-github" value="${this.esc(c.github ?? '')}">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="m-footer-email" value="${this.esc(c.email ?? '')}">
      </div>`;
  },

  async _saveFooter() {
    const p = this._currentProfile;
    p.name  = document.getElementById('m-footer-name').value.trim();
    p.title = document.getElementById('m-footer-title').value.trim();
    p.contact = p.contact || {};
    p.contact.linkedin = document.getElementById('m-footer-linkedin').value.trim();
    p.contact.github   = document.getElementById('m-footer-github').value.trim();
    p.contact.email    = document.getElementById('m-footer-email').value.trim();

    const r = await this._post('/admin/api/profile', p);
    if (r.status !== 'ok') { this._modalError(r.message); return; }
    this._applyFooter(p);
    this.closeModal();
  },


  // ── Project CRUD ───────────────────────────────────────────────────────────

  // ── Project reorder ────────────────────────────────────────────────────────

  async moveProject(idx, direction) {
    const projects = await this._get('/admin/api/projects');
    if (!Array.isArray(projects)) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= projects.length) return;
    const order = projects.map((_, i) => i);
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    const r = await this._post('/admin/api/projects/reorder', { order });
    if (r.status === 'ok') await this._refreshProjects();
  },

  // ── Skill group reorder ────────────────────────────────────────────────────

  async moveSkillGroup(idx, direction) {
    const profile = await this._get('/admin/api/profile');
    if (!profile || profile.status === 'error') return;
    const skills = profile.skills || [];
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= skills.length) return;
    const order = skills.map((_, i) => i);
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    const r = await this._post('/admin/api/skills/reorder', { order });
    if (r.status === 'ok') {
      profile.skills = order.map(i => skills[i]);
      this._applySkills(profile);
    }
  },

  openAddProject() {
    this.openModal('Add Project', this._projectForm(null), 'Add Project',
                   () => this._saveProject(null, true));
  },

  async openEditProject(idx) {
    const list = await this._get('/admin/api/projects');
    const proj = Array.isArray(list) ? list[idx] : null;
    this.openModal('Edit Project', this._projectForm(proj), 'Save Changes',
                   () => this._saveProject(idx, false));
  },

  _projectForm(p) {
    const metricsHTML = (p?.metrics || [{ value: '', label: '' }])
      .map((m, i) => this._metricRowHTML(i, m)).join('');

    return `
      ${this._uploadWidget('m-proj-image-url', 'proj-img-preview', p?.image || '', 'Screenshot / project image (optional)')}
      <div class="form-group">
        <label>Project title</label>
        <input type="text" id="m-proj-title" value="${this.esc(p?.title ?? '')}">
      </div>
      <div class="form-group">
        <label>Tagline — one-line hook shown on the card header</label>
        <input type="text" id="m-proj-tagline" placeholder="e.g. Five countries. One source of truth."
               value="${this.esc(p?.tagline ?? '')}">
      </div>
      <p class="form-section-label">Case Study</p>
      <div class="form-group">
        <label>Problem — what was broken or missing</label>
        <textarea id="m-proj-problem" rows="3">${this.esc(p?.problem ?? '')}</textarea>
      </div>
      <div class="form-group">
        <label>Solution — what you built</label>
        <textarea id="m-proj-solution" rows="3">${this.esc(p?.solution ?? '')}</textarea>
      </div>
      <div class="form-group">
        <label>Impact — what changed as a result</label>
        <textarea id="m-proj-impact" rows="3">${this.esc(p?.impact ?? '')}</textarea>
      </div>
      <p class="form-section-label">Metrics (up to 4)</p>
      <div id="m-proj-metrics">${metricsHTML}</div>
      <button type="button" class="admin-btn" style="margin-bottom:.75rem"
              onclick="AdminPanel.addMetricRow()">
        <i class="fas fa-plus"></i> Add metric
      </button>
      <p class="form-section-label">Links & Tags</p>
      <div class="form-group">
        <label>Technologies (comma-separated)</label>
        <input type="text" id="m-proj-tags" value="${this.esc((p?.tags || []).join(', '))}">
      </div>
      <div class="form-group">
        <label>GitHub URL <small style="color:var(--text-muted)">(leave blank to hide button)</small></label>
        <input type="url" id="m-proj-github" placeholder="https://github.com/…"
               value="${this.esc(p?.github ?? '')}">
      </div>
      <div class="form-group">
        <label>Demo</label>
        <select id="m-proj-demo-type" onchange="AdminPanel.toggleDemoUrl()">
          <option value=""     ${(p?.demo_type ?? '') === ''     ? 'selected' : ''}>Request demo (contact form)</option>
          <option value="live" ${(p?.demo_type ?? (p?.demo && p?.demo !== '#' ? 'live' : '')) === 'live' ? 'selected' : ''}>Live demo (URL)</option>
        </select>
      </div>
      <div class="form-group" id="m-proj-demo-url-group"
           style="display:${(p?.demo_type === 'live' || (!p?.demo_type && p?.demo && p?.demo !== '#')) ? 'block' : 'none'}">
        <label>Live Demo URL</label>
        <input type="url" id="m-proj-demo" placeholder="https://…"
               value="${this.esc(p?.demo ?? '')}">
      </div>`;
  },

  _metricRowHTML(_i, m = {}) {
    return `
      <div class="metric-row" style="display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem">
        <input type="text" class="metric-value" placeholder="e.g. 70%" style="width:90px;flex-shrink:0"
               value="${this.esc(m.value ?? '')}">
        <input type="text" class="metric-label" placeholder="e.g. Reduction in errors"
               style="flex:1" value="${this.esc(m.label ?? '')}">
        <button type="button" class="admin-btn admin-btn-small admin-btn-danger"
                onclick="this.closest('.metric-row').remove()" title="Remove">
          <i class="fas fa-times"></i>
        </button>
      </div>`;
  },

  toggleDemoUrl() {
    const type = document.getElementById('m-proj-demo-type')?.value;
    const group = document.getElementById('m-proj-demo-url-group');
    if (group) group.style.display = type === 'live' ? 'block' : 'none';
  },

  addMetricRow() {
    const container = document.getElementById('m-proj-metrics');
    const idx = container.querySelectorAll('.metric-row').length;
    if (idx >= 4) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = this._metricRowHTML(idx);
    container.appendChild(wrap.firstElementChild);
  },

  async _saveProject(idx, isNew) {
    const metrics = Array.from(
      document.querySelectorAll('#m-proj-metrics .metric-row')
    ).map(row => ({
      value: row.querySelector('.metric-value').value.trim(),
      label: row.querySelector('.metric-label').value.trim(),
    })).filter(m => m.value || m.label);

    const data = {
      title:    document.getElementById('m-proj-title').value.trim(),
      tagline:  document.getElementById('m-proj-tagline').value.trim(),
      problem:  document.getElementById('m-proj-problem').value.trim(),
      solution: document.getElementById('m-proj-solution').value.trim(),
      impact:   document.getElementById('m-proj-impact').value.trim(),
      metrics,
      tags:      document.getElementById('m-proj-tags').value,
      github:    document.getElementById('m-proj-github').value.trim(),
      demo_type: document.getElementById('m-proj-demo-type').value,
      demo:      (document.getElementById('m-proj-demo-type').value === 'live'
                   ? document.getElementById('m-proj-demo')?.value.trim()
                   : '') || '',
      image:     document.getElementById('m-proj-image-url').value.trim(),
    };

    const r = isNew
      ? await this._post('/admin/api/projects', data)
      : await this._put(`/admin/api/projects/${idx}`, data);

    if (r.status !== 'ok') { this._modalError(r.message); return; }
    this.closeModal();
    await this._refreshProjects();
  },

  async deleteProject(idx) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    const r = await this._delete(`/admin/api/projects/${idx}`);
    if (r.status === 'ok') await this._refreshProjects();
  },

  async _refreshProjects() {
    const projects = await this._get('/admin/api/projects');
    if (!Array.isArray(projects)) return;
    const grid = document.querySelector('.projects-grid');
    if (!grid) return;
    const isAllPage = window.location.pathname === '/projects';
    const list = isAllPage ? projects : projects.slice(0, 3);
    grid.innerHTML = list.map((p, i) => this._projectCardHTML(i, p, list.length)).join('');
  },

  _projectCardHTML(idx, p, total) {
    const isAdmin = !!document.getElementById('admin-bar');
    const controls = isAdmin ? `
      <div class="card-admin-controls" style="position:absolute;top:12px;right:12px;z-index:10;">
        <button class="admin-btn admin-btn-small card-move-btn"
                onclick="AdminPanel.moveProject(${idx}, -1)"
                title="Move up" ${idx === 0 ? 'disabled' : ''}>
          <i class="fas fa-chevron-up"></i>
        </button>
        <button class="admin-btn admin-btn-small card-move-btn"
                onclick="AdminPanel.moveProject(${idx}, 1)"
                title="Move down" ${idx === total - 1 ? 'disabled' : ''}>
          <i class="fas fa-chevron-down"></i>
        </button>
        <button class="admin-btn admin-btn-small"
                onclick="AdminPanel.openEditProject(${idx})">
          <i class="fas fa-pencil-alt"></i> Edit
        </button>
        <button class="admin-btn admin-btn-small admin-btn-danger"
                onclick="AdminPanel.deleteProject(${idx})">
          <i class="fas fa-times"></i>
        </button>
      </div>` : '';

    const tags = (p.tags || []).map(t => `<span class="tag">${this.esc(t)}</span>`).join('');

    const imgHTML = p.image
      ? `<img src="${this.esc(p.image)}" alt="${this.esc(p.title)}" class="cs-header-img">
         <div class="cs-header-overlay"></div>`
      : '';

    const metricsHTML = (p.metrics || []).length
      ? `<div class="cs-metrics">${(p.metrics || []).map(m => `
          <div class="cs-metric">
            <span class="cs-metric-value">${this.esc(m.value)}</span>
            <span class="cs-metric-label">${this.esc(m.label)}</span>
          </div>`).join('')}
        </div>` : '';

    return `
      <article class="case-study-card" data-idx="${idx}">
        ${controls}
        <div class="cs-header">${imgHTML}
          <p class="cs-tagline">${this.esc(p.tagline || p.title)}</p>
        </div>
        ${metricsHTML}
        <div class="cs-body">
          <h3 class="cs-title">${this.esc(p.title)}</h3>
          <div class="cs-psi">
            <div class="cs-psi-item">
              <span class="cs-psi-label cs-psi-problem">Problem</span>
              <p class="cs-psi-text">${this.esc(p.problem || '')}</p>
            </div>
            <div class="cs-psi-item cs-psi-collapsible">
              <span class="cs-psi-label cs-psi-solution">Solution</span>
              <p class="cs-psi-text">${this.esc(p.solution || '')}</p>
            </div>
            <div class="cs-psi-item cs-psi-collapsible">
              <span class="cs-psi-label cs-psi-impact">Impact</span>
              <p class="cs-psi-text">${this.esc(p.impact || '')}</p>
            </div>
          </div>
          <button class="cs-toggle-btn" onclick="toggleCard(this)" aria-expanded="false">
            <i class="fas fa-chevron-down"></i> Show more
          </button>
          <div class="project-tags">${tags}</div>
          <div class="project-links">
            ${p.github && p.github !== '#' ? `<a href="${this.esc(p.github)}" class="project-link" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> GitHub</a>` : ''}
            ${p.demo_type === 'live' && p.demo && p.demo !== '#'
              ? `<a href="${this.esc(p.demo)}" class="project-link demo" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> Live Demo</a>`
              : `<a href="/#contact" class="project-link ask-demo"><i class="fas fa-envelope"></i> Request Demo</a>`}
          </div>
        </div>
      </article>`;
  },


  // ── Experience CRUD ────────────────────────────────────────────────────────

  openAddExperience() {
    this.openModal('Add Experience', this._experienceForm(null), 'Add Entry',
                   () => this._saveExperience(null, true));
  },

  async openEditExperience(idx) {
    const list = await this._get('/admin/api/experience');
    const exp  = Array.isArray(list) ? list[idx] : null;
    this.openModal('Edit Experience', this._experienceForm(exp), 'Save Changes',
                   () => this._saveExperience(idx, false));
  },

  _experienceForm(exp) {
    return `
      <div class="form-group">
        <label>Job title</label>
        <input type="text" id="m-exp-title" value="${this.esc(exp?.title ?? '')}">
      </div>
      <div class="form-group">
        <label>Organisation</label>
        <input type="text" id="m-exp-org" value="${this.esc(exp?.organization ?? '')}">
      </div>
      <div class="form-group">
        <label>Period (e.g. 2020 – Present)</label>
        <input type="text" id="m-exp-period" value="${this.esc(exp?.period ?? '')}">
      </div>
      <div class="form-group">
        <label>Highlights — one bullet point per line</label>
        <textarea id="m-exp-highlights" rows="7">${this.esc((exp?.highlights || []).join('\n'))}</textarea>
      </div>`;
  },

  async _saveExperience(idx, isNew) {
    const data = {
      title:        document.getElementById('m-exp-title').value.trim(),
      organization: document.getElementById('m-exp-org').value.trim(),
      period:       document.getElementById('m-exp-period').value.trim(),
      highlights:   document.getElementById('m-exp-highlights').value,
    };

    const r = isNew
      ? await this._post('/admin/api/experience', data)
      : await this._put(`/admin/api/experience/${idx}`, data);

    if (r.status !== 'ok') { this._modalError(r.message); return; }
    this.closeModal();
    await this._refreshExperience();
  },

  async deleteExperience(idx) {
    if (!confirm('Delete this experience entry? This cannot be undone.')) return;
    const r = await this._delete(`/admin/api/experience/${idx}`);
    if (r.status === 'ok') await this._refreshExperience();
  },

  async _refreshExperience() {
    const list = await this._get('/admin/api/experience');
    if (!Array.isArray(list)) return;
    const timeline = document.querySelector('.timeline');
    if (timeline) {
      timeline.innerHTML = list.map((job, i) => this._timelineItemHTML(i, job)).join('');
    }
  },

  _timelineItemHTML(idx, job) {
    const isAdmin = !!document.getElementById('admin-bar');
    const controls = isAdmin ? `
      <div class="card-admin-controls">
        <button class="admin-btn admin-btn-small"
                onclick="AdminPanel.openEditExperience(${idx})">
          <i class="fas fa-pencil-alt"></i> Edit
        </button>
        <button class="admin-btn admin-btn-small admin-btn-danger"
                onclick="AdminPanel.deleteExperience(${idx})">
          <i class="fas fa-times"></i>
        </button>
      </div>` : '';

    const highlights = (job.highlights || [])
      .map(h => `<li>${this.esc(h)}</li>`).join('');

    return `
      <div class="timeline-item" data-idx="${idx}">
        <div class="timeline-dot" aria-hidden="true"></div>
        <div class="timeline-content">
          ${controls}
          <h3 class="timeline-title">${this.esc(job.title)}</h3>
          <p class="timeline-org">${this.esc(job.organization)}</p>
          <p class="timeline-period">
            <i class="fas fa-calendar-alt" aria-hidden="true"></i>
            ${this.esc(job.period)}
          </p>
          <ul class="timeline-details">${highlights}</ul>
        </div>
      </div>`;
  },


  // ── Live DOM updates ───────────────────────────────────────────────────────

  _applyHero(p) {
    const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    set('.hero-greeting', p.hero?.greeting ?? '');
    set('.hero-title',    p.name  ?? '');
    set('.hero-role',     p.title ?? '');
    set('.hero-tagline',  p.hero?.tagline ?? '');
    this._applyFooter(p);
  },

  _applyAbout(p) {
    // Avatar
    const avatarWrap = document.querySelector('.about-avatar');
    if (avatarWrap) {
      if (p.avatar) {
        avatarWrap.innerHTML = `<img src="${this.esc(p.avatar)}" alt="${this.esc(p.name ?? '')}" class="avatar-photo">`;
      } else {
        const initials = (p.name || 'VO').trim().split(' ')
          .filter(Boolean)
          .map((w, _, a) => a.length > 1 ? (a.indexOf(w) === 0 || a.indexOf(w) === a.length - 1 ? w[0] : '') : w.slice(0, 2))
          .join('').toUpperCase().slice(0, 2);
        avatarWrap.innerHTML = `<div class="avatar-initials" aria-hidden="true">${initials}</div>`;
      }
    }

    // Bio paragraphs
    const bios = document.querySelectorAll('.about-text');
    (p.about?.bio || []).forEach((text, i) => { if (bios[i]) bios[i].textContent = text; });

    // Social links
    const s = p.about?.social || {};
    const setLink = (sel, href) => { const el = document.querySelector(sel); if (el) el.href = href || '#'; };
    setLink('.about-social-linkedin', s.linkedin);
    setLink('.about-social-github',   s.github);
    setLink('.about-social-email',    s.email ? `mailto:${s.email}` : '');
  },

  _applySkills(p) {
    const grid = document.querySelector('.skills-grid');
    if (!grid) return;
    const isAdmin = !!document.getElementById('admin-bar');
    const skills  = p.skills || [];
    grid.innerHTML = skills.map((g, i) => {
      const moveControls = isAdmin ? `
        <div class="skill-group-move-controls">
          <button class="admin-btn admin-btn-small card-move-btn"
                  onclick="AdminPanel.moveSkillGroup(${i}, -1)"
                  title="Move left" ${i === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
          </button>
          <button class="admin-btn admin-btn-small card-move-btn"
                  onclick="AdminPanel.moveSkillGroup(${i}, 1)"
                  title="Move right" ${i === skills.length - 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>` : '';
      return `
        <div class="skill-group" data-idx="${i}">
          ${moveControls}
          <h3 class="skill-category">
            <i class="fas ${this.esc(g.icon)}" aria-hidden="true"></i>
            ${this.esc(g.category)}
          </h3>
          <div class="skill-tags">
            ${(g.tags || []).map(t => `<span class="skill-tag">${this.esc(t)}</span>`).join('')}
          </div>
        </div>`;
    }).join('');
  },

  _applyContact(p) {
    const c = p.contact || {};
    const emailEl = document.querySelector('.contact-email-link');
    if (emailEl) { emailEl.href = `mailto:${c.email ?? ''}`; emailEl.textContent = c.email ?? ''; }
    const locEl = document.querySelector('.contact-location-text');
    if (locEl) locEl.textContent = c.location ?? '';
    const setHref = (sel, href) => { const el = document.querySelector(sel); if (el) el.href = href || '#'; };
    setHref('.contact-linkedin-link', c.linkedin);
    setHref('.contact-github-link',   c.github);
    const waEl = document.querySelector('.contact-whatsapp-link');
    if (waEl) {
      const num = (c.whatsapp || '').replace(/\D/g, '');
      waEl.href = num ? `https://wa.me/${num}` : '#';
      waEl.closest('.contact-item').style.display = num ? '' : 'none';
    }
    this._applyFooter(p);
  },

  _applyFooter(p) {
    const c = p.contact || {};
    const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    set('.footer-name',  p.name  ?? '');
    set('.footer-title', p.title ?? '');
    const setHref = (sel, href) => { const el = document.querySelector(sel); if (el) el.href = href || '#'; };
    const footer = document.querySelector('.footer-social');
    if (footer) {
      setHref('.footer-social [aria-label="LinkedIn"]', c.linkedin);
      setHref('.footer-social [aria-label="GitHub"]',   c.github);
      const emLink = footer.querySelector('[aria-label="Email"]');
      if (emLink) emLink.href = c.email ? `mailto:${c.email}` : '#';
    }
  },

};


// ── Drag-to-reorder (SortableJS) ──────────────────────────────────────────

function initSortable() {
  if (typeof Sortable === 'undefined') return;

  // Projects grid — only when admin bar is present
  const projGrid = document.querySelector('.projects-grid');
  if (projGrid && document.getElementById('admin-bar')) {
    Sortable.create(projGrid, {
      animation: 180,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: async function () {
        const cards  = [...projGrid.querySelectorAll('.case-study-card')];
        const order  = cards.map(c => parseInt(c.dataset.idx));
        const r      = await AdminPanel._post('/admin/api/projects/reorder', { order });
        if (r.status === 'ok') await AdminPanel._refreshProjects();
      },
    });
  }

  // Skills grid
  const skillGrid = document.querySelector('.skills-grid');
  if (skillGrid && document.getElementById('admin-bar')) {
    Sortable.create(skillGrid, {
      animation: 180,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: async function () {
        const groups = [...skillGrid.querySelectorAll('.skill-group')];
        const order  = groups.map(g => parseInt(g.dataset.idx));
        const r      = await AdminPanel._post('/admin/api/skills/reorder', { order });
        if (r.status === 'ok') {
          const profile = await AdminPanel._get('/admin/api/profile');
          if (profile && !profile.status) AdminPanel._applySkills(profile);
        }
      },
    });
  }
}

document.addEventListener('DOMContentLoaded', initSortable);


// ── Card collapse toggle ───────────────────────────────────────────────────

function toggleCard(btn) {
  const card     = btn.closest('.case-study-card');
  const expanded = card.classList.toggle('cs-expanded');
  btn.setAttribute('aria-expanded', expanded);
  btn.innerHTML  = expanded
    ? '<i class="fas fa-chevron-up"></i> Show less'
    : '<i class="fas fa-chevron-down"></i> Show more';
}


// ── Keyboard shortcuts ─────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  AdminPanel.closeModal();
  AdminPanel.closeLoginModal();
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const loginModal = document.getElementById('admin-login-modal');
  if (loginModal?.classList.contains('active')) AdminPanel.login();
});
