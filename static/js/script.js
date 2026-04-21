/**
 * script.js — Vincent Ochanji Portfolio
 * =======================================
 * Responsibilities:
 *   1. Theme toggle  — dark ↔ light, persisted in localStorage
 *   2. Dynamic footer year
 *   3. Mobile hamburger menu
 *   4. Smooth scroll for in-page anchor links
 *   5. Contact form — AJAX submission with inline feedback
 *   6. Scroll-in animations via IntersectionObserver
 *   7. Navbar background intensify on scroll
 */

'use strict';

/* ── 1. THEME TOGGLE ──────────────────────────────────────────────────────── */

(function initTheme() {
  // Use saved manual override if present; otherwise follow the OS preference.
  const saved  = localStorage.getItem('theme');
  const system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(saved || system);

  // If the user hasn't set a manual override, track OS changes in real time.
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'light' : 'dark');
    }
  });
})();

/**
 * Apply a theme by setting data-theme on <html> and swapping the toggle icons.
 * @param {'dark'|'light'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  const iconSun  = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');

  if (!iconSun || !iconMoon) return;

  if (theme === 'dark') {
    // In dark mode: show the sun (clicking will switch to light)
    iconSun.style.display  = '';
    iconMoon.style.display = 'none';
  } else {
    // In light mode: show the moon (clicking will switch to dark)
    iconSun.style.display  = 'none';
    iconMoon.style.display = '';
  }
}

// Wire up the toggle button click
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);   // persist across page loads
  });
}


/* ── 2. DYNAMIC FOOTER YEAR ──────────────────────────────────────────────── */

const footerYear = document.getElementById('footer-year');
if (footerYear) {
  footerYear.textContent = new Date().getFullYear();
}


/* ── 3. MOBILE HAMBURGER MENU ────────────────────────────────────────────── */

const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('active');
    hamburger.classList.toggle('active', isOpen);
    // Update ARIA attribute so screen readers know the menu state
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close the mobile menu when any nav link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}


/* ── 4. SMOOTH SCROLL FOR ANCHOR LINKS ──────────────────────────────────── */
/**
 * CSS scroll-behavior: smooth covers most cases, but this JS handler
 * also accounts for the fixed navbar height so sections aren't obscured.
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href').slice(1);
    const target   = document.getElementById(targetId);

    if (!target) return;  // let browser handle unknown hashes

    e.preventDefault();

    // Offset scroll position by the navbar height so content isn't hidden
    const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
    const targetTop    = target.getBoundingClientRect().top + window.scrollY - navbarHeight;

    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  });
});


/* ── 5. CONTACT FORM — AJAX SUBMISSION ──────────────────────────────────── */

const contactForm = document.getElementById('contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();   // prevent default full-page POST

    const submitBtn    = document.getElementById('submit-btn');
    const feedbackEl   = document.getElementById('form-feedback');

    // ── Client-side validation ────────────────────────────────────────────
    const name    = contactForm.querySelector('#name').value.trim();
    const email   = contactForm.querySelector('#email').value.trim();
    const message = contactForm.querySelector('#message').value.trim();

    // Show an inline error and abort if any field is empty
    if (!name || !email || !message) {
      showFeedback(feedbackEl, 'Please fill in all fields.', 'error');
      return;
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback(feedbackEl, 'Please enter a valid email address.', 'error');
      return;
    }

    // ── Disable button while the request is in flight ─────────────────────
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled    = true;
    feedbackEl.textContent = '';
    feedbackEl.className   = 'form-feedback';

    try {
      // POST form data to the Flask /contact endpoint
      const response = await fetch('/contact', {
        method: 'POST',
        body:   new FormData(contactForm),
      });

      const data = await response.json();

      if (response.ok && data.status === 'ok') {
        // Success — show message and reset the form
        showFeedback(feedbackEl, data.message, 'success');
        contactForm.reset();
      } else {
        // Server returned an error (e.g. missing fields — shouldn't reach here
        // after client validation, but handle gracefully)
        showFeedback(feedbackEl, data.message || 'Something went wrong.', 'error');
      }

    } catch (_err) {
      // Network error or unexpected exception
      showFeedback(
        feedbackEl,
        'Could not send message. Please email me directly at vochanji@hotmail.com.',
        'error'
      );
    } finally {
      // Re-enable the button regardless of outcome
      submitBtn.textContent = 'Send Message';
      submitBtn.disabled    = false;
    }
  });
}

/**
 * Display inline feedback below the form.
 * @param {HTMLElement} el      - the feedback paragraph element
 * @param {string}      message - text to display
 * @param {'success'|'error'} type - controls the CSS class / colour
 */
function showFeedback(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className   = `form-feedback ${type}`;
}


/* ── 6. SCROLL-IN ANIMATIONS ─────────────────────────────────────────────── */
/**
 * Add .fade-in-up to sections as they enter the viewport.
 * The CSS keyframe animation is defined in styles.css.
 */
const animationObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up');
        // Stop observing once animated — no need to re-trigger
        animationObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold:  0.1,
    rootMargin: '0px 0px -40px 0px',   // trigger slightly before fully in view
  }
);

// Observe all top-level sections
document.querySelectorAll('section').forEach(section => {
  animationObserver.observe(section);
});


/* ── 7. NAVBAR SCROLL EFFECT ─────────────────────────────────────────────── */
/**
 * Slightly deepen the navbar background once the user has scrolled
 * past the hero, reinforcing the "sticky" feel.
 */
const navbar = document.querySelector('.navbar');

if (navbar) {
  window.addEventListener('scroll', () => {
    // Using requestAnimationFrame keeps the scroll handler off the main thread
    requestAnimationFrame(() => {
      if (window.scrollY > 80) {
        navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.3)';
      } else {
        navbar.style.boxShadow = 'none';
      }
    });
  }, { passive: true });   // passive:true tells browser we won't call preventDefault
}


/* ── 8. LIGHTBOX ──────────────────────────────────────────────────────────── */

(function initLightbox() {
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lightbox-img');
  const lbClose = document.getElementById('lightbox-close');
  if (!lb || !lbImg) return;

  function openLightbox(src, alt) {
    lbImg.src = src;
    lbImg.alt = alt || '';
    lb.classList.add('lb-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.classList.remove('lb-open');
    document.body.style.overflow = '';
    // Small delay so the fade-out doesn't show a blank src flash
    setTimeout(() => { lbImg.src = ''; }, 200);
  }

  // Open on click of any zoomable image or project card header
  document.addEventListener('click', function (e) {
    const attachmentImg = e.target.closest('.attachment-img');
    if (attachmentImg) {
      const src = attachmentImg.getAttribute('data-src');
      const alt = attachmentImg.getAttribute('data-alt') || '';
      if (src) openLightbox(src, alt);
      return;
    }

    // Direct image click
    const img = e.target.closest('.cs-header-img, .avatar-photo');
    if (img) { openLightbox(img.src, img.alt); return; }
    // Click anywhere inside a card header that has an image
    const header = e.target.closest('.cs-header');
    if (header) {
      const headerImg = header.querySelector('.cs-header-img');
      if (headerImg) openLightbox(headerImg.src, headerImg.alt);
    }
  });

  // Close via button, backdrop click, or Escape key
  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', function (e) {
    if (e.target === lb) closeLightbox();   // click on backdrop, not image
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lb.classList.contains('lb-open')) closeLightbox();
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.classList?.contains('attachment-img')) {
      e.preventDefault();
      const src = document.activeElement.getAttribute('data-src');
      const alt = document.activeElement.getAttribute('data-alt') || '';
      if (src) openLightbox(src, alt);
    }
  });
})();
