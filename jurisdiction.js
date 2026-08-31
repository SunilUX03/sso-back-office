// ============================================================
// TN SSO — Jurisdiction Management : dynamic content
// ============================================================

// ---- Overview KPI cards (all use the "school" badge per design) ----
const KPI_CARDS = [
  { number: "5", label: "Sub Departments" },
  { number: "20", label: "Divisions" },
  { number: "1500", label: "Districts" },
  { number: "1500", label: "Sub Divisions" },
  { number: "5", label: "Talukas/Mandal/Tehsil" },
  { number: "20", label: "Frika/ Revenue Circle" },
  { number: "1500", label: "Village" },
];

// ---- Sub-department cards ----
const CHIPS = [
  "5 Divisions",
  "38 Districts",
  "24 Sub Divisions",
  "3600 Circle",
  "1200 Talukas",
  "4800 Villages",
];
const DEPARTMENTS = [
  "Revenue and Disaster Management",
  "Micro , Small and Medium Enterprises Department",
  "Rural Development and Panchayat Raj Department",
  "Department of Agriculture",
  "Department of Agriculture",
  "Department of Agriculture",
];

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

// ---- Render KPI cards ----
const kpiGrid = document.querySelector(".kpi-grid");
KPI_CARDS.forEach((c) => {
  kpiGrid.appendChild(
    el(
      "article",
      "kpi-card",
      `<div class="kpi-top">
         <span class="icon-badge"><span class="material-icons">school</span></span>
         <a href="#" class="kpi-external" aria-label="Open"><span class="material-icons">open_in_new</span></a>
       </div>
       <div class="kpi-number">${c.number}</div>
       <div class="kpi-label">${c.label}</div>`
    )
  );
});

// ---- Render Sub-department cards ----
const deptGrid = document.querySelector(".dept-grid");
DEPARTMENTS.forEach((name) => {
  const chips = CHIPS.map((t) => `<span class="chip">${t}</span>`).join("");
  deptGrid.appendChild(
    el(
      "article",
      "dept-card",
      `<div class="dept-top">
         <span class="dept-badge"><img src="assets/imgIconBadge.svg" alt="" /></span>
         <a href="agency.html" class="kpi-external" aria-label="Open ${name}"><span class="material-icons">open_in_new</span></a>
       </div>
       <h3 class="dept-name">${name}</h3>
       <div class="chips">${chips}</div>`
    )
  );
});

// ---- Tab switcher interaction (navigate if data-href, else toggle) ----
document.querySelectorAll(".tab-switch .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.dataset.href) {
      window.location.href = tab.dataset.href;
      return;
    }
    document.querySelectorAll(".tab-switch .tab").forEach((t) => {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
  });
});
