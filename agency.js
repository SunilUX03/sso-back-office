// ============================================================
// TN SSO — Department Jurisdiction (Jurisdiction Management drill-down).
// Scoped to one department via ?dept=<slug>. Levels + offices are
// owned by the shared Store, per department (Store.deptLevels /
// Store.deptOffices), persisted to localStorage.
// ============================================================
const params = new URLSearchParams(window.location.search);
const deptName = Store.deptBySlug(params.get("dept")) || Store.allDepartments()[0];
const resolvedSub = Store.subDeptBySlug(deptName, params.get("sub"));
const subDeptName = resolvedSub !== null ? resolvedSub : Store.allSubDepartments(deptName)[0];

const state = {
  levels: Store.deptLevels(deptName, subDeptName),
  offices: Store.deptOffices(deptName, subDeptName),
};

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
function escapeAttr(s) {
  return escapeHtml(s);
}

// ============================================================
// Page head: scoped title / breadcrumb
// ============================================================
const subDeptLabel = Store.subDeptLabel(deptName, subDeptName);
document.getElementById("deptTitle").textContent = subDeptLabel;
document.getElementById("subDeptCrumb").textContent = subDeptLabel;
document.title = `${subDeptLabel} — Jurisdiction — TN SSO`;
// The "General / Department-Level" bucket's label IS the department name,
// so its own crumb would otherwise repeat the department crumb right
// before it — skip that crumb entirely rather than show the name twice.
if (subDeptName === Store.generalSubDept()) {
  document.getElementById("deptCrumbLink").hidden = true;
  document.getElementById("deptCrumbSep").hidden = true;
} else {
  document.getElementById("deptCrumbLink").textContent = deptName;
  document.getElementById("deptCrumbLink").href = `jurisdiction-subdept.html?dept=${Store.deptSlug(deptName)}`;
}

// ============================================================
// Overview stat tiles (this department only)
// ============================================================
const statGrid = document.getElementById("statGrid");
function renderStats() {
  statGrid.innerHTML = "";
  const nonZero = Store.deptLevelCounts(deptName, subDeptName).filter((c) => c.value > 0);
  if (!nonZero.length) {
    statGrid.innerHTML = `<div class="empty-list">No jurisdiction offices added yet.</div>`;
    return;
  }
  nonZero.forEach((c) => {
    statGrid.appendChild(
      el(
        "article",
        "ux4g-card ux4g-card-outline ux4g-al-stat-card",
        `<div class="ux4g-card-body">
           <span class="ux4g-al-icon-tile"><span class="ux4g-icon-outlined" style="font-size:20px">domain</span></span>
           <div>
             <div class="ux4g-al-stat-number">${c.value}</div>
             <div class="ux4g-al-stat-label">${escapeHtml(c.label)}</div>
           </div>
         </div>`
      )
    );
  });
}

// ============================================================
// Modal plumbing
// ============================================================
const hierarchyModal = document.getElementById("hierarchyModal");
const officeModal = document.getElementById("officeModal");

function openModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal(modal) {
  modal.hidden = true;
  document.body.style.overflow = "";
}

document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-open]");
  if (!trigger) return;
  if (trigger.dataset.open === "hierarchy") openHierarchy();
  else if (trigger.dataset.open === "office") openOffice(null);
});

[hierarchyModal, officeModal].forEach((modal) => {
  modal.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => closeModal(modal))
  );
  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) closeModal(modal);
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!hierarchyModal.hidden) closeModal(hierarchyModal);
    if (!officeModal.hidden) closeModal(officeModal);
  }
});

// ============================================================
// Define Hierarchy Structure modal
// ============================================================
const levelsList = document.getElementById("levelsList");
let editLevels = [];
let dragIndex = null;

function openHierarchy() {
  editLevels = state.levels.length ? [...state.levels] : [""];
  renderLevelRows();
  openModal(hierarchyModal);
}

function renderLevelRows() {
  levelsList.innerHTML = "";
  editLevels.forEach((name, i) => {
    const row = el("div", "level-row");
    row.draggable = true;
    row.dataset.index = i;
    row.innerHTML = `
      <span class="drag-handle" title="Drag to reorder"><span class="material-icons">drag_indicator</span></span>
      <span class="level-num">${i + 1}</span>
      <div class="level-input-wrap">
        <input class="level-input" type="text" placeholder="Enter Level Name" value="${escapeAttr(name)}" />
        <button type="button" class="level-remove" aria-label="Remove level"><span class="material-icons">close</span></button>
      </div>`;

    row.querySelector(".level-input").addEventListener("input", (e) => {
      editLevels[i] = e.target.value;
    });
    row.querySelector(".level-remove").addEventListener("click", () => {
      editLevels.splice(i, 1);
      if (editLevels.length === 0) editLevels = [""];
      renderLevelRows();
    });

    row.addEventListener("dragstart", () => {
      dragIndex = i;
      row.classList.add("is-dragging");
    });
    row.addEventListener("dragend", () => {
      dragIndex = null;
      row.classList.remove("is-dragging");
      levelsList.querySelectorAll(".level-row").forEach((r) => r.classList.remove("drop-target"));
    });
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      row.classList.add("drop-target");
    });
    row.addEventListener("dragleave", () => row.classList.remove("drop-target"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      const to = Number(row.dataset.index);
      if (dragIndex === null || dragIndex === to) return;
      const [moved] = editLevels.splice(dragIndex, 1);
      editLevels.splice(to, 0, moved);
      renderLevelRows();
    });

    levelsList.appendChild(row);
  });
}

