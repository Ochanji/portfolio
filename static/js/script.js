/**
 * script.js — Vincent Ochanji Portfolio
 * Modern vanilla JS with optional chaining and logical nullish assignment.
 */

'use strict';

/* ── 0. FONT AWESOME → SVG CONVERTER ─────────────────────────────────────── */

window.convertFAIcons = function(root) {
  root = root || document;
  const icons = root.querySelectorAll('i[class*="fa-"]');
  icons.forEach(function(el) {
    const cls = el.className;
    const match = cls.match(/fa[sbr]\s+fa-([a-z0-9-]+)/);
    if (!match) return;
    const name = match[1];
    // Look up the symbol from the sprite and clone its contents inline
    const symbol = document.getElementById('icon-' + name);
    if (!symbol) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', symbol.getAttribute('viewBox') || '0 0 24 24');
    var newClass = cls.replace(/fa[sbr]\s+fa-[a-z0-9-]+/g, '').trim();
    newClass = (newClass ? newClass + ' ' : '') + 'icon icon-' + name;
    svg.setAttribute('class', newClass);
    svg.setAttribute('aria-hidden', el.getAttribute('aria-hidden') || 'true');
    if (el.id) svg.setAttribute('id', el.id);
    if (el.style.cssText) svg.setAttribute('style', el.style.cssText);
    if (cls.includes('fa-spin')) svg.classList.add('icon-spin');
    // Clone all child nodes from the symbol (paths, rects, circles, etc.)
    Array.from(symbol.childNodes).forEach(function(child) {
      svg.appendChild(child.cloneNode(true));
    });
    el.parentNode.replaceChild(svg, el);
  });
};

document.addEventListener('DOMContentLoaded', function() {
  convertFAIcons();
});

/* ── 1. THEME TOGGLE ──────────────────────────────────────────────────────── */

(function initTheme() {
  const saved  = localStorage.getItem('theme');
  const system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(saved ?? system);

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'light' : 'dark');
  });
})();

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const iconSun  = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  if (!iconSun || !iconMoon) return;
  iconSun.style.display  = theme === 'dark' ? '' : 'none';
  iconMoon.style.display = theme === 'dark' ? 'none' : '';
}

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
});

/* ── 2. DYNAMIC FOOTER YEAR ──────────────────────────────────────────────── */

const footerYear = document.getElementById('footer-year');
if (footerYear) footerYear.textContent = String(new Date().getFullYear());

/* ── 3. MOBILE HAMBURGER MENU ────────────────────────────────────────────── */

const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');

hamburger?.addEventListener('click', () => {
  const isOpen = navLinks?.classList.toggle('active') ?? false;
  hamburger.classList.toggle('active', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
    hamburger?.classList.remove('active');
    hamburger?.setAttribute('aria-expanded', 'false');
  });
});

/* ── 4. SMOOTH SCROLL FOR ANCHOR LINKS ──────────────────────────────────── */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.getElementById(this.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    const navH = document.querySelector('.navbar')?.offsetHeight ?? 0;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
  });
});

/* ── 5. CONTACT FORM — REAL-TIME VALIDATION + AJAX SUBMISSION ────────────── */

const contactForm = document.getElementById('contact-form');
if (contactForm) {
  const nameInput    = contactForm.querySelector('#name');
  const emailInput   = contactForm.querySelector('#email');
  const messageInput = contactForm.querySelector('#message');
  const nameErr      = document.getElementById('name-error');
  const emailErr     = document.getElementById('email-error');
  const messageErr   = document.getElementById('message-error');

  function validateField(field, errorEl) {
    const val = field.value.trim();
    let error = null;

    if (field === nameInput) {
      if (!val) error = 'Name is required.';
      else if (val.length < 2) error = 'Name must be at least 2 characters.';
    } else if (field === emailInput) {
      if (!val) error = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) error = 'Please enter a valid email.';
    } else if (field === messageInput) {
      if (!val) error = 'Message is required.';
      else if (val.length < 10) error = 'Message must be at least 10 characters.';
    }

    field.classList.remove('valid', 'invalid');
    errorEl.classList.remove('visible');
    if (val) {
      if (error) {
        field.classList.add('invalid');
        errorEl.textContent = error;
        errorEl.classList.add('visible');
      } else {
        field.classList.add('valid');
      }
    }
    return !error;
  }

  [nameInput, emailInput, messageInput].forEach(field => {
    field?.addEventListener('blur', () => {
      const errEl = field === nameInput ? nameErr : field === emailInput ? emailErr : messageErr;
      validateField(field, errEl);
    });
    field?.addEventListener('input', () => {
      field.classList.remove('valid', 'invalid');
      const errEl = field === nameInput ? nameErr : field === emailInput ? emailErr : messageErr;
      if (errEl) { errEl.classList.remove('visible'); errEl.textContent = ''; }
      if (field.value.trim() && field === emailInput && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
        field.classList.add('valid');
      }
    });
  });

  /* ── AJAX Submission ── */
  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const submitBtn  = document.getElementById('submit-btn');
    const feedbackEl = document.getElementById('form-feedback');

    const nameValid    = validateField(nameInput, nameErr);
    const emailValid   = validateField(emailInput, emailErr);
    const messageValid = validateField(messageInput, messageErr);

    if (!nameValid || !emailValid || !messageValid) return;

    submitBtn.textContent = 'Sending…';
    submitBtn.disabled    = true;
    feedbackEl.textContent = '';
    feedbackEl.className   = 'form-feedback';

    try {
      const resp = await fetch('/contact', { method: 'POST', body: new FormData(this) });
      const data = await resp.json();
      if (resp.ok && data.status === 'ok') {
        showFeedback(feedbackEl, data.message, 'success');
        this.reset();
        [nameInput, emailInput, messageInput].forEach(f => f?.classList.remove('valid', 'invalid'));
      } else {
        showFeedback(feedbackEl, data.message ?? 'Something went wrong.', 'error');
      }
    } catch {
      showFeedback(feedbackEl, 'Could not send message. Please email me directly.', 'error');
    } finally {
      submitBtn.textContent = 'Send Message';
      submitBtn.disabled    = false;
    }
  });
}

