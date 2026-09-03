// ============================================================
// TN SSO — Accessibility bar: Text Size, Text Spacing, Line
// Height. Three real, working controls (no color/contrast toggle,
// no "More" menu). Applies immediately on every page and persists
// across navigation via localStorage, since this is a per-visitor
// display preference, not app data (so it doesn't belong in Store).
// ============================================================
(function () {
  const STORAGE_KEY = "tnsso.a11y";

  // Text size: applied via CSS zoom (scales the whole page, layout
  // included) since the site is built with fixed px sizes throughout —
  // there's no rem-based scale to hook a root font-size change into.
  const SIZE_LEVELS = [85, 92, 100, 110, 120, 130]; // percent
  const SIZE_DEFAULT = 2; // index into SIZE_LEVELS, i.e. 100%

  // Text spacing / line height: applied as an html-level class, with
  // !important overrides — the standard way an accessibility toolbar
  // has to reach every element regardless of the component CSS
  // underneath it. Levels loosely track WCAG 1.4.12 (Text Spacing):
  // level 2 meets its letter/word-spacing minimums, level 1 of line
  // height meets its 1.5x minimum.
  const SPACING_LEVELS = 3;
  const LINEHEIGHT_LEVELS = 3;

  function clampIndex(v, max, fallback) {
    v = Number(v);
    if (!Number.isInteger(v) || v < 0 || v > max) return fallback;
    return v;
  }

  function loadState() {
    let parsed = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch (e) {
      parsed = null;
    }
    parsed = parsed || {};
    return {
      size: clampIndex(parsed.size, SIZE_LEVELS.length - 1, SIZE_DEFAULT),
      spacing: clampIndex(parsed.spacing, SPACING_LEVELS, 0),
      lineheight: clampIndex(parsed.lineheight, LINEHEIGHT_LEVELS, 0),
    };
  }

  const state = loadState();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Private browsing / storage disabled — the setting still applies
      // for this page view, it just won't carry over to the next one.
    }
  }

  function applySize() {
    const pct = SIZE_LEVELS[state.size];
    document.body.style.zoom = pct === 100 ? "" : `${pct}%`;
  }
  function applySpacing() {
    const html = document.documentElement;
    for (let i = 1; i <= SPACING_LEVELS; i++) html.classList.remove(`a11y-spacing-${i}`);
    if (state.spacing > 0) html.classList.add(`a11y-spacing-${state.spacing}`);
  }
  function applyLineHeight() {
    const html = document.documentElement;
    for (let i = 1; i <= LINEHEIGHT_LEVELS; i++) html.classList.remove(`a11y-lineheight-${i}`);
    if (state.lineheight > 0) html.classList.add(`a11y-lineheight-${state.lineheight}`);
  }

  applySize();
  applySpacing();
  applyLineHeight();

  const GROUPS = {
    size: { max: SIZE_LEVELS.length - 1, default: SIZE_DEFAULT, apply: applySize },
    spacing: { max: SPACING_LEVELS, default: 0, apply: applySpacing },
    lineheight: { max: LINEHEIGHT_LEVELS, default: 0, apply: applyLineHeight },
  };

  document.querySelectorAll("[data-a11y-group]").forEach((groupEl) => {
    const groupName = groupEl.dataset.a11yGroup;
    const group = GROUPS[groupName];
    if (!group) return;
    groupEl.querySelectorAll("[data-a11y-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.a11yAction;
        if (action === "increase") state[groupName] = Math.min(group.max, state[groupName] + 1);
        else if (action === "decrease") state[groupName] = Math.max(0, state[groupName] - 1);
        else if (action === "reset") state[groupName] = group.default;
        save();
        group.apply();
      });
    });
  });
})();