document.getElementById("addLevelBtn").addEventListener("click", () => {
  editLevels.push("");
  renderLevelRows();
  const inputs = levelsList.querySelectorAll(".level-input");
  inputs[inputs.length - 1].focus();
});

document.getElementById("saveHierarchyBtn").addEventListener("click", () => {
  const cleaned = editLevels.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    alert("Add at least one level name.");
    return;
  }
  Store.setDeptLevels(deptName, cleaned, subDeptName);
  state.levels = Store.deptLevels(deptName, subDeptName);
  renderHierarchyCard();
  renderStats();
  resetLevelFilter();
  renderOfficeTable();
  closeModal(hierarchyModal);
});

// ============================================================
// "Hierarchy Structure" card
// ============================================================
const hierarchyCard = document.getElementById("hierarchyCard");

function renderHierarchyCard() {
  if (!state.levels.length) {
    hierarchyCard.classList.remove("is-defined");
    hierarchyCard.innerHTML = `
      <div class="hierarchy-illustration"><img src="assets/imgImage6.png" alt="" /></div>
      <div class="hierarchy-text">
        <h3 class="hierarchy-title">No Hierarchy Structure</h3>
        <p class="hierarchy-desc">Define the administrative hierarchy used by this department by specifying each jurisdiction level in order (e.g., State → Division → District → Mandal → Village).</p>
        <button class="btn btn-primary btn-lg" data-open="hierarchy">
          <img class="btn-plus" src="assets/imgPlus.svg" alt="" /> Define Hierarchy Structure
        </button>
      </div>`;
    return;
  }
  const chips = state.levels
    .map((lvl) => `<span class="hier-chip">${escapeHtml(lvl)}</span>`)
    .join('<span class="hier-sep"><span class="material-icons">chevron_right</span></span>');
  hierarchyCard.classList.add("is-defined");
  hierarchyCard.innerHTML = `
    <div class="hierarchy-illustration"><img src="assets/imgImage6.png" alt="" /></div>
    <div class="hier-main">
      <div class="hier-head">
        <h3 class="hier-card-title">Hierarchy Structure</h3>
        <button class="btn-edit-hier" data-open="hierarchy">
          <span class="material-icons">edit</span> Edit Hierarchy Structure
        </button>
      </div>
      <div class="hier-chips">${chips}</div>
    </div>`;
}

// ============================================================
// Add / Edit Jurisdiction Office modal
// ============================================================
const fLevel = document.getElementById("fLevel");
const fName = document.getElementById("fName");
const fParent = document.getElementById("fParent");
const fDesc = document.getElementById("fDesc");
const parentField = document.getElementById("parentField");
const officeTitle = document.getElementById("officeTitle");
const officeSubtitle = officeModal.querySelector(".modal-subtitle");
const addOfficeBtn = document.getElementById("addOfficeBtn");
let editingOfficeId = null;

function populateFLevel() {
  fLevel.innerHTML = '<option value="" disabled selected>Select a Level</option>';
  state.levels.forEach((name, i) => {
    const opt = el("option");
    opt.value = String(i);
    opt.textContent = name;
    fLevel.appendChild(opt);
  });
}

function populateParentField(levelIndex, currentParentId) {
  if (Number.isNaN(levelIndex) || levelIndex <= 0) {
    parentField.hidden = true;
    return;
  }
  parentField.hidden = false;
  const parentIndex = levelIndex - 1;
  const parentLevelName = state.levels[parentIndex];
  const parentOffices = state.offices.filter((o) => o.levelIndex === parentIndex && o.id !== editingOfficeId);

  fParent.innerHTML = "";
  if (parentOffices.length) {
    fParent.appendChild(makeOption("", "Select Parent office...", true, !currentParentId));
    parentOffices.forEach((o) =>
      fParent.appendChild(makeOption(String(o.id), o.name, false, o.id === currentParentId))
    );
    fParent.disabled = false;
  } else {
    fParent.appendChild(
      makeOption("", `No ${(parentLevelName || "").toLowerCase()} offices yet - Add them first`, true, true)
    );
    fParent.disabled = true;
  }
}