function showFeedback(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className   = `form-feedback ${type}`;
}

/* ── 6. SCROLL-IN ANIMATIONS ─────────────────────────────────────────────── */

const animationObserver = new IntersectionObserver(
  entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in-up');
      animationObserver.unobserve(entry.target);
    }
  }),
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('section').forEach(s => animationObserver.observe(s));

/* ── 7. SCROLL PROGRESS BAR ──────────────────────────────────────────────── */

const progressBar = document.getElementById('scroll-progress');
if (progressBar) {
  window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = `${scrolled}%`;
}, { passive: true });
}

/* Back to top button visibility and click */
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
  window.addEventListener('scroll', () => {
    const show = (document.documentElement.scrollTop || document.body.scrollTop) > 500;
    backToTop.classList.toggle('visible', show);
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── 8. NAVBAR SCROLL EFFECT ───────────────────────────────────────────────── */

const navbar = document.querySelector('.navbar');
navbar && window.addEventListener('scroll', () => {
  window.requestAnimationFrame(() => {
    navbar.style.boxShadow = window.scrollY > 80 ? '0 2px 20px rgba(0,0,0,0.3)' : 'none';
  });
}, { passive: true });

/* ── 8. HERO PARTICLES ──────────────────────────────────────────────────── */

class HeroParticles {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.resize();
    this.init();
    this.animate();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  init() {
    const density = Math.min(Math.floor((this.canvas.width * this.canvas.height) / 10000), 50);
    for (let i = 0; i < density; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: -Math.random() * 0.4 - 0.05,
        opacity: Math.random() * 0.4 + 0.05,
  });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.y < -10) { p.y = this.canvas.height + 10; p.x = Math.random() * this.canvas.width; }
      if (p.x < -10 || p.x > this.canvas.width + 10) { p.x = Math.random() * this.canvas.width; }
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(59, 130, 246, ${p.opacity})`;
      this.ctx.fill();
    }
    this._frame = requestAnimationFrame(() => this.animate());
  }
}

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('hero-canvas');
    if (c) new HeroParticles(c);
  });
}


/* ── 9. LIGHTBOX ──────────────────────────────────────────────────────────── */

(function initLightbox() {
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lightbox-img');
  const lbClose = document.getElementById('lightbox-close');
  if (!lb || !lbImg) return;

  const open = (src, alt = '') => { lbImg.src = src; lbImg.alt = alt; lb.classList.add('lb-open'); document.body.style.overflow = 'hidden'; };
  const close = () => { lb.classList.remove('lb-open'); document.body.style.overflow = ''; setTimeout(() => { lbImg.src = ''; }, 200); };

  document.addEventListener('click', e => {
    const att = e.target.closest('.attachment-img');
    if (att) { const s = att.getAttribute('data-src'); if (s) open(s, att.getAttribute('data-alt') ?? ''); return; }
    const img = e.target.closest('.strip-visual-img, .hero-photo');
    if (img) { open(img.src, img.alt); return; }
    const vis = e.target.closest('.strip-visual');
    if (vis) { const vi = vis.querySelector('.strip-visual-img'); if (vi) open(vi.src, vi.alt); }
  });

  lbClose?.addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lb.classList.contains('lb-open')) close();
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.classList.contains('attachment-img')) {
      e.preventDefault();
      const s = document.activeElement.getAttribute('data-src');
      if (s) open(s, document.activeElement.getAttribute('data-alt') ?? '');
    }
  });
})();
