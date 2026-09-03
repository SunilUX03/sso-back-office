// ============================================================
// TN SSO — Department Designations (Designation Management drill-down).
// Scoped to one department via ?dept=<slug>. Designations, levels and
// offices are owned by the shared Store, per department, persisted to
// localStorage.
// ============================================================
const params = new URLSearchParams(window.location.search);
const deptName = Store.resolveScopedDept(Store.deptBySlug(params.get("dept")));
const resolvedSub = Store.subDeptBySlug(deptName, params.get("sub"));
const subDeptName = Store.resolveScopedSubDept(deptName, resolvedSub);

const state = {
  levels: Store.deptLevels(deptName, subDeptName),
  offices: Store.visibleOffices(deptName, subDeptName),
  designations: Store.visibleDeptDesignations(deptName, subDeptName),
};

// The lowest level a jurisdiction-office admin can add a designation at —
// their own office's level and below (unlike offices, a designation AT
// their own level is normal — it's plausibly their own job title), so this
// is inclusive where scopeMinAddLevelIndex in agency.js is exclusive.
// Everyone else has no such floor.
function scopeMinDesignationLevelIndex() {
  const scope = Store.myScope();
  if (scope.role === "dept-admin" && scope.office && deptName === scope.dept && subDeptName === scope.subDept) {
    const own = Store.deptOffices(deptName, subDeptName).find((o) => o.name === scope.office);
    if (own) return own.levelIndex;
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
    document.title = `${officeLabel} — Designations — TN SSO`;
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
  // Always show real stat tiles — a Total Designations tile even at zero —
  // same as every other Overview on the site, instead of swapping the
  // whole grid out for a text-only empty state.
  const tiles = [{ icon: "badge", value: state.designations.length, label: "Total Designations" }];
  // Computed from state.designations (already scoped to this admin's own
  // level and below), not Store.deptDesignationLevelCounts — that reads
  // every designation in the sub-department regardless of who's signed in.
  state.levels.forEach((label, levelIndex) => {
    const value = state.designations.filter((d) => d.levelIndex === levelIndex).length;
    if (value > 0) tiles.push({ icon: "badge", value, label });
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

// ---- shared custom-dropdown popup for this modal's selects (same
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
const syncDLevelTrigger = bindFieldSelectTrigger("dLevel", "Select a Level");
const syncDOfficerLevelTrigger = bindFieldSelectTrigger("dOfficerLevel", "Select a Level");
const syncDOfficerTrigger = bindFieldSelectTrigger("dOfficer", "Select a Level first");
const syncDOfficeLevelTrigger = bindFieldSelectTrigger("dOfficeLevel", "Select a Level");
const syncDOfficeTrigger = bindFieldSelectTrigger("dOffice", "Select a Level first");
document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".filter-menu") &&
    !e.target.closest("#dLevelTrigger") &&
    !e.target.closest("#dOfficerLevelTrigger") &&
    !e.target.closest("#dOfficerTrigger") &&
    !e.target.closest("#dOfficeLevelTrigger") &&
    !e.target.closest("#dOfficeTrigger")
  ) closeFieldMenus();
});

