// ============================================================
// TN SSO — Designation Management: real department list, each
// card linking to its own scoped designation page.
// ============================================================
// A Department Admin only ever has one department in this list, so showing
// it as a one-card picker is pure friction — skip straight to that
// department's own sub-department breakdown instead. A Sub-Department
// Admin only has one sub-department too, so they skip one level further,
// straight to its own designation page.
{
  const scope = Store.myScope();
  if (scope.role === "dept-admin") {
    if (scope.subDept) {
      window.location.replace(`agency-designation.html?dept=${Store.deptSlug(scope.dept)}&sub=${Store.subDeptSlug(scope.subDept)}`);
    } else {
      window.location.replace(`designation-subdept.html?dept=${Store.deptSlug(scope.dept)}`);
    }
  }
}

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

// ---- Overview: 3 headline stat tiles only. The per-department /
// per-sub-department breakdown lives in the "All Departments" directory
// below instead (each card already shows its own count), so nothing here
// duplicates it — this stays a fixed, compact size regardless of how many
// of the 76 departments get configured.
function renderOverview() {
  let totalRecords = 0;
  let deptsConfigured = 0;
  let subsConfigured = 0;
  const totalRealSubDepts = Store.visibleDepartments().reduce((sum, d) => sum + Store.allSubDepartments(d).length, 0);

  Store.visibleDepartments().forEach((dept) => {
    let deptTotal = 0;
    Store.allSubDepartments(dept).forEach((sub) => {
      const n = Store.deptDesignations(dept, sub).length;
      deptTotal += n;
      if (n > 0) subsConfigured++;
    });
    deptTotal += Store.deptDesignations(dept, Store.generalSubDept()).length;
    totalRecords += deptTotal;
    if (deptTotal > 0) deptsConfigured++;
  });

  const tiles = [
    { icon: "badge", value: totalRecords.toLocaleString("en-IN"), label: "Total Designations" },
    { icon: "domain", value: `${deptsConfigured} of ${Store.visibleDepartments().length}`, label: "Departments Configured" },
    { icon: "apartment", value: `${subsConfigured} of ${totalRealSubDepts}`, label: "Sub-Departments Configured" },
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

// ---- A department's OWN designations only (its "General / Department-
// Level" bucket) — deliberately NOT summed with its sub-departments', so
// the chips on its card only ever describe roles that belong to the
// department itself, e.g. a Secretary's post. ----
function deptOwnLevelCounts(deptName) {
  return Store.deptDesignationLevelCounts(deptName, Store.generalSubDept());
}
// How many of a department's real sub-departments have at least one
// designation of their own.
function subDeptsConfiguredCount(deptName) {
  return Store.allSubDepartments(deptName).filter((sub) => Store.deptDesignations(deptName, sub).length > 0).length;
}
// A department counts as Configured if EITHER it has its own
// department-level designations, OR at least one of its sub-departments
// does (or both) — same bar as the Overview tiles above.
function isConfigured(deptName) {
  const ownTotal = deptOwnLevelCounts(deptName).reduce((sum, c) => sum + c.value, 0);
  return ownTotal > 0 || subDeptsConfiguredCount(deptName) > 0;
}

// ---- Department directory: unified search across department AND
// sub-department names, a Configured/All filter, and an A–Z strip for
// scanning the full 76-department list. ----
const deptList = document.getElementById("deptList");
const deptCountBadge = document.getElementById("deptCountBadge");
const deptSearch = document.getElementById("deptSearch");
const azStrip = document.getElementById("azStrip");
let deptFilter = "";
let configFilterValue = "all";
let azFilter = null;

deptCountBadge.textContent = Store.visibleDepartments().length;

function passesConfigFilter(configured) {
  if (configFilterValue === "configured") return configured;
  if (configFilterValue === "not-configured") return !configured;
  return true;
}

function departmentResults() {
  let names = Store.visibleDepartments();
  if (deptFilter) {
    const q = deptFilter.toLowerCase();
    names = names.filter((n) => n.toLowerCase().includes(q));
  } else if (azFilter) {
    names = names.filter((n) => n.trim()[0]?.toUpperCase() === azFilter);
  }
  return names.filter((n) => passesConfigFilter(isConfigured(n)));
}

// Sub-departments whose NAME matched but whose parent department's name
// did NOT — exactly the case where an admin knows the sub-department but
// not which department it sits under.
function subDeptHitResults() {
  if (!deptFilter) return [];
  const q = deptFilter.toLowerCase();
  const hits = [];
  Store.visibleDepartments().forEach((dept) => {
    if (dept.toLowerCase().includes(q)) return;
    Store.allSubDepartments(dept).forEach((sub) => {
      if (!sub.toLowerCase().includes(q)) return;
      const counts = Store.deptDesignationLevelCounts(dept, sub);
      const configured = counts.some((c) => c.value > 0);
      if (passesConfigFilter(configured)) hits.push({ dept, sub, counts, configured });
    });
  });
  return hits;
}

function chipsHTML(counts) {
  const total = counts.reduce((sum, c) => sum + c.value, 0);
  return total
    ? counts
        .filter((c) => c.value > 0)
        .map((c) => `<span class="chip">${c.value} ${escapeHtml(c.label)}</span>`)
        .join("")
    : `<span class="chip ux4g-jm-empty-chip">Not yet configured</span>`;
}

function renderDepartments() {
  deptList.innerHTML = "";
  const depts = departmentResults();
  const subHits = subDeptHitResults();

  depts.forEach((name) => {
    const ownCounts = deptOwnLevelCounts(name);
    const ownTotal = ownCounts.reduce((sum, c) => sum + c.value, 0);
    const countBadge = ownTotal ? `<span class="count-badge">${ownTotal}</span>` : "";
    const subsConfigured = subDeptsConfiguredCount(name);
    const subsTotal = Store.allSubDepartments(name).length;
    deptList.appendChild(
      el(
        "article",
        "ux4g-card ux4g-card-outline ux4g-jm-dept-card",
        `<a class="ux4g-jm-dept-link" href="designation-subdept.html?dept=${Store.deptSlug(name)}" aria-label="Open ${escapeHtml(name)}">
           <span class="ux4g-jm-dept-badge"><span class="ux4g-icon-outlined">badge</span></span>
           <span class="ux4g-jm-dept-body">
             <span class="ux4g-jm-dept-name-row">
               <span class="ux4g-jm-dept-name">${escapeHtml(name)}</span>
               ${countBadge}
             </span>
             <span class="ux4g-jm-subdept-status" role="link" tabindex="0" data-dept="${escapeHtml(name)}">${subsConfigured} of ${subsTotal} sub-departments configured</span>
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
          `<a class="ux4g-jm-dept-link" href="agency-designation.html?dept=${Store.deptSlug(dept)}&sub=${Store.subDeptSlug(sub)}" aria-label="Open ${escapeHtml(sub)}">
             <span class="ux4g-jm-dept-badge"><span class="ux4g-icon-outlined">badge</span></span>
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
  const available = new Set(Store.visibleDepartments().map((n) => n.trim()[0].toUpperCase()));
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

// ---- "X of Y sub-departments configured" jumps straight into that
// department's sub-department picker, pre-filtered to Configured and
// scrolled to the Sub-Departments section — it's nested inside the
// card's own link, so stop that link's navigation first. ----
function openSubDeptStatus(dept) {
  window.location.href = `designation-subdept.html?dept=${Store.deptSlug(dept)}&filter=configured#subDepartments`;
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
