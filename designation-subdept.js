// ============================================================
// TN SSO — Designation Management: Sub-Department picker.
// Scoped to one department via ?dept=<slug>. Lists that
// department's real sub-departments (Store.allSubDepartments);
// each card drills into agency-designation.html for that
// dept + sub-dept.
// ============================================================
const params = new URLSearchParams(window.location.search);
const deptName = Store.resolveScopedDept(Store.deptBySlug(params.get("dept")));

// A Sub-Department Admin only has one sub-department — this "which one?"
// picker doesn't apply to them, so send them straight to it, the same way
// designation.html sends them straight here instead of the full
// department picker.
{
  const scope = Store.myScope();
  if (scope.role === "dept-admin" && scope.subDept) {
    window.location.replace(`agency-designation.html?dept=${Store.deptSlug(deptName)}&sub=${Store.subDeptSlug(scope.subDept)}`);
  }
}

document.getElementById("deptTitle").textContent = deptName;
document.getElementById("deptCrumb").textContent = deptName;
document.title = `${deptName} — Sub-Departments — TN SSO`;

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

const generalList = document.getElementById("generalList");
const subDeptList = document.getElementById("subDeptList");
const subDeptCountBadge = document.getElementById("subDeptCountBadge");
let subFilter = "";
// A link from the department directory (its "X of Y sub-departments
// configured" line) can arrive with the filter pre-set, e.g.
// ?filter=configured, so this page opens already showing what that link
// promised instead of the unfiltered default.
let configFilterValue = params.get("filter") === "configured" || params.get("filter") === "not-configured"
  ? params.get("filter")
  : "all";
document.querySelectorAll("#configFilter .ux4g-jm-config-btn").forEach((b) => {
  b.classList.toggle("is-active", b.dataset.filter === configFilterValue);
});

subDeptCountBadge.textContent = Store.visibleSubDepartments(deptName).length;

function passesConfigFilter(configured) {
  if (configFilterValue === "configured") return configured;
  if (configFilterValue === "not-configured") return !configured;
  return true;
}

// ============================================================
// Overview stat tiles (this department only)
// ============================================================
const overviewTiles = document.getElementById("overviewTiles");
function renderOverview() {
  const subs = Store.visibleSubDepartments(deptName);
  let total = 0;
  let subsConfigured = 0;
  subs.forEach((sub) => {
    const n = Store.deptDesignations(deptName, sub).length;
    total += n;
    if (n > 0) subsConfigured++;
  });
  total += Store.deptDesignations(deptName, Store.generalSubDept()).length;
  const tiles = [
    { icon: "badge", value: total, label: "Total Designations" },
    { icon: "apartment", value: `${subsConfigured} of ${subs.length}`, label: "Sub-Departments Configured" },
  ];
  overviewTiles.innerHTML = tiles
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

function renderGeneral() {
  generalList.innerHTML = "";
  const sub = Store.generalSubDept();
  const label = Store.generalLabel(deptName);
  const counts = Store.deptDesignationLevelCounts(deptName, sub);
  const total = counts.reduce((sum, c) => sum + c.value, 0);
  const chips = total
    ? counts
        .filter((c) => c.value > 0)
        .map((c) => `<span class="chip">${c.value} ${escapeHtml(c.label)}</span>`)
        .join("")
    : `<span class="chip ux4g-jm-empty-chip">Not yet configured</span>`;

  generalList.appendChild(
    el(
      "article",
      "ux4g-card ux4g-card-outline ux4g-jm-dept-card",
      `<a class="ux4g-jm-dept-link" href="agency-designation.html?dept=${Store.deptSlug(deptName)}&sub=${Store.subDeptSlug(sub)}" aria-label="Open ${escapeHtml(label)}">
         <span class="ux4g-jm-dept-badge"><span class="ux4g-icon-outlined">badge</span></span>
         <span class="ux4g-jm-dept-body">
           <span class="ux4g-jm-dept-name">${escapeHtml(label)}</span>
           <span class="chips">${chips}</span>
         </span>
         <span class="ux4g-jm-dept-arrow"><span class="material-icons">arrow_forward</span></span>
       </a>`
    )
  );
}

function renderSubDepts() {
  subDeptList.innerHTML = "";
  Store.visibleSubDepartments(deptName)
    .filter((name) => name.toLowerCase().includes(subFilter.toLowerCase()))
    .forEach((name) => {
      const counts = Store.deptDesignationLevelCounts(deptName, name);
      const total = counts.reduce((sum, c) => sum + c.value, 0);
      if (!passesConfigFilter(total > 0)) return;
      const chips = total
        ? counts
            .filter((c) => c.value > 0)
            .map((c) => `<span class="chip">${c.value} ${escapeHtml(c.label)}</span>`)
            .join("")
        : `<span class="chip ux4g-jm-empty-chip">Not yet configured</span>`;
      const countBadge = total ? `<span class="count-badge">${total}</span>` : "";

      subDeptList.appendChild(
        el(
          "article",
          "ux4g-card ux4g-card-outline ux4g-jm-dept-card",
          `<a class="ux4g-jm-dept-link" href="agency-designation.html?dept=${Store.deptSlug(deptName)}&sub=${Store.subDeptSlug(name)}" aria-label="Open ${escapeHtml(name)}">
             <span class="ux4g-jm-dept-badge"><span class="ux4g-icon-outlined">badge</span></span>
             <span class="ux4g-jm-dept-body">
               <span class="ux4g-jm-dept-name-row">
                 <span class="ux4g-jm-dept-name">${escapeHtml(name)}</span>
                 ${countBadge}
               </span>
               <span class="chips">${chips}</span>
             </span>
             <span class="ux4g-jm-dept-arrow"><span class="material-icons">arrow_forward</span></span>
           </a>`
        )
      );
    });

  if (!subDeptList.children.length) {
    subDeptList.innerHTML = `<div class="empty-list">No sub-departments match your search or filter.</div>`;
  }
}
function renderAll() {
  renderOverview();
  renderGeneral();
  renderSubDepts();
}
renderAll();
Store.on(renderAll);

// Arriving from the department directory's "X of Y sub-departments
// configured" link scrolls straight to this section — done explicitly
// rather than relying on the browser's own #hash scroll, which doesn't
// reliably land here since the section's height depends on the filtered
// list above finishing its render first.
if (window.location.hash === "#subDepartments") {
  document.getElementById("subDepartments").scrollIntoView({ block: "start" });
}

const subDeptSearch = document.getElementById("subDeptSearch");
if (subDeptSearch) {
  subDeptSearch.addEventListener("input", (e) => {
    subFilter = e.target.value;
    renderSubDepts();
  });
}

document.querySelectorAll("#configFilter .ux4g-jm-config-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    configFilterValue = btn.dataset.filter;
    document.querySelectorAll("#configFilter .ux4g-jm-config-btn").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });
    renderSubDepts();
  });
});
