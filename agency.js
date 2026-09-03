// ============================================================
// TN SSO — Department Jurisdiction (Jurisdiction Management drill-down).
// Scoped to one department via ?dept=<slug>. Levels + offices are
// owned by the shared Store, per department (Store.deptLevels /
// Store.deptOffices), persisted to localStorage.
// ============================================================
const params = new URLSearchParams(window.location.search);
const deptName = Store.resolveScopedDept(Store.deptBySlug(params.get("dept")));
const resolvedSub = Store.subDeptBySlug(deptName, params.get("sub"));
const subDeptName = Store.resolveScopedSubDept(deptName, resolvedSub);

const state = {
  levels: Store.deptLevels(deptName, subDeptName),
  offices: Store.visibleOffices(deptName, subDeptName),
};

// The lowest new level a jurisdiction-office admin can add an office at —
// strictly below their own office's level, since a level at or above that
// would be a peer or ancestor office outside their own authority, not a
// descendant. Everyone else (Super Admin, a Department/Sub-Department
// Admin with no office of their own) has no such floor.
function scopeMinAddLevelIndex() {
  const scope = Store.myScope();
  if (scope.role === "dept-admin" && scope.office && deptName === scope.dept && subDeptName === scope.subDept) {
    const own = Store.deptOffices(deptName, subDeptName).find((o) => o.name === scope.office);
    if (own) return own.levelIndex + 1;
  }
  return 0;
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
// A jurisdiction-office admin's real scope is their own office, not the
// whole sub-department — the heading and breadcrumb name that office (and
// its level) instead, with the sub-department demoted to a mid-crumb.
{
  const officeScope = Store.myScope();
  const scopedOffice =
    officeScope.role === "dept-admin" && officeScope.office && deptName === officeScope.dept && subDeptName === officeScope.subDept
      ? Store.deptOffices(deptName, subDeptName).find((o) => o.name === officeScope.office)
      : null;
  if (scopedOffice) {
    const levelLabel = state.levels[scopedOffice.levelIndex] || "";
    const officeLabel = levelLabel ? `${scopedOffice.name} (${levelLabel})` : scopedOffice.name;
    document.getElementById("deptTitle").textContent = officeLabel;
    document.title = `${officeLabel} — Jurisdiction — TN SSO`;
    document.getElementById("subDeptCrumb").classList.remove("crumb-current");
    document.getElementById("officeCrumbSep").hidden = false;
    const officeCrumbEl = document.getElementById("officeCrumb");
    officeCrumbEl.hidden = false;
    officeCrumbEl.textContent = officeLabel;
  }
}

// ============================================================
// Overview stat tiles (this department only)
// ============================================================
const statGrid = document.getElementById("statGrid");
function renderStats() {
  statGrid.innerHTML = "";
  // Always show real stat tiles — a Total Records tile even at zero — same
  // as every other Overview on the site, instead of swapping the whole
  // grid out for a text-only empty state.
  const tiles = [{ icon: "account_tree", value: state.offices.length, label: "Total Jurisdiction Records" }];
  // Computed from state.offices (already scoped to this admin's own
  // subtree), not Store.deptLevelCounts — that reads every office in the
  // sub-department regardless of who's signed in.
  state.levels.slice(1).forEach((label, i) => {
    const levelIndex = i + 1;
    const value = state.offices.filter((o) => o.levelIndex === levelIndex).length;
    if (value > 0) tiles.push({ icon: "domain", value, label });
  });
  tiles.forEach((t) => {
    statGrid.appendChild(
      el(
        "article",
        "ux4g-card ux4g-card-outline ux4g-al-stat-card",
        `<div class="ux4g-card-body">
           <span class="ux4g-al-icon-tile"><span class="ux4g-icon-outlined" style="font-size:20px">${t.icon}</span></span>
           <div>
             <div class="ux4g-al-stat-number">${t.value}</div>
             <div class="ux4g-al-stat-label">${escapeHtml(t.label)}</div>
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

// The hierarchy structure (the level chain itself — State, Division,
// District, ...) is a whole department/sub-department definition, not
// something scoped to one office within it — a jurisdiction-office admin
// (Tier 3+) can't redefine it, only view it.
function isHierarchyFrozen() {
  const scope = Store.myScope();
  return scope.role === "dept-admin" && !!scope.office && deptName === scope.dept && subDeptName === scope.subDept;
}

function renderHierarchyCard() {
  const frozen = isHierarchyFrozen();
  if (!state.levels.length) {
    hierarchyCard.classList.remove("is-defined");
    hierarchyCard.innerHTML = `
      <div class="hierarchy-illustration"><img src="assets/imgImage6.png" alt="" /></div>
      <div class="hierarchy-text">
        <h3 class="hierarchy-title">No Hierarchy Structure</h3>
        <p class="hierarchy-desc">Define the administrative hierarchy used by this department by specifying each jurisdiction level in order (e.g., State → Division → District → Mandal → Village).</p>
        ${frozen ? "" : `<button class="btn btn-primary btn-lg" data-open="hierarchy">
          <img class="btn-plus" src="assets/imgPlus.svg" alt="" /> Define Hierarchy Structure
        </button>`}
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
        ${frozen ? "" : `<button class="btn-edit-hier" data-open="hierarchy">
          <span class="material-icons">edit</span> Edit Hierarchy Structure
        </button>`}
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

// ---- shared custom-dropdown popup for this modal's two selects (same
// component the rest of the app uses instead of a native <select> list) ----
function closeFieldMenus() {
  document.querySelectorAll(".filter-menu").forEach((m) => m.remove());
}
function openFieldMenu(anchor, options, activeValue, onPick) {
  closeFieldMenus();
  const menu = document.createElement("div");
  menu.className = "filter-menu";
  options.forEach((opt) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = opt.label;
    if (opt.value === activeValue) b.classList.add("is-active");
    b.addEventListener("click", () => { onPick(opt.value, opt.label); closeFieldMenus(); });
    menu.appendChild(b);
  });
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top = `${r.bottom + 4}px`;
  menu.style.left = `${r.left}px`;
  menu.style.minWidth = `${r.width}px`;
}
function bindFieldSelectTrigger(id, placeholder) {
  const select = document.getElementById(id);
  const trigger = document.getElementById(id + "Trigger");
  const label = document.getElementById(id + "TriggerLabel");
  function sync() {
    const opt = select.options[select.selectedIndex];
    const hasValue = opt && opt.value !== "";
    label.textContent = opt ? opt.textContent : placeholder;
    label.classList.toggle("is-placeholder", !hasValue);
  }
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (trigger.disabled) return;
    if (document.querySelector(".filter-menu")) { closeFieldMenus(); return; }
    const options = [...select.options].filter((o) => !o.disabled).map((o) => ({ value: o.value, label: o.textContent }));
    openFieldMenu(trigger, options, select.value, (value, lbl) => {
      select.value = value;
      label.textContent = lbl;
      label.classList.remove("is-placeholder");
      select.dispatchEvent(new Event("change"));
    });
  });
  sync();
  return sync;
}
const syncFLevelTrigger = bindFieldSelectTrigger("fLevel", "Select a Level");
const syncFParentTrigger = bindFieldSelectTrigger("fParent", "Select Parent office...");
document.addEventListener("click", (e) => {
  if (!e.target.closest(".filter-menu") && !e.target.closest("#fLevelTrigger") && !e.target.closest("#fParentTrigger")) closeFieldMenus();
});

// includeLevelIndex keeps one level selectable even below the usual floor
// — the office being edited's own current level, so editing it doesn't
// silently lose its level because that level is no longer addable as new.
function populateFLevel(includeLevelIndex) {
  fLevel.innerHTML = '<option value="" disabled selected>Select a Level</option>';
  const minLevel = scopeMinAddLevelIndex();
  state.levels.forEach((name, i) => {
    if (i < minLevel && i !== includeLevelIndex) return;
    const opt = el("option");
    opt.value = String(i);
    opt.textContent = name;
    fLevel.appendChild(opt);
  });
  syncFLevelTrigger();
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
  document.getElementById("fParentTrigger").disabled = fParent.disabled;
  syncFParentTrigger();
}

const officeModeToggle = document.getElementById("officeModeToggle");
const officeSinglePanel = document.getElementById("officeSinglePanel");
const officeBulkPanel = document.getElementById("officeBulkPanel");
const officeBulkCreateBtn = document.getElementById("officeBulkCreateBtn");
let officeMode = "single";

function applyOfficeMode() {
  const isBulk = officeMode === "bulk";
  officeModeToggle.querySelectorAll(".mode-toggle-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === officeMode));
  officeSinglePanel.hidden = isBulk;
  officeBulkPanel.hidden = !isBulk;
  addOfficeBtn.hidden = isBulk;
  officeBulkCreateBtn.hidden = !isBulk;
}
officeModeToggle.querySelectorAll(".mode-toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => { officeMode = btn.dataset.mode; applyOfficeMode(); });
});

function openOffice(office) {
  editingOfficeId = office ? office.id : null;
  populateFLevel(office ? office.levelIndex : undefined);
  officeMode = "single";
  applyOfficeMode();
  // Bulk upload only makes sense for adding new offices, not editing one.
  officeModeToggle.hidden = !!office;
  resetOfficeBulkPanel();

  if (office) {
    officeTitle.textContent = "Edit Jurisdiction Office";
    officeSubtitle.textContent = "Update this office's details";
    addOfficeBtn.textContent = "Save Changes";
    fLevel.value = String(office.levelIndex);
    syncFLevelTrigger();
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
  state.offices = Store.visibleOffices(deptName, subDeptName);
  renderStats();
  renderOfficeTable();
  closeModal(officeModal);
});

// ============================================================
// Bulk Upload — Jurisdiction Offices
// ============================================================
const OFFICE_BULK_HEADERS = ["Level", "Office Name", "Parent Office", "Description"];
let officeBulkRows = [];

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function csvEscape(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
document.getElementById("officeBulkDownloadTemplate").addEventListener("click", () => {
  const csv = OFFICE_BULK_HEADERS.map(csvEscape).join(",");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "bulk-jurisdiction-template.csv");
});

function resetOfficeBulkPanel() {
  officeBulkRows = [];
  document.getElementById("officeBulkFileInput").value = "";
  document.getElementById("officeBulkFileName").textContent = "";
  document.getElementById("officeBulkPreviewWrap").hidden = true;
  document.getElementById("officeBulkResultsWrap").hidden = true;
  officeBulkCreateBtn.disabled = true;
  officeBulkCreateBtn.textContent = "Add Offices";
}

// Every row's Parent Office must already exist (in the real, already-saved
// hierarchy, or elsewhere earlier in the SAME file isn't supported — only
// pre-existing offices count) — kept simple and predictable rather than
// resolving cross-row references within one upload.
function validateOfficeBulkRow(cells, seen) {
  const [levelRaw, name, parentRaw, description] = [0, 1, 2, 3].map((i) => (cells[i] || "").trim());
  const errors = [];
  const minLevel = scopeMinAddLevelIndex();
  let levelIndex = state.levels.findIndex((l) => l.toLowerCase() === levelRaw.toLowerCase());
  if (!levelRaw) errors.push("Level is required");
  else if (levelIndex === -1) errors.push(`Level "${levelRaw}" doesn't match this department's real levels`);
  else if (levelIndex < minLevel) errors.push(`Level "${levelRaw}" is above what you're allowed to add`);
  if (!name) errors.push("Office Name is required");

  let parentId = null;
  let parentName = "";
  if (levelIndex > 0) {
    if (!parentRaw) errors.push("Parent Office is required for this level");
    else {
      const parentIndex = levelIndex - 1;
      const parent = state.offices.find((o) => o.levelIndex === parentIndex && o.name.toLowerCase() === parentRaw.toLowerCase());
      if (!parent) errors.push(`Parent Office "${parentRaw}" not found at the level above`);
      else { parentId = parent.id; parentName = parent.name; }
    }
  } else if (parentRaw) {
    errors.push("Parent Office must be blank for the top level");
  }

  // duplicate within this same file — same (level, name) pair twice
  const dupeKey = levelIndex >= 0 ? `${levelIndex}::${name.toLowerCase()}` : null;
  if (dupeKey && name) {
    if (seen.has(dupeKey)) errors.push("Duplicated in another row in this file");
    seen.add(dupeKey);
  }

  return { level: levelRaw, levelIndex, name, parentId, parentName, description, errors };
}

function renderOfficeBulkPreview() {
  const body = document.getElementById("officeBulkPreviewBody");
  body.innerHTML = "";
  const validCount = officeBulkRows.filter((r) => !r.errors.length).length;
  officeBulkRows.forEach((r, i) => {
    const ok = !r.errors.length;
    const tr = document.createElement("tr");
    tr.className = ok ? "is-ok" : "is-error";
    tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(r.level)}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.parentName || "—")}</td>
      <td>${ok ? '<span class="bulk-status is-ok"><span class="material-icons">check_circle</span>Ready</span>' : `<span class="bulk-status is-error"><span class="material-icons">error</span>${escapeHtml(r.errors.join("; "))}</span>`}</td>`;
    body.appendChild(tr);
  });
  document.getElementById("officeBulkPreviewSummary").innerHTML =
    `<span class="material-icons">description</span>${officeBulkRows.length} row${officeBulkRows.length === 1 ? "" : "s"} found — <strong>${validCount} ready</strong>, ${officeBulkRows.length - validCount} with errors`;
  document.getElementById("officeBulkPreviewWrap").hidden = false;
  document.getElementById("officeBulkResultsWrap").hidden = true;
  officeBulkCreateBtn.disabled = validCount === 0;
  officeBulkCreateBtn.textContent = `Add ${validCount} Office${validCount === 1 ? "" : "s"}`;
}

document.getElementById("officeBulkFileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById("officeBulkFileName").textContent = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    const allRows = parseCsv(String(reader.result));
    if (!allRows.length) { officeBulkRows = []; renderOfficeBulkPreview(); return; }
    const dataRows = allRows.slice(1);
    const seen = new Set();
    officeBulkRows = dataRows
      .filter((r) => r.some((cell) => (cell || "").trim()))
      .map((r) => validateOfficeBulkRow(r, seen));
    renderOfficeBulkPreview();
  };
  reader.readAsText(file);
});

officeBulkCreateBtn.addEventListener("click", () => {
  const valid = officeBulkRows.filter((r) => !r.errors.length);
  const failed = officeBulkRows.filter((r) => r.errors.length);
  valid.forEach((r) => {
    Store.addDeptOffice(deptName, {
      name: r.name,
      levelIndex: r.levelIndex,
      parentId: r.parentId,
      reportsTo: r.parentName || "Top Level",
      description: r.description,
    }, subDeptName);
  });
  state.offices = Store.visibleOffices(deptName, subDeptName);
  renderStats();
  renderOfficeTable();

  document.getElementById("officeBulkResultsBanner").innerHTML =
    `<span class="material-icons">${failed.length ? "info" : "check_circle"}</span>` +
    `<strong>${valid.length} of ${officeBulkRows.length}</strong> offices added. ` +
    (failed.length ? `${failed.length} row${failed.length === 1 ? "" : "s"} need fixing and re-uploading.` : "All rows added successfully.");
  const failuresBody = document.getElementById("officeBulkFailuresBody");
  failuresBody.innerHTML = "";
  failed.forEach((r) => {
    const originalIndex = officeBulkRows.indexOf(r) + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${originalIndex}</td><td>${escapeHtml(r.name || "—")}</td><td>${escapeHtml(r.errors.join("; "))}</td>`;
    failuresBody.appendChild(tr);
  });
  document.getElementById("officeBulkPreviewWrap").hidden = true;
  document.getElementById("officeBulkResultsWrap").hidden = false;
  document.getElementById("officeBulkResultsWrap").querySelector(".bulk-preview-table-wrap").hidden = failed.length === 0;
  officeBulkCreateBtn.disabled = true;
  officeBulkCreateBtn.textContent = "Offices Added";
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
  const presentIndexes = [...new Set(state.offices.map((o) => o.levelIndex))].sort((a, b) => a - b);
  const options = [{ label: "All Levels", value: "" }].concat(
    presentIndexes.map((i) => ({ label: state.levels[i] || `Level ${i}`, value: String(i) }))
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
    state.offices = Store.visibleOffices(deptName, subDeptName);
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
