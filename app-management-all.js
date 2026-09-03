// ============================================================
// TN SSO — App Management: flat "All Applications" list across every
// department, not scoped to one. Reads ?type=web|mobile from the URL
// so the Overview tiles on app-management.html ("Web Applications" /
// "Mobile Applications") can link straight into this list pre-filtered,
// instead of only being static counts.
// ============================================================
// App Management doesn't exist below Sub-Department — applications aren't
// tied to a specific jurisdiction office in the data model — so a
// jurisdiction-office admin who reaches this URL directly is bounced away.
if (Store.myScope().role === "dept-admin" && Store.myScope().office) {
  window.location.replace("index.html");
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

const params = new URLSearchParams(location.search);
const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "web", label: "Web Applications" },
  { value: "mobile", label: "Mobile Applications" },
];
let typeFilter = TYPE_OPTIONS.some((o) => o.value === params.get("type")) ? params.get("type") : "all";
let statusFilter = "all"; // all | active | inactive
let searchQuery = "";

function matchesType(a, filter) {
  if (filter === "web") return a.type === "Web Application" || a.type === "Web & Mobile";
  if (filter === "mobile") return a.type === "Mobile Application" || a.type === "Web & Mobile";
  return true;
}
function visibleApps() {
  let apps = Store.visibleApplications();
  if (typeFilter !== "all") apps = apps.filter((a) => matchesType(a, typeFilter));
  if (statusFilter !== "all") apps = apps.filter((a) => a.status === statusFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    apps = apps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q) ||
        a.dept.toLowerCase().includes(q) ||
        (a.subDept || "").toLowerCase().includes(q)
    );
  }
  return apps;
}

// ---- Overview stat tiles ----
function renderOverview() {
  const apps = Store.visibleApplications();
  const deptsWithApps = new Set(apps.map((a) => a.dept)).size;
  const webCount = apps.filter((a) => a.type === "Web Application" || a.type === "Web & Mobile").length;
  const mobileCount = apps.filter((a) => a.type === "Mobile Application" || a.type === "Web & Mobile").length;
  const tiles = [
    { icon: "apps", value: String(apps.length), label: "All Applications", type: "all" },
    { icon: "domain", value: `${deptsWithApps} of ${Store.visibleDepartments().length}`, label: "Departments Registered", type: null },
    { icon: "language", value: String(webCount), label: "Web Applications", type: "web" },
    { icon: "phone_iphone", value: String(mobileCount), label: "Mobile Applications", type: "mobile" },
  ];
  document.getElementById("overviewTiles").innerHTML = tiles
    .map(
      (t) => `
      <article class="ux4g-card ux4g-card-outline ux4g-al-stat-card${t.type ? " is-clickable" : ""}"${t.type ? ` data-type-tile="${t.type}"` : ""}>
        <div class="ux4g-card-body">
          <span class="ux4g-al-icon-tile"><span class="ux4g-icon-outlined" style="font-size:20px">${t.icon}</span></span>
          <div>
            <div class="ux4g-al-stat-number">${t.value}</div>
            <div class="ux4g-al-stat-label">${t.label}</div>
          </div>
          ${t.type ? `<span class="ux4g-jm-dept-arrow"><span class="material-icons">arrow_forward</span></span>` : ""}
        </div>
      </article>`
    )
    .join("");
  document.querySelectorAll("[data-type-tile]").forEach((tile) => {
    tile.addEventListener("click", () => {
      typeFilter = tile.dataset.typeTile;
      selectTypeLabel.textContent = TYPE_OPTIONS.find((o) => o.value === typeFilter).label;
      selectTypeBtn.classList.toggle("has-filter", typeFilter !== "all");
      renderList();
      document.getElementById("appGrid").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ---- Type filter dropdown ----
const selectTypeBtn = document.getElementById("selectType");
const selectTypeLabel = document.getElementById("selectTypeLabel");
selectTypeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  closeMenus();
  const menu = el("div", "filter-menu");
  TYPE_OPTIONS.forEach((o) => {
    const opt = el("button", "filter-menu-item" + (typeFilter === o.value ? " is-active" : ""), o.label);
    opt.type = "button";
    opt.addEventListener("click", () => {
      typeFilter = o.value;
      selectTypeLabel.textContent = o.label;
      selectTypeBtn.classList.toggle("has-filter", o.value !== "all");
      closeMenus();
      renderList();
    });
    menu.appendChild(opt);
  });
  positionMenu(menu, selectTypeBtn);
});
if (typeFilter !== "all") {
  selectTypeLabel.textContent = TYPE_OPTIONS.find((o) => o.value === typeFilter).label;
  selectTypeBtn.classList.add("has-filter");
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
      renderList();
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
      <span class="app-card-dept">${escapeHtml(a.dept)}</span>
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
