// ============================================================
// TN SSO — All Users: real department directory (Store.allDepartments),
// mirroring Jurisdiction/Designation Management's own redesign — same
// Overview tiles, count badge, Configured/All/Not-Configured filter,
// A–Z scan strip, and "search finds sub-departments too" behavior.
// "Configured" here means the department (or sub-department) has at
// least one officer assigned. Each card links to its own sub-department
// picker (users-subdept.html), which drills into the actual officer
// roster (users-officers.html) — same drill-down shape as jurisdiction.
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

// ---- officer counts (flat dept/subDept fields on each officer record,
// unlike jurisdiction/designation's compound-keyed buckets) ----
function officersIn(deptName, subDeptName) {
  return Store.officers().filter((o) => o.dept === deptName && o.subDept === subDeptName);
}
function officerCounts(deptName, subDeptName) {
  const list = officersIn(deptName, subDeptName);
  const active = list.filter((o) => o.status === "active").length;
  return { total: list.length, active, inactive: list.length - active };
}
// A department's OWN officers only (its "General / Department-Level"
// bucket) — deliberately NOT summed with its sub-departments', matching
// Jurisdiction Management's same "own vs sub-department" separation.
function deptOwnCounts(deptName) {
  return officerCounts(deptName, Store.generalSubDept());
}
function subDeptsConfiguredCount(deptName) {
  return Store.allSubDepartments(deptName).filter((sub) => officersIn(deptName, sub).length > 0).length;
}
function isConfigured(deptName) {
  return deptOwnCounts(deptName).total > 0 || subDeptsConfiguredCount(deptName) > 0;
}

// ---- Overview: 3 headline stat tiles only — same fixed, compact shape
// as Jurisdiction/Designation Management regardless of how many of the
// 76 departments have officers. ----
function renderOverview() {
  const totalRealSubDepts = Store.allDepartments().reduce((sum, d) => sum + Store.allSubDepartments(d).length, 0);
  let deptsConfigured = 0;
  let subsConfigured = 0;
  Store.allDepartments().forEach((dept) => {
    if (isConfigured(dept)) deptsConfigured++;
    subsConfigured += subDeptsConfiguredCount(dept);
  });

  const tiles = [
    { icon: "group", value: Store.officerCount().toLocaleString("en-IN"), label: "Total Officers" },
    { icon: "domain", value: `${deptsConfigured} of ${Store.allDepartments().length}`, label: "Departments with Officers" },
    { icon: "apartment", value: `${subsConfigured} of ${totalRealSubDepts}`, label: "Sub-Departments with Officers" },
  ];
  document.getElementById("overviewTiles").innerHTML = tiles
    .map(
      (t) => `
      <article class="ux4g-card ux4g-card-outline ux4g-al-stat-card">
        <div class="ux4g-card-body">
          <span class="ux4g-al-icon-tile"><span class="ux4g-icon-outlined" style="font-size:20px">${t.icon}</span></span>
          <div>
            <div class="ux4g-al-stat-number">${t.value}</div>
            <div class="ux4g-al-stat-label">${t.label}</div>
          </div>
        </div>
      </article>`
    )
    .join("");
}

// ---- Department directory: unified search across department AND
// sub-department names, a Configured/All filter, and an A–Z strip. ----
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
// Jurisdiction Management handles.
function subDeptHitResults() {
  if (!deptFilter) return [];
  const q = deptFilter.toLowerCase();
  const hits = [];
  Store.allDepartments().forEach((dept) => {
    if (dept.toLowerCase().includes(q)) return;
    Store.allSubDepartments(dept).forEach((sub) => {
      if (!sub.toLowerCase().includes(q)) return;
      const counts = officerCounts(dept, sub);
      if (passesConfigFilter(counts.total > 0)) hits.push({ dept, sub, counts });
    });
  });
  return hits;
}

function chipsHTML(counts) {
  return counts.total
    ? `<span class="chip">${counts.total} Officers</span><span class="chip">${counts.active} Active</span><span class="chip">${counts.inactive} Inactive</span>`
    : `<span class="chip ux4g-jm-empty-chip">No officers yet</span>`;
}

