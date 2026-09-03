// ============================================================
// TN SSO — "Create Admin Login" wizard (Super Admin only) +
// success modal. Grants admin rights over a real department to an
// EXISTING, already-verified user — it doesn't create new logins
// itself. That's deliberate: Add New User (officer-modals.js) is the
// one place a login gets created, with its own duplicate-checking
// and pending/verification lifecycle — duplicating that form here
// would mean two different creation paths to keep in sync. Step 2's
// "Create a new user" banner hands off there instead, pre-filled with
// whatever Department was picked in Step 1.
// Step 1 picks the department (or a sub-department, for context
// only) from the real directory (Store.allDepartments /
// Store.allSubDepartments) rather than typing a new department
// name, since the department/sub-department directory itself is
// now managed separately on the Edit Dept & Sub Dept Names page.
// Built from real UX4G components (Modal, Button, Input, Badge) —
// see ux4g-al-* rules in styles.css for the small step-indicator
// glue between them.
// Exposes window.openDepartmentWizard(editRecord?). Open triggers:
// any element with [data-open="department"].
// Load AFTER store.js and BEFORE admin-logins.js.
// ============================================================
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---- inject markup ---------------------------------------
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <div class="ux4g-modal-backdrop ux4g-modal-backdrop-50" id="deptWizard">
    <div class="ux4g-modal">
      <div class="ux4g-modal-box ux4g-modal-l">
        <div class="ux4g-modal-header">
          <div class="ux4g-modal-header-title-content">
            <div>
              <div class="ux4g-modal-header-title" id="dwTitle">Create Admin Login</div>
              <div class="ux4g-modal-header-sub-heading" id="dwStepSub">Step 1 of 3 &middot; Select Department</div>
            </div>
          </div>
          <button class="ux4g-modal-close" data-dw-close aria-label="Close" type="button">
            <span class="ux4g-icon-outlined ux4g-modal-close-icon">close</span>
          </button>
        </div>

        <div class="ux4g-modal-body">
          <div class="ux4g-al-steps" id="dwStepper"></div>

          <!-- Step 1: Select Department -->
          <div class="ux4g-al-wizard-step" data-step="1">
            <p class="ux4g-al-step-intro">Which department is this login for?</p>
            <form class="ux4g-al-form-grid" onsubmit="return false">
              <div class="ux4g-al-field">
                <label class="ux4g-label-m-default">Department <span class="ux4g-al-req">*</span></label>
                <button type="button" class="ux4g-al-select" id="dwDeptTrigger">
                  <span class="ux4g-al-select-label is-placeholder" id="dwDeptTriggerLabel">Select a department</span>
                  <span class="ux4g-icon-outlined">expand_more</span>
                </button>
                <select class="ux4g-al-select-native" id="dwDept" required>
                  <option value="" disabled selected>Select a department</option>
                </select>
              </div>
              <div class="ux4g-al-field">
                <label class="ux4g-label-m-default">Sub-Department</label>
                <button type="button" class="ux4g-al-select" id="dwSubDeptTrigger" disabled>
                  <span class="ux4g-al-select-label is-placeholder" id="dwSubDeptTriggerLabel">Select a department first</span>
                  <span class="ux4g-icon-outlined">expand_more</span>
                </button>
                <select class="ux4g-al-select-native" id="dwSubDept" disabled>
                  <option value="">Select a department first</option>
                </select>
              </div>
            </form>
          </div>

          <!-- Step 2: User Details -->
          <div class="ux4g-al-wizard-step" data-step="2" hidden>
            <p class="ux4g-al-step-intro">Who will administer this department?</p>

            <!-- Edit mode: the admin's identity isn't something you change
                 here — just confirm who it is before adjusting Department
                 in Step 1 and saving. -->
            <div id="dwCurrentAdminCard" hidden>
              <div class="ux4g-al-review-card">
                <div class="ux4g-al-review-row"><span>Name</span><strong id="dwCurrentAdminName">—</strong></div>
                <div class="ux4g-al-review-row"><span>Email</span><strong id="dwCurrentAdminEmail">—</strong></div>
                <div class="ux4g-al-review-row"><span>Mobile</span><strong id="dwCurrentAdminMobile">—</strong></div>
                <div class="ux4g-al-review-row"><span>SSO Username</span><strong id="dwCurrentAdminSso">—</strong></div>
              </div>
            </div>

            <!-- Create mode: an admin has to already be a real, verified
                 user — this wizard doesn't create logins itself anymore
                 (that's Add New User's job, with its own duplicate-checking
                 and verification flow), it only grants admin rights to an
                 existing one. -->
            <div id="dwNewAdminChoices">
              <div class="ux4g-al-existing-banner" id="dwExistingBanner" role="button" tabindex="0">
                <span class="ux4g-icon-outlined" style="font-size:20px">person_search</span>
                <span class="ux4g-al-existing-copy">
                  <span class="ux4g-al-existing-title">Make an existing user an admin</span>
                  <span class="ux4g-al-existing-sub">Look them up by email, mobile number, or SSO username</span>
                </span>
                <span class="ux4g-icon-outlined ux4g-al-existing-chevron" id="dwExistingChevron">expand_more</span>
              </div>
              <div class="ux4g-al-existing-panel" id="dwExistingPanel" hidden>
                <div class="ux4g-al-existing-search">
                  <div class="ux4g-input ux4g-input-md">
                    <input class="ux4g-input-input" id="dwExistingQuery" type="text" placeholder="Enter their email, mobile number, or SSO username" />
                  </div>
                  <button class="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md" id="dwExistingFind" type="button">Find User</button>
                </div>
                <div id="dwExistingResult"></div>
              </div>
              <div class="ux4g-al-or-divider">or</div>
              <div class="ux4g-al-existing-banner" id="dwCreateNewUser" role="button" tabindex="0">
                <span class="ux4g-icon-outlined" style="font-size:20px">person_add</span>
                <span class="ux4g-al-existing-copy">
                  <span class="ux4g-al-existing-title">Create a new user</span>
                  <span class="ux4g-al-existing-sub">You can only make a user an admin once their account is verified — this opens Add New User to create their login first.</span>
                </span>
                <span class="ux4g-icon-outlined">arrow_forward</span>
              </div>
            </div>
          </div>

          <!-- Step 3: Review -->
          <div class="ux4g-al-wizard-step" data-step="3" hidden>
            <p class="ux4g-al-step-intro">Review before onboarding</p>
            <div id="dwReview"></div>
          </div>
        </div>

        <div class="ux4g-modal-actions">
          <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-md" data-dw-close type="button">Cancel</button>
          <button class="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-md" data-dw-back type="button" hidden>Back</button>
          <button class="ux4g-btn ux4g-btn-primary ux4g-btn-md" data-dw-next type="button">Next Step</button>
          <button class="ux4g-btn ux4g-btn-primary ux4g-btn-md" id="dwSubmitBtn" type="button" hidden>Create Login</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Success modal -->
  <div class="ux4g-modal-backdrop ux4g-modal-backdrop-50" id="deptSuccess">
    <div class="ux4g-modal">
      <div class="ux4g-modal-box ux4g-modal-m ux4g-modal-center-content">
        <div class="ux4g-modal-header">
          <div class="ux4g-modal-header-title-content"></div>
          <button class="ux4g-modal-close" data-ds-close aria-label="Close" type="button">
            <span class="ux4g-icon-outlined ux4g-modal-close-icon">close</span>
          </button>
        </div>
        <div class="ux4g-modal-body">
          <div class="ux4g-al-success-check"><span class="ux4g-icon-outlined" style="font-size:28px">check</span></div>
          <div class="ux4g-modal-body-title" id="dsTitle">Admin Login Created Successfully!</div>
          <p class="ux4g-al-success-subtext" id="dsSubtext">The department has been added and its admin login created. Credentials have been sent to the admin's registered email address.</p>
          <div class="ux4g-al-review-card">
            <div class="ux4g-al-review-row"><span>Department Name</span><strong id="dsName">&mdash;</strong></div>
            <div class="ux4g-al-review-row"><span>Admin Name</span><strong id="dsAdminName">&mdash;</strong></div>
            <div class="ux4g-al-review-row"><span>SSO Username</span><strong id="dsAdminSso">&mdash;</strong></div>
            <div class="ux4g-al-review-row"><span>Status</span><strong class="ux4g-al-status is-active"><span class="ux4g-badge-dot-success"></span>Active</strong></div>
          </div>
        </div>
        <div class="ux4g-modal-actions ux4g-al-success-actions" style="justify-content:center">
          <button class="ux4g-btn ux4g-btn-primary ux4g-btn-md" id="dsAddAnother" type="button">Create Another Login</button>
          <button class="ux4g-btn ux4g-btn-text-neutral ux4g-btn-md" data-ds-close type="button">Go to Dashboard</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap);

  // ---- refs ------------------------------------------------
  const wizard = document.getElementById("deptWizard");
  const success = document.getElementById("deptSuccess");
  const stepperEl = document.getElementById("dwStepper");
  const stepSub = document.getElementById("dwStepSub");
  const titleEl = document.getElementById("dwTitle");
  const steps = wizard.querySelectorAll(".ux4g-al-wizard-step");
  const nextBtn = wizard.querySelector("[data-dw-next]");
  const backBtn = wizard.querySelector("[data-dw-back]");
  const submitBtn = document.getElementById("dwSubmitBtn");
  const deptSelect = document.getElementById("dwDept");
  const subDeptSelect = document.getElementById("dwSubDept");
  const currentAdminCard = document.getElementById("dwCurrentAdminCard");
  const newAdminChoices = document.getElementById("dwNewAdminChoices");
  const existingBanner = document.getElementById("dwExistingBanner");
  const existingChevron = document.getElementById("dwExistingChevron");
  const existingPanel = document.getElementById("dwExistingPanel");
  const existingQuery = document.getElementById("dwExistingQuery");
  const existingFind = document.getElementById("dwExistingFind");
  const existingResult = document.getElementById("dwExistingResult");
  const createNewUserBanner = document.getElementById("dwCreateNewUser");
  const STEP_LABELS = ["Select Department", "User Details", "Review & Submit"];
  let current = 1;
  let editingId = null;
  // The admin being granted rights — either picked via the existing-user
  // search, or (in edit mode) the login's current holder, shown read-only.
  let selectedExistingOfficer = null;

  function lock() { document.body.style.overflow = "hidden"; }
  function unlock() { if (!wizard.classList.contains("is-open") && !success.classList.contains("is-open")) document.body.style.overflow = ""; }
  function open(m) { m.classList.add("is-open"); lock(); }
  function close(m) { m.classList.remove("is-open"); unlock(); }

  // ---- Step 1: Department / Sub-Department picker ----
  // The sub-department select is just context (why this login is
  // needed) — the admin it creates always manages the whole department,
  // so nothing downstream reads dwSubDept's value except the review
  // screen and the record's own subDept field.
  // dwDept/dwSubDept stay real <select> elements (hidden) purely as the
  // data-holder every other function in this file already reads/writes
  // via .value — the visible picker is the custom button + popup below,
  // matching the app's own dropdown component instead of the browser's
  // native list.
  const deptTrigger = document.getElementById("dwDeptTrigger");
  const deptTriggerLabel = document.getElementById("dwDeptTriggerLabel");
  const subDeptTrigger = document.getElementById("dwSubDeptTrigger");
  const subDeptTriggerLabel = document.getElementById("dwSubDeptTriggerLabel");

  function populateDeptSelect(selected) {
    deptSelect.innerHTML = '<option value="" disabled' + (selected ? "" : " selected") + '>Select a department</option>';
    Store.allDepartments().forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (name === selected) opt.selected = true;
      deptSelect.appendChild(opt);
    });
    deptTriggerLabel.textContent = selected || "Select a department";
    deptTriggerLabel.classList.toggle("is-placeholder", !selected);
  }
  function populateSubDeptSelect(deptName, selected) {
    if (!deptName) {
      subDeptSelect.innerHTML = '<option value="">Select a department first</option>';
      subDeptSelect.disabled = true;
      subDeptTrigger.disabled = true;
      subDeptTriggerLabel.textContent = "Select a department first";
      subDeptTriggerLabel.classList.add("is-placeholder");
      return;
    }
    subDeptSelect.disabled = false;
    subDeptTrigger.disabled = false;
    const options = [{ label: "General / Department-Level (this department itself)", value: "" }].concat(
      Store.allSubDepartments(deptName).map((s) => ({ label: s, value: s }))
    );
    subDeptSelect.innerHTML = options
      .map((o) => `<option value="${esc(o.value)}"${o.value === selected ? " selected" : ""}>${esc(o.label)}</option>`)
      .join("");
    const activeOpt = options.find((o) => o.value === selected) || options[0];
    subDeptTriggerLabel.textContent = activeOpt.label;
    subDeptTriggerLabel.classList.remove("is-placeholder");
  }
  deptSelect.addEventListener("change", () => {
    populateSubDeptSelect(deptSelect.value, "");
    updateNextEnabled();
  });

  function closeDwMenus() {
    document.querySelectorAll(".filter-menu").forEach((m) => m.remove());
  }
  function openDwMenu(anchor, options, activeValue, onPick) {
    closeDwMenus();
    const menu = document.createElement("div");
    menu.className = "filter-menu";
    options.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = opt.label;
      if (opt.value === activeValue) b.classList.add("is-active");
      b.addEventListener("click", () => {
        onPick(opt.value, opt.label);
        closeDwMenus();
      });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    menu.style.top = `${r.bottom + 4}px`;
    menu.style.left = `${r.left}px`;
    menu.style.minWidth = `${r.width}px`;
  }
  deptTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (document.querySelector(".filter-menu")) { closeDwMenus(); return; }
    const options = Store.allDepartments().map((d) => ({ label: d, value: d }));
    openDwMenu(deptTrigger, options, deptSelect.value, (value, label) => {
      deptSelect.value = value;
      deptTriggerLabel.textContent = label;
      deptTriggerLabel.classList.remove("is-placeholder");
      deptSelect.dispatchEvent(new Event("change"));
    });
  });
  subDeptTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (subDeptTrigger.disabled) return;
    if (document.querySelector(".filter-menu")) { closeDwMenus(); return; }
    const options = [...subDeptSelect.options].map((o) => ({ label: o.textContent, value: o.value }));
    openDwMenu(subDeptTrigger, options, subDeptSelect.value, (value, label) => {
      subDeptSelect.value = value;
      subDeptTriggerLabel.textContent = label;
      subDeptTriggerLabel.classList.remove("is-placeholder");
    });
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-menu") && !e.target.closest("#dwDeptTrigger") && !e.target.closest("#dwSubDeptTrigger")) closeDwMenus();
  });

  // ---- Make an existing user an admin (search Store.officers()) ----
  existingBanner.addEventListener("click", () => {
    const isOpen = !existingPanel.hidden;
    existingPanel.hidden = isOpen;
    existingChevron.textContent = isOpen ? "expand_more" : "expand_less";
    if (!isOpen) existingQuery.focus();
  });
  existingBanner.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); existingBanner.click(); }
  });

  function findOfficer(query) {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return Store.officers().find(
      (o) =>
        (o.email || "").toLowerCase() === q ||
        (o.mobile || "") === query.trim() ||
        (o.sso || "").toLowerCase() === q
    ) || null;
  }

  // Picking a match here just selects them and lets "Next Step" carry them
  // into Review — it doesn't submit on the spot, so the same Review &
  // Submit step applies whether you found an existing user or (in edit
  // mode) already had one.
  function renderExistingResult(officer) {
    if (!officer) {
      existingResult.innerHTML = `<p class="ux4g-al-existing-empty">No matching user found. Try a different email, mobile number, or SSO username.</p>`;
      return;
    }
    if (officer.status !== "active") {
      existingResult.innerHTML = `<p class="ux4g-al-existing-empty">This account hasn't been verified yet, so it can't be made an admin. Check Pending Accounts, or ask them to finish verification first.</p>`;
      return;
    }
    existingResult.innerHTML = `
      <div class="ux4g-al-review-card">
        <div class="ux4g-al-review-row"><span>Name</span><strong>${esc(officer.name)}</strong></div>
        <div class="ux4g-al-review-row"><span>Email</span><strong>${esc(officer.email)}</strong></div>
        <div class="ux4g-al-review-row"><span>Mobile</span><strong>${esc(officer.mobile)}</strong></div>
        <div class="ux4g-al-review-row"><span>Current Role</span><strong>${esc(officer.role || "—")}</strong></div>
      </div>
      <button class="ux4g-btn ux4g-btn-primary ux4g-btn-md" id="dwSelectExisting" type="button">
        <span class="ux4g-icon-outlined" style="font-size:18px">check</span> Select This User
      </button>`;

    document.getElementById("dwSelectExisting").addEventListener("click", (e) => {
      selectedExistingOfficer = {
        name: officer.name,
        email: officer.email,
        mobile: officer.mobile,
        sso: officer.sso || officer.name.replace(/\s+/g, "").slice(0, 8),
      };
      updateNextEnabled();
      e.target.closest("button").innerHTML = '<span class="ux4g-icon-outlined" style="font-size:18px">check_circle</span> Selected — click Next Step below';
      e.target.closest("button").disabled = true;
    });
  }

  existingFind.addEventListener("click", () => renderExistingResult(findOfficer(existingQuery.value)));
  existingQuery.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); existingFind.click(); }
  });

  // ---- Create a new user — this wizard no longer creates logins itself,
  // it hands off to Add New User (which owns duplicate-checking and the
  // pending/verification lifecycle), pre-filled with whatever Department
  // was picked in Step 1. ----
  createNewUserBanner.addEventListener("click", () => {
    const deptChosen = deptSelect.value;
    const slug = deptChosen && typeof Store !== "undefined" ? Store.deptSlug(deptChosen) : "";
    window.location.href = slug ? `users-officers.html?dept=${slug}&openAdd=1` : "users.html";
  });

  // Step 2's Next is gated on actually having an admin to grant rights to:
  // in edit mode that's always true (the current holder, shown read-only);
  // in create mode it's true only once a search result has been selected.
  function updateNextEnabled() {
    if (current === 1) nextBtn.disabled = !deptSelect.value;
    else if (current === 2) nextBtn.disabled = editingId ? false : !selectedExistingOfficer;
    else nextBtn.disabled = false;
  }

  function renderStepper(active) {
    let html = "";
    STEP_LABELS.forEach((label, i) => {
      const n = i + 1;
      const done = n < active;
      const isActive = n === active;
      const badgeInner = done ? '<span class="ux4g-icon-outlined">check</span>' : n;
      html += `<div class="ux4g-al-step ${isActive ? "is-active" : ""} ${done ? "is-done" : ""}">
        <span class="ux4g-al-step-badge">${badgeInner}</span>
        <span class="ux4g-al-step-label">${label}</span>
      </div>`;
      if (i < STEP_LABELS.length - 1) html += `<div class="ux4g-al-step-line ${done ? "is-done" : ""}"></div>`;
    });
    stepperEl.innerHTML = html;
    stepSub.textContent = `Step ${active} of ${STEP_LABELS.length} · ${STEP_LABELS[active - 1]}`;
  }
  function showStep(n) {
    current = n;
    steps.forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
    renderStepper(n);
    backBtn.hidden = n === 1;
    nextBtn.hidden = n === STEP_LABELS.length;
    submitBtn.hidden = n !== STEP_LABELS.length;
    updateNextEnabled();
    if (n === STEP_LABELS.length) renderReview();
    wizard.querySelector(".ux4g-modal-box").scrollTop = 0;
  }

  // ---- review ------------------------------------------------
  function reviewRow(label, value) {
    return `<div class="ux4g-al-review-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }
  function renderReview() {
    const subDeptRow = subDeptSelect.value
      ? reviewRow("Sub-Department (context)", subDeptSelect.value)
      : "";
    const admin = selectedExistingOfficer;
    document.getElementById("dwReview").innerHTML = `
      <div class="ux4g-al-review-card">
        <div class="ux4g-al-review-card-title">Department</div>
        ${reviewRow("Department", deptSelect.value || "—")}
        ${subDeptRow}
      </div>
      <div class="ux4g-al-review-card">
        <div class="ux4g-al-review-card-title">User Details</div>
        ${reviewRow("Admin Name", (admin && admin.name) || "—")}
        ${reviewRow("Email", (admin && admin.email) || "—")}
        ${reviewRow("Mobile Number", (admin && admin.mobile) || "—")}
        ${reviewRow("SSO Username", (admin && admin.sso) || "—")}
      </div>`;
  }

  // ---- navigation ------------------------------------------
  nextBtn.addEventListener("click", () => {
    if (nextBtn.disabled) return;
    showStep(Math.min(current + 1, STEP_LABELS.length));
  });
  backBtn.addEventListener("click", () => showStep(Math.max(current - 1, 1)));
  wizard.querySelectorAll("[data-dw-close]").forEach((b) => b.addEventListener("click", () => close(wizard)));

  submitBtn.addEventListener("click", () => {
    if (!selectedExistingOfficer) return;
    const name = deptSelect.value;
    const subDept = subDeptSelect.value;
    const admin = selectedExistingOfficer;
    if (editingId) {
      Store.updateDepartment(editingId, { name, code: "", admin, subDept });
      document.getElementById("dsTitle").textContent = "Admin Login Updated Successfully!";
      document.getElementById("dsSubtext").textContent = "The login's details have been updated.";
      document.getElementById("dsAddAnother").hidden = true;
    } else {
      const existingAdminRecord = Store.departmentAdmins().find((a) => a.dept === name);
      if (existingAdminRecord) {
        Store.updateDepartment(existingAdminRecord.id, { name, code: existingAdminRecord.code, admin, subDept });
      } else {
        Store.addDepartment({ name, code: "", admin, subDept });
      }
      document.getElementById("dsTitle").textContent = "Admin Assigned Successfully!";
      document.getElementById("dsSubtext").textContent = `${admin.name} has been made the admin for ${name}.`;
      document.getElementById("dsAddAnother").hidden = false;
    }
    document.getElementById("dsName").textContent = subDept ? `${name} — ${subDept}` : name;
    document.getElementById("dsAdminName").textContent = admin.name;
    document.getElementById("dsAdminSso").textContent = admin.sso;
    close(wizard);
    open(success);
  });

  function openWizard(editRecord) {
    existingPanel.hidden = true;
    existingChevron.textContent = "expand_more";
    existingQuery.value = "";
    existingResult.innerHTML = "";
    editingId = editRecord ? editRecord.id : null;
    selectedExistingOfficer = editRecord
      ? { name: editRecord.name, email: editRecord.email, mobile: editRecord.mobile, sso: editRecord.sso }
      : null;
    if (editRecord) {
      titleEl.textContent = "Edit Admin Login";
      submitBtn.textContent = "Save Changes";
      populateDeptSelect(editRecord.dept);
      populateSubDeptSelect(editRecord.dept, editRecord.subDept || "");
      document.getElementById("dwCurrentAdminName").textContent = editRecord.name || "—";
      document.getElementById("dwCurrentAdminEmail").textContent = editRecord.email || "—";
      document.getElementById("dwCurrentAdminMobile").textContent = editRecord.mobile || "—";
      document.getElementById("dwCurrentAdminSso").textContent = editRecord.sso || "—";
      currentAdminCard.hidden = false;
      newAdminChoices.hidden = true;
    } else {
      titleEl.textContent = "Create Admin Login";
      submitBtn.textContent = "Create Login";
      populateDeptSelect("");
      populateSubDeptSelect("", "");
      currentAdminCard.hidden = true;
      newAdminChoices.hidden = false;
    }
    showStep(1);
    open(wizard);
  }
  window.openDepartmentWizard = openWizard;

  // ---- success modal ---------------------------------------
  success.querySelectorAll("[data-ds-close]").forEach((b) => b.addEventListener("click", () => close(success)));
  document.getElementById("dsAddAnother").addEventListener("click", () => { close(success); openWizard(); });

  // ---- backdrop + Esc --------------------------------------
  [wizard, success].forEach((m) => m.addEventListener("mousedown", (e) => { if (e.target === m) close(m); }));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (success.classList.contains("is-open")) return close(success);
    if (wizard.classList.contains("is-open")) return close(wizard);
  });

  // ---- global open trigger ---------------------------------
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-open="department"]')) { e.preventDefault(); openWizard(); }
  });
})();
