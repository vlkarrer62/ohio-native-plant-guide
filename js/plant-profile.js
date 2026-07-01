// Shared plant profile behavior.
// 1) Reveals .section blocks as they enter the viewport.
// 2) Auto-links companion plant names using /data/plants.json.
// 3) Adds Botanical Plate / In the Garden switcher.
//    Supports plant.garden as either one object or an array of photos.

(function revealSections() {
  const sections = document.querySelectorAll(".section");

  if (!sections.length) return;

  if (!("IntersectionObserver" in window)) {
    sections.forEach(section => section.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.07 }
  );

  sections.forEach(section => observer.observe(section));
})();

async function loadPlantsJson() {
  const paths = [
    "../data/plants.json",
    "./data/plants.json",
    "data/plants.json",
    "/data/plants.json",
    "/ohio-native-plant-guide/data/plants.json"
  ];

  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (!response.ok) continue;

      const plants = await response.json();
      if (Array.isArray(plants)) return plants;
    } catch (_) {
      // Try next path.
    }
  }

  return null;
}

function normalizePlantName(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCurrentPlantSlug() {
  return (
    document.body.dataset.plant ||
    location.pathname.split("/").pop().replace(/\.html?$/, "")
  ).toLowerCase();
}

async function autoLinkCompanionPlants() {
  try {
    const companionNames = document.querySelectorAll(".companion-common");
    if (!companionNames.length) return;

    const plants = await loadPlantsJson();
    if (!Array.isArray(plants)) return;

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
        plantMap.set(normalizePlantName(name), plant.url);
      });
    });

    companionNames.forEach(nameEl => {
      const key = normalizePlantName(nameEl.textContent);
      const url = plantMap.get(key);

      if (!url) return;
      if (nameEl.querySelector("a")) return;

      const link = document.createElement("a");
      link.href = url;
      link.className = "companion-link";
      link.textContent = nameEl.textContent;

      nameEl.replaceChildren(link);
    });
  } catch (error) {
    console.warn("Companion plant linking failed:", error);
  }
}

