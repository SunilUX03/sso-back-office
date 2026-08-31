// ============================================================
// TN SSO — User Management (landing) : dynamic content
// ============================================================
function kpiCards() {
  const subDeptCount = Object.values(Store.all().subDepartments)
    .reduce((n, arr) => n + arr.length, 0);
  return [
    { number: String(subDeptCount), label: "Sub Departments" },
    { number: String(Store.officerCount()), label: "Officers" },
    { number: String(Store.officerCount("active")), label: "Active Officers Accounts" },
    { number: String(Store.officerCount("deactivated")), label: "Inactive Officers Accounts" },
  ];
}

const JURISDICTIONS = [
  "In Department of Agriculture",
  "In Department of Agriculture",
  "In Department of Agriculture",
  "In Department of Agriculture",
  "In Department of Agriculture",
  "In Tamil Nadu e Governance Agency",
  "Jurisdictions in Natural Resources Department",
  "In Municipal Administration and Water Supply Department",
];

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

// ---- Overview KPI cards (live from store) ----
const kpiGrid = document.getElementById("kpiGrid");
function renderKpis() {
  kpiGrid.innerHTML = "";
  kpiCards().forEach((c) => {
    kpiGrid.appendChild(
      el(
        "article",
        "kpi-card",
        `<div class="kpi-top">
           <span class="icon-badge"><span class="material-icons">school</span></span>
           <a href="users-officers.html" class="kpi-external" aria-label="Open"><span class="material-icons">open_in_new</span></a>
         </div>
         <div class="kpi-number">${c.number}</div>
         <div class="kpi-label">${c.label}</div>`
      )
    );
  });
}
renderKpis();
Store.on(renderKpis);

// ---- All Jurisdictions cards ----
const ujGrid = document.getElementById("ujGrid");
JURISDICTIONS.forEach((sub) => {
  ujGrid.appendChild(
    el(
      "article",
      "uj-card",
      `<div class="uj-top">
         <span class="uj-badge"><img src="assets/imgIconBadge.svg" alt="" /></span>
         <a href="users-officers.html" class="kpi-external" aria-label="Open"><span class="material-icons">open_in_new</span></a>
       </div>
       <div class="uj-numrow"><span class="uj-number">10,000</span><span class="uj-officers">Officers</span></div>
       <div class="uj-sub">${sub}</div>`
    )
  );
});
