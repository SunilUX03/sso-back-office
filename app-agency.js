// ============================================================
// TN SSO — App Management: department detail page. Reads ?dept=
// (and optional &sub=) from the URL, resolves them against the
// real 75-department directory, and renders that department's
// actual registered applications from Store — replacing the old
// hardcoded "Tamil Nadu e-Governance Agency" page that showed the
// same 4 fake app types cycled to 12 cards regardless of which
// department link was clicked.
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

// App Management doesn't exist below Sub-Department — applications aren't
// tied to a specific jurisdiction office in the data model — so a
// jurisdiction-office admin who reaches this URL directly is bounced away.
if (Store.myScope().role === "dept-admin" && Store.myScope().office) {
  window.location.replace("index.html");
}

// ---- resolve ?dept=&sub= against the real directory ----
const params = new URLSearchParams(location.search);
const rawDeptName = Store.deptBySlug(params.get("dept") || "");

if (!rawDeptName) {
  document.getElementById("deptTitle").textContent = "Department not found";
  document.querySelector(".page").innerHTML =
    '<div class="page-head"><div class="page-title-block"><h1 class="page-title">Department not found</h1></div></div>' +
    '<div class="empty-list">This department link is invalid or the department no longer exists. <a href="app-management.html">Go back to All Applications</a>.</div>';
  throw new Error("app-agency: unknown department slug");
}
// A Department (or Sub-Department) Admin who requests — or, by editing
// the URL, tries to reach — another department is bounced to their own,
// same as every other detail page.
const deptName = Store.resolveScopedDept(rawDeptName);
const subSlugParam = params.get("sub");
let subDeptName = deptName && subSlugParam != null ? Store.subDeptBySlug(deptName, subSlugParam) : null;
// A Sub-Department Admin is locked to their own sub-department here too —
// "All Sub-Departments" or another sub-department isn't theirs to browse.
{
  const scope = Store.myScope();
  if (scope.role === "dept-admin" && scope.subDept && deptName === scope.dept && subDeptName !== scope.subDept) {
    const url = new URL(window.location.href);
    url.searchParams.set("dept", Store.deptSlug(deptName));
    url.searchParams.set("sub", Store.subDeptSlug(scope.subDept));
    window.location.replace(url.toString());
    subDeptName = scope.subDept;
  }
}

// ---- page head: dynamic title + breadcrumb ----
// Department-level view (no ?sub=): the department itself is the current
// crumb, no further segment. Sub-department view: department becomes a
// clickable link back to its whole-department page, sub-department is
// the current crumb.
const deptCrumbLink = document.getElementById("deptCrumbLink");
const subDeptCrumbEl = document.getElementById("subDeptCrumb");
const subDeptCrumbSepEl = document.getElementById("subDeptCrumbSep");
if (subDeptName != null) {
  document.getElementById("deptTitle").textContent = Store.subDeptLabel(deptName, subDeptName);
  deptCrumbLink.textContent = deptName;
  deptCrumbLink.href = "app-management-agency.html?dept=" + Store.deptSlug(deptName);
  subDeptCrumbEl.textContent = Store.subDeptLabel(deptName, subDeptName);
} else {
  document.getElementById("deptTitle").textContent = deptName;
  deptCrumbLink.outerHTML = `<span class="crumb-current">${escapeHtml(deptName)}</span>`;
  subDeptCrumbSepEl.remove();
  subDeptCrumbEl.remove();
}

// ---- scope: whole department (all sub-depts) unless a sub-dept is picked ----
let subDeptFilter = subDeptName; // null = All Sub-Departments
let statusFilter = "all"; // all | active | inactive
let searchQuery = "";

function scopedApps() {
  return subDeptFilter != null ? Store.appsByDept(deptName, subDeptFilter) : Store.appsByDept(deptName);
}
function visibleApps() {
  let apps = scopedApps();
  if (statusFilter !== "all") apps = apps.filter((a) => a.status === statusFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    apps = apps.filter((a) => a.name.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q));
  }
  return apps;
}