function renderDepartments() {
  deptList.innerHTML = "";
  const depts = departmentResults();
  const subHits = subDeptHitResults();

  depts.forEach((name) => {
    const ownCounts = deptOwnCounts(name);
    const countBadge = ownCounts.total ? `<span class="count-badge">${ownCounts.total}</span>` : "";
    const subsConfigured = subDeptsConfiguredCount(name);
    const subsTotal = Store.allSubDepartments(name).length;
    deptList.appendChild(
      el(
        "article",
        "ux4g-card ux4g-card-outline ux4g-jm-dept-card",
        `<a class="ux4g-jm-dept-link" href="users-subdept.html?dept=${Store.deptSlug(name)}" aria-label="Open ${escapeHtml(name)}">
           <span class="ux4g-jm-dept-badge"><span class="ux4g-icon-outlined">group</span></span>
           <span class="ux4g-jm-dept-body">
             <span class="ux4g-jm-dept-name-row">
               <span class="ux4g-jm-dept-name">${escapeHtml(name)}</span>
               ${countBadge}
             </span>
             <span class="ux4g-jm-subdept-status" role="link" tabindex="0" data-dept="${escapeHtml(name)}">${subsConfigured} of ${subsTotal} sub-departments with officers</span>
             <span class="chips">${chipsHTML(ownCounts)}</span>
           </span>
           <span class="ux4g-jm-dept-arrow"><span class="material-icons">arrow_forward</span></span>
         </a>`
      )
    );
  });

  if (subHits.length) {
    deptList.appendChild(el("div", "ux4g-jm-group-label", "Sub-Departments"));
    subHits.forEach(({ dept, sub, counts }) => {
      deptList.appendChild(
        el(
          "article",
          "ux4g-card ux4g-card-outline ux4g-jm-dept-card",
          `<a class="ux4g-jm-dept-link" href="users-officers.html?dept=${Store.deptSlug(dept)}&sub=${Store.subDeptSlug(sub)}" aria-label="Open ${escapeHtml(sub)}">
             <span class="ux4g-jm-dept-badge"><span class="ux4g-icon-outlined">group</span></span>
             <span class="ux4g-jm-dept-body">
               <span class="ux4g-jm-dept-name-sub">
                 <span class="ux4g-jm-dept-name">${escapeHtml(sub)}</span>
                 <span class="ux4g-jm-dept-parent">under ${escapeHtml(dept)}</span>
               </span>
               <span class="chips">${chipsHTML(counts)}</span>
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

// ---- "X of Y sub-departments with officers" jumps straight into that
// department's sub-department picker, pre-filtered to Configured and
// scrolled to the Sub-Departments section — same deep-link behavior as
// Jurisdiction Management's department directory. ----
function openSubDeptStatus(dept) {
  window.location.href = `users-subdept.html?dept=${Store.deptSlug(dept)}&filter=configured#subDepartments`;
}
deptList.addEventListener("click", (e) => {
  const statusEl = e.target.closest(".ux4g-jm-subdept-status");
  if (!statusEl) return;
  e.preventDefault();
  e.stopPropagation();
  openSubDeptStatus(statusEl.dataset.dept);
});
deptList.addEventListener("keydown", (e) => {
  const statusEl = e.target.closest(".ux4g-jm-subdept-status");
  if (!statusEl || (e.key !== "Enter" && e.key !== " ")) return;
  e.preventDefault();
  e.stopPropagation();
  openSubDeptStatus(statusEl.dataset.dept);
});

// ---- Search (unified across departments + sub-departments) ----
if (deptSearch) {
  deptSearch.addEventListener("input", (e) => {
    deptFilter = e.target.value;
    azFilter = null;
    renderDepartments();
    renderAzStrip();
  });
}

// ---- Configured / All / Not Configured filter ----
document.querySelectorAll("#configFilter .ux4g-jm-config-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    configFilterValue = btn.dataset.filter;
    document.querySelectorAll("#configFilter .ux4g-jm-config-btn").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });
    renderDepartments();
  });
});
