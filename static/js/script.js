/**
 * script.js — Vincent Ochanji Portfolio
 * Modern vanilla JS with optional chaining and logical nullish assignment.
 */

'use strict';

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

/* ── 5. CONTACT FORM — AJAX SUBMISSION ──────────────────────────────────── */

document.getElementById('contact-form')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const submitBtn  = document.getElementById('submit-btn');
  const feedbackEl = document.getElementById('form-feedback');
  const name    = this.querySelector('#name').value.trim();
  const email   = this.querySelector('#email').value.trim();
  const message = this.querySelector('#message').value.trim();

  const err = !name || !email || !message ? 'Please fill in all fields.' :
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Please enter a valid email address.' : null;
  if (err) { showFeedback(feedbackEl, err, 'error'); return; }

  submitBtn.textContent = 'Sending…';
  submitBtn.disabled    = true;
  feedbackEl.textContent = '';
  feedbackEl.className   = 'form-feedback';

  try {
    const resp = await fetch('/contact', { method: 'POST', body: new FormData(this) });
    const data = await resp.json();
    if (resp.ok && data.status === 'ok') { showFeedback(feedbackEl, data.message, 'success'); this.reset(); }
    else { showFeedback(feedbackEl, data.message ?? 'Something went wrong.', 'error'); }
  } catch {
    showFeedback(feedbackEl, 'Could not send message. Please email me directly.', 'error');
  } finally {
    submitBtn.textContent = 'Send Message';
    submitBtn.disabled    = false;
  }
});

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

/* ── 7. NAVBAR SCROLL EFFECT ─────────────────────────────────────────────── */

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
    const img = e.target.closest('.cs-header-img, .avatar-photo');
    if (img) { open(img.src, img.alt); return; }
    const hdr = e.target.closest('.cs-header');
    if (hdr) { const hi = hdr.querySelector('.cs-header-img'); if (hi) open(hi.src, hi.alt); }
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
