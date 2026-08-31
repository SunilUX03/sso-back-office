// ============================================================
// TN SSO — Departments (Super Admin only): onboarded departments
// + their admin logins.
// ============================================================
function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

const kpiGrid = document.getElementById("kpiGrid");
const deptList = document.getElementById("deptList");
let filterText = "";

function renderKpis() {
  const admins = Store.departmentAdmins();
  const active = admins.filter((a) => a.status === "active").length;
  const inactive = admins.length - active;
  kpiGrid.innerHTML = "";
  [
    { icon: "domain", number: String(Store.departments().length), label: "Departments" },
    { icon: "check_circle", number: String(active), label: "Active Admins" },
    { icon: "cancel", number: String(inactive), label: "Inactive Admins" },
  ].forEach((c) => {
    kpiGrid.appendChild(
      el(
        "article",
        "kpi-card",
        `<span class="icon-badge"><span class="material-icons">${c.icon}</span></span>
         <div class="kpi-number">${c.number}</div>
         <div class="kpi-label">${c.label}</div>`
      )
    );
  });
}

function renderDepartments() {
  deptList.innerHTML = "";
  Store.departmentAdmins()
    .filter((a) => a.dept.toLowerCase().includes(filterText.toLowerCase()) || a.name.toLowerCase().includes(filterText.toLowerCase()))
    .forEach((a) => {
      const statusCls = a.status === "active" ? "is-active" : "is-inactive";
      const statusLabel = a.status === "active" ? "Active" : "Inactive";
      const row = el(
        "article",
        "dept-admin-row",
        `<div class="dept-admin-main">
           <span class="dept-badge"><img src="assets/imgIconBadge.svg" alt="" /></span>
           <div>
             <h3 class="dept-name">${a.dept}</h3>
             <p class="dept-admin-meta">Admin: ${a.name} &middot; ${a.email} &middot; ${a.mobile}</p>
           </div>
         </div>
         <div class="dept-admin-side">
           <span class="status-badge ${statusCls}">${statusLabel}</span>
           <button class="status-toggle-btn" data-toggle-id="${a.id}" data-next="${a.status === "active" ? "inactive" : "active"}">
             ${a.status === "active" ? "Deactivate" : "Activate"}
           </button>
           <a href="jurisdiction.html" class="kpi-external" aria-label="Manage ${a.dept}"><span class="material-icons">arrow_forward</span></a>
         </div>`
      );
      deptList.appendChild(row);
    });
}

function renderAll() {
  renderKpis();
  renderDepartments();
}
renderAll();
Store.on(renderAll);

deptList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-toggle-id]");
  if (!btn) return;
  Store.setDepartmentAdminStatus(Number(btn.dataset.toggleId), btn.dataset.next);
});

const deptSearch = document.getElementById("deptSearch");
if (deptSearch) {
  deptSearch.addEventListener("input", (e) => {
    filterText = e.target.value;
    renderDepartments();
  });
}
