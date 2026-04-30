/* ========================================================================
   GoLove — shared app script
   Handles: language toggle, snap navigation, chapter prev/next injection
   ======================================================================== */

(function () {
  'use strict';

  // ----------------------------------------------------------------------
  // Chapter manifest — single source of truth for all chapter pages
  // ----------------------------------------------------------------------
  const CHAPTERS = [
    { slug: '01-first-steps',  tr: 'İlk Adımlar',          en: 'First Steps' },
    { slug: '02-types',        tr: 'Değişken ve Tip',      en: 'Variables & Types' },
    { slug: '03-functions',    tr: 'Fonksiyon',            en: 'Functions' },
    { slug: '04-slice',        tr: 'Slice',                en: 'Slice' },
    { slug: '05-maps',         tr: 'Map',                  en: 'Maps' },
    { slug: '06-structs',      tr: 'Struct ve Metot',      en: 'Structs & Methods' },
    { slug: '07-pointers',     tr: 'Pointer',              en: 'Pointers' },
    { slug: '08-interfaces',   tr: 'Interface',            en: 'Interfaces' },
    { slug: '09-errors',       tr: 'Hata Yönetimi',        en: 'Error Handling' },
    { slug: '10-testing',      tr: 'Test Yazmak',          en: 'Testing' },
    { slug: '11-goroutines',   tr: 'Goroutine',            en: 'Goroutines' },
    { slug: '12-channels',     tr: 'Channel',              en: 'Channels' },
    { slug: '13-mutex',        tr: 'Mutex ve Sync',        en: 'Mutex & Sync' },
    { slug: '14-http',         tr: 'HTTP Sunucu',          en: 'HTTP Server' },
  ];
  const AVAILABLE = new Set(['01-first-steps', '02-types', '03-functions', '04-slice', '05-maps', '06-structs', '07-pointers', '08-interfaces', '09-errors', '10-testing', '11-goroutines', '12-channels', '13-mutex', '14-http']);

  // ----------------------------------------------------------------------
  // Progress tracking (localStorage) — set of chapter slugs reaching last card
  // ----------------------------------------------------------------------
  const PROGRESS_KEY = 'golove-progress';
  function getCompleted() {
    try { return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]')); }
    catch (e) { return new Set(); }
  }
  function markCompleted(slug) {
    const set = getCompleted();
    if (set.has(slug)) return;
    set.add(slug);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...set]));
  }

  // Expose for landing page rendering
  window.GoLove = { CHAPTERS, AVAILABLE, getCompleted };

  // ----------------------------------------------------------------------
  // Language toggle (works on every page)
  // ----------------------------------------------------------------------
  const html = document.documentElement;
  const langBtn = document.getElementById('langToggle');
  const ltTr = document.getElementById('lt-tr');
  const ltEn = document.getElementById('lt-en');

  const savedLang = localStorage.getItem('golove-lang');
  if (savedLang === 'en' || savedLang === 'tr') html.lang = savedLang;

  function updateLangButton() {
    if (!ltTr || !ltEn) return;
    const cur = html.lang;
    ltTr.classList.toggle('active', cur === 'tr');
    ltEn.classList.toggle('active', cur === 'en');
  }
  updateLangButton();

  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const next = html.lang === 'tr' ? 'en' : 'tr';
      html.lang = next;
      localStorage.setItem('golove-lang', next);
      updateLangButton();
    });
  }

  // ----------------------------------------------------------------------
  // Chapter page logic — only runs if body has data-chapter
  // ----------------------------------------------------------------------
  const chapterSlug = document.body.getAttribute('data-chapter');
  if (!chapterSlug) return;

  const chapterIndex = CHAPTERS.findIndex(c => c.slug === chapterSlug);
  const prev = chapterIndex > 0 ? CHAPTERS[chapterIndex - 1] : null;
  const next = chapterIndex >= 0 && chapterIndex < CHAPTERS.length - 1
    ? CHAPTERS[chapterIndex + 1] : null;

  // Inject chapter navigation card after the last existing .card
  function injectChapterNav() {
    const lastCard = Array.from(document.querySelectorAll('.card')).pop();
    if (!lastCard) return null;

    const prevAvailable = prev && AVAILABLE.has(prev.slug);
    const nextAvailable = next && AVAILABLE.has(next.slug);

    const prevCard = prev ? `
      <a class="nav-card${prevAvailable ? '' : ' disabled'}" href="${prevAvailable ? prev.slug + '.html' : '#'}">
        <span class="label">
          <span class="lang-tr">← Önceki bölüm</span>
          <span class="lang-en">← Previous chapter</span>
        </span>
        <span class="title">${chapterIndex.toString().padStart(2, '0')} · <span class="lang-tr">${prev.tr}</span><span class="lang-en">${prev.en}</span></span>
      </a>` : `<div></div>`;

    const nextCard = next ? `
      <a class="nav-card${nextAvailable ? '' : ' disabled'}" href="${nextAvailable ? next.slug + '.html' : '#'}">
        <span class="label">
          <span class="lang-tr">Sonraki bölüm →</span>
          <span class="lang-en">Next chapter →</span>
        </span>
        <span class="title">${(chapterIndex + 2).toString().padStart(2, '0')} · <span class="lang-tr">${next.tr}</span><span class="lang-en">${next.en}</span></span>
      </a>` : `<div></div>`;

    const navHTML = `
      <section class="card" id="cnav">
        <div class="card-inner banner chapter-nav">
          <h2>
            <span class="lang-tr">Sıradaki ne var?</span>
            <span class="lang-en">What's next?</span>
          </h2>
          <div class="nav-grid">
            ${prevCard}
            ${nextCard}
          </div>
          <a class="home-card" href="index.html">
            <span class="lang-tr">↩ Tüm bölümler</span>
            <span class="lang-en">↩ All chapters</span>
          </a>
        </div>
      </section>
    `;
    lastCard.insertAdjacentHTML('afterend', navHTML);
    return document.getElementById('cnav');
  }

  injectChapterNav();

  // ----------------------------------------------------------------------
  // Snap navigation (chapter pages)
  // ----------------------------------------------------------------------
  const cards = Array.from(document.querySelectorAll('.card'));
  const dotsNav = document.querySelector('.dots');
  const fill = document.querySelector('.progress-fill');
  let current = 0;

  if (dotsNav) {
    cards.forEach((_, i) => {
      const b = document.createElement('button');
      b.className = 'dot' + (i === 0 ? ' active' : '');
      b.setAttribute('aria-label', `Card ${i + 1}`);
      b.addEventListener('click', () => snapTo(i));
      dotsNav.appendChild(b);
    });
  }
  const dots = dotsNav ? Array.from(dotsNav.children) : [];

  function snapTo(idx) {
    idx = Math.max(0, Math.min(cards.length - 1, idx));
    cards[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    current = idx;
  }

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowDown': case 'PageDown': case 'j':
      case ' ': case 'Enter':
        e.preventDefault(); snapTo(current + 1); break;
      case 'ArrowUp': case 'PageUp': case 'k':
        e.preventDefault(); snapTo(current - 1); break;
      case 'Home':
        e.preventDefault(); snapTo(0); break;
      case 'End':
        e.preventDefault(); snapTo(cards.length - 1); break;
    }
  });

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting && en.intersectionRatio > 0.55) {
          const idx = cards.indexOf(en.target);
          if (idx !== -1) {
            current = idx;
            dots.forEach((d, i) => d.classList.toggle('active', i === idx));
            if (fill) fill.style.width = ((idx) / (cards.length - 1) * 100) + '%';
            if (history.replaceState) {
              history.replaceState(null, '', '#c' + idx);
            }
            // Last content card = cards.length - 2 (last is injected chapter-nav)
            if (idx >= cards.length - 2) markCompleted(chapterSlug);
          }
        }
      });
    }, { threshold: [0.55, 0.6, 0.7] });
    cards.forEach(c => obs.observe(c));
  }

  window.addEventListener('load', () => {
    const m = (location.hash || '').match(/^#c(\d+)$/);
    if (m) {
      const idx = parseInt(m[1], 10);
      if (!isNaN(idx)) snapTo(idx);
    }
  });
})();
