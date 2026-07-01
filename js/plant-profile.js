// Shared plant profile behavior.
// 1) Reveals .section blocks as they enter the viewport.
// 2) Auto-links companion plant names using /data/plants.json.

(function revealSections() {
  const sections = document.querySelectorAll('.section');
  if (!sections.length || !('IntersectionObserver' in window)) {
    sections.forEach(section => section.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    }),
    { threshold: 0.07 }
  );

  sections.forEach(section => observer.observe(section));
})();

async function autoLinkCompanionPlants() {
  try {
    const companionNames = document.querySelectorAll('.companion-common');
    if (!companionNames.length) return;

    const possiblePaths = [
      '../data/plants.json',
      './data/plants.json',
      'data/plants.json',
      '/ohio-native-plant-guide/data/plants.json'
    ];

    let plants = null;

    for (const path of possiblePaths) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          plants = await res.json();
          break;
        }
      } catch (_) {
        // Try the next path.
      }
    }

    if (!Array.isArray(plants)) return;

    const normalize = text =>
      String(text || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[’']/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const plantMap = new Map();

    plants.forEach(plant => {
      if (!plant.url) return;

      const names = [
        plant.commonName,
        plant.scientificName,
        plant.displayName,
        plant.shortName,
        ...(plant.aliases || [])
      ].filter(Boolean);

 /* ---- Botanical plate ⇄ garden photo switcher (gallery-capable) ----
   `garden` in plants.json may be ONE object {src, caption} or an ARRAY of them.
   One photo behaves exactly as before; two or more get dots + swipe.
   Plants with no `garden` are left untouched. */
(function plateGardenSwitcher() {
  const figure = document.querySelector('figure.botanical-plate');
  if (!figure) return;

  const slug = (document.body.dataset.plant ||
    location.pathname.split('/').pop().replace(/\.html?$/, '')).toLowerCase();

  const paths = ['../data/plants.json', './data/plants.json', 'data/plants.json',
                 '/ohio-native-plant-guide/data/plants.json'];

  (async () => {
    let plants = null;
    for (const p of paths) {
      try { const r = await fetch(p); if (r.ok) { plants = await r.json(); break; } } catch (_) {}
    }
    if (!Array.isArray(plants)) return;

    const plant = plants.find(p =>
      (p.slug && p.slug.toLowerCase() === slug) ||
      (p.url && p.url.toLowerCase().replace(/\.html?$/, '') === slug));
    if (!plant || !plant.garden) return;

    // accept a single object OR an array — keeps existing single-photo entries working
    const photos = (Array.isArray(plant.garden) ? plant.garden : [plant.garden])
      .filter(ph => ph && ph.src);
    if (!photos.length) return;

    const fallbackCap = (plant.commonName || slug) + ' in the garden';
    const cap = figure.querySelector('figcaption');
    const plateHTML = cap ? cap.innerHTML : '';          // preserve the <em> italics

    // --- plate panel: move the existing figure content (except figcaption) in ---
    const platePanel = document.createElement('div');
    platePanel.className = 'plate-view is-on';
    platePanel.id = 'pv-plate';
    platePanel.setAttribute('role', 'tabpanel');
    Array.from(figure.childNodes).filter(n => n !== cap).forEach(n => platePanel.appendChild(n));

    // --- garden panel: a gallery (1..n photos) ---
    const gardenPanel = document.createElement('div');
    gardenPanel.className = 'plate-view';
    gardenPanel.id = 'pv-garden';
    gardenPanel.setAttribute('role', 'tabpanel');
    gardenPanel.hidden = true;

    const gallery = document.createElement('div');
    gallery.className = 'plate-gallery';
    const imgs = photos.map((ph, idx) => {
      const im = document.createElement('img');
      im.className = 'plate-garden-img' + (idx === 0 ? ' is-on' : '');
      im.alt = ph.alt || fallbackCap;
      im.loading = 'lazy';
      im.dataset.src = ph.src;
      gallery.appendChild(im);
      return im;
    });
    gardenPanel.appendChild(gallery);

    let dots = [];
    let cur = 0;
    function showPhoto(i) {
      cur = (i + photos.length) % photos.length;
      imgs.forEach((im, idx) => {
        const on = idx === cur;
        im.classList.toggle('is-on', on);
        if (on && !im.src) im.src = im.dataset.src;   // lazy-load on first view
      });
      dots.forEach((d, idx) => d.classList.toggle('is-on', idx === cur));
      if (cap) cap.textContent = photos[cur].caption || fallbackCap;
    }

    if (photos.length > 1) {
      const dotWrap = document.createElement('div');
      dotWrap.className = 'plate-dots';
      dotWrap.setAttribute('role', 'tablist');
      dots = photos.map((_, idx) => {
        const b = document.createElement('button');
        b.className = 'plate-dot' + (idx === 0 ? ' is-on' : '');
        b.setAttribute('aria-label', 'Photo ' + (idx + 1) + ' of ' + photos.length);
        b.addEventListener('click', () => showPhoto(idx));
        b.addEventListener('keydown', e => {
          if (e.key === 'ArrowRight') { showPhoto(cur + 1); dots[cur].focus(); }
          if (e.key === 'ArrowLeft')  { showPhoto(cur - 1); dots[cur].focus(); }
        });
        dotWrap.appendChild(b);
        return b;
      });
      gardenPanel.appendChild(dotWrap);

      let tx = 0;
      gallery.addEventListener('touchstart', e => { tx = e.changedTouches[0].clientX; }, { passive: true });
      gallery.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - tx;
        if (dx < -40) showPhoto(cur + 1);
        else if (dx > 40) showPhoto(cur - 1);
      }, { passive: true });
    }

    // --- the outer Botanical Plate / In the Garden control ---
    const sw = document.createElement('div');
    sw.className = 'plate-switch';
    sw.setAttribute('role', 'tablist');
    sw.setAttribute('aria-label', 'Choose how to view this plant');
    sw.innerHTML =
      '<span class="thumb" aria-hidden="true"></span>' +
      '<button role="tab" aria-selected="true"  aria-controls="pv-plate">Botanical Plate</button>' +
      '<button role="tab" aria-selected="false" aria-controls="pv-garden">In the Garden</button>';

    figure.insertBefore(sw, cap || null);
    figure.insertBefore(platePanel, cap || null);
    figure.insertBefore(gardenPanel, cap || null);

    const tabs = Array.from(sw.querySelectorAll('button'));
    const thumb = sw.querySelector('.thumb');
    const views = { 'pv-plate': platePanel, 'pv-garden': gardenPanel };
    const place = t => { thumb.style.left = t.offsetLeft + 'px'; thumb.style.width = t.offsetWidth + 'px'; };
    function select(tab) {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        const v = views[t.getAttribute('aria-controls')];
        v.classList.toggle('is-on', on); v.hidden = !on;
      });
      place(tab);
      if (tab.getAttribute('aria-controls') === 'pv-garden') {
        showPhoto(cur);                       // sets caption + lazy-loads current photo
      } else if (cap) {
        cap.innerHTML = plateHTML;            // restore italic scientific name
      }
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const ni = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          tabs[ni].focus(); select(tabs[ni]);
        }
      });
    });
    requestAnimationFrame(() => place(tabs[0]));
    window.addEventListener('resize', () => place(tabs.find(t => t.getAttribute('aria-selected') === 'true')));
  })();
})();