function openOffice(office) {
  editingOfficeId = office ? office.id : null;
  populateFLevel();

  if (office) {
    officeTitle.textContent = "Edit Jurisdiction Office";
    officeSubtitle.textContent = "Update this office's details";
    addOfficeBtn.textContent = "Save Changes";
    fLevel.value = String(office.levelIndex);
    fName.value = office.name;
    fDesc.value = office.description || "";
    populateParentField(office.levelIndex, office.parentId);
  } else {
    officeTitle.textContent = "Add Jurisdiction Office";
    officeSubtitle.textContent = "Add an office to this department's jurisdiction hierarchy";
    addOfficeBtn.textContent = "Add Jurisdiction Office";
    fName.value = "";
    fDesc.value = "";
    parentField.hidden = true;
  }
  openModal(officeModal);
}

fLevel.addEventListener("change", () => {
  const levelIndex = Number(fLevel.value);
  populateParentField(levelIndex, null);
});

addOfficeBtn.addEventListener("click", () => {
  const levelIndex = Number(fLevel.value);
  if (Number.isNaN(levelIndex)) {
    alert("Please select a Jurisdiction Level.");
    return;
  }
  if (!fName.value.trim()) {
    alert("Please enter a Jurisdiction Office Name.");
    fName.focus();
    return;
  }
  if (!parentField.hidden && !fParent.disabled && !fParent.value) {
    alert("Please select a Parent Office.");
    return;
  }
  const parentId = !parentField.hidden && fParent.value ? Number(fParent.value) : null;
  const parent = parentId ? state.offices.find((o) => o.id === parentId) : null;

  const payload = {
    name: fName.value.trim(),
    levelIndex,
    parentId,
    reportsTo: parent ? parent.name : "Top Level",
    description: fDesc.value.trim(),
  };

  if (editingOfficeId) {
    Store.updateDeptOffice(deptName, editingOfficeId, payload, subDeptName);
  } else {
    Store.addDeptOffice(deptName, payload, subDeptName);
  }
  state.offices = Store.deptOffices(deptName, subDeptName);
  renderStats();
  renderOfficeTable();
  closeModal(officeModal);
});

// ============================================================
// Level filter + search
// ============================================================
const levelFilter = document.getElementById("levelFilter");
const levelFilterLabel = document.getElementById("levelFilterLabel");
const officeSearch = document.getElementById("officeSearch");
let searchText = "";
let levelFilterValue = "";

function resetLevelFilter() {
  levelFilterValue = "";
  levelFilterLabel.textContent = "All Levels";
}
function closeFilterMenus() {
  document.querySelectorAll(".filter-menu").forEach((m) => m.remove());
}
function openLevelFilterMenu() {
  closeFilterMenus();
  const menu = document.createElement("div");
  menu.className = "filter-menu";
  const options = [{ label: "All Levels", value: "" }].concat(
    state.levels.map((name, i) => ({ label: name, value: String(i) }))
  );
  options.forEach((opt) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = opt.label;
    if (opt.value === levelFilterValue) b.classList.add("is-active");
    b.addEventListener("click", () => {
      levelFilterValue = opt.value;
      levelFilterLabel.textContent = opt.label;
      currentPage = 1;
      renderOfficeTable();
      closeFilterMenus();
    });
    menu.appendChild(b);
  });
  document.body.appendChild(menu);
  const r = levelFilter.getBoundingClientRect();
  menu.style.top = `${r.bottom + 4}px`;
  menu.style.left = `${r.left}px`;
  menu.style.minWidth = `${r.width}px`;
}
levelFilter.addEventListener("click", (e) => {
  e.stopPropagation();
  if (document.querySelector(".filter-menu")) { closeFilterMenus(); return; }
  openLevelFilterMenu();
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".filter-menu") && !e.target.closest("#levelFilter")) closeFilterMenus();
});
officeSearch.addEventListener("input", (e) => {
  searchText = e.target.value;
  currentPage = 1;
  renderOfficeTable();
});

// ============================================================
// Office table + pagination
// ============================================================
const officeBody = document.getElementById("officeBody");
const officeTable = document.getElementById("officeTable");
const officeEmpty = document.getElementById("officeEmpty");
const countBadge = document.getElementById("countBadge");
const paginationEl = document.getElementById("officePagination");
const pageNumsEl = document.getElementById("pageNums");
const pagePrevBtn = document.getElementById("pagePrev");
const pageNextBtn = document.getElementById("pageNext");
const pageSizeSelect = document.getElementById("pageSize");
const pageInfoTotal = document.getElementById("pageInfoTotal");
let currentPage = 1;
let pageSize = Number(pageSizeSelect.value) || 10;

