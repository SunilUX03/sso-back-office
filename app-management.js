// ============================================================
// TN SSO — App Management: real department list, each card
// linking to its own scoped application list
// (app-management-agency.html). Mirrors jurisdiction.js's own
// "All Departments" directory pattern (search, A–Z strip,
// Registered/Not Registered filter) instead of a fixed set of
// hand-typed department cards that didn't correspond to anything
// real — most of the real 75 departments start with zero
// registered applications, which is the honest default.
// ============================================================
function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---- Overview: headline stat tiles ----
function renderOverview() {
  const apps = Store.applications();
  const deptsWithApps = new Set(apps.map((a) => a.dept)).size;
  const webCount = apps.filter((a) => a.type === "Web Application" || a.type === "Web & Mobile").length;
  const mobileCount = apps.filter((a) => a.type === "Mobile Application" || a.type === "Web & Mobile").length;

  const tiles = [
    { icon: "apps", value: String(apps.length), label: "All Applications", href: "app-management-all.html" },
    { icon: "domain", value: `${deptsWithApps} of ${Store.allDepartments().length}`, label: "Departments Registered", href: null },
    { icon: "language", value: String(webCount), label: "Web Applications", href: "app-management-all.html?type=web" },
    { icon: "phone_iphone", value: String(mobileCount), label: "Mobile Applications", href: "app-management-all.html?type=mobile" },
  ];
  document.getElementById("overviewTiles").innerHTML = tiles
    .map(
      (t) => `
      <article class="ux4g-card ux4g-card-outline ux4g-al-stat-card${t.href ? " is-clickable" : ""}">
        <div class="ux4g-card-body">
          <span class="ux4g-al-icon-tile"><span class="ux4g-icon-outlined" style="font-size:20px">${t.icon}</span></span>
          <div>
            <div class="ux4g-al-stat-number">${t.value}</div>
            <div class="ux4g-al-stat-label">${t.label}</div>
          </div>
          ${t.href ? `<span class="ux4g-jm-dept-arrow"><span class="material-icons">arrow_forward</span></span>` : ""}
        </div>
        ${t.href ? `<a class="ux4g-al-stat-link" href="${t.href}" aria-label="View ${escapeHtml(t.label)}"></a>` : ""}
      </article>`
    )
    .join("");
}

// ---- Department directory: unified search across department AND
// sub-department names, a Registered/All filter, and an A–Z strip. ----
const deptList = document.getElementById("deptList");
const deptCountBadge = document.getElementById("deptCountBadge");
const deptSearch = document.getElementById("deptSearch");
const azStrip = document.getElementById("azStrip");
let deptFilter = "";
let configFilterValue = "all";
let azFilter = null;

deptCountBadge.textContent = Store.allDepartments().length;

function passesConfigFilter(configured) {
  if (configFilterValue === "configured") return configured;
  if (configFilterValue === "not-configured") return !configured;
  return true;
}
function isConfigured(deptName) {
  return Store.deptApplicationCount(deptName) > 0;
}

function departmentResults() {
  let names = Store.allDepartments();
  if (deptFilter) {
    const q = deptFilter.toLowerCase();
    names = names.filter((n) => n.toLowerCase().includes(q));
  } else if (azFilter) {
    names = names.filter((n) => n.trim()[0]?.toUpperCase() === azFilter);
  }
  return names.filter((n) => passesConfigFilter(isConfigured(n)));
}

// Sub-departments whose NAME matched but whose parent department's name
// did NOT — same "found the sub-department, not the department" case
// jurisdiction.js handles.
function subDeptHitResults() {
  if (!deptFilter) return [];
  const q = deptFilter.toLowerCase();
  const hits = [];
  Store.allDepartments().forEach((dept) => {
    if (dept.toLowerCase().includes(q)) return;
    Store.allSubDepartments(dept).forEach((sub) => {
      if (!sub.toLowerCase().includes(q)) return;
      const count = Store.appsByDept(dept, sub).length;
      if (passesConfigFilter(count > 0)) hits.push({ dept, sub, count });
    });
  });
  return hits;
}

