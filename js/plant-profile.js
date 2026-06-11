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