function pageNumbersToShow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = new Set([1, 2, 3, 4, 5, 6, total]);
  for (let n = current - 1; n <= current + 1; n++) {
    if (n >= 1 && n <= total) nums.add(n);
  }
  return Array.from(nums).sort((a, b) => a - b);
}

function renderPagination(totalRows) {
  const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1);
  if (currentPage > totalPages) currentPage = totalPages;
  if (totalRows <= pageSize) {
    paginationEl.hidden = true;
    return;
  }
  paginationEl.hidden = false;

  const nums = pageNumbersToShow(currentPage, totalPages);
  pageNumsEl.innerHTML = "";
  let prevNum = 0;
  nums.forEach((n) => {
    if (n - prevNum > 1) pageNumsEl.appendChild(el("span", "page-ellipsis", "..."));
    const btn = el("button", `page-num${n === currentPage ? " is-active" : ""}`, String(n));
    btn.type = "button";
    btn.addEventListener("click", () => {
      currentPage = n;
      renderOfficeTable();
    });
    pageNumsEl.appendChild(btn);
    prevNum = n;
  });

  pagePrevBtn.classList.toggle("is-disabled", currentPage === 1);
  pageNextBtn.classList.toggle("is-disabled", currentPage === totalPages);
  pageInfoTotal.textContent = `of ${totalRows} items`;
}

pagePrevBtn.addEventListener("click", () => {
  if (currentPage > 1) { currentPage -= 1; renderOfficeTable(); }
});
pageNextBtn.addEventListener("click", () => {
  currentPage += 1;
  renderOfficeTable();
});
pageSizeSelect.addEventListener("change", () => {
  pageSize = Number(pageSizeSelect.value) || 10;
  currentPage = 1;
  renderOfficeTable();
});

function renderOfficeTable() {
  countBadge.textContent = String(state.offices.length);

  if (state.offices.length === 0) {
    officeTable.hidden = true;
    officeEmpty.hidden = false;
    officeBody.innerHTML = "";
    paginationEl.hidden = true;
    return;
  }

  const filtered = state.offices.filter((o) => {
    if (levelFilterValue !== "" && o.levelIndex !== Number(levelFilterValue)) return false;
    if (searchText && !o.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  officeTable.hidden = false;
  officeEmpty.hidden = true;
  officeBody.innerHTML = "";

  renderPagination(filtered.length);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  rows.forEach((o) => {
    const levelName = state.levels[o.levelIndex] || "—";
    const childCount = Store.deptOfficeChildCount(deptName, o.id, subDeptName);
    const row = el("tr");
    row.innerHTML = `
      <td>${escapeHtml(o.name)}</td>
      <td><span class="chip level-chip">${escapeHtml(levelName)}</span></td>
      <td>${escapeHtml(o.reportsTo || "Top Level")}</td>
      <td>${childCount} Sub jurisdiction offices</td>
      <td>
        <div class="ux4g-al-row-actions">
          <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-sm" data-edit-id="${o.id}" aria-label="Edit ${escapeAttr(o.name)}">
            <span class="ux4g-icon-outlined" style="font-size:15px">edit</span>
          </button>
          <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-sm" data-del-id="${o.id}" aria-label="Delete ${escapeAttr(o.name)}">
            <span class="ux4g-icon-outlined" style="font-size:15px">delete</span>
          </button>
        </div>
      </td>`;
    officeBody.appendChild(row);
  });
}

officeBody.addEventListener("click", (e) => {
  const delBtn = e.target.closest("[data-del-id]");
  if (delBtn) {
    const id = Number(delBtn.dataset.delId);
    const office = state.offices.find((o) => o.id === id);
    const childCount = office ? Store.deptOfficeChildCount(deptName, id, subDeptName) : 0;
    const warning = childCount > 0
      ? `This will also delete its ${childCount} sub jurisdiction office${childCount === 1 ? "" : "s"}. This can't be undone.`
      : "This can't be undone.";
    if (!confirm(`Delete "${office ? office.name : "this office"}"? ${warning}`)) return;
    Store.removeDeptOffice(deptName, id, subDeptName);
    state.offices = Store.deptOffices(deptName, subDeptName);
    renderStats();
    renderOfficeTable();
    return;
  }
  const editBtn = e.target.closest("[data-edit-id]");
  if (editBtn) {
    const office = state.offices.find((o) => o.id === Number(editBtn.dataset.editId));
    if (office) openOffice(office);
  }
});

// ============================================================
// helpers
// ============================================================
function makeOption(value, text, disabled = false, selected = false) {
  const opt = el("option");
  opt.value = value;
  opt.textContent = text;
  if (disabled) opt.disabled = true;
  if (selected) opt.selected = true;
  return opt;
}

// ============================================================
// Initial render
// ============================================================
renderStats();
renderHierarchyCard();
renderOfficeTable();
