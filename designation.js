// ============================================================
// TN SSO — Designation Management (landing) : dynamic content
// ============================================================

// Overview breakdown chart — organisation tiers vs. total designations
const BREAKDOWN = [
  { label: "Departments", value: "5" },
  { label: "Divisions", value: "20" },
  { label: "Districts", value: "38" },
  { label: "Sub Divisions", value: "64" },
  { label: "Talukas/Mandal/Tehsil", value: "164" },
  { label: "Firka/ Revenue Circle", value: "320" },
  { label: "Village", value: "820" },
  { label: "Designations", value: "21,200" },
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

// ---- Overview breakdown chart ----
renderHierarchyBarChart(document.querySelector(".chart-card"), BREAKDOWN);

// ---- Department rows ----
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
           <a href="agency-designation.html" class="kpi-external" aria-label="Open ${name}"><span class="material-icons">arrow_forward</span></a>
         </div>
         <div class="chips">${chips}</div>`
      )
    );
  });
}
renderDepartments();

const deptSearch = document.getElementById("deptSearch");
if (deptSearch) {
  deptSearch.addEventListener("input", (e) => {
    deptFilter = e.target.value;
    renderDepartments();
  });
}

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
