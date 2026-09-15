/* ==========================================================================
   Lhel Farías — Portfolio
   Shared behavior for every page.

   1. Mobile menu
   2. Scroll to top (logo / Home link on the current page)
   3. Image viewer for case-study mockups
   ========================================================================== */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');


  /* 1. Mobile menu
     ------------------------------------------------------------------------ */

  const nav = document.querySelector('.site-nav');
  const toggle = nav && nav.querySelector('.nav-toggle');

  if (toggle) {
    const isOpen = () => nav.classList.contains('is-open');

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    // Close after choosing a link (needed for same-page anchors).
    nav.querySelector('.nav-menu').addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', (event) => {
      if (isOpen() && !nav.contains(event.target)) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Reset if the window is resized to desktop while the menu is open.
    window.matchMedia('(min-width: 769px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }


  /* 2. Scroll to top
     ------------------------------------------------------------------------ */

  // Treats "/", "/repo/" and "/repo/index.html" as the same page (GitHub Pages).
  const normalizePath = (path) => path.replace(/index\.html$/, '');

  document.querySelectorAll('[data-scroll-top]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (normalizePath(link.pathname) !== normalizePath(window.location.pathname)) return;
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    });
  });


  /* 3. Image viewer
     ------------------------------------------------------------------------ */

  const LINK_SELECTOR = '[data-gallery] .mockup-link';

  if (document.querySelector(LINK_SELECTOR) && typeof HTMLDialogElement === 'function') {
    initLightbox();
  }

  function initLightbox() {
    const icon = (path) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

    const dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Image viewer');
    dialog.innerHTML = `
      <div class="lightbox-bar">
        <a class="lightbox-original" target="_blank" rel="noopener">Open original</a>
        <button class="lightbox-btn" type="button" data-action="close" aria-label="Close">${icon('<path d="M6 6l12 12M18 6L6 18"/>')}</button>
      </div>
      <div class="lightbox-stage">
        <img class="lightbox-img" alt="">
      </div>
      <div class="lightbox-bar lightbox-bar-bottom">
        <button class="lightbox-btn" type="button" data-action="prev" aria-label="Previous image">${icon('<path d="M15 5l-7 7 7 7"/>')}</button>
        <p class="lightbox-caption" aria-live="polite">
          <span class="lightbox-title"></span>
          <span class="lightbox-count"></span>
        </p>
        <button class="lightbox-btn" type="button" data-action="next" aria-label="Next image">${icon('<path d="M9 5l7 7-7 7"/>')}</button>
      </div>`;
    document.body.append(dialog);

    const image = dialog.querySelector('.lightbox-img');
    const stage = dialog.querySelector('.lightbox-stage');
    const title = dialog.querySelector('.lightbox-title');
    const count = dialog.querySelector('.lightbox-count');
    const original = dialog.querySelector('.lightbox-original');
    const arrows = dialog.querySelectorAll('[data-action="prev"], [data-action="next"]');

    let items = [];
    let current = 0;
    let trigger = null;

    const show = (index) => {
      current = (index + items.length) % items.length; // wraps around at both ends
      const link = items[current];
      const thumb = link.querySelector('img');
      const tag = link.closest('.mockup-frame')?.querySelector('.mockup-tag');
      const alt = thumb ? thumb.alt : '';

      image.src = link.href;
      image.alt = alt;
      original.href = link.href;
      // Alt text is the caption: tags like "Starting Point" repeat within a section.
      title.textContent = alt || (tag ? tag.textContent.trim() : '');
      count.textContent = items.length > 1 ? `${current + 1} of ${items.length}` : '';

      // Warm up the neighbors so next/previous feel instant.
      [current - 1, current + 1].forEach((n) => {
        const neighbor = items[(n + items.length) % items.length];
        if (neighbor !== link) new Image().src = neighbor.href;
      });
    };

    const open = (link) => {
      items = [...link.closest('[data-gallery]').querySelectorAll('.mockup-link')];
      trigger = link;
      arrows.forEach((button) => { button.hidden = items.length < 2; });
      show(items.indexOf(link));
      document.documentElement.classList.add('has-lightbox');
      dialog.showModal();
    };

    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('has-lightbox');
      image.removeAttribute('src');
      if (trigger) trigger.focus();
    });

    // Intercept plain clicks only; Cmd/Ctrl/Shift-click keeps opening a new tab.
    document.addEventListener('click', (event) => {
      const link = event.target.closest(LINK_SELECTOR);
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      open(link);
    });

    dialog.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'close') dialog.close();
      else if (action === 'prev') show(current - 1);
      else if (action === 'next') show(current + 1);
      else if (event.target === dialog || event.target === stage) dialog.close();
    });

    dialog.addEventListener('keydown', (event) => {
      if (items.length < 2) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
    });

    // Swipe with one finger; two-finger gestures are left for pinch-zoom.
    let startX = null;
    let startY = 0;

    stage.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) { startX = null; return; }
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    }, { passive: true });

    stage.addEventListener('touchend', (event) => {
      if (startX === null || items.length < 2) return;
      const dx = event.changedTouches[0].clientX - startX;
      const dy = event.changedTouches[0].clientY - startY;
      startX = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(dx < 0 ? current + 1 : current - 1);
    }, { passive: true });
  }
})();