// ---- Overview stat tiles ----
function renderOverview() {
  const apps = scopedApps();
  const webCount = apps.filter((a) => a.type === "Web Application" || a.type === "Web & Mobile").length;
  const mobileCount = apps.filter((a) => a.type === "Mobile Application" || a.type === "Web & Mobile").length;
  const activeCount = apps.filter((a) => a.status === "active").length;
  const tiles = [
    { icon: "apps", value: String(apps.length), label: "Total Applications" },
    { icon: "check_circle", value: String(activeCount), label: "Active" },
    { icon: "language", value: String(webCount), label: "Web Applications" },
    { icon: "phone_iphone", value: String(mobileCount), label: "Mobile Applications" },
  ];
  document.getElementById("statGrid").innerHTML = tiles
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

// ---- Sub-Department filter dropdown (only meaningful when opened at the
// whole-department level; hidden when the URL already scopes to one) ----
const selectSubDeptBtn = document.getElementById("selectSubDept");
const selectSubDeptLabel = document.getElementById("selectSubDeptLabel");
if (subDeptName != null) {
  selectSubDeptBtn.hidden = true;
} else {
  const subDepts = Store.allSubDepartments(deptName);
  selectSubDeptBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeMenus();
    const menu = el("div", "filter-menu");
    const allOpt = el("button", "filter-menu-item" + (subDeptFilter === null ? " is-active" : ""), "All Sub-Departments");
    allOpt.type = "button";
    allOpt.addEventListener("click", () => { subDeptFilter = null; selectSubDeptLabel.textContent = "All Sub-Departments"; selectSubDeptBtn.classList.remove("has-filter"); closeMenus(); renderAll(); });
    menu.appendChild(allOpt);
    const genOpt = el("button", "filter-menu-item" + (subDeptFilter === "" ? " is-active" : ""), "General / Department-Level");
    genOpt.type = "button";
    genOpt.addEventListener("click", () => { subDeptFilter = ""; selectSubDeptLabel.textContent = "General / Department-Level"; selectSubDeptBtn.classList.add("has-filter"); closeMenus(); renderAll(); });
    menu.appendChild(genOpt);
    subDepts.forEach((s) => {
      const opt = el("button", "filter-menu-item" + (subDeptFilter === s ? " is-active" : ""), escapeHtml(s));
      opt.type = "button";
      opt.addEventListener("click", () => { subDeptFilter = s; selectSubDeptLabel.textContent = s; selectSubDeptBtn.classList.add("has-filter"); closeMenus(); renderAll(); });
      menu.appendChild(opt);
    });
    positionMenu(menu, selectSubDeptBtn);
  });
}

// ---- Status filter dropdown ----
const selectStatusBtn = document.getElementById("selectStatus");
const selectStatusLabel = document.getElementById("selectStatusLabel");
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
selectStatusBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  closeMenus();
  const menu = el("div", "filter-menu");
  STATUS_OPTIONS.forEach((o) => {
    const opt = el("button", "filter-menu-item" + (statusFilter === o.value ? " is-active" : ""), o.label);
    opt.type = "button";
    opt.addEventListener("click", () => {
      statusFilter = o.value;
      selectStatusLabel.textContent = o.label;
      selectStatusBtn.classList.toggle("has-filter", o.value !== "all");
      closeMenus();
      renderAll();
    });
    menu.appendChild(opt);
  });
  positionMenu(menu, selectStatusBtn);
});

function closeMenus() { document.querySelectorAll(".filter-menu").forEach((m) => m.remove()); }
function positionMenu(menu, anchor) {
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top = `${r.bottom + 4}px`;
  menu.style.left = `${r.left}px`;
  menu.style.minWidth = `${r.width}px`;
}
document.addEventListener("click", closeMenus);

// ---- Search ----
document.getElementById("appSearch").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderList();
});

