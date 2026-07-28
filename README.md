# Palette Studio — developer README

This is the source project for Palette Studio. **What you install to your
phone and what GitHub Pages serves is still one self-contained
`index.html`** — that hasn't changed. What changed is where you *edit* it.

## Why this exists

The app grew past 7,000 lines in a single HTML file across many sessions.
That's genuinely fine for a while, but it stopped scaling: bugs like
mismatched function names, stale element IDs, and dead code kept slipping
through because nothing automated was checking for them — every review was
a manual grep pass. This restructuring keeps the *shipped* app exactly the
same shape while giving the *editing* experience real tooling: multiple
organized files, a type checker, a linter, and a real test suite.

## Structure

```
src/
  index.template.html   — the HTML shell (head, body markup, two
                           placeholders: {{CSS}} and {{JS}})
  styles.css             — all CSS, one file
  js/
    _MODULE_ORDER.txt    — the exact concatenation order (matters — see below)
    rendering-engine.js  — canvas noise/texture, K-M pigment mixing math,
                           Lab color distance, the inverse mixing solver
    colors-data.js       — the paint reference database (pure data)
    state-core.js        — palette load/save, safe storage, page nav
    palette-view-core.js — Palette tab shell + swatch grid
    mixing-chart.js      — Mix Colors bar, Color Wheel, Mixing Chart
    color-matcher.js     — "Match a Color" solver UI
    brush-studio.js      — Mix Studio (wet-on-wet practice canvas)
    palette-actions-chip.js — palette CRUD + the paint-detail chip modal
    reference-tab.js     — Brand Reference grid
    ui-shell.js          — toasts, haptics, swipe-to-delete
    pigment-tools.js     — notes, Pigment Compare, Recommended Palettes
    export-print.js      — printable palette export
    opacity-tool.js      — Opacity Chart
    tube-tracker.js      — Paint Tube Tracker
    cost-estimator.js    — Cost Estimator
    recipes-tool.js      — Quick Mix Recipes
    sort-drag-photo.js   — sort modes, drag-reorder, swatch photos
    shopping-backup.js   — Shopping List, Backup/Import-Export, diagnostics
    harmony-generator.js — Color Harmony (page init only — see note below)
    value-study.js       — Value Study, Roll a Reference, prompt dice
                           (also contains 3 Harmony functions — see note)
    app-init-shell.js    — mobile nav drawer, app init, service worker reg
  static/                — copied as-is: manifest.json, sw.js, icons

build.js                 — assembles src/ into dist/index.html
tsconfig.json             — JSDoc-based type checking config
eslint.config.js           — lint config (has to know about this app's
                              global names — see comment in the file)
vitest.config.js            — test config (uses jsdom — see note below)
tests/                       — real tests for the pure-logic functions
dist/                          — BUILD OUTPUT. This is what you deploy.
```

### A known wrinkle, left as-is on purpose

`harmony-generator.js` only contains the Color Harmony page's init function.
Its other three functions (`renderHarmonyColorGrid`, `setHarmonyRoot`,
`renderHarmonyResult`) physically ended up inside `value-study.js` at some
point in the app's single-file history — probably pasted in near whatever
was being edited at the time rather than found by scrolling to the right
spot. This restructuring was done as a pure mechanical split (every
original line landed in exactly one new file, in original order, verified
byte-for-byte against the original) specifically so it carried zero risk of
introducing a behavior change. Silently "fixing" this placement would have
broken that guarantee. It's a good candidate for a small, deliberate
follow-up now that it's actually easy to find and move.

## Day-to-day workflow

```bash
node build.js       # rebuild dist/index.html — no npm install needed for this alone
```

That's it for the minimum loop: edit a file in `src/js/`, run `node
build.js`, open (or redeploy) `dist/index.html`.

For the full tooling (recommended before pushing):

```bash
npm install          # one-time, needs network access
npm run typecheck     # tsc --noEmit — catches wrong args, typo'd properties
npm run lint            # eslint — catches dangling references, unused code
npm test                  # vitest — runs tests/
npm run check              # all of the above, plus build
```

### About the type-checker

It runs today and catches real things (it caught a config typo and a
genuine cross-file visibility bug while this was being set up). It's
configured leniently on purpose — `strict: false` — since the codebase has
zero type annotations. Expect a couple hundred `TS2339` warnings out of the
box; nearly all of them are the same root cause: `document.getElementById()`
returns the generic `HTMLElement` type, so TypeScript doesn't know a
particular element is actually an `<input>` (with `.value`) or `<canvas>`
(with `.getContext`). `src/js/color-matcher.js` has the fix pattern
demonstrated — a JSDoc cast:

```js
const hexInput = /** @type {HTMLInputElement} */ (document.getElementById('match-hex-input'));
```

Apply that pattern to a file's `getElementById` calls the next time you're
already working in it, rather than doing all ~130 remaining ones in one
pass. The warnings are genuinely low-risk to ignore in the meantime — they're
type-checker noise, not runtime bugs.

### About the linter

`eslint.config.js` treats all of `src/js/*.js` as one shared global scope
(`sourceType: "script"`, not `"module"`) — because that's what they actually
are once `build.js` concatenates them, exactly like the original single
file. The config has to explicitly list every function/variable name this
app defines at the top level so `no-undef` doesn't falsely flag legitimate
cross-file calls. **If you add or remove a top-level `function`/`var`/`let`/
`const`, regenerate that list** — the two commands to do it are in the
comment at the top of `eslint.config.js`.

### About the tests

`tests/` covers the pure-logic functions: the Kubelka-Munk mixing math, Lab
color distance, the inverse mixing solver, and the shuffle-bag pickers used
by Roll a Reference and the painting-prompt dice. These are exactly the
functions that got hand-verified via throwaway `node -e "..."` snippets in
nearly every past session before shipping — as real tests, that verification
work stops being reinvented from scratch every time.

Tests import directly from the real source files (via a small "export shim"
at the bottom of `rendering-engine.js` and `value-study.js` — a no-op in the
browser, since there's no `module` global there) so they can't silently
drift out of sync with the actual implementation.

`value-study.js` wires up real browser event listeners at load time (same
as it always has), so its tests run under `jsdom` (see `vitest.config.js`)
rather than plain Node — jsdom provides real `window`/`document` globals so
the file imports cleanly.

## What's *not* done

This covers the functions most worth testing today, not exhaustive coverage.
The remaining ~130 TypeScript warnings are undone (documented above, not
urgent). ESLint and Vitest are configured but unverified against their real
binaries — this was built in a sandboxed environment with no network access
to actually install and run them. Everything about them was verified
indirectly (config file validity, and the exact logic every test asserts,
proven correct via plain Node beforehand) but **please run `npm install &&
npm run check` yourself once, early, to confirm the real tools agree** with
that verification before trusting this setup day-to-day.
