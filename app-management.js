// ============================================================
// TN SSO — App Management (landing) : dynamic content
// Figma node 1-13071 (frame 34)
// ============================================================

// ---- Overview KPI cards ----
const KPI_CARDS = [
  { icon: "school", number: "5", label: "Sub Departments" },
  { icon: "layers", number: "35", label: "Applications" },
  { icon: "layers", number: "15", label: "Web Applications" },
  { icon: "layers", number: "20", label: "Mobile Applications" },
];

// ---- "All Applications" — applications per department ----
const DEPT_CARDS = [
  { count: "4", dept: "In Department of Agriculture" },
  { count: "7", dept: "In Tamil Nadu e Governance Agency" },
  { count: "5", dept: "Jurisdictions in Natural Resources Department" },
  { count: "9", dept: "In Municipal Administration and Water Supply Department" },
  { count: "10", dept: "In Department of Agriculture" },
  { count: "8", dept: "In Department of Agriculture" },
  { count: "3", dept: "In Department of Agriculture" },
  { count: "9", dept: "In Department of Agriculture" },
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
         <span class="icon-badge"><span class="material-icons">${c.icon}</span></span>
         <a href="app-management-agency.html" class="kpi-external" aria-label="Open"><span class="material-icons">open_in_new</span></a>
       </div>
       <div class="kpi-number">${c.number}</div>
       <div class="kpi-label">${c.label}</div>`
    )
  );
});

// ---- Render department (applications) cards ----
const appDeptGrid = document.querySelector(".uj-grid");
DEPT_CARDS.forEach((c) => {
  appDeptGrid.appendChild(
    el(
      "article",
      "uj-card",
      `<div class="uj-top">
         <span class="uj-badge"><img src="assets/imgIconBadge.svg" alt="" /></span>
         <a href="app-management-agency.html" class="kpi-external" aria-label="Open"><span class="material-icons">open_in_new</span></a>
       </div>
       <div class="uj-numrow">
         <span class="uj-number">${c.count}</span>
         <span class="uj-officers">Applications</span>
       </div>
       <div class="uj-sub">${c.dept}</div>`
    )
  );
});
