// ============================================================
// TN SSO — Officers list (Active / Deactivated), scoped to one
// department + sub-department via ?dept=<slug>&sub=<slug> — mirrors
// agency.js's own dept/sub resolution against the real 76-department
// directory (Store.allDepartments), rather than the old 3-department
// "onboarded" list.
// ============================================================
const params = new URLSearchParams(window.location.search);
const deptName = Store.deptBySlug(params.get("dept")) || Store.allDepartments()[0];
const resolvedSub = Store.subDeptBySlug(deptName, params.get("sub"));
const subDeptName = resolvedSub !== null ? resolvedSub : Store.allSubDepartments(deptName)[0];

const subDeptLabel = Store.subDeptLabel(deptName, subDeptName);
document.getElementById("deptTitle").textContent = subDeptLabel;
document.getElementById("subDeptCrumb").textContent = subDeptLabel;
document.title = `${subDeptLabel} — Officers — TN SSO`;
// The "General / Department-Level" bucket's label IS the department
// name, so its own crumb would otherwise repeat the department crumb
// right before it — skip that crumb entirely rather than show it twice.
if (subDeptName === Store.generalSubDept()) {
  document.getElementById("deptCrumbLink").hidden = true;
  document.getElementById("deptCrumbSep").hidden = true;
} else {
  document.getElementById("deptCrumbLink").textContent = deptName;
  document.getElementById("deptCrumbLink").href = `users-subdept.html?dept=${Store.deptSlug(deptName)}`;
}

const officerListEl = document.getElementById("officerList");
const countBadge = document.querySelector(".count-badge");
const sectionTitle = document.querySelector(".jur-toolbar-left .section-title");
const searchInput = document.querySelector(".search-box input");
const filterBtns = document.querySelectorAll(".jur-toolbar-right .level-dropdown");
const pagination = document.querySelector(".pagination");
const pageNums = pagination.querySelector(".page-nums");
const arrows = pagination.querySelectorAll(".page-arrow");
const prevArrow = arrows[0];
const nextArrow = arrows[1];
const pageSizeSel = pagination.querySelector(".page-size select");
const pageInfoTotal = pagination.querySelector(".page-info span:last-child");

let mode = "active"; // "active" | "deactivated"
let query = "";
let levelFilter = ""; // levelIndex as a string, or ""
let jurFilter = "";
let desigFilter = "";
let page = 1;
let pageSize = parseInt(pageSizeSel ? pageSizeSel.value : "10", 10) || 10;

// ---- level lookups (an officer's own level comes from its jurisdiction
// office; used to drive the Level filter and to narrow the Jurisdiction /
// Designation filter menus so they only ever show that level's items) ----
function officeLevelIndex(name) {
  const o = Store.deptOffices(deptName, subDeptName).find((x) => x.name === name);
  return o ? o.levelIndex : null;
}
function officerLevelIndex(o) {
  return officeLevelIndex(o.jurisdiction);
}

// ---- filtering ----
function baseList() {
  return Store.officers().filter((o) => o.dept === deptName && o.subDept === subDeptName && o.status === mode);
}
function filtered() {
  let list = baseList();
  if (query) {
    const q = query.toLowerCase();
    list = list.filter((o) =>
      `${o.name} ${o.role} ${o.designation} ${o.jurisdiction}`.toLowerCase().includes(q)
    );
  }
  if (levelFilter !== "") list = list.filter((o) => officerLevelIndex(o) === Number(levelFilter));
  if (jurFilter) list = list.filter((o) => o.jurisdiction === jurFilter);
  if (desigFilter) list = list.filter((o) => o.designation === desigFilter);
  return list;
}

