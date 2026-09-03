// ============================================================
// TN SSO — Edit Dept & Sub Dept Names. Manages the real
// department / sub-department directory (Store.allDepartments /
// Store.allSubDepartments) used across Jurisdiction Management,
// Designation Management and Hierarchy Map: add, rename, and
// password-gated deactivate/reactivate. Kept entirely separate
// from Admin Logins' "Create Admin Login" flow — this page only
// manages names, never admin accounts.
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

// Super Admin only — renaming/creating real departments and sub-departments
// isn't something a Department Admin is scoped to do.
if (Store.myScope().role !== "super-admin") {
  window.location.replace("index.html");
}

let deptFilter = "";
let statusFilterValue = "all";
const expandedDepts = new Set();

// ============================================================
// Overview tiles
// ============================================================
function renderOverview() {
  const records = Store.allDepartmentRecords();
  const active = records.filter((d) => d.status === "active").length;
  const deactivated = records.length - active;
  const tiles = [
    { icon: "domain", value: records.length, label: "Total Departments" },
    { icon: "check_circle", value: active, label: "Active" },
    { icon: "block", value: deactivated, label: "Deactivated" },
  ];
  document.getElementById("overviewTiles").innerHTML = tiles
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

// ============================================================
// Filtering
// ============================================================
function subDeptMatchesSearch(sub) {
  return !deptFilter || sub.name.toLowerCase().includes(deptFilter.toLowerCase());
}
function deptMatchesSearch(dept) {
  if (!deptFilter) return true;
  const q = deptFilter.toLowerCase();
  if (dept.name.toLowerCase().includes(q)) return true;
  return Store.allSubDepartmentRecords(dept.name).some((s) => subDeptMatchesSearch(s));
}
// A department shows under a status filter if IT has that status, or any
// of its sub-departments do — so a deactivated sub-department under an
// otherwise-active department is still reachable to reactivate.
function deptMatchesStatusFilter(dept) {
  if (statusFilterValue === "all") return true;
  const subs = Store.allSubDepartmentRecords(dept.name);
  return dept.status === statusFilterValue || subs.some((s) => s.status === statusFilterValue);
}
function subDeptsToShow(deptName) {
  let subs = Store.allSubDepartmentRecords(deptName);
  if (deptFilter) {
    const q = deptFilter.toLowerCase();
    const deptItselfMatches = deptName.toLowerCase().includes(q);
    if (!deptItselfMatches) subs = subs.filter((s) => subDeptMatchesSearch(s));
  }
  if (statusFilterValue !== "all") subs = subs.filter((s) => s.status === statusFilterValue);
  return subs;
}

// ============================================================
// Render
// ============================================================
const deptList = document.getElementById("deptList");
const deptCountBadge = document.getElementById("deptCountBadge");

function statusBadge(status) {
  return status === "active"
    ? `<span class="ux4g-dd-status-badge is-active">Active</span>`
    : `<span class="ux4g-dd-status-badge is-deactivated">Deactivated</span>`;
}
function statusIcon(status) {
  return status === "active" ? "block" : "check_circle";
}
function statusActionTitle(status) {
  return status === "active" ? "Deactivate" : "Reactivate";
}

function renderList() {
  const records = Store.allDepartmentRecords().filter(
    (d) => deptMatchesSearch(d) && deptMatchesStatusFilter(d)
  );
  deptCountBadge.textContent = records.length;

  if (!records.length) {
    deptList.innerHTML = `<div class="empty-list">No departments match your search or filter.</div>`;
    return;
  }

  deptList.innerHTML = "";
  records.forEach((dept) => {
    const subs = subDeptsToShow(dept.name);
    const isExpanded = expandedDepts.has(dept.name) || (!!deptFilter && subs.length > 0 && !dept.name.toLowerCase().includes(deptFilter.toLowerCase()));
    const allSubs = Store.allSubDepartmentRecords(dept.name);

    const card = el("article", "ux4g-dd-dept-card");
    card.innerHTML = `
      <div class="ux4g-dd-dept-row">
        <button class="ux4g-dd-expand-btn${isExpanded ? " is-expanded" : ""}" data-action="toggle-expand" ${allSubs.length ? "" : "disabled"} aria-label="Expand">
          <span class="material-icons">chevron_right</span>
        </button>
        <span class="ux4g-dd-dept-name">${escapeHtml(dept.name)}</span>
        ${statusBadge(dept.status)}
        <span class="ux4g-dd-subdept-summary">${allSubs.length} sub-department${allSubs.length === 1 ? "" : "s"}</span>
        <div class="ux4g-dd-actions">
          <button data-action="edit-dept" title="Edit"><span class="material-icons">edit</span></button>
          <button data-action="toggle-dept-status" title="${statusActionTitle(dept.status)}"><span class="material-icons">${statusIcon(dept.status)}</span></button>
          <button data-action="add-subdept" title="Add sub-department"><span class="material-icons">add</span></button>
        </div>
      </div>
      <div class="ux4g-dd-subdept-list" ${isExpanded ? "" : "hidden"}>
        ${
          subs.length
            ? subs
                .map(
                  (s) => `
              <div class="ux4g-dd-subdept-row">
                <span class="ux4g-dd-subdept-name">${escapeHtml(s.name)}</span>
                ${statusBadge(s.status)}
                <div class="ux4g-dd-actions">
                  <button data-action="edit-subdept" data-sub="${escapeHtml(s.name)}" title="Edit"><span class="material-icons">edit</span></button>
                  <button data-action="toggle-subdept-status" data-sub="${escapeHtml(s.name)}" title="${statusActionTitle(s.status)}"><span class="material-icons">${statusIcon(s.status)}</span></button>
                </div>
              </div>`
                )
                .join("")
            : `<div class="ux4g-dd-subdept-empty">No sub-departments${deptFilter || statusFilterValue !== "all" ? " match your search or filter" : " yet"}.</div>`
        }
      </div>`;
    card.dataset.dept = dept.name;
    deptList.appendChild(card);
  });
}

function renderAll() {
  renderOverview();
  renderList();
}
renderAll();
Store.on(renderAll);

// ============================================================
// Search + status filter
// ============================================================
document.getElementById("deptSearch").addEventListener("input", (e) => {
  deptFilter = e.target.value;
  renderList();
});
document.querySelectorAll("#statusFilter .ux4g-jm-config-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    statusFilterValue = btn.dataset.filter;
    document.querySelectorAll("#statusFilter .ux4g-jm-config-btn").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });
    renderList();
  });
});

