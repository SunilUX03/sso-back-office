// ============================================================
// TN SSO — Admin Logins (Super Admin only): onboarded departments
// + their admin logins. Built from real UX4G components
// (Card, Table, Badge, Input) — see ux4g-al-* rules in styles.css
// for the small amount of custom layout glue between them.
// ============================================================
function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

const kpiGrid = document.getElementById("kpiGrid");
const deptList = document.getElementById("deptList");
const pendingSection = document.getElementById("pendingSection");
const pendingList = document.getElementById("pendingList");
const pendingCountBadge = document.getElementById("pendingCountBadge");
let filterText = "";

function renderKpis() {
  const admins = Store.departmentAdmins();
  const active = admins.filter((a) => a.status === "active").length;
  const pending = admins.filter((a) => a.status === "pending").length;
  const inactive = admins.length - active - pending;
  kpiGrid.innerHTML = "";
  [
    { icon: "domain", number: String(Store.departments().length), label: "Departments" },
    { icon: "check_circle", number: String(active), label: "Active Admins" },
    { icon: "hourglass_top", number: String(pending), label: "Pending Admins" },
    { icon: "cancel", number: String(inactive), label: "Inactive Admins" },
  ].forEach((c) => {
    kpiGrid.appendChild(
      el(
        "article",
        "ux4g-card ux4g-card-outline ux4g-al-stat-card",
        `<div class="ux4g-card-body">
           <span class="ux4g-al-icon-tile"><span class="ux4g-icon-outlined" style="font-size:20px">${c.icon}</span></span>
           <div>
             <div class="ux4g-al-stat-number">${c.number}</div>
             <div class="ux4g-al-stat-label">${c.label}</div>
           </div>
         </div>`
      )
    );
  });
}

function renderDepartments() {
  deptList.innerHTML = "";
  Store.departmentAdmins()
    // Pending logins aren't "admin logins" yet — no one can sign in with
    // them until they're verified — so they live in their own section
    // below instead of this table.
    .filter((a) => a.status !== "pending")
    .filter((a) => a.dept.toLowerCase().includes(filterText.toLowerCase()) || a.name.toLowerCase().includes(filterText.toLowerCase()))
    .forEach((a) => {
      const isActive = a.status === "active";
      const deptLabel = a.code ? `${a.dept} (${a.code})` : a.dept;
      const row = el(
        "tr",
        null,
        `<td><span class="ux4g-al-dept-name">${deptLabel}</span></td>
         <td>${a.name}</td>
         <td><span class="ux4g-al-contact">${a.email}<br />${a.mobile}</span></td>
         <td>
           <span class="ux4g-al-status ${isActive ? "is-active" : "is-inactive"}">
             <span class="ux4g-badge-dot-${isActive ? "success" : "danger"}"></span>
             ${isActive ? "Active" : "Inactive"}
           </span>
         </td>
         <td>
           <div class="ux4g-al-row-actions">
             <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-sm" data-toggle-id="${a.id}" data-next="${isActive ? "deactivated" : "active"}">
               ${isActive ? "Deactivate" : "Activate"}
             </button>
             <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-sm" data-edit-id="${a.id}" aria-label="Edit ${a.dept}">
               <span class="ux4g-icon-outlined" style="font-size:15px">edit</span> Edit
             </button>
           </div>
         </td>`
      );
      deptList.appendChild(row);
    });
}

function renderPending() {
  const pending = Store.pendingDepartmentAdmins();
  pendingSection.hidden = pending.length === 0;
  pendingCountBadge.textContent = pending.length;
  pendingList.innerHTML = "";
  pending.forEach((a) => {
    const deptLabel = a.code ? `${a.dept} (${a.code})` : a.dept;
    const row = el(
      "tr",
      null,
      `<td><span class="ux4g-al-dept-name">${deptLabel}</span></td>
       <td>${a.name}</td>
       <td><span class="ux4g-al-contact">${a.email}<br />${a.mobile}</span></td>
       <td>
         <div class="ux4g-al-row-actions">
           <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-sm" data-resend-id="${a.id}">
             <span class="ux4g-icon-outlined" style="font-size:15px">forward_to_inbox</span> Resend Link
           </button>
           <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-sm" data-edit-id="${a.id}" aria-label="Edit ${a.dept}">
             <span class="ux4g-icon-outlined" style="font-size:15px">edit</span> Edit
           </button>
         </div>
       </td>`
    );
    pendingList.appendChild(row);
  });
}

function renderAll() {
  renderKpis();
  renderDepartments();
  renderPending();
}
renderAll();
Store.on(renderAll);

deptList.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest("[data-toggle-id]");
  if (toggleBtn) {
    Store.setDepartmentAdminStatus(Number(toggleBtn.dataset.toggleId), toggleBtn.dataset.next);
    return;
  }
  const editBtn = e.target.closest("[data-edit-id]");
  if (editBtn && window.openDepartmentWizard) {
    const record = Store.departmentAdmins().find((a) => a.id === Number(editBtn.dataset.editId));
    if (record) window.openDepartmentWizard(record);
  }
});

pendingList.addEventListener("click", (e) => {
  const resendBtn = e.target.closest("[data-resend-id]");
  if (resendBtn) {
    Store.resendVerification("admin", Number(resendBtn.dataset.resendId));
    resendBtn.innerHTML = '<span class="ux4g-icon-outlined" style="font-size:15px">check</span> Link Resent';
    setTimeout(renderAll, 1200);
    return;
  }
  const editBtn = e.target.closest("[data-edit-id]");
  if (editBtn && window.openDepartmentWizard) {
    const record = Store.departmentAdmins().find((a) => a.id === Number(editBtn.dataset.editId));
    if (record) window.openDepartmentWizard(record);
  }
});

const deptSearch = document.getElementById("deptSearch");
if (deptSearch) {
  deptSearch.addEventListener("input", (e) => {
    filterText = e.target.value;
    renderDepartments();
  });
}