function chipHTML(count) {
  return count
    ? `<span class="chip">${count} Application${count === 1 ? "" : "s"}</span>`
    : `<span class="chip ux4g-jm-empty-chip">Not yet registered</span>`;
}

function renderDepartments() {
  deptList.innerHTML = "";
  const depts = departmentResults();
  const subHits = subDeptHitResults();

  depts.forEach((name) => {
    const count = Store.deptApplicationCount(name);
    const countBadge = count ? `<span class="count-badge">${count}</span>` : "";
    deptList.appendChild(
      el(
        "article",
        "ux4g-card ux4g-card-outline ux4g-jm-dept-card",
        `<a class="ux4g-jm-dept-link" href="app-management-agency.html?dept=${Store.deptSlug(name)}" aria-label="Open ${escapeHtml(name)}">
           <span class="ux4g-jm-dept-badge"><span class="ux4g-icon-outlined">apps</span></span>
           <span class="ux4g-jm-dept-body">
             <span class="ux4g-jm-dept-name-row">
               <span class="ux4g-jm-dept-name">${escapeHtml(name)}</span>
               ${countBadge}
             </span>
             <span class="chips">${chipHTML(count)}</span>
           </span>
           <span class="ux4g-jm-dept-arrow"><span class="material-icons">arrow_forward</span></span>
         </a>`
      )
    );
  });

  if (subHits.length) {
    deptList.appendChild(el("div", "ux4g-jm-group-label", "Sub-Departments"));
    subHits.forEach(({ dept, sub, count }) => {
      deptList.appendChild(
        el(
          "article",
          "ux4g-card ux4g-card-outline ux4g-jm-dept-card",
          `<a class="ux4g-jm-dept-link" href="app-management-agency.html?dept=${Store.deptSlug(dept)}&sub=${Store.subDeptSlug(sub)}" aria-label="Open ${escapeHtml(sub)}">
             <span class="ux4g-jm-dept-badge"><span class="ux4g-icon-outlined">apps</span></span>
             <span class="ux4g-jm-dept-body">
               <span class="ux4g-jm-dept-name-sub">
                 <span class="ux4g-jm-dept-name">${escapeHtml(sub)}</span>
                 <span class="ux4g-jm-dept-parent">under ${escapeHtml(dept)}</span>
               </span>
               <span class="chips">${chipHTML(count)}</span>
             </span>
             <span class="ux4g-jm-dept-arrow"><span class="material-icons">arrow_forward</span></span>
           </a>`
        )
      );
    });
  }

  if (!depts.length && !subHits.length) {
    deptList.innerHTML = `<div class="empty-list">No departments or sub-departments match your search.</div>`;
  }
}

function renderAzStrip() {
  const available = new Set(Store.allDepartments().map((n) => n.trim()[0].toUpperCase()));
  azStrip.innerHTML = "";
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter) => {
    const btn = el("button", "ux4g-jm-az-btn" + (azFilter === letter ? " is-active" : ""), letter);
    btn.type = "button";
    btn.disabled = !available.has(letter);
    btn.addEventListener("click", () => {
      azFilter = azFilter === letter ? null : letter;
      deptFilter = "";
      deptSearch.value = "";
      renderAll();
    });
    azStrip.appendChild(btn);
  });
}

function renderAll() {
  renderOverview();
  renderDepartments();
  renderAzStrip();
}
renderAll();
Store.on(renderAll);

// ---- Search (unified across departments + sub-departments) ----
if (deptSearch) {
  deptSearch.addEventListener("input", (e) => {
    deptFilter = e.target.value;
    azFilter = null;
    renderDepartments();
    renderAzStrip();
  });
}

// ---- Registered / All / Not Registered filter ----
document.querySelectorAll("#configFilter .ux4g-jm-config-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    configFilterValue = btn.dataset.filter;
    document.querySelectorAll("#configFilter .ux4g-jm-config-btn").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });
    renderDepartments();
  });
});
