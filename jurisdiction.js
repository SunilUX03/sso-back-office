// ============================================================
// TN SSO — Jurisdiction Management : dynamic content
// ============================================================

// ---- Overview breakdown chart ----
const BREAKDOWN = [
  { label: "Departments", value: "5" },
  { label: "Divisions", value: "20" },
  { label: "Districts", value: "1,500" },
  { label: "Sub Divisions", value: "1,500" },
  { label: "Talukas/Mandal/Tehsil", value: "5" },
  { label: "Firka/ Revenue Circle", value: "20" },
  { label: "Village", value: "1,500" },
];

// ---- Department rows ----
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

// ---- Render Overview breakdown chart ----
renderHierarchyBarChart(document.querySelector(".chart-card"), BREAKDOWN);

// ---- Render department rows (full-width, one per row) ----
const deptList = document.querySelector(".dept-list");
let deptFilter = "";

function renderDepartments() {
  deptList.innerHTML = "";
  const chips = CHIPS.map((t) => `<span class="chip">${t}</span>`).join("");
  DEPARTMENTS.filter((name) =>
    name.toLowerCase().includes(deptFilter.toLowerCase())
  ).forEach((name) => {
    deptList.appendChild(
      el(
        "article",
        "dept-row",
        `<div class="dept-row-head">
           <div class="dept-row-title">
             <span class="dept-badge"><img src="assets/imgIconBadge.svg" alt="" /></span>
             <h3 class="dept-name">${name}</h3>
           </div>
           <a href="agency.html" class="kpi-external" aria-label="Open ${name}"><span class="material-icons">arrow_forward</span></a>
         </div>
         <div class="chips">${chips}</div>`
      )
    );
  });
}
renderDepartments();

// ---- Search filter ----
const deptSearch = document.getElementById("deptSearch");
if (deptSearch) {
  deptSearch.addEventListener("input", (e) => {
    deptFilter = e.target.value;
    renderDepartments();
  });
}

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