// ---- card actions ----
function actionsHTML(o) {
  if (o.status === "pending") {
    return `
      <div class="officer-actions">
        <button class="officer-action" data-act="resend" data-id="${o.id}"><span class="material-icons">forward_to_inbox</span>Resend Verification Link</button>
        <button class="officer-action" data-act="edit" data-id="${o.id}"><span class="material-icons">edit</span>Edit Details</button>
      </div>`;
  }
  const first =
    o.status === "deactivated"
      ? `<button class="officer-action act-activate" data-act="activate" data-id="${o.id}"><span class="material-icons">play_arrow</span>Activate Officer</button>`
      : `<button class="officer-action" data-act="deactivate" data-id="${o.id}"><span class="material-icons">block</span>Deactivate Officer</button>`;
  return `
    <div class="officer-actions">
      ${first}
      <button class="officer-action" data-act="edit" data-id="${o.id}"><span class="material-icons">edit</span>Edit Details</button>
      <button class="btn-unlink" data-act="unlink" data-id="${o.id}">Unlink Officer</button>
    </div>`;
}

// ---- pagination render ----
function pageWindow(total, current) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  if (lo > 2) out.push("...");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push("...");
  out.push(total);
  return out;
}
function renderPagination(total, totalPages) {
  pageNums.innerHTML = "";
  pageWindow(totalPages, page).forEach((n) => {
    if (n === "...") {
      const s = document.createElement("span");
      s.className = "page-ellipsis";
      s.textContent = "...";
      pageNums.appendChild(s);
      return;
    }
    const b = document.createElement("button");
    b.className = "page-num" + (n === page ? " is-active" : "");
    b.textContent = String(n);
    b.addEventListener("click", () => { page = n; render(); });
    pageNums.appendChild(b);
  });
  prevArrow.classList.toggle("is-disabled", page <= 1);
  nextArrow.classList.toggle("is-disabled", page >= totalPages);
  if (pageInfoTotal) pageInfoTotal.textContent = `of ${total} items`;
}

// ---- main render ----
function render() {
  const list = filtered();
  countBadge.textContent = baseList().length;
  sectionTitle.textContent =
    mode === "active" ? "Active Officers Accounts" : mode === "pending" ? "Pending Accounts" : "Deactivated Officers Accounts";

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  if (page > totalPages) page = totalPages;
  const start = (page - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  officerListEl.innerHTML = "";
  if (!pageItems.length) {
    officerListEl.innerHTML = `<div class="empty-list">No officers match your filters.</div>`;
  } else {
    pageItems.forEach((o) => {
      const card = document.createElement("div");
      card.className = "officer-card";
      card.innerHTML = window.OfficerCard(actionsHTML(o), o);
      officerListEl.appendChild(card);
    });
  }
  renderPagination(list.length, totalPages);
}

// ---- tab toggle (Active / Deactivated) ----
document.querySelectorAll("[data-officer-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-officer-tab]").forEach((t) => {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    mode = tab.dataset.officerTab;
    page = 1;
    render();
  });
});

// ---- status / unlink actions (delegated) ----
officerListEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.act === "deactivate") Store.setOfficerStatus(id, "deactivated");
  else if (btn.dataset.act === "activate") Store.setOfficerStatus(id, "active");
  else if (btn.dataset.act === "unlink") {
    // A transfer, not a delete — the officer stays in the system and shows
    // up under "Click here to add a Transferred Officer" wherever they get
    // linked next, instead of being erased.
    if (confirm("Unlink this officer from the department? They'll appear as a Transferred Officer until linked elsewhere.")) Store.unlinkOfficer(id);
  } else if (btn.dataset.act === "edit") {
    const officer = Store.officers().find((o) => o.id === id);
    if (officer && window.openOfficerWizard) window.openOfficerWizard(officer);
  } else if (btn.dataset.act === "resend") {
    Store.resendVerification("officer", id);
    btn.innerHTML = '<span class="material-icons">check</span>Link Resent';
    setTimeout(() => render(), 1200);
  }
});

// ---- search ----
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    query = e.target.value;
    page = 1;
    render();
  });
}

