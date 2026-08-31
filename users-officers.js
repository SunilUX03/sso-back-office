// ============================================================
// TN SSO — Officers list (Active / Deactivated) — store-driven
// ============================================================
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
let jurFilter = "";
let desigFilter = "";
let page = 1;
let pageSize = parseInt(pageSizeSel ? pageSizeSel.value : "10", 10) || 10;

// ---- filtering ----
function baseList() {
  return Store.officers().filter((o) => o.status === mode);
}
function filtered() {
  let list = baseList();
  if (query) {
    const q = query.toLowerCase();
    list = list.filter((o) =>
      `${o.name} ${o.role} ${o.designation} ${o.jurisdiction}`.toLowerCase().includes(q)
    );
  }
  if (jurFilter) list = list.filter((o) => o.jurisdiction === jurFilter);
  if (desigFilter) list = list.filter((o) => o.designation === desigFilter);
  return list;
}

// ---- card actions ----
function actionsHTML(o) {
  const first =
    o.status === "deactivated"
      ? `<button class="officer-action act-activate" data-act="activate" data-id="${o.id}"><span class="material-icons">play_arrow</span>Activate Officer</button>`
      : `<button class="officer-action" data-act="deactivate" data-id="${o.id}"><span class="material-icons">block</span>Deactivate Officer</button>`;
  return `
    <div class="officer-actions">
      ${first}
      <button class="officer-action"><span class="material-icons">add</span>Add Additional Role</button>
      <button class="officer-action"><span class="material-icons">edit</span>Edit Details</button>
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
    mode === "active" ? "Active Officers Accounts" : "Deactivated Officers Accounts";

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
    if (confirm("Unlink this officer from the department?")) Store.removeOfficer(id);
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
function uniqueValues(key) {
  return [...new Set(Store.officers().map((o) => o[key]).filter(Boolean))].sort();
}
if (filterBtns[0]) {
  filterBtns[0].addEventListener("click", (e) => {
    e.stopPropagation();
    const opts = [{ label: "All Jurisdictions", value: "" }].concat(
      uniqueValues("jurisdiction").map((v) => ({ label: v, value: v }))
    );
    openFilterMenu(filterBtns[0], opts, jurFilter, (v) => {
      jurFilter = v; page = 1;
      filterBtns[0].classList.toggle("has-filter", !!v);
      filterBtns[0].childNodes[0].nodeValue = v || "Jurisdiction ";
      render();
    });
  });
}
if (filterBtns[1]) {
  filterBtns[1].addEventListener("click", (e) => {
    e.stopPropagation();
    const opts = [{ label: "All Designations", value: "" }].concat(
      uniqueValues("designation").map((v) => ({ label: v, value: v }))
    );
    openFilterMenu(filterBtns[1], opts, desigFilter, (v) => {
      desigFilter = v; page = 1;
      filterBtns[1].classList.toggle("has-filter", !!v);
      filterBtns[1].childNodes[0].nodeValue = v || "Designation ";
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
