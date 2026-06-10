# Refactor notes

This copy preserves the existing visual design while moving inline `<style>` blocks into external CSS files.

## What changed

- Added `/css/base.css` as the shared global stylesheet scaffold.
- Added `/css/plant-profile.css` for future shared plant-profile styling.
- Added `/css/directory.css` for future directory/index styling.
- Added `/css/about.css` for future about-page styling.
- Extracted each page’s original inline CSS into `/css/pages/`.
- Updated each HTML file to load the shared CSS files plus its extracted page-specific CSS file.
- Fixed the `Wildlife/` folder capitalization in common links/fetch paths.
- Fixed `Wildlife/wildlife.json` so Carpenter Bee points to `carpenter-bee_1.html`.
- Fixed any `plants.json` reference to `foxglove-beardtongue.html` to use `penstemon.html` when present.

## Why this is a safe first refactor

The page-specific CSS files contain the original inline CSS, so the current handcrafted visual identity should remain intact. This creates the shared CSS architecture without flattening each plant profile’s personality.

## Recommended next phase

Move repeated rules gradually from `/css/pages/plants-*.css` into `/css/plant-profile.css`, starting with navigation, page layout, botanical plate/card components, footer, tag/chip styles, and mobile breakpoints.

## Pages extracted

- `index.html` → `css/pages/index.css` (26,609 CSS characters)
- `about.html` → `css/pages/about.css` (15,527 CSS characters)
- `plants/switchgrass.html` → `css/pages/plants-switchgrass.css` (10,375 CSS characters)
- `plants/purple-coneflower.html` → `css/pages/plants-purple-coneflower.css` (14,163 CSS characters)
- `plants/goldenrod.html` → `css/pages/plants-goldenrod.css` (13,980 CSS characters)
- `plants/catmint.html` → `css/pages/plants-catmint.css` (11,793 CSS characters)
- `plants/index.html` → `css/pages/plants-index.css` (13,567 CSS characters)
- `plants/ironweed.html` → `css/pages/plants-ironweed.css` (14,118 CSS characters)
- `plants/mountain-mint.html` → `css/pages/plants-mountain-mint.css` (16,341 CSS characters)
- `plants/penstemon.html` → `css/pages/plants-penstemon.css` (14,245 CSS characters)
- `plants/witch-hazel.html` → `css/pages/plants-witch-hazel.css` (14,019 CSS characters)
- `plants/cardinal-flower.html` → `css/pages/plants-cardinal-flower.css` (13,575 CSS characters)
- `plants/little-bluestem.html` → `css/pages/plants-little-bluestem.css` (13,956 CSS characters)
- `plants/pennsylvania-sedge.html` → `css/pages/plants-pennsylvania-sedge.css` (13,294 CSS characters)
- `plants/false-sunflower.html` → `css/pages/plants-false-sunflower.css` (14,762 CSS characters)
- `plants/butterfly-weed.html` → `css/pages/plants-butterfly-weed.css` (13,611 CSS characters)
- `plants/purple-lovegrass.html` → `css/pages/plants-purple-lovegrass.css` (13,442 CSS characters)
- `plants/fox-sedge.html` → `css/pages/plants-fox-sedge.css` (11,863 CSS characters)
- `plants/coreopsis.html` → `css/pages/plants-coreopsis.css` (13,548 CSS characters)
- `plants/aster.html` → `css/pages/plants-aster.css` (17,041 CSS characters)
- `plants/honey-locust.html` → `css/pages/plants-honey-locust.css` (13,519 CSS characters)
- `plants/rattlesnake-master.html` → `css/pages/plants-rattlesnake-master.css` (13,373 CSS characters)
- `plants/joe-pye-weed.html` → `css/pages/plants-joe-pye-weed.css` (13,373 CSS characters)
- `plants/golden-alexanders.html` → `css/pages/plants-golden-alexanders.css` (14,527 CSS characters)
- `plants/black-eyed-susan.html` → `css/pages/plants-black-eyed-susan.css` (14,835 CSS characters)
- `plants/wild-bergamot.html` → `css/pages/plants-wild-bergamot.css` (11,519 CSS characters)
- `plants/swamp-milkweed.html` → `css/pages/plants-swamp-milkweed.css` (12,073 CSS characters)
- `plants/white-oak.html` → `css/pages/plants-white-oak.css` (14,643 CSS characters)
- `plants/prairie-dropseed.html` → `css/pages/plants-prairie-dropseed.css` (14,157 CSS characters)
- `plants/liatris.html` → `css/pages/plants-liatris.css` (13,433 CSS characters)
- `plants/red-buckeye.html` → `css/pages/plants-red-buckeye.css` (13,017 CSS characters)
- `plants/serviceberry.html` → `css/pages/plants-serviceberry.css` (14,805 CSS characters)
- `plants/bur-oak.html` → `css/pages/plants-bur-oak.css` (14,951 CSS characters)
- `Wildlife/index.html` → `css/pages/Wildlife-index.css` (9,082 CSS characters)
- `Wildlife/carpenter-bee_1.html` → `css/pages/Wildlife-carpenter-bee_1.css` (13,600 CSS characters)

## Known remaining content gap

- `plants/serviceberry.html` and `plants/plants.json` reference `nodding-onion.html`, but no Nodding Onion profile file exists in this repository yet. I left this as-is because it looks like a planned future plant profile, not a path typo.

## Companion auto-linking pass

Added a shared script at `js/plant-profile.js` that automatically turns `.companion-common` plant names into links by matching them against `plants/plants.json`. Existing manually linked companions are preserved.

Added shared companion-link styling to `css/plant-profile.css` so future plant pages do not need to repeat the same CSS.

Added `aliases` entries to `plants/plants.json` for common companion wording variants such as `Goldenrods`, `Tall Goldenrod`, `New England Aster`, `White Wood Aster`, `Black Eyed Susan`, and scientific names.

Each individual plant profile now loads the shared behavior with:

```html
<script src="../js/plant-profile.js"></script>
```

Known intentional open item: `nodding-onion.html` is still referenced in `plants.json`, but the page has not been created yet. Once that file exists, companion links to Nodding Onion should start working automatically.


## Botanical plate placeholders

Added placeholder botanical plate sections to plant pages that did not yet have a plate. Each placeholder looks for `images/[plant-page-slug]-plate.png`; adding an image with that exact filename will make it appear automatically.

Pages updated:
- `bur-oak.html`
- `butterfly-weed.html`
- `cardinal-flower.html`
- `catmint.html`
- `coreopsis.html`
- `fox-sedge.html`
- `honey-locust.html`
- `joe-pye-weed.html`
- `liatris.html`
- `little-bluestem.html`
- `mountain-mint.html`
- `pennsylvania-sedge.html`
- `prairie-dropseed.html`
- `red-buckeye.html`
- `switchgrass.html`
- `white-oak.html`
- `wild-bergamot.html`
- `witch-hazel.html`


## Wildlife navigation update
- Added a shared top return navigation component for wildlife profile pages.
- Wildlife profiles now include links back to Home, the Wildlife Directory, and the Plant Directory.
- Styling lives in `/css/base.css` under `.site-return-nav`.


## Plant page consistency update

- Standardized plant profile plate eyebrow labels to `Botanical Plate`.
- Updated Serviceberry, False Sunflower, and Black-eyed Susan to use the shared botanical-plate placeholder frame pattern.
- Removed duplicate inline scroll-reveal scripts from those three newer plant pages so they rely on `../js/plant-profile.js`.
- No page visual redesigns were made.