// ---- Level -> item cascade, so the second dropdown only ever shows
// the handful of designations/offices at one level, not the whole list.
function populateOfficerList(levelIndex, selectedId) {
  dOfficer.innerHTML = "";
  if (levelIndex === "" || levelIndex == null) {
    dOfficer.appendChild(makeOption("", "Select a Level first", true, true));
    dOfficer.disabled = true;
    document.getElementById("dOfficerTrigger").disabled = true;
    syncDOfficerTrigger();
    return;
  }
  const atLevel = state.designations.filter(
    (d) => d.levelIndex === Number(levelIndex) && d.id !== editingDesigId
  );
  if (!atLevel.length) {
    dOfficer.appendChild(makeOption("", `No designations at ${state.levels[levelIndex]} yet`, true, true));
    dOfficer.disabled = true;
    document.getElementById("dOfficerTrigger").disabled = true;
    syncDOfficerTrigger();
    return;
  }
  dOfficer.disabled = false;
  dOfficer.appendChild(makeOption("", "Select Designation", true, !selectedId));
  atLevel.forEach((d) => dOfficer.appendChild(makeOption(String(d.id), d.name, false, d.id === selectedId)));
  document.getElementById("dOfficerTrigger").disabled = false;
  syncDOfficerTrigger();
}
function populateOfficeList(levelIndex, selectedName) {
  dOffice.innerHTML = "";
  if (levelIndex === "" || levelIndex == null) {
    dOffice.appendChild(makeOption("", "Select a Level first", true, true));
    dOffice.disabled = true;
    document.getElementById("dOfficeTrigger").disabled = true;
    syncDOfficeTrigger();
    return;
  }
  const atLevel = state.offices.filter((o) => o.levelIndex === Number(levelIndex));
  if (!atLevel.length) {
    dOffice.appendChild(makeOption("", `No offices at ${state.levels[levelIndex]} yet`, true, true));
    dOffice.disabled = true;
    document.getElementById("dOfficeTrigger").disabled = true;
    syncDOfficeTrigger();
    return;
  }
  dOffice.disabled = false;
  dOffice.appendChild(makeOption("", "Select Office", true, !selectedName));
  atLevel.forEach((o) => dOffice.appendChild(makeOption(o.name, o.name, false, o.name === selectedName)));
  document.getElementById("dOfficeTrigger").disabled = false;
  syncDOfficeTrigger();
}
dOfficerLevel.addEventListener("change", () => { populateOfficerList(dOfficerLevel.value, null); syncDOfficerLevelTrigger(); });
dOfficeLevel.addEventListener("change", () => { populateOfficeList(dOfficeLevel.value, null); syncDOfficeLevelTrigger(); });

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
    syncDOfficerLevelTrigger();
    populateOfficerList(aboveLevel, null);
  }
  if (type === "office" && dOfficeLevel.value === "") {
    dOfficeLevel.value = aboveLevel;
    syncDOfficeLevelTrigger();
    populateOfficeList(aboveLevel, null);
  }
}
reportingSeg.querySelectorAll(".seg-btn").forEach((b) =>
  b.addEventListener("click", () => setReportType(b.dataset.report))
);

const desigModeToggle = document.getElementById("desigModeToggle");
const desigSinglePanel = document.getElementById("desigSinglePanel");
const desigBulkPanel = document.getElementById("desigBulkPanel");
const desigBulkCreateBtn = document.getElementById("desigBulkCreateBtn");
let desigMode = "single";

function applyDesigMode() {
  const isBulk = desigMode === "bulk";
  desigModeToggle.querySelectorAll(".mode-toggle-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === desigMode));
  desigSinglePanel.hidden = isBulk;
  desigBulkPanel.hidden = !isBulk;
  addDesignationBtn.hidden = isBulk;
  desigBulkCreateBtn.hidden = !isBulk;
}
desigModeToggle.querySelectorAll(".mode-toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => { desigMode = btn.dataset.mode; applyDesigMode(); });
});

