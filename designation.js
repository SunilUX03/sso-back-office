// ============================================================
// TN SSO — Designation Management (landing) : dynamic content
// ============================================================

// Overview KPI cards — "<used>/ <total>" designations per level
const KPI_CARDS = [
  { number: "5/ 8000", label: "Sub Departments/Designations" },
  { number: "20/ 400", label: "Divisions/ Designations" },
  { number: "38/ 800", label: "Districts/ Designations" },
  { number: "64/ 1200", label: "Sub Divisions/ Designations" },
  { number: "164/ 2600", label: "Talukas,Mandal,Tehsil/ Designations" },
  { number: "320/ 3200", label: "Frika,Revenue Circle/ Designations" },
  { number: "820/ 5000", label: "Village/ Designations" },
];

// Sub-department rows (full-width). Each carries used/total per level.
const CHIPS = [
  "5/182 Divisions/Designations",
  "38/232 Districts/Designations",
  "24/402 Sub Divisions/Designations",
  "360/1200 Circle/Designations",
  "1200/4800 Talukas/Designations",
  "4800/12000 Villages/Designations",
];
const DEPARTMENTS = [
  "Revenue and Disaster Management",
  "Micro , Small and Medium Enterprises Department",
  "Rural Development and Panchayat Raj Department",
];

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

// ---- KPI cards ----
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

// ---- Sub-department rows ----
const deptList = document.querySelector(".dept-list");
DEPARTMENTS.forEach((name) => {
  const chips = CHIPS.map((t) => `<span class="chip">${t}</span>`).join("");
  deptList.appendChild(
    el(
      "article",
      "dept-row",
      `<div class="dept-row-head">
         <div class="dept-row-title">
           <span class="dept-badge"><img src="assets/imgIconBadge.svg" alt="" /></span>
           <h3 class="dept-name">${name}</h3>
         </div>
         <a href="agency-designation.html" class="kpi-external" aria-label="Open ${name}"><span class="material-icons">open_in_new</span></a>
       </div>
       <div class="chips">${chips}</div>`
    )
  );
});

// ---- Tab switcher (navigate if data-href, else toggle) ----
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
