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
    .filter((a) => a.dept.toLowerCase().includes(filterText.toLowerCase()) || a.name.toLowerCase().includes(filterText.toLowerCase()))
    .forEach((a) => {
      const isActive = a.status === "active";
      const row = el(
        "tr",
        null,
        `<td><span class="ux4g-al-dept-name">${a.dept}</span></td>
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
             <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-sm" data-toggle-id="${a.id}" data-next="${isActive ? "inactive" : "active"}">
               ${isActive ? "Deactivate" : "Activate"}
             </button>
             <a href="jurisdiction.html" aria-label="Manage ${a.dept}" style="display:inline-flex"><span class="ux4g-icon-outlined" style="font-size:18px">arrow_forward</span></a>
           </div>
         </td>`
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
