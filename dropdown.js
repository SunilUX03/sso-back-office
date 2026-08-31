// ============================================================
// TN SSO — UX4G-style dropdown behavior (shared across pages)
// Toggle on click, close on outside-click / Escape, single-open.
// Markup: <div class="dropdown"> > [data-toggle="dropdown"] + .dropdown-menu
// ============================================================
(function () {
  const toggles = document.querySelectorAll('[data-toggle="dropdown"]');

  function closeAll(except) {
    document.querySelectorAll(".dropdown.is-open").forEach((d) => {
      if (d === except) return;
      d.classList.remove("is-open");
      const t = d.querySelector('[data-toggle="dropdown"]');
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }

  toggles.forEach((toggle) => {
    const dropdown = toggle.closest(".dropdown");
    if (!dropdown) return;

    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = !dropdown.classList.contains("is-open");
      closeAll(dropdown);
      dropdown.classList.toggle("is-open", willOpen);
      toggle.setAttribute("aria-expanded", String(willOpen));
    });
  });

  // Click anywhere outside an open dropdown closes it.
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) closeAll();
  });

  // Escape closes any open dropdown.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });

  // ----------------------------------------------------------
  // Make whole cards clickable: any .dept-card / .dept-row /
  // .uj-card navigates to its inner "open" link (.kpi-external
  // anchor) when you click anywhere on it (except a real
  // button/link inside). Adds a pointer affordance too.
  // ----------------------------------------------------------
  const CARD_SELECTOR = ".dept-card, .dept-row, .uj-card";
  document.addEventListener("click", (e) => {
    const card = e.target.closest(CARD_SELECTOR);
    if (!card) return;
    // ignore clicks on interactive children (buttons / other links / inputs)
    if (e.target.closest("a, button, input, select")) return;
    const link = card.querySelector("a.kpi-external, a[href]:not([href='#'])");
    const href = link && link.getAttribute("href");
    if (href && href !== "#") window.location.href = href;
  });
  // pointer affordance is applied lazily as cards are hovered
  document.addEventListener("mouseover", (e) => {
    const card = e.target.closest(CARD_SELECTOR);
    if (card && !card.dataset.clickable) {
      const link = card.querySelector("a.kpi-external, a[href]:not([href='#'])");
      if (link && link.getAttribute("href") && link.getAttribute("href") !== "#") {
        card.dataset.clickable = "1";
        card.classList.add("is-clickable");
      }
    }
  });
})();