// ---- Application cards ----
const appGrid = document.getElementById("appGrid");
const countBadge = document.getElementById("countBadge");
// One badge per card, never two — "Web & Mobile" gets its own icon meaning
// "both", rather than showing the mobile and desktop icons side by side.
function accessIcons(a) {
  if (a.type === "Mobile Application") return `<span class="app-access-icon" title="Mobile app"><span class="material-icons">phone_iphone</span></span>`;
  if (a.type === "Web & Mobile") return `<span class="app-access-icon" title="Web &amp; Mobile"><span class="material-icons">devices</span></span>`;
  return `<span class="app-access-icon" title="Browser"><span class="material-icons">desktop_windows</span></span>`;
}
function statusBtn(a) {
  return a.status === "active"
    ? `<button class="app-status-btn is-stop" data-app-id="${a.id}" title="Deactivate application"><span class="material-icons">stop</span></button>`
    : `<button class="app-status-btn is-play" data-app-id="${a.id}" title="Activate application"><span class="material-icons">play_arrow</span></button>`;
}
function renderList() {
  const apps = visibleApps();
  countBadge.textContent = String(apps.length);
  appGrid.innerHTML = "";
  if (!apps.length) {
    appGrid.appendChild(el("div", "empty-list", "No applications match your filters."));
    return;
  }
  apps.forEach((a) => {
    const card = el("article", "app-card");
    card.innerHTML = `
      <div class="app-card-top">
        <span class="app-logo"><span class="material-icons">apps</span></span>
        <div class="app-access-icons">${accessIcons(a)}</div>
      </div>
      <h3 class="app-name">${escapeHtml(a.name)}</h3>
      <span class="chip">${escapeHtml(a.subDept ? a.subDept : "General / Department-Level")}</span>
      <span class="status-badge ${a.status === "active" ? "is-active" : "is-inactive"}">${a.status === "active" ? "Active" : "Inactive"}</span>
      <p class="app-desc">${escapeHtml(a.description || "No description provided.")}</p>
      <button class="btn btn-primary-alt btn-block view-app-btn" data-app-id="${a.id}"><span class="material-icons" style="font-size:16px">visibility</span>View App</button>
      <div class="app-card-actions">
        <button class="btn btn-outline edit-app-btn" data-app-id="${a.id}"><span class="material-icons" style="font-size:16px">edit</span>Edit Details</button>
        ${statusBtn(a)}
      </div>`;
    appGrid.appendChild(card);
  });
}
function renderAll() {
  renderOverview();
  renderList();
}
renderAll();
Store.on(renderAll);

// ---- Access modal ("Select one to access the application") ----
const accessModal = document.getElementById("accessModal");
const accessOptions = document.getElementById("accessOptions");
function openAccess(app) {
  accessOptions.innerHTML = "";
  if (app.webUrl) {
    accessOptions.innerHTML += `
      <a class="access-option" href="${escapeHtml(app.webUrl)}" target="_blank" rel="noopener">
        <span class="access-option-icon"><span class="material-icons">desktop_windows</span></span>
        <span class="access-option-text">Open in Browser</span>
      </a>`;
  }
  if (app.appUrl) {
    accessOptions.innerHTML += `
      <a class="access-option" href="${escapeHtml(app.appUrl)}" target="_blank" rel="noopener">
        <span class="access-option-icon"><span class="material-icons">phone_iphone</span></span>
        <span class="access-option-text">Open Mobile App</span>
      </a>`;
  }
  if (!accessOptions.innerHTML) {
    accessOptions.innerHTML = `<p class="empty-list">No access link has been set up for this application yet.</p>`;
  }
  accessModal.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeAccess() { accessModal.hidden = true; document.body.style.overflow = ""; }
appGrid.addEventListener("click", (e) => {
  const viewBtn = e.target.closest(".view-app-btn");
  const editBtn = e.target.closest(".edit-app-btn");
  const statusButton = e.target.closest(".app-status-btn");
  if (viewBtn) {
    const app = Store.applications().find((a) => a.id === Number(viewBtn.dataset.appId));
    if (app) openAccess(app);
  } else if (editBtn) {
    const app = Store.applications().find((a) => a.id === Number(editBtn.dataset.appId));
    if (app && window.openAppWizard) window.openAppWizard(app);
  } else if (statusButton) {
    const app = Store.applications().find((a) => a.id === Number(statusButton.dataset.appId));
    if (app) Store.setApplicationStatus(app.id, app.status === "active" ? "inactive" : "active");
  }
});
accessModal.querySelectorAll("[data-access-close], .access-option").forEach((b) =>
  b.addEventListener("click", closeAccess)
);
accessModal.addEventListener("mousedown", (e) => { if (e.target === accessModal) closeAccess(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !accessModal.hidden) closeAccess(); });