// ============================================================
// Expand / collapse + row actions (delegated)
// ============================================================
deptList.addEventListener("click", (e) => {
  const card = e.target.closest(".ux4g-dd-dept-card");
  if (!card) return;
  const deptName = card.dataset.dept;
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "toggle-expand") {
    if (expandedDepts.has(deptName)) expandedDepts.delete(deptName);
    else expandedDepts.add(deptName);
    renderList();
  } else if (action === "edit-dept") {
    openDeptModal(deptName);
  } else if (action === "add-subdept") {
    openSubDeptModal(deptName, null);
  } else if (action === "edit-subdept") {
    openSubDeptModal(deptName, btn.dataset.sub);
  } else if (action === "toggle-dept-status") {
    const record = Store.allDepartmentRecords().find((d) => d.name === deptName);
    if (record.status === "active") {
      openDeactivateModal({ type: "dept", dept: deptName, label: deptName });
    } else {
      Store.setDirectoryDepartmentStatus(deptName, "active");
    }
  } else if (action === "toggle-subdept-status") {
    const subName = btn.dataset.sub;
    const record = Store.allSubDepartmentRecords(deptName).find((s) => s.name === subName);
    if (record.status === "active") {
      openDeactivateModal({ type: "subdept", dept: deptName, sub: subName, label: subName });
    } else {
      Store.setDirectorySubDepartmentStatus(deptName, subName, "active");
    }
  }
});

// ============================================================
// Modal plumbing
// ============================================================
function openModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal(modal) {
  modal.hidden = true;
  document.body.style.overflow = "";
}
[document.getElementById("deptModal"), document.getElementById("subDeptModal"), document.getElementById("deactivateModal")].forEach((modal) => {
  modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal(modal)));
  modal.addEventListener("mousedown", (e) => { if (e.target === modal) closeModal(modal); });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  [document.getElementById("deptModal"), document.getElementById("subDeptModal"), document.getElementById("deactivateModal")].forEach((modal) => {
    if (!modal.hidden) closeModal(modal);
  });
});

// ============================================================
// Add / Edit Department
// ============================================================
document.getElementById("addDeptBtn").addEventListener("click", () => openDeptModal(null));
const deptModal = document.getElementById("deptModal");
const deptModalTitle = document.getElementById("deptModalTitle");
const deptNameInput = document.getElementById("deptNameInput");
const saveDeptBtn = document.getElementById("saveDeptBtn");
let editingDept = null;

