// ============================================================
// TN SSO — Tamil Nadu e-Governance Agency : interactions
// ============================================================

// ---- Shared state ----
// Levels defined via "Define Hierarchy Structure" (index 0 = highest/top level).
// Seeded with the default Tamil Nadu hierarchy so the Jurisdiction Level
// dropdown is populated out of the box (these are editable in the modal).
// Levels + offices are owned by the shared Store (persisted to
// localStorage and shared with the Designation module). These are
// live references — Store mutates the arrays in place.
const state = {
  levels: Store.levels,
  offices: Store.offices(),
};

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

// ============================================================
// Tab switcher
// ============================================================
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

// ============================================================
// Pagination
// ============================================================
document.querySelectorAll(".page-nums .page-num").forEach((num) => {
  num.addEventListener("click", () => {
    document
      .querySelectorAll(".page-nums .page-num")
      .forEach((n) => n.classList.remove("is-active"));
    num.classList.add("is-active");
  });
});

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

// open triggers (delegated so dynamically-rendered buttons work too)
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-open]");
  if (!trigger) return;
  if (trigger.dataset.open === "hierarchy") openHierarchy();
  else if (trigger.dataset.open === "office") openOffice();
});

// close on [data-close], backdrop click, and Esc
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
let editLevels = []; // working copy while the modal is open
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

    // drag to reorder
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
  Store.setLevels(cleaned);
  state.levels = Store.levels;
  renderHierarchyCard();
  renderOfficeTable();
  closeModal(hierarchyModal);
});

// ============================================================
// "Your Hierarchy Structure" card (defined state with level chips)
// ============================================================
const hierarchyCard = document.getElementById("hierarchyCard");

function renderHierarchyCard() {
  if (!state.levels.length) {
    // empty state
    hierarchyCard.classList.remove("is-defined");
    hierarchyCard.innerHTML = `
      <div class="hierarchy-illustration"><img src="assets/imgImage6.png" alt="" /></div>
      <div class="hierarchy-text">
        <h3 class="hierarchy-title">No Hierarchy Structure</h3>
        <p class="hierarchy-desc">Define the administrative hierarchy used by your department by specifying each jurisdiction level in order (e.g., State → Division → District → Mandal → Village).</p>
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
        <h3 class="hier-card-title">Your Hierarchy Structure</h3>
        <button class="btn-edit-hier" data-open="hierarchy">
          <span class="material-icons">edit</span> Edit Hierarchy Structure
        </button>
      </div>
      <div class="hier-chips">${chips}</div>
    </div>`;
}

// ============================================================
// Add Jurisdiction Office modal
// ============================================================
const fLevel = document.getElementById("fLevel");
const fName = document.getElementById("fName");
const fParent = document.getElementById("fParent");
const fDesc = document.getElementById("fDesc");
const parentField = document.getElementById("parentField");

function openOffice() {
  // populate the level dropdown from the defined hierarchy levels
  fLevel.innerHTML = '<option value="" disabled selected>Select a Level</option>';
  state.levels.forEach((name, i) => {
    const opt = el("option");
    opt.value = String(i);
    opt.textContent = name;
    fLevel.appendChild(opt);
  });
  fName.value = "";
  fDesc.value = "";
  parentField.hidden = true;
  openModal(officeModal);
}

fLevel.addEventListener("change", () => {
  const levelIndex = Number(fLevel.value);
  // top level (or none) → no parent; otherwise show the parent picker
  if (Number.isNaN(levelIndex) || levelIndex <= 0) {
    parentField.hidden = true;
    return;
  }
  parentField.hidden = false;
  const parentIndex = levelIndex - 1;
  const parentLevelName = state.levels[parentIndex];
  const parentOffices = state.offices.filter((o) => o.levelIndex === parentIndex);

  fParent.innerHTML = "";
  if (parentOffices.length) {
    fParent.appendChild(makeOption("", "Select Parent office...", true, true));
    parentOffices.forEach((o) => fParent.appendChild(makeOption(String(o.id), o.name)));
    fParent.disabled = false;
  } else {
    // empty state, e.g. "No district offices yet - Add them first"
    fParent.appendChild(
      makeOption("", `No ${parentLevelName.toLowerCase()} offices yet - Add them first`, true, true)
    );
    fParent.disabled = true;
  }
});

document.getElementById("addOfficeBtn").addEventListener("click", () => {
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
  // parent required when a parent picker is shown AND parent offices exist
  if (!parentField.hidden && !fParent.disabled && !fParent.value) {
    alert("Please select a Parent Office.");
    return;
  }

  Store.addOffice({
    name: fName.value.trim(),
    levelIndex,
    parentId: !parentField.hidden && fParent.value ? Number(fParent.value) : null,
    description: fDesc.value.trim(),
  });
  state.offices = Store.offices();
  renderOfficeTable();
  closeModal(officeModal);
});

// ============================================================
// Office table render (replaces the empty state once offices exist)
// ============================================================
const jurTable = document.querySelector(".jur-table");
const tableEmpty = document.querySelector(".table-empty");
const countBadge = document.querySelector(".count-badge");

function renderOfficeTable() {
  let rowsWrap = jurTable.querySelector(".table-rows");
  if (state.offices.length === 0) {
    if (rowsWrap) rowsWrap.remove();
    tableEmpty.style.display = "";
    return;
  }
  tableEmpty.style.display = "none";
  if (!rowsWrap) {
    rowsWrap = el("div", "table-rows");
    jurTable.appendChild(rowsWrap);
  }
  rowsWrap.innerHTML = "";
  state.offices.forEach((o) => {
    const levelName = state.levels[o.levelIndex] || "—";
    const parent = o.parentId ? state.offices.find((p) => p.id === o.parentId) : null;
    const reportsTo = o.reportsTo != null ? o.reportsTo : parent ? parent.name : "—";
    const subCount =
      o.subCount != null ? o.subCount : state.offices.filter((p) => p.parentId === o.id).length;
    const row = el("div", "table-row");
    row.innerHTML = `
      <span><input type="checkbox" class="table-checkbox" aria-label="Select row" /></span>
      <span class="cell-name-wrap">
        <span class="table-cell cell-name">${escapeHtml(o.name)}</span>
        ${o.subLabel ? `<span class="cell-sub">${escapeHtml(o.subLabel)}</span>` : ""}
      </span>
      <span><span class="chip level-chip">${escapeHtml(levelName)}</span></span>
      <span class="table-cell">${escapeHtml(reportsTo)}</span>
      <span class="table-cell">${subCount} Sub jurisdiction offices</span>
      <span class="row-actions">
        <button class="row-action act-edit" aria-label="Edit office"><span class="material-icons">edit</span></button>
        <button class="row-action act-del" aria-label="Delete office" data-del="${o.id}"><span class="material-icons">delete</span></button>
      </span>`;
    rowsWrap.appendChild(row);
  });
  rowsWrap.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = Number(b.dataset.del);
      Store.removeOffice(id);
      state.offices = Store.offices();
      renderOfficeTable();
    })
  );
}

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
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s);
}

// ============================================================
// Initial render
// ============================================================
renderHierarchyCard();
renderOfficeTable();
