// ============================================================
// TN SSO — Department Designations (Designation Management drill-down).
// Scoped to one department via ?dept=<slug>. Designations, levels and
// offices are owned by the shared Store, per department, persisted to
// localStorage.
// ============================================================
const params = new URLSearchParams(window.location.search);
const deptName = Store.deptBySlug(params.get("dept")) || Store.allDepartments()[0];
const resolvedSub = Store.subDeptBySlug(deptName, params.get("sub"));
const subDeptName = resolvedSub !== null ? resolvedSub : Store.allSubDepartments(deptName)[0];

const state = {
  levels: Store.deptLevels(deptName, subDeptName),
  offices: Store.deptOffices(deptName, subDeptName),
  designations: Store.deptDesignations(deptName, subDeptName),
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
function escapeAttr(s) { return escapeHtml(s); }
function makeOption(value, text, disabled = false, selected = false) {
  const opt = el("option");
  opt.value = value;
  opt.textContent = text;
  if (disabled) opt.disabled = true;
  if (selected) opt.selected = true;
  return opt;
}

// ============================================================
// Page head: scoped title / breadcrumb
// ============================================================
const subDeptLabel = Store.subDeptLabel(deptName, subDeptName);
document.getElementById("deptTitle").textContent = subDeptLabel;
document.getElementById("subDeptCrumb").textContent = subDeptLabel;
document.title = `${subDeptLabel} — Designations — TN SSO`;
// The "General / Department-Level" bucket's label IS the department name,
// so its own crumb would otherwise repeat the department crumb right
// before it — skip that crumb entirely rather than show the name twice.
if (subDeptName === Store.generalSubDept()) {
  document.getElementById("deptCrumbLink").hidden = true;
  document.getElementById("deptCrumbSep").hidden = true;
} else {
  document.getElementById("deptCrumbLink").textContent = deptName;
  document.getElementById("deptCrumbLink").href = `designation-subdept.html?dept=${Store.deptSlug(deptName)}`;
}

// ============================================================
// Overview stat tiles (this department only)
// ============================================================
const statGrid = document.getElementById("statGrid");
function renderStats() {
  statGrid.innerHTML = "";
  const nonZero = Store.deptDesignationLevelCounts(deptName, subDeptName).filter((c) => c.value > 0);
  if (!nonZero.length) {
    statGrid.innerHTML = `<div class="empty-list">No designations added yet.</div>`;
    return;
  }
  nonZero.forEach((c) => {
    statGrid.appendChild(
      el(
        "article",
        "ux4g-card ux4g-card-outline ux4g-al-stat-card",
        `<div class="ux4g-card-body">
           <span class="ux4g-al-icon-tile"><span class="ux4g-icon-outlined" style="font-size:20px">badge</span></span>
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
const designationModal = document.getElementById("designationModal");

function openModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal(modal) {
  modal.hidden = true;
  document.body.style.overflow = "";
}

document.addEventListener("click", (e) => {
  if (e.target.closest('[data-open="designation"]')) openDesignation(null);
});
designationModal.querySelectorAll("[data-close]").forEach((b) =>
  b.addEventListener("click", () => closeModal(designationModal))
);
designationModal.addEventListener("mousedown", (e) => {
  if (e.target === designationModal) closeModal(designationModal);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !designationModal.hidden) closeModal(designationModal);
});

// ============================================================
// Add / Edit Designation modal
// ============================================================
const dTitle = document.getElementById("dTitle");
const dLevel = document.getElementById("dLevel");
const dCode = document.getElementById("dCode");
const dOfficerLevel = document.getElementById("dOfficerLevel");
const dOfficer = document.getElementById("dOfficer");
const dOfficeLevel = document.getElementById("dOfficeLevel");
const dOffice = document.getElementById("dOffice");
const dDesc = document.getElementById("dDesc");
const reportsOfficerField = document.getElementById("reportsOfficerField");
const reportsOfficeField = document.getElementById("reportsOfficeField");
const reportingSeg = document.getElementById("reportingSeg");
const desigTitleEl = document.getElementById("desigTitle");
const addDesignationBtn = document.getElementById("addDesignationBtn");
let reportType = "none";
let editingDesigId = null;

// ---- Level -> item cascade, so the second dropdown only ever shows
// the handful of designations/offices at one level, not the whole list.
function populateOfficerList(levelIndex, selectedId) {
  dOfficer.innerHTML = "";
  if (levelIndex === "" || levelIndex == null) {
    dOfficer.appendChild(makeOption("", "Select a Level first", true, true));
    dOfficer.disabled = true;
    return;
  }
  const atLevel = state.designations.filter(
    (d) => d.levelIndex === Number(levelIndex) && d.id !== editingDesigId
  );
  if (!atLevel.length) {
    dOfficer.appendChild(makeOption("", `No designations at ${state.levels[levelIndex]} yet`, true, true));
    dOfficer.disabled = true;
    return;
  }
  dOfficer.disabled = false;
  dOfficer.appendChild(makeOption("", "Select Designation", true, !selectedId));
  atLevel.forEach((d) => dOfficer.appendChild(makeOption(String(d.id), d.name, false, d.id === selectedId)));
}
function populateOfficeList(levelIndex, selectedName) {
  dOffice.innerHTML = "";
  if (levelIndex === "" || levelIndex == null) {
    dOffice.appendChild(makeOption("", "Select a Level first", true, true));
    dOffice.disabled = true;
    return;
  }
  const atLevel = state.offices.filter((o) => o.levelIndex === Number(levelIndex));
  if (!atLevel.length) {
    dOffice.appendChild(makeOption("", `No offices at ${state.levels[levelIndex]} yet`, true, true));
    dOffice.disabled = true;
    return;
  }
  dOffice.disabled = false;
  dOffice.appendChild(makeOption("", "Select Office", true, !selectedName));
  atLevel.forEach((o) => dOffice.appendChild(makeOption(o.name, o.name, false, o.name === selectedName)));
}
dOfficerLevel.addEventListener("change", () => populateOfficerList(dOfficerLevel.value, null));
dOfficeLevel.addEventListener("change", () => populateOfficeList(dOfficeLevel.value, null));

function setReportType(type) {
  reportType = type;
  reportingSeg.querySelectorAll(".seg-btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.report === type);
  });
  reportsOfficerField.hidden = type !== "officer";
  reportsOfficeField.hidden = type !== "office";
  // Default to the level directly above the role being defined — that's
  // how a hierarchy normally reports — while still letting it be changed.
  const aboveLevel = dLevel.value !== "" ? Math.max(Number(dLevel.value) - 1, 0) : "";
  if (type === "officer" && dOfficerLevel.value === "") {
    dOfficerLevel.value = aboveLevel;
    populateOfficerList(aboveLevel, null);
  }
  if (type === "office" && dOfficeLevel.value === "") {
    dOfficeLevel.value = aboveLevel;
    populateOfficeList(aboveLevel, null);
  }
}
reportingSeg.querySelectorAll(".seg-btn").forEach((b) =>
  b.addEventListener("click", () => setReportType(b.dataset.report))
);

function openDesignation(record) {
  editingDesigId = record ? record.id : null;

  dLevel.innerHTML = "";
  dLevel.appendChild(makeOption("", "Select a Level", true, true));
  state.levels.forEach((lvl, i) => dLevel.appendChild(makeOption(String(i), lvl)));

  dOfficerLevel.innerHTML = "";
  dOfficerLevel.appendChild(makeOption("", "Select a Level", true, true));
  state.levels.forEach((lvl, i) => dOfficerLevel.appendChild(makeOption(String(i), lvl)));
  populateOfficerList("", null);

  dOfficeLevel.innerHTML = "";
  dOfficeLevel.appendChild(makeOption("", "Select a Level", true, true));
  state.levels.forEach((lvl, i) => dOfficeLevel.appendChild(makeOption(String(i), lvl)));
  populateOfficeList("", null);

  if (record) {
    desigTitleEl.textContent = "Edit Designation";
    addDesignationBtn.textContent = "Save Changes";
    dTitle.value = record.name;
    dLevel.value = String(record.levelIndex);
    dCode.value = record.code === "—" ? "" : record.code;
    dDesc.value = record.description || "";
    setReportType(record.reportsToType || "none");
    if (record.reportsToType === "officer") {
      const target = state.designations.find((d) => d.id === record.reportsToId);
      if (target) {
        dOfficerLevel.value = String(target.levelIndex);
        populateOfficerList(target.levelIndex, target.id);
      }
    }
    if (record.reportsToType === "office") {
      const target = state.offices.find((o) => o.name === record.reportsToId);
      if (target) {
        dOfficeLevel.value = String(target.levelIndex);
        populateOfficeList(target.levelIndex, target.name);
      }
    }
  } else {
    desigTitleEl.textContent = "Add Designation";
    addDesignationBtn.textContent = "Add Designation";
    dTitle.value = "";
    dCode.value = "";
    dDesc.value = "";
    setReportType("none");
  }
  openModal(designationModal);
}

addDesignationBtn.addEventListener("click", () => {
  if (!dTitle.value.trim()) {
    alert("Please enter a Designation Title.");
    dTitle.focus();
    return;
  }
  if (dLevel.value === "") {
    alert("Please select a Jurisdiction Level.");
    return;
  }
  let reportsTo = "Top Level";
  let reportsToId = null;
  if (reportType === "officer") {
    if (dOfficerLevel.value === "") {
      alert("Please select the Level of the officer this role reports to.");
      return;
    }
    if (!dOfficer.value) {
      alert("Please select the Designation this role reports to.");
      return;
    }
    reportsToId = Number(dOfficer.value);
    reportsTo = state.designations.find((d) => d.id === reportsToId)?.name || "—";
  } else if (reportType === "office") {
    if (dOfficeLevel.value === "") {
      alert("Please select the Level of the office this role reports to.");
      return;
    }
    if (!dOffice.value) {
      alert("Please select the Office this role reports to.");
      return;
    }
    reportsToId = dOffice.value;
    reportsTo = dOffice.value;
  }

  const payload = {
    name: dTitle.value.trim(),
    code: dCode.value.trim() || "—",
    levelIndex: Number(dLevel.value),
    reportsToType: reportType,
    reportsToId,
    reportsTo,
    description: dDesc.value.trim(),
  };

  if (editingDesigId) {
    Store.updateDeptDesignation(deptName, editingDesigId, payload, subDeptName);
  } else {
    Store.addDeptDesignation(deptName, payload, subDeptName);
  }
  state.designations = Store.deptDesignations(deptName, subDeptName);
  renderStats();
  renderDesigTable();
  closeModal(designationModal);
});

// ============================================================
// Level filter + search + pagination
// ============================================================
const levelFilter = document.getElementById("levelFilter");
const levelFilterLabel = document.getElementById("levelFilterLabel");
const desigSearch = document.getElementById("desigSearch");
let searchText = "";
let levelFilterValue = "";
let currentPage = 1;

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
      renderDesigTable();
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
desigSearch.addEventListener("input", (e) => {
  searchText = e.target.value;
  currentPage = 1;
  renderDesigTable();
});

const paginationEl = document.getElementById("desigPagination");
const pageNumsEl = document.getElementById("pageNums");
const pagePrevBtn = document.getElementById("pagePrev");
const pageNextBtn = document.getElementById("pageNext");
const pageSizeSelect = document.getElementById("pageSize");
const pageInfoTotal = document.getElementById("pageInfoTotal");
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
    btn.addEventListener("click", () => { currentPage = n; renderDesigTable(); });
    pageNumsEl.appendChild(btn);
    prevNum = n;
  });
  pagePrevBtn.classList.toggle("is-disabled", currentPage === 1);
  pageNextBtn.classList.toggle("is-disabled", currentPage === totalPages);
  pageInfoTotal.textContent = `of ${totalRows} items`;
}
pagePrevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage -= 1; renderDesigTable(); } });
pageNextBtn.addEventListener("click", () => { currentPage += 1; renderDesigTable(); });
pageSizeSelect.addEventListener("change", () => {
  pageSize = Number(pageSizeSelect.value) || 10;
  currentPage = 1;
  renderDesigTable();
});

// ============================================================
// Designations table
// ============================================================
const desigBody = document.getElementById("desigBody");
const desigTable = document.getElementById("desigTable");
const desigEmpty = document.getElementById("desigEmpty");
const countBadge = document.getElementById("countBadge");

function renderDesigTable() {
  countBadge.textContent = String(state.designations.length);

  if (state.designations.length === 0) {
    desigTable.hidden = true;
    desigEmpty.hidden = false;
    desigBody.innerHTML = "";
    paginationEl.hidden = true;
    return;
  }

  const filtered = state.designations.filter((d) => {
    if (levelFilterValue !== "" && d.levelIndex !== Number(levelFilterValue)) return false;
    if (searchText && !d.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  desigTable.hidden = false;
  desigEmpty.hidden = true;
  desigBody.innerHTML = "";

  renderPagination(filtered.length);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  rows.forEach((d) => {
    const levelName = state.levels[d.levelIndex] || "—";
    const row = el("tr");
    row.innerHTML = `
      <td>${escapeHtml(d.name)}</td>
      <td>${escapeHtml(d.code)}</td>
      <td><span class="chip level-chip">${escapeHtml(levelName)}</span></td>
      <td>${escapeHtml(d.reportsTo || "Top Level")}</td>
      <td>
        <div class="ux4g-al-row-actions">
          <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-sm" data-edit-id="${d.id}" aria-label="Edit ${escapeAttr(d.name)}">
            <span class="ux4g-icon-outlined" style="font-size:15px">edit</span>
          </button>
          <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-sm" data-del-id="${d.id}" aria-label="Delete ${escapeAttr(d.name)}">
            <span class="ux4g-icon-outlined" style="font-size:15px">delete</span>
          </button>
        </div>
      </td>`;
    desigBody.appendChild(row);
  });
}

desigBody.addEventListener("click", (e) => {
  const delBtn = e.target.closest("[data-del-id]");
  if (delBtn) {
    const id = Number(delBtn.dataset.delId);
    const record = state.designations.find((d) => d.id === id);
    if (!confirm(`Delete "${record ? record.name : "this designation"}"? This can't be undone.`)) return;
    const blockers = Store.removeDeptDesignation(deptName, id, subDeptName);
    if (blockers) {
      alert(
        `Can't delete "${record.name}" — ${blockers.length} designation${blockers.length === 1 ? "" : "s"} report to it: ${blockers.map((b) => b.name).join(", ")}. Reassign them first.`
      );
      return;
    }
    state.designations = Store.deptDesignations(deptName, subDeptName);
    renderStats();
    renderDesigTable();
    return;
  }
  const editBtn = e.target.closest("[data-edit-id]");
  if (editBtn) {
    const record = state.designations.find((d) => d.id === Number(editBtn.dataset.editId));
    if (record) openDesignation(record);
  }
});

// ============================================================
// Initial render
// ============================================================
renderStats();
renderDesigTable();