// ---- filter dropdowns (Jurisdiction / Designation) ----
function closeFilterMenus() {
  document.querySelectorAll(".filter-menu").forEach((m) => m.remove());
}
function openFilterMenu(btn, options, current, onPick) {
  closeFilterMenus();
  const menu = document.createElement("div");
  menu.className = "filter-menu";
  options.forEach((opt) => {
    const b = document.createElement("button");
    b.textContent = opt.label;
    if (opt.value === current) b.classList.add("is-active");
    b.addEventListener("click", () => { onPick(opt.value); closeFilterMenus(); });
    menu.appendChild(b);
  });
  document.body.appendChild(menu);
  const r = btn.getBoundingClientRect();
  menu.style.top = `${r.bottom + 4}px`;
  menu.style.left = `${r.left}px`;
}
// Jurisdiction / Designation options are scoped to officers in this
// department AND, once a Level is picked, to just that level — so
// picking "District" leaves only district-level names to choose from.
function uniqueValues(key) {
  let list = Store.officers().filter((o) => o.dept === deptName && o.subDept === subDeptName);
  if (levelFilter !== "") list = list.filter((o) => officerLevelIndex(o) === Number(levelFilter));
  return [...new Set(list.map((o) => o[key]).filter(Boolean))].sort();
}
const levelBtn = filterBtns[0];
const jurBtn = filterBtns[1];
const desigBtn = filterBtns[2];

if (levelBtn) {
  levelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const opts = [{ label: "All Levels", value: "" }].concat(
      Store.deptLevels(deptName, subDeptName).map((name, i) => ({ label: name, value: String(i) }))
    );
    openFilterMenu(levelBtn, opts, levelFilter, (v) => {
      levelFilter = v;
      // Level changed: the previously-picked Jurisdiction/Designation may
      // no longer apply at this level — clear them rather than silently
      // showing an empty list.
      jurFilter = "";
      desigFilter = "";
      jurBtn.classList.remove("has-filter");
      jurBtn.childNodes[0].nodeValue = "Jurisdiction ";
      desigBtn.classList.remove("has-filter");
      desigBtn.childNodes[0].nodeValue = "Designation ";
      const levelName = v === "" ? "" : Store.deptLevels(deptName, subDeptName)[Number(v)];
      levelBtn.classList.toggle("has-filter", !!levelName);
      levelBtn.childNodes[0].nodeValue = levelName || "Level ";
      page = 1;
      render();
    });
  });
}
if (jurBtn) {
  jurBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const opts = [{ label: "All Jurisdictions", value: "" }].concat(
      uniqueValues("jurisdiction").map((v) => ({ label: v, value: v }))
    );
    openFilterMenu(jurBtn, opts, jurFilter, (v) => {
      jurFilter = v; page = 1;
      jurBtn.classList.toggle("has-filter", !!v);
      jurBtn.childNodes[0].nodeValue = v || "Jurisdiction ";
      render();
    });
  });
}
if (desigBtn) {
  desigBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const opts = [{ label: "All Designations", value: "" }].concat(
      uniqueValues("designation").map((v) => ({ label: v, value: v }))
    );
    openFilterMenu(desigBtn, opts, desigFilter, (v) => {
      desigFilter = v; page = 1;
      desigBtn.classList.toggle("has-filter", !!v);
      desigBtn.childNodes[0].nodeValue = v || "Designation ";
      render();
    });
  });
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".filter-menu") && !e.target.closest(".level-dropdown")) closeFilterMenus();
});

// ---- page size + arrows ----
if (pageSizeSel) {
  pageSizeSel.addEventListener("change", () => {
    pageSize = parseInt(pageSizeSel.value, 10) || 10;
    page = 1;
    render();
  });
}
prevArrow.addEventListener("click", () => { if (page > 1) { page--; render(); } });
nextArrow.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(filtered().length / pageSize));
  if (page < totalPages) { page++; render(); }
});

// ---- re-render when the store changes (e.g. wizard adds an officer) ----
Store.on(() => render());

render();