async function plateGardenSwitcher() {
  try {
    const figure = document.querySelector("figure.botanical-plate");
    if (!figure) return;

    const plants = await loadPlantsJson();
    if (!Array.isArray(plants)) return;

    const slug = getCurrentPlantSlug();

    const plant = plants.find(p =>
      (p.slug && p.slug.toLowerCase() === slug) ||
      (p.url && p.url.toLowerCase().replace(/\.html?$/, "") === slug)
    );

    if (!plant || !plant.garden) return;

    const photos = (Array.isArray(plant.garden) ? plant.garden : [plant.garden])
      .filter(photo => photo && photo.src);

    if (!photos.length) return;

    const caption = figure.querySelector("figcaption");
    const originalCaptionHTML = caption ? caption.innerHTML : "";
    const fallbackCaption = `${plant.commonName || slug} in the garden`;

    const platePanel = document.createElement("div");
    platePanel.className = "plate-view is-on";
    platePanel.id = "pv-plate";
    platePanel.setAttribute("role", "tabpanel");

    Array.from(figure.childNodes)
      .filter(node => node !== caption)
      .forEach(node => platePanel.appendChild(node));

    const gardenPanel = document.createElement("div");
    gardenPanel.className = "plate-view";
    gardenPanel.id = "pv-garden";
    gardenPanel.setAttribute("role", "tabpanel");
    gardenPanel.hidden = true;

    const gallery = document.createElement("div");
    gallery.className = "plate-gallery";

    const images = photos.map((photo, index) => {
      const img = document.createElement("img");
      img.className = "plate-garden-img" + (index === 0 ? " is-on" : "");
      img.alt = photo.alt || fallbackCaption;
      img.loading = "lazy";
      img.dataset.src = photo.src;
      gallery.appendChild(img);
      return img;
    });

    gardenPanel.appendChild(gallery);

    let currentIndex = 0;
    let dots = [];

    function showPhoto(index) {
      currentIndex = (index + photos.length) % photos.length;

      images.forEach((img, imgIndex) => {
        const active = imgIndex === currentIndex;
        img.classList.toggle("is-on", active);

        if (active && !img.src) {
          img.src = img.dataset.src;
        }
      });

      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("is-on", dotIndex === currentIndex);
        dot.setAttribute("aria-selected", dotIndex === currentIndex ? "true" : "false");
      });

      if (caption) {
        caption.textContent = photos[currentIndex].caption || fallbackCaption;
      }
    }

    if (photos.length > 1) {
      const dotWrap = document.createElement("div");
      dotWrap.className = "plate-dots";
      dotWrap.setAttribute("role", "tablist");
      dotWrap.setAttribute("aria-label", "Garden photo gallery");

      dots = photos.map((_, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "plate-dot" + (index === 0 ? " is-on" : "");
        button.setAttribute("role", "tab");
        button.setAttribute("aria-label", `Photo ${index + 1} of ${photos.length}`);
        button.setAttribute("aria-selected", index === 0 ? "true" : "false");

        button.addEventListener("click", () => showPhoto(index));

        button.addEventListener("keydown", event => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            showPhoto(currentIndex + 1);
            dots[currentIndex].focus();
          }

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            showPhoto(currentIndex - 1);
            dots[currentIndex].focus();
          }
        });

        dotWrap.appendChild(button);
        return button;
      });

      gardenPanel.appendChild(dotWrap);

      let touchStartX = 0;

      gallery.addEventListener(
        "touchstart",
        event => {
          touchStartX = event.changedTouches[0].clientX;
        },
        { passive: true }
      );

      gallery.addEventListener(
        "touchend",
        event => {
          const distanceX = event.changedTouches[0].clientX - touchStartX;

          if (distanceX < -40) showPhoto(currentIndex + 1);
          if (distanceX > 40) showPhoto(currentIndex - 1);
        },
        { passive: true }
      );
    }

    const switcher = document.createElement("div");
    switcher.className = "plate-switch";
    switcher.setAttribute("role", "tablist");
    switcher.setAttribute("aria-label", "Choose how to view this plant");

    switcher.innerHTML = `
      <span class="thumb" aria-hidden="true"></span>
      <button type="button" role="tab" aria-selected="true" aria-controls="pv-plate">Botanical Plate</button>
      <button type="button" role="tab" aria-selected="false" aria-controls="pv-garden">In the Garden</button>
    `;

    figure.insertBefore(switcher, caption || null);
    figure.insertBefore(platePanel, caption || null);
    figure.insertBefore(gardenPanel, caption || null);

    const tabs = Array.from(switcher.querySelectorAll("button"));
    const thumb = switcher.querySelector(".thumb");

    const views = {
      "pv-plate": platePanel,
      "pv-garden": gardenPanel
    };

    function placeThumb(tab) {
      if (!thumb || !tab) return;
      thumb.style.left = `${tab.offsetLeft}px`;
      thumb.style.width = `${tab.offsetWidth}px`;
    }

    function selectTab(tab) {
      tabs.forEach(currentTab => {
        const active = currentTab === tab;
        currentTab.setAttribute("aria-selected", active ? "true" : "false");

        const view = views[currentTab.getAttribute("aria-controls")];
        if (!view) return;

        view.classList.toggle("is-on", active);
        view.hidden = !active;
      });

      placeThumb(tab);

      if (tab.getAttribute("aria-controls") === "pv-garden") {
        showPhoto(currentIndex);
      } else if (caption) {
        caption.innerHTML = originalCaptionHTML;
      }
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectTab(tab));

      tab.addEventListener("keydown", event => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

        event.preventDefault();

        const nextIndex =
          event.key === "ArrowRight"
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length;

        tabs[nextIndex].focus();
        selectTab(tabs[nextIndex]);
      });
    });

    requestAnimationFrame(() => {
      placeThumb(tabs[0]);
    });

    window.addEventListener("resize", () => {
      const activeTab = tabs.find(tab => tab.getAttribute("aria-selected") === "true");
      placeThumb(activeTab);
    });
  } catch (error) {
    console.warn("Botanical plate switcher failed:", error);
  }
}

autoLinkCompanionPlants();
plateGardenSwitcher();