// ============================================================
// TN SSO — Reports (Super Admin only).
// Instead of a fixed set of report types, this exposes every real
// data set the system tracks as something the admin can pick and
// choose from — since there's no way to predict every report
// someone might eventually want, the flexible move is to let them
// combine whichever raw data sets they actually need.
// ============================================================
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Flattens every department × sub-department (including the General /
// department-level bucket) into one iterator — used by the Jurisdiction
// Offices and Designations data sets below, so they reflect the real
// 75-department directory instead of a stale, unrelated seed list.
function forEachDeptSubDept(fn) {
  Store.allDepartments().forEach((dept) => {
    fn(dept, "");
    Store.allSubDepartments(dept).forEach((sub) => fn(dept, sub));
  });
}

const DATASETS = {
  departments: {
    label: "Departments & Sub-Departments",
    icon: "domain",
    description: "The full department and sub-department directory.",
    columns: ["Department", "Sub-Department", "Status"],
    rows() {
      const rows = [];
      Store.allDepartments().forEach((dept) => {
        rows.push([dept, "General / Department-Level", "Active"]);
        Store.allSubDepartments(dept).forEach((sub) => rows.push([dept, sub, "Active"]));
      });
      return rows;
    },
  },
  jurisdictions: {
    label: "Jurisdiction Offices",
    icon: "account_tree",
    description: "Every configured jurisdiction office, by department.",
    columns: ["Department", "Sub-Department", "Office", "Level", "Reports To"],
    rows() {
      const rows = [];
      forEachDeptSubDept((dept, sub) => {
        const levels = Store.deptLevels(dept, sub);
        Store.deptOffices(dept, sub).forEach((o) => {
          rows.push([dept, sub || "General", o.name, levels[o.levelIndex] || "—", o.reportsTo || "—"]);
        });
      });
      return rows;
    },
  },
  designations: {
    label: "Designations",
    icon: "badge",
    description: "Every configured designation, by department.",
    columns: ["Department", "Sub-Department", "Designation", "Short Code"],
    rows() {
      const rows = [];
      forEachDeptSubDept((dept, sub) => {
        Store.deptDesignations(dept, sub).forEach((d) => {
          rows.push([dept, sub || "General", d.name, d.code || "—"]);
        });
      });
      return rows;
    },
  },
  officers: {
    label: "Officers (Users)",
    icon: "group",
    description: "Every officer account, active, deactivated, or pending.",
    columns: ["Name", "Designation", "Department", "Sub-Department", "Jurisdiction", "Mobile", "Email", "Status"],
    rows() {
      return Store.officers().map((o) => [
        o.name, o.role || o.designation || "—", o.dept || "—", o.subDept || "—", o.jurisdiction || "—",
        o.mobile || "—", o.email || "—",
        o.status === "active" ? "Active" : o.status === "pending" ? "Pending" : "Deactivated",
      ]);
    },
  },
  adminLogins: {
    label: "Admin Logins",
    icon: "admin_panel_settings",
    description: "Department admin accounts and their status.",
    columns: ["Department", "Admin Name", "Email", "Mobile", "Status"],
    rows() {
      return Store.departmentAdmins().map((a) => [
        a.dept, a.name, a.email, a.mobile,
        a.status === "active" ? "Active" : a.status === "pending" ? "Pending" : "Deactivated",
      ]);
    },
  },
  applications: {
    label: "Applications",
    icon: "apps",
    description: "Every registered application across all departments.",
    columns: ["Application", "Department", "Sub-Department", "Type", "Audience", "Status"],
    rows() {
      return Store.applications().map((a) => [
        a.name, a.dept, a.subDept || "General", a.type,
        a.audience === "public" ? "General Public" : a.audience === "both" ? "Both Officers & Public" : "Government Officers",
        a.status === "active" ? "Active" : "Inactive",
      ]);
    },
  },
  pending: {
    label: "Pending Accounts",
    icon: "hourglass_empty",
    description: "Officer and admin accounts still awaiting verification.",
    columns: ["Name", "Account Type", "Department", "Contact"],
    rows() {
      const officers = (Store.pendingOfficers ? Store.pendingOfficers() : []).map((o) => [o.name, "Officer", o.dept || "—", o.email || o.mobile || "—"]);
      const admins = (Store.pendingDepartmentAdmins ? Store.pendingDepartmentAdmins() : []).map((a) => [a.name, "Admin Login", a.dept || "—", a.email || a.mobile || "—"]);
      return officers.concat(admins);
    },
  },
};

const selected = new Set();

function selectedKeys() {
  return Object.keys(DATASETS).filter((k) => selected.has(k));
}

// ---- Catalog ----
const catalogEl = document.getElementById("datasetCatalog");
function renderCatalog() {
  catalogEl.innerHTML = Object.keys(DATASETS)
    .map((key) => {
      const ds = DATASETS[key];
      const count = ds.rows().length;
      return `
      <label class="dataset-row">
        <input type="checkbox" data-dataset-key="${key}" ${selected.has(key) ? "checked" : ""} />
        <span class="dataset-row-icon"><span class="material-icons">${esc(ds.icon)}</span></span>
        <span class="dataset-row-info">
          <span class="dataset-row-title">${esc(ds.label)}</span>
          <span class="dataset-row-desc">${esc(ds.description)}</span>
        </span>
        <span class="count-badge">${count}</span>
      </label>`;
    })
    .join("");
  catalogEl.querySelectorAll("input[data-dataset-key]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) selected.add(cb.dataset.datasetKey);
      else selected.delete(cb.dataset.datasetKey);
      renderAll();
    });
  });
}

