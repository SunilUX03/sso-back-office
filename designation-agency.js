// ============================================================
// TN SSO — Designations (Tamil Nadu e-Governance Agency)
// ============================================================
// Levels, offices and designations come from the shared Store
// (persisted + shared with the Jurisdiction module). Levels and
// designations are live references; offices is refreshed on open.
const state = {
  levels: Store.levels,
  offices: Store.officeNames(),
  designations: Store.designations(),
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
function makeOption(value, text, disabled = false, selected = false) {
  const opt = el("option");
  opt.value = value;
  opt.textContent = text;
  if (disabled) opt.disabled = true;
  if (selected) opt.selected = true;
  return opt;
}

// ============================================================
// Tab switcher (navigate if data-href, else toggle)
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
  const trigger = e.target.closest('[data-open="designation"]');
  if (trigger) openDesignation();
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
// Add Designation modal
// ============================================================
const dTitle = document.getElementById("dTitle");
const dLevel = document.getElementById("dLevel");
const dCode = document.getElementById("dCode");
const dOfficer = document.getElementById("dOfficer");
const dOffice = document.getElementById("dOffice");
const dDesc = document.getElementById("dDesc");
const reportsOfficerField = document.getElementById("reportsOfficerField");
const reportsOfficeField = document.getElementById("reportsOfficeField");
const reportingSeg = document.getElementById("reportingSeg");
let reportType = "none";

function openDesignation() {
  // refresh shared data (levels/offices may have changed in Jurisdiction)
  state.levels = Store.levels;
  state.offices = Store.officeNames();
  // Jurisdiction Level options
  dLevel.innerHTML = "";
  dLevel.appendChild(makeOption("", "Select a Level", true, true));
  state.levels.forEach((lvl, i) => dLevel.appendChild(makeOption(String(i), lvl)));

  // Reports-to-Designation options (existing designations)
  dOfficer.innerHTML = "";
  dOfficer.appendChild(makeOption("", "Select Designation", true, true));
  state.designations.forEach((d) => dOfficer.appendChild(makeOption(String(d.id), d.name)));

  // Reports-to-Office options
  dOffice.innerHTML = "";
  dOffice.appendChild(makeOption("", "Select Office", true, true));
  state.offices.forEach((o) => dOffice.appendChild(makeOption(o, o)));

  dTitle.value = "";
  dCode.value = "";
  dDesc.value = "";
  setReportType("none");
  openModal(designationModal);
}

function setReportType(type) {
  reportType = type;
  reportingSeg.querySelectorAll(".seg-btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.report === type);
  });
  reportsOfficerField.hidden = type !== "officer";
  reportsOfficeField.hidden = type !== "office";
}

reportingSeg.querySelectorAll(".seg-btn").forEach((b) =>
  b.addEventListener("click", () => setReportType(b.dataset.report))
);

document.getElementById("addDesignationBtn").addEventListener("click", () => {
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
  if (reportType === "officer") {
    if (!dOfficer.value) {
      alert("Please select the Designation this role reports to.");
      return;
    }
    reportsTo = state.designations.find((d) => d.id === Number(dOfficer.value))?.name || "—";
  } else if (reportType === "office") {
    if (!dOffice.value) {
      alert("Please select the Office this role reports to.");
      return;
    }
    reportsTo = dOffice.value;
  }

  Store.addDesignation({
    name: dTitle.value.trim(),
    code: dCode.value.trim() || "—",
    levelIndex: Number(dLevel.value),
    reportsTo,
    description: dDesc.value.trim(),
  });
  state.designations = Store.designations();
  renderDesigTable();
  closeModal(designationModal);
});

// ============================================================
// Designations table
// ============================================================
const desigTable = document.getElementById("desigTable");
const desigHead = desigTable.querySelector(".table-head");
const desigEmpty = desigTable.querySelector(".table-empty");

function renderDesigTable() {
  let rowsWrap = desigTable.querySelector(".table-rows");
  if (state.designations.length === 0) {
    if (rowsWrap) rowsWrap.remove();
    desigHead.style.display = "none";
    desigEmpty.style.display = "";
    desigTable.classList.add("is-empty");
    return;
  }
  desigTable.classList.remove("is-empty");
  desigHead.style.display = "";
  desigEmpty.style.display = "none";
  if (!rowsWrap) {
    rowsWrap = el("div", "table-rows");
    desigTable.appendChild(rowsWrap);
  }
  rowsWrap.innerHTML = "";
  state.designations.forEach((d) => {
    const levelName = state.levels[d.levelIndex] || "—";
    const row = el("div", "table-row");
    row.innerHTML = `
      <span><input type="checkbox" class="table-checkbox" aria-label="Select row" /></span>
      <span class="table-cell cell-name">${escapeHtml(d.name)}</span>
      <span class="table-cell">${escapeHtml(d.code)}</span>
      <span><span class="chip level-chip">${escapeHtml(levelName)}</span></span>
      <span class="table-cell">${escapeHtml(d.reportsTo)}</span>
      <span class="row-actions">
        <button class="row-action act-edit" aria-label="Edit designation"><span class="material-icons">edit</span></button>
        <button class="row-action act-del" aria-label="Delete designation" data-del="${d.id}"><span class="material-icons">delete</span></button>
      </span>`;
    rowsWrap.appendChild(row);
  });
  rowsWrap.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = Number(b.dataset.del);
      Store.removeDesignation(id);
      state.designations = Store.designations();
      renderDesigTable();
    })
  );
}

// ============================================================
// Initial render
// ============================================================
renderDesigTable();
