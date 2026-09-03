// ============================================================
// TN SSO — Shared, sitewide: reflects whoever is actually signed
// in (Super Admin or a Department Admin) into the org-switcher
// chip in the header, and clears the session on Sign Out. Loaded
// on every page, right after store.js.
// ============================================================
(function () {
  function applyIdentity() {
    const scope = Store.myScope();
    const nameEl = document.querySelector(".org-name");
    if (!nameEl) return;
    if (scope.role === "dept-admin") {
      const admin = Store.departmentAdmins().find((a) => a.dept === scope.dept && (a.subDept || "") === scope.subDept && (a.office || "") === scope.office) || null;
      const roleLabel = scope.office ? "Jurisdiction Admin" : scope.subDept ? "Sub-Department Admin" : "Department Admin";
      nameEl.textContent = admin ? admin.name : roleLabel;
      nameEl.title = scope.office
        ? `${roleLabel} — ${scope.office}, ${scope.dept}`
        : scope.subDept
        ? `${roleLabel} — ${scope.subDept}, ${scope.dept}`
        : `${roleLabel} — ${scope.dept}`;
    } else {
      const p = Store.superAdmin();
      nameEl.textContent = p.name;
      nameEl.removeAttribute("title");
    }
  }
  // Structural, department-directory-wide actions (renaming/creating real
  // departments and sub-departments) stay Super Admin only — a Department
  // Admin is scoped to editing content within their own department, not
  // the directory of departments itself.
  function applySuperAdminOnly() {
    const isSuperAdmin = Store.myScope().role === "super-admin";
    document.querySelectorAll("[data-super-admin-only]").forEach((el) => {
      el.style.display = isSuperAdmin ? "" : "none";
    });
  }
  applySuperAdminOnly();

  // Applications are registered at department/sub-department granularity
  // only — nothing in the data model ties one to a specific jurisdiction
  // office — so App Management doesn't apply once an admin is scoped down
  // to an office (Tier 3+).
  function applyOfficeScopeHide() {
    const isOfficeScoped = Store.myScope().role === "dept-admin" && !!Store.myScope().office;
    document.querySelectorAll("[data-office-scope-hide]").forEach((el) => {
      el.style.display = isOfficeScoped ? "none" : "";
    });
  }
  applyOfficeScopeHide();

  applyIdentity();
  Store.on(applyIdentity);

  // Sign Out clears the session before handing off to the Login page —
  // otherwise the next page load would still think someone's signed in.
  document.querySelectorAll('a[href="login.html"]').forEach((link) => {
    link.addEventListener("click", () => Store.clearSession());
  });
})();