// ---- Preview (also the PDF print source) ----
const previewSection = document.getElementById("previewSection");
const previewList = document.getElementById("previewList");
function renderPreview() {
  const keys = selectedKeys();
  previewSection.hidden = keys.length === 0;
  previewList.innerHTML = keys
    .map((key) => {
      const ds = DATASETS[key];
      const rows = ds.rows();
      return `
      <div class="preview-block">
        <h3 class="subsection-title">${esc(ds.label)} <span class="count-badge">${rows.length}</span></h3>
        <div class="ux4g-al-table-wrap">
          <table class="ux4g-table ux4g-table-rounded ux4g-table-m">
            <thead><tr>${ds.columns.map((c) => `<th><div class="ux4g-table-th-content">${esc(c)}</div></th>`).join("")}</tr></thead>
            <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>
      </div>`;
    })
    .join("");
}

// ---- Selection summary + export button state ----
const selectedCountBadge = document.getElementById("selectedCountBadge");
const exportCsvBtn = document.getElementById("exportCsv");
const exportPdfBtn = document.getElementById("exportPdf");
function renderSummary() {
  const keys = selectedKeys();
  const totalRecords = keys.reduce((sum, k) => sum + DATASETS[k].rows().length, 0);
  selectedCountBadge.textContent = keys.length
    ? `${keys.length} selected · ${totalRecords} record${totalRecords === 1 ? "" : "s"}`
    : "0 selected";
  exportCsvBtn.disabled = keys.length === 0;
  exportPdfBtn.disabled = keys.length === 0;
}

function renderAll() {
  renderCatalog();
  renderPreview();
  renderSummary();
}
renderAll();
Store.on(renderAll);

// ---- Select All ----
document.getElementById("selectAllBtn").addEventListener("click", () => {
  const allSelected = selected.size === Object.keys(DATASETS).length;
  selected.clear();
  if (!allSelected) Object.keys(DATASETS).forEach((k) => selected.add(k));
  renderAll();
});

// ---- CSV export: one file per selected data set ----
function toCsvValue(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCsv(ds, key) {
  const lines = [ds.columns.map(toCsvValue).join(",")];
  ds.rows().forEach((row) => lines.push(row.map(toCsvValue).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tn-sso-${key}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
exportCsvBtn.addEventListener("click", () => {
  selectedKeys().forEach((key) => downloadCsv(DATASETS[key], key));
});

// ---- PDF export: the Preview section becomes the printed page,
// combining every selected data set into one document (browser
// print-to-PDF, same pattern as Hierarchy Map's Download Map). ----
exportPdfBtn.addEventListener("click", () => window.print());
