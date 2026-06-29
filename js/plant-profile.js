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

      names.forEach(name => {
        const key = normalize(name);
        if (key && !plantMap.has(key)) plantMap.set(key, plant.url);
      });
    });

    companionNames.forEach(el => {
      // Leave existing manual links alone.
      if (el.querySelector('a')) return;

      const name = el.textContent.trim();
      const matchUrl = plantMap.get(normalize(name));
      if (!matchUrl) return;

      const link = document.createElement('a');
      link.href = matchUrl;
      link.className = 'companion-link';
      link.textContent = name;

      el.textContent = '';
      el.appendChild(link);
    });
  } catch (err) {
    console.warn('Companion auto-linking failed:', err);
  }
}

autoLinkCompanionPlants();

/* ---- Botanical plate ⇄ garden photo switcher (final) ----
   Adds an "In the Garden" view to a plant's botanical plate, but ONLY
   when that plant has a `garden` photo in /data/plants.json.
   Plants without one are left exactly as they are today. */
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
    if (!plant || !plant.garden || !plant.garden.src) return;  // no photo → untouched

    const cap = figure.querySelector('figcaption');
    const plateHTML = cap ? cap.innerHTML : '';                 // keep the <em> italics
    const gardenCaption = plant.garden.caption || ((plant.commonName || slug) + ' in the garden');

    const platePanel = document.createElement('div');
    platePanel.className = 'plate-view is-on';
    platePanel.id = 'pv-plate';
    platePanel.setAttribute('role', 'tabpanel');
    Array.from(figure.childNodes).filter(n => n !== cap).forEach(n => platePanel.appendChild(n));

    const gardenPanel = document.createElement('div');
    gardenPanel.className = 'plate-view';
    gardenPanel.id = 'pv-garden';
    gardenPanel.setAttribute('role', 'tabpanel');
    gardenPanel.hidden = true;
    const img = document.createElement('img');
    img.className = 'plate-garden-img';
    img.alt = (plant.commonName || slug) + ' growing in the garden';
    img.loading = 'lazy';
    img.dataset.src = plant.garden.src;
    gardenPanel.appendChild(img);

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
      if (cap) {
        if (tab.getAttribute('aria-controls') === 'pv-garden') cap.textContent = gardenCaption;
        else cap.innerHTML = plateHTML;
      }
      const gi = gardenPanel.querySelector('img');
      if (tab.getAttribute('aria-controls') === 'pv-garden' && gi && !gi.src) gi.src = gi.dataset.src;
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