function openDesignation(record) {
  editingDesigId = record ? record.id : null;
  desigMode = "single";
  applyDesigMode();
  // Bulk upload only makes sense for adding new designations, not editing one.
  desigModeToggle.hidden = !!record;
  resetDesigBulkPanel();

  dLevel.innerHTML = "";
  dLevel.appendChild(makeOption("", "Select a Level", true, true));
  const minDesigLevel = scopeMinDesignationLevelIndex();
  const editingLevelIndex = record ? record.levelIndex : undefined;
  state.levels.forEach((lvl, i) => {
    if (i < minDesigLevel && i !== editingLevelIndex) return;
    dLevel.appendChild(makeOption(String(i), lvl));
  });

  syncDLevelTrigger();

  // "Reports to" targets are scoped the same as the designation's own
  // level — a jurisdiction-office admin's new designations can only report
  // to something else within their own visible reach, never a level above.
  dOfficerLevel.innerHTML = "";
  dOfficerLevel.appendChild(makeOption("", "Select a Level", true, true));
  state.levels.forEach((lvl, i) => { if (i >= minDesigLevel) dOfficerLevel.appendChild(makeOption(String(i), lvl)); });
  populateOfficerList("", null);
  syncDOfficerLevelTrigger();

  dOfficeLevel.innerHTML = "";
  dOfficeLevel.appendChild(makeOption("", "Select a Level", true, true));
  state.levels.forEach((lvl, i) => { if (i >= minDesigLevel) dOfficeLevel.appendChild(makeOption(String(i), lvl)); });
  populateOfficeList("", null);
  syncDOfficeLevelTrigger();

  if (record) {
    desigTitleEl.textContent = "Edit Designation";
    addDesignationBtn.textContent = "Save Changes";
    dTitle.value = record.name;
    dLevel.value = String(record.levelIndex);
    syncDLevelTrigger();
    dCode.value = record.code === "—" ? "" : record.code;
    dDesc.value = record.description || "";
    setReportType(record.reportsToType || "none");
    if (record.reportsToType === "officer") {
      const target = state.designations.find((d) => d.id === record.reportsToId);
      if (target) {
        dOfficerLevel.value = String(target.levelIndex);
        syncDOfficerLevelTrigger();
        populateOfficerList(target.levelIndex, target.id);
      }
    }
    if (record.reportsToType === "office") {
      const target = state.offices.find((o) => o.name === record.reportsToId);
      if (target) {
        dOfficeLevel.value = String(target.levelIndex);
        syncDOfficeLevelTrigger();
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
  state.designations = Store.visibleDeptDesignations(deptName, subDeptName);
  renderStats();
  renderDesigTable();
  closeModal(designationModal);
});

// ============================================================
// Bulk Upload — Designations
// ============================================================
const DESIG_BULK_HEADERS = ["Level", "Designation Title", "Short Code", "Reports To Type", "Reports To Name", "Description"];
let desigBulkRows = [];

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
document.getElementById("desigBulkDownloadTemplate").addEventListener("click", () => {
  const csv = DESIG_BULK_HEADERS.map(csvEscape).join(",");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "bulk-designation-template.csv");
});

function resetDesigBulkPanel() {
  desigBulkRows = [];
  document.getElementById("desigBulkFileInput").value = "";
  document.getElementById("desigBulkFileName").textContent = "";
  document.getElementById("desigBulkPreviewWrap").hidden = true;
  document.getElementById("desigBulkResultsWrap").hidden = true;
  desigBulkCreateBtn.disabled = true;
  desigBulkCreateBtn.textContent = "Add Designations";
}

// Reports To Name must already exist (a real designation for "officer", a
// real office for "office") — never another row in the same file, kept
// simple and predictable rather than resolving cross-row references.
function validateDesigBulkRow(cells, seen) {
  const [levelRaw, title, code, reportTypeRaw, reportsToRaw, description] = [0, 1, 2, 3, 4, 5].map((i) => (cells[i] || "").trim());
  const errors = [];
  const minDesigLevel = scopeMinDesignationLevelIndex();
  const levelIndex = state.levels.findIndex((l) => l.toLowerCase() === levelRaw.toLowerCase());
  if (!levelRaw) errors.push("Level is required");
  else if (levelIndex === -1) errors.push(`Level "${levelRaw}" doesn't match this department's real levels`);
  else if (levelIndex < minDesigLevel) errors.push(`Level "${levelRaw}" is above what you're allowed to add`);
  if (!title) errors.push("Designation Title is required");

  const reportType = (reportTypeRaw || "none").toLowerCase();
  let reportsToId = null;
  let reportsTo = "Top Level";
  if (reportType !== "none" && reportType !== "officer" && reportType !== "office") {
    errors.push(`Reports To Type must be none, officer, or office — got "${reportTypeRaw}"`);
  } else if (reportType === "officer") {
    if (!reportsToRaw) errors.push("Reports To Name is required when Reports To Type is officer");
    else {
      const target = state.designations.find((d) => d.name.toLowerCase() === reportsToRaw.toLowerCase());
      if (!target) errors.push(`Designation "${reportsToRaw}" not found to report to`);
      else { reportsToId = target.id; reportsTo = target.name; }
    }
  } else if (reportType === "office") {
    if (!reportsToRaw) errors.push("Reports To Name is required when Reports To Type is office");
    else {
      const target = state.offices.find((o) => o.name.toLowerCase() === reportsToRaw.toLowerCase());
      if (!target) errors.push(`Office "${reportsToRaw}" not found to report to`);
      else { reportsToId = target.name; reportsTo = target.name; }
    }
  }

  // duplicate within this same file — same (level, title) pair twice
  const dupeKey = levelIndex >= 0 ? `${levelIndex}::${title.toLowerCase()}` : null;
  if (dupeKey && title) {
    if (seen.has(dupeKey)) errors.push("Duplicated in another row in this file");
    seen.add(dupeKey);
  }

  return { level: levelRaw, levelIndex, title, code, reportType, reportsToId, reportsTo, description, errors };
}

function renderDesigBulkPreview() {
  const body = document.getElementById("desigBulkPreviewBody");
  body.innerHTML = "";
  const validCount = desigBulkRows.filter((r) => !r.errors.length).length;
  desigBulkRows.forEach((r, i) => {
    const ok = !r.errors.length;
    const tr = document.createElement("tr");
    tr.className = ok ? "is-ok" : "is-error";
    tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(r.level)}</td><td>${escapeHtml(r.title)}</td><td>${escapeHtml(r.reportType === "none" ? "—" : r.reportsTo)}</td>
      <td>${ok ? '<span class="bulk-status is-ok"><span class="material-icons">check_circle</span>Ready</span>' : `<span class="bulk-status is-error"><span class="material-icons">error</span>${escapeHtml(r.errors.join("; "))}</span>`}</td>`;
    body.appendChild(tr);
  });
  document.getElementById("desigBulkPreviewSummary").innerHTML =
    `<span class="material-icons">description</span>${desigBulkRows.length} row${desigBulkRows.length === 1 ? "" : "s"} found — <strong>${validCount} ready</strong>, ${desigBulkRows.length - validCount} with errors`;
  document.getElementById("desigBulkPreviewWrap").hidden = false;
  document.getElementById("desigBulkResultsWrap").hidden = true;
  desigBulkCreateBtn.disabled = validCount === 0;
  desigBulkCreateBtn.textContent = `Add ${validCount} Designation${validCount === 1 ? "" : "s"}`;
}

document.getElementById("desigBulkFileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById("desigBulkFileName").textContent = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    const allRows = parseCsv(String(reader.result));
    if (!allRows.length) { desigBulkRows = []; renderDesigBulkPreview(); return; }
    const dataRows = allRows.slice(1);
    const seen = new Set();
    desigBulkRows = dataRows
      .filter((r) => r.some((cell) => (cell || "").trim()))
      .map((r) => validateDesigBulkRow(r, seen));
    renderDesigBulkPreview();
  };
  reader.readAsText(file);
});

desigBulkCreateBtn.addEventListener("click", () => {
  const valid = desigBulkRows.filter((r) => !r.errors.length);
  const failed = desigBulkRows.filter((r) => r.errors.length);
  valid.forEach((r) => {
    Store.addDeptDesignation(deptName, {
      name: r.title,
      code: r.code || "—",
      levelIndex: r.levelIndex,
      reportsToType: r.reportType,
      reportsToId: r.reportsToId,
      reportsTo: r.reportsTo,
      description: r.description,
    }, subDeptName);
  });
  state.designations = Store.visibleDeptDesignations(deptName, subDeptName);
  renderStats();
  renderDesigTable();

  document.getElementById("desigBulkResultsBanner").innerHTML =
    `<span class="material-icons">${failed.length ? "info" : "check_circle"}</span>` +
    `<strong>${valid.length} of ${desigBulkRows.length}</strong> designations added. ` +
    (failed.length ? `${failed.length} row${failed.length === 1 ? "" : "s"} need fixing and re-uploading.` : "All rows added successfully.");
  const failuresBody = document.getElementById("desigBulkFailuresBody");
  failuresBody.innerHTML = "";
  failed.forEach((r) => {
    const originalIndex = desigBulkRows.indexOf(r) + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${originalIndex}</td><td>${escapeHtml(r.title || "—")}</td><td>${escapeHtml(r.errors.join("; "))}</td>`;
    failuresBody.appendChild(tr);
  });
  document.getElementById("desigBulkPreviewWrap").hidden = true;
  document.getElementById("desigBulkResultsWrap").hidden = false;
  document.getElementById("desigBulkResultsWrap").querySelector(".bulk-preview-table-wrap").hidden = failed.length === 0;
  desigBulkCreateBtn.disabled = true;
  desigBulkCreateBtn.textContent = "Designations Added";
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
    state.designations = Store.visibleDeptDesignations(deptName, subDeptName);
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