function openDeptModal(existingName) {
  editingDept = existingName;
  if (existingName) {
    deptModalTitle.textContent = "Edit Department Name";
    saveDeptBtn.textContent = "Save Changes";
    deptNameInput.value = existingName;
  } else {
    deptModalTitle.textContent = "Add Department";
    saveDeptBtn.textContent = "Add Department";
    deptNameInput.value = "";
  }
  openModal(deptModal);
  deptNameInput.focus();
}
saveDeptBtn.addEventListener("click", () => {
  const name = deptNameInput.value.trim();
  if (!name) {
    alert("Please enter a department name.");
    return;
  }
  if (editingDept) {
    if (name !== editingDept && Store.directoryDepartmentExists(name)) {
      alert(`"${name}" already exists.`);
      return;
    }
    Store.renameDirectoryDepartment(editingDept, name);
  } else {
    if (Store.directoryDepartmentExists(name)) {
      alert(`"${name}" already exists.`);
      return;
    }
    Store.addDirectoryDepartment(name);
    expandedDepts.add(name);
  }
  closeModal(deptModal);
});

// ============================================================
// Add / Edit Sub-Department
// ============================================================
const subDeptModal = document.getElementById("subDeptModal");
const subDeptModalTitle = document.getElementById("subDeptModalTitle");
const subDeptModalSubtitle = document.getElementById("subDeptModalSubtitle");
const subDeptNameInput = document.getElementById("subDeptNameInput");
const saveSubDeptBtn = document.getElementById("saveSubDeptBtn");
let subDeptTargetDept = null;
let editingSubDept = null;

function openSubDeptModal(deptName, existingSubName) {
  subDeptTargetDept = deptName;
  editingSubDept = existingSubName;
  subDeptModalSubtitle.textContent = `Under ${deptName}`;
  if (existingSubName) {
    subDeptModalTitle.textContent = "Edit Sub-Department Name";
    saveSubDeptBtn.textContent = "Save Changes";
    subDeptNameInput.value = existingSubName;
  } else {
    subDeptModalTitle.textContent = "Add Sub-Department";
    saveSubDeptBtn.textContent = "Add Sub-Department";
    subDeptNameInput.value = "";
  }
  openModal(subDeptModal);
  subDeptNameInput.focus();
}
saveSubDeptBtn.addEventListener("click", () => {
  const name = subDeptNameInput.value.trim();
  if (!name) {
    alert("Please enter a sub-department name.");
    return;
  }
  if (editingSubDept) {
    if (name !== editingSubDept && Store.directorySubDepartmentExists(subDeptTargetDept, name)) {
      alert(`"${name}" already exists under ${subDeptTargetDept}.`);
      return;
    }
    Store.renameDirectorySubDepartment(subDeptTargetDept, editingSubDept, name);
  } else {
    if (Store.directorySubDepartmentExists(subDeptTargetDept, name)) {
      alert(`"${name}" already exists under ${subDeptTargetDept}.`);
      return;
    }
    Store.addDirectorySubDepartment(subDeptTargetDept, name);
    expandedDepts.add(subDeptTargetDept);
  }
  closeModal(subDeptModal);
});

// ============================================================
// Deactivate (password-gated)
// ============================================================
const deactivateModal = document.getElementById("deactivateModal");
const deactivateModalTitle = document.getElementById("deactivateModalTitle");
const deactivateModalSubtitle = document.getElementById("deactivateModalSubtitle");
const deactivatePasswordInput = document.getElementById("deactivatePasswordInput");
const deactivatePasswordError = document.getElementById("deactivatePasswordError");
const confirmDeactivateBtn = document.getElementById("confirmDeactivateBtn");
let pendingDeactivate = null;

function openDeactivateModal(target) {
  pendingDeactivate = target;
  deactivateModalTitle.textContent = `Deactivate "${target.label}"`;
  deactivateModalSubtitle.textContent =
    target.type === "dept"
      ? "This hides the department (and its sub-departments) from every picker until it's reactivated. Its existing jurisdiction and designation records are kept, not deleted."
      : "This hides the sub-department from every picker until it's reactivated. Its existing jurisdiction and designation records are kept, not deleted.";
  deactivatePasswordInput.value = "";
  deactivatePasswordError.hidden = true;
  openModal(deactivateModal);
  deactivatePasswordInput.focus();
}
confirmDeactivateBtn.addEventListener("click", () => {
  const pw = deactivatePasswordInput.value;
  if (!Store.verifyAdminPassword(pw)) {
    deactivatePasswordError.hidden = false;
    deactivatePasswordInput.value = "";
    deactivatePasswordInput.focus();
    return;
  }
  if (pendingDeactivate.type === "dept") {
    Store.setDirectoryDepartmentStatus(pendingDeactivate.dept, "deactivated");
  } else {
    Store.setDirectorySubDepartmentStatus(pendingDeactivate.dept, pendingDeactivate.sub, "deactivated");
  }
  closeModal(deactivateModal);
});
deactivatePasswordInput.addEventListener("input", () => {
  deactivatePasswordError.hidden = true;
});
