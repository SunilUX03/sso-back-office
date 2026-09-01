// ============================================================
// TN SSO — Reports & Export (Super Admin only).
// Picks a Store-backed dataset, previews it in a UX4G table,
// and exports the current view as CSV (real file download) or
// PDF (browser print-to-PDF, same pattern as Hierarchy Map's
// Download Map).
// ============================================================
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

const DATASETS = {
  departments: {
    label: "Departments",
    columns: ["Department", "Code", "Admin", "Email", "Mobile", "Status"],
    rows() {
      return Store.departmentAdmins().map((a) => [
        a.dept, a.code || "—", a.name, a.email, a.mobile,
        a.status === "active" ? "Active" : "Inactive",
      ]);
    },
  },
  jurisdictions: {
    label: "Jurisdictions",
    columns: ["Name", "Level", "Reports To", "Sub Offices"],
    rows() {
      return Store.offices().map((o) => [
        o.name, Store.levels[o.levelIndex] || "—", o.reportsTo || "—", String(o.subCount ?? "—"),
      ]);
    },
  },
  designations: {
    label: "Designations",
    columns: ["Name", "Code", "Level", "Reports To"],
    rows() {
      return Store.designations().map((d) => [
        d.name, d.code || "—", Store.levels[d.levelIndex] || "—", d.reportsTo || "—",
      ]);
    },
  },
  officers: {
    label: "Officers",
    columns: ["Name", "Role", "Department", "Sub Department", "Jurisdiction", "Mobile", "Email", "Status"],
    rows() {
      return Store.officers().map((o) => [
        o.name, o.role, o.dept, o.subDept, o.jurisdiction, o.mobile, o.email,
        o.status === "active" ? "Active" : "Deactivated",
      ]);
    },
  },
};

let currentDataset = "departments";
let filterText = "";

const reportHead = document.getElementById("reportHead");
const reportBody = document.getElementById("reportBody");
const reportCount = document.getElementById("reportCount");

function currentRows() {
  const ds = DATASETS[currentDataset];
  const rows = ds.rows();
  if (!filterText) return rows;
  const q = filterText.toLowerCase();
  return rows.filter((row) => row.some((cell) => String(cell).toLowerCase().includes(q)));
}

function render() {
  const ds = DATASETS[currentDataset];
  reportHead.innerHTML = `<tr>${ds.columns.map((c) => `<th><div class="ux4g-table-th-content">${esc(c)}</div></th>`).join("")}</tr>`;
  const rows = currentRows();
  reportBody.innerHTML = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`)
    .join("");
  reportCount.textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;
}
render();
Store.on(render);

// ---- Dataset tabs ----
document.querySelectorAll("#datasetTabs .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("#datasetTabs .tab").forEach((t) => {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    currentDataset = tab.dataset.dataset;
    render();
  });
});

// ---- Search ----
document.getElementById("reportSearch").addEventListener("input", (e) => {
  filterText = e.target.value;
  render();
});

// ---- CSV export ----
function toCsvValue(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
document.getElementById("exportCsv").addEventListener("click", () => {
  const ds = DATASETS[currentDataset];
  const lines = [ds.columns.map(toCsvValue).join(",")];
  currentRows().forEach((row) => lines.push(row.map(toCsvValue).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tn-sso-${currentDataset}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// ---- PDF export (browser print-to-PDF, same pattern as Hierarchy Map) ----
document.getElementById("exportPdf").addEventListener("click", () => window.print());
