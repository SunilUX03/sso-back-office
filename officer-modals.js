// ============================================================
// TN SSO — Shared officer modals (Add New Officer wizard,
// Success, and Select Transferred Officer). Injected into <body>.
// Include this BEFORE users.js / users-officers.js.
// ============================================================
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---- shared custom-dropdown popup (same component Create Admin Login
  // and Register Application use) — replaces the browser's native <select>
  // list with the app's own trigger button + popup ----
  function closeMenus() { document.querySelectorAll(".filter-menu").forEach((m) => m.remove()); }
  function openMenu(anchor, options, activeValue, onPick) {
    closeMenus();
    const menu = document.createElement("div");
    menu.className = "filter-menu";
    options.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = opt.label;
      if (opt.value === activeValue) b.classList.add("is-active");
      b.addEventListener("click", () => { onPick(opt.value, opt.label); closeMenus(); });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    menu.style.top = `${r.bottom + 4}px`;
    menu.style.left = `${r.left}px`;
    menu.style.minWidth = `${r.width}px`;
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-menu") && !e.target.closest(".ux4g-al-select")) closeMenus();
  });
  // Markup for one trigger+hidden-select pair. The real <select> stays in
  // the DOM (display:none) purely as the value-holder every other function
  // in this file reads/writes via .value, unchanged.
  function selectTrigger(id, placeholder) {
    return `<button type="button" class="ux4g-al-select" id="${id}Trigger">
        <span class="ux4g-al-select-label is-placeholder" id="${id}TriggerLabel">${esc(placeholder)}</span>
        <span class="material-icons">expand_more</span>
      </button>
      <select class="ux4g-al-select-native" id="${id}"></select>`;
  }
  // Wires a trigger button to its hidden <select>: opens the popup built
  // from the select's own <option>s, and keeps the trigger's label in
  // sync whenever the select's options or value change programmatically
  // (call the returned function again after repopulating).
  function bindSelectTrigger(id, placeholder) {
    const select = document.getElementById(id);
    const trigger = document.getElementById(id + "Trigger");
    const label = document.getElementById(id + "TriggerLabel");
    function sync() {
      const opt = select.options[select.selectedIndex];
      const hasValue = opt && opt.value !== "";
      label.textContent = opt ? opt.textContent : placeholder;
      label.classList.toggle("is-placeholder", !hasValue);
    }
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (trigger.disabled) return;
      if (document.querySelector(".filter-menu")) { closeMenus(); return; }
      const options = [...select.options].filter((o) => !o.disabled).map((o) => ({ value: o.value, label: o.textContent }));
      openMenu(trigger, options, select.value, (value, lbl) => {
        select.value = value;
        label.textContent = lbl;
        label.classList.remove("is-placeholder");
        select.dispatchEvent(new Event("change"));
      });
    });
    sync();
    return sync;
  }

  // ---- Shared officer-card markup (used by list + transfer modal) ----
  function officerCard(rightHTML, opts) {
    opts = opts || {};
    const name = opts.name || "Sunil Kumar";
    const role = opts.role || opts.designation || "UI/UX Designer";
    const dept = opts.dept || "Name of the Department";
    const subDept = opts.subDept || "Name of the Sub Department";
    const juris = opts.jurisdiction || "Jurisdiction";
    const sso = opts.sso || "Sunilkumar";
    const mobile = opts.mobile || "86502332342";
    const email = opts.email || "sunilkumar@gmail.com";
    const reportsTo = opts.reportsTo || "Sunilkumar";
    return `
      <div class="officer-main">
        <span class="officer-avatar" aria-hidden="true"></span>
        <div class="officer-body">
          <div>
            <h3 class="officer-name">${esc(name)}</h3>
            <p class="officer-role">${esc(role)}</p>
          </div>
          <div class="officer-chips">
            <span class="chip-outline">${esc(dept)}</span>
            <span class="chip-outline">${esc(subDept)}</span>
            <span class="chip-outline">${esc(juris)}</span>
          </div>
          <div class="officer-details">
            <div class="officer-field"><span class="of-label">SSO User Name</span><span class="of-value">${esc(sso)}</span></div>
            <div class="officer-field"><span class="of-label">Mobile Number</span><span class="of-value">${esc(mobile)}</span></div>
            <div class="officer-field"><span class="of-label">Email Id</span><span class="of-value">${esc(email)}</span></div>
            <div class="officer-field"><span class="of-label">Reporting Officer</span><span class="of-value">${esc(reportsTo)}</span></div>
          </div>
        </div>
      </div>
      ${rightHTML}`;
  }
  window.OfficerCard = officerCard;

  // ---- Inject modal markup ----
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <!-- Add New User wizard -->
  <div class="modal-backdrop" id="officerWizard" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Add New User">
      <button class="modal-close" data-wiz-close aria-label="Close" style="position:absolute;top:28px;right:28px;">
        <span class="material-icons">close</span>
      </button>
      <div class="wizard-title">
        <img src="assets/imgImage10.png" alt="" />
        <h2>Add New User</h2>
      </div>
      <div class="stepper" id="wizStepper"></div>

      <!-- Step 1: Add Department Info -->
      <div class="wizard-step" data-step="1">
        <div class="mode-toggle" id="wizModeToggle">
          <button type="button" class="mode-toggle-btn is-active" data-mode="single">Add Single User</button>
          <button type="button" class="mode-toggle-btn" data-mode="bulk">Bulk Upload</button>
        </div>
        <form class="form-fields" onsubmit="return false">
          <div class="field">
            <label class="field-label" for="wDept">Select Department</label>
            ${selectTrigger("wDept", "Select Department")}
          </div>
          <div class="field" id="wSubDeptField">
            <label class="field-label" for="wSubDept">Select Sub Department</label>
            ${selectTrigger("wSubDept", "Select Sub Department")}
          </div>
          <div class="field" id="wJurisField">
            <label class="field-label" for="wJuris">Select Jurisdiction</label>
            ${selectTrigger("wJuris", "Select Jurisdiction")}
            <span class="field-hint"><span class="material-icons">info</span>Can't find the jurisdiction? Add it in <a href="agency.html">Jurisdiction Management</a></span>
          </div>
          <div class="field" id="wDesigField">
            <label class="field-label" for="wDesig">Select Designation</label>
            ${selectTrigger("wDesig", "Select Designation")}
            <span class="field-hint"><span class="material-icons">info</span>Can't find the designation? Add it in <a href="agency-designation.html">Designation Management</a></span>
          </div>
          <div class="field" id="wReportsToField" hidden>
            <label class="field-label">Reporting Officer</label>
            <div class="field-control field-control-readonly" id="wReportsToValue">—</div>
            <span class="field-hint"><span class="material-icons">info</span>Filled in automatically from the jurisdiction and designation above</span>
          </div>
          <div class="bulk-columns-note" id="wBulkDeptHint" hidden>
            <span class="material-icons">info</span>
            <span>Jurisdiction and Designation are set per person in the uploaded file — Department and Sub-Department here apply to everyone in it.</span>
          </div>
        </form>
        <div class="modal-footer wide">
          <button class="btn btn-outline btn-officer" data-wiz-close><span class="material-icons">cancel</span>Close</button>
          <button class="btn btn-primary btn-officer" id="wizNext"><span class="material-icons">add</span>Next</button>
        </div>
      </div>

      <!-- Step 2: Add User Details -->
      <div class="wizard-step" data-step="2" hidden>
        <div id="singleUserPanel">
          <div class="transfer-banner" id="openTransfer" role="button" tabindex="0">
            <span class="tb-link">Click here to add a Transferred Officer to Your Department</span>
            <span class="tb-sub">Officers unlinked from another department show up here — link them to this one in a click.</span>
          </div>
          <div class="transfer-banner" id="openLinkExisting" role="button" tabindex="0">
            <span class="tb-link">Link an existing SSO account</span>
            <span class="tb-sub">Look them up by email, mobile number, or SSO username instead of creating a new login.</span>
          </div>
          <div class="link-existing-panel" id="linkExistingPanel" hidden>
            <div class="field" style="margin-bottom:10px;">
              <input class="field-control" id="linkExistingQuery" type="text" placeholder="Enter their email, mobile number, or SSO username" />
            </div>
            <div class="link-existing-actions">
              <button class="btn btn-outline btn-officer" id="linkExistingFind" type="button">Find Account</button>
            </div>
            <div id="linkExistingResult"></div>
          </div>
          <div class="or-divider">or</div>
          <form class="form-fields" onsubmit="return false">
            <div class="field">
              <label class="field-label" for="wName">Enter Full Name</label>
              <input class="field-control" id="wName" type="text" placeholder="Enter full name" />
              <span class="field-hint"><span class="material-icons">info</span>Enter the name as per records</span>
            </div>
            <div class="field">
              <label class="field-label" for="wSso">Create SSO User Name</label>
              <input class="field-control" id="wSso" type="text" placeholder="e.g. TSUNIL" />
              <span class="field-hint" id="wSsoHint"><span class="material-icons">info</span>SSO Username format: First initial + last name. Example: TSUNIL</span>
            </div>
            <div class="field">
              <label class="field-label" for="wMobile">Enter Mobile Number</label>
              <input class="field-control" id="wMobile" type="text" placeholder="10-digit mobile number" />
              <span class="field-hint" id="wMobileHint"><span class="material-icons">info</span>A verification link is sent to this number once the login is created</span>
            </div>
            <div class="field">
              <label class="field-label" for="wEmail">Enter work Email Id</label>
              <input class="field-control" id="wEmail" type="text" placeholder="name@tn.gov.in" />
              <span class="field-hint" id="wEmailHint"><span class="material-icons">info</span>A verification link is sent here too — either one activates the account</span>
            </div>
          </form>
        </div>

        <div id="bulkUploadPanel" hidden>
          <div class="bulk-upload-intro">
            <div class="bulk-columns-note">
              <span class="material-icons">info</span>
              <span>Columns required: <strong>Full Name, SSO Username, Mobile Number, Work Email, Jurisdiction, Designation</strong>. Jurisdiction/Designation can be left blank for a department-level user — Department and Sub-Department are set once above, not per row.</span>
            </div>
            <div class="bulk-upload-actions">
              <button class="btn btn-outline btn-officer" id="bulkDownloadTemplate" type="button"><span class="material-icons">download</span>Download CSV Template</button>
              <label class="btn btn-outline btn-officer bulk-file-label" for="bulkFileInput"><span class="material-icons">upload_file</span>Choose CSV File<input type="file" id="bulkFileInput" accept=".csv" hidden /></label>
              <span id="bulkFileName" class="bulk-file-name"></span>
            </div>
          </div>
          <div id="bulkPreviewWrap" hidden>
            <div class="bulk-preview-summary" id="bulkPreviewSummary"></div>
            <div class="bulk-preview-table-wrap">
              <table class="bulk-preview-table">
                <thead>
                  <tr>
                    <th>#</th><th>Name</th><th>SSO</th><th>Mobile</th><th>Email</th><th>Jurisdiction</th><th>Designation</th><th>Status</th>
                  </tr>
                </thead>
                <tbody id="bulkPreviewBody"></tbody>
              </table>
            </div>
          </div>
          <div id="bulkResultsWrap" hidden>
            <div class="bulk-results-banner" id="bulkResultsBanner"></div>
            <div class="bulk-preview-table-wrap">
              <table class="bulk-preview-table">
                <thead><tr><th>#</th><th>Name</th><th>Reason</th></tr></thead>
                <tbody id="bulkFailuresBody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-footer wide">
          <button class="btn btn-outline btn-officer" id="wizBack"><span class="material-icons">chevron_left</span>Back</button>
          <button class="btn btn-primary btn-officer" id="wizSubmit"><span class="material-icons">check</span>Submit</button>
          <button class="btn btn-primary btn-officer" id="bulkCreateBtn" hidden disabled><span class="material-icons">check</span>Create Accounts</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Success modal -->
  <div class="modal-backdrop" id="successModal" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Officer added">
      <div class="success-body">
        <div class="success-check">&#10003;</div>
        <h2 class="success-title" id="successTitle">New User Account Added Successfully!</h2>
        <div class="summary-card">
          <div class="summary-row"><span class="summary-label">Full Name</span><span class="summary-value" id="sumName">T Sunil Kumar</span></div>
          <div class="summary-row"><span class="summary-label">SSO Username</span><span class="summary-value" id="sumSso">TSunil</span></div>
          <div class="summary-row"><span class="summary-label">Designation</span><span class="summary-value" id="sumDesig">Backend Developer</span></div>
          <div class="summary-row"><span class="summary-label">Jurisdiction</span><span class="summary-value" id="sumJuris">Chennai</span></div>
        </div>
        <div class="cred-banner">
          <span class="material-icons">login</span>
          <span id="credText">Login credentials have been sent to sunilkumarwork@email.com and +91 86382 70481</span>
        </div>
        <div class="modal-footer wide">
          <button class="btn btn-outline btn-officer" id="successAddAnother"><span class="material-icons">add</span>Add New User</button>
          <button class="btn btn-primary btn-officer" data-success-close><span class="material-icons">check</span>Done</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Select Transferred Officer modal -->
  <div class="modal-backdrop" id="transferModal" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Select an Officer to add">
      <div class="modal-header">
        <h2 class="modal-title">Select an Officer to add</h2>
        <button class="modal-close" data-transfer-close aria-label="Close"><span class="material-icons">close</span></button>
      </div>
      <div class="transfer-search">
        <label class="field-label" for="transferSearch">Search for Officer</label>
        <input class="field-control" id="transferSearch" type="text" placeholder="search by name, designation, Jurisdiction" />
      </div>
      <div class="officer-list" id="transferList"></div>
    </div>
  </div>`;
  document.body.appendChild(wrap);

  // ---- Custom dropdown triggers for the 4 step-1 selects ----
  const syncDeptTrigger = bindSelectTrigger("wDept", "Select Department");
  const syncSubDeptTrigger = bindSelectTrigger("wSubDept", "Select Sub Department");
  const syncJurisTrigger = bindSelectTrigger("wJuris", "Select Jurisdiction");
  const syncDesigTrigger = bindSelectTrigger("wDesig", "Select Designation");

  // ---- Element refs ----
  const wizard = document.getElementById("officerWizard");
  const successModal = document.getElementById("successModal");
  const transferModal = document.getElementById("transferModal");
  const stepperEl = document.getElementById("wizStepper");
  const steps = wizard.querySelectorAll(".wizard-step");

  function lock() { document.body.style.overflow = "hidden"; }
  function unlock() { if (![wizard, successModal, transferModal].some((m) => !m.hidden)) document.body.style.overflow = ""; }
  function open(m) { m.hidden = false; lock(); }
  function close(m) { m.hidden = true; unlock(); }

  // ---- Stepper render ----
  const STEP_LABELS = ["Add Department Info", "Add User Details"];
  function renderStepper(active) {
    let html = "";
    STEP_LABELS.forEach((label, i) => {
      const n = i + 1;
      const cls = n < active ? "is-done" : n === active ? "is-active" : "";
      const inner = n < active ? "&#10003;" : String(n);
      html += `<div class="step-item ${cls}"><span class="step-circle-num">${inner}</span><span class="step-label">${label}</span></div>`;
      if (i < STEP_LABELS.length - 1) {
        html += `<div class="step-connector ${active > n ? "is-done" : ""}"></div>`;
      }
    });
    stepperEl.innerHTML = html;
  }
  function showStep(n) {
    steps.forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
    renderStepper(n);
  }

  function fillSelect(sel, items, placeholder) {
    if (!sel) return;
    sel.innerHTML = "";
    if (placeholder) {
      const o = document.createElement("option");
      o.value = ""; o.textContent = placeholder; o.disabled = true; o.selected = true;
      sel.appendChild(o);
    }
    items.forEach((txt) => {
      const o = document.createElement("option");
      o.value = txt; o.textContent = txt;
      sel.appendChild(o);
    });
  }

  // Populate step-1 selects from the shared Store (when available).
  // Jurisdiction + Designation are scoped to whichever department is
  // selected, so they always match that department's real data. When
  // opened from a specific department/sub-department's own roster page,
  // both default to that page's context instead of whatever sorts first.
  function populateWizard(defaultDept, defaultSubDept) {
    if (typeof Store === "undefined") return;
    const dept = document.getElementById("wDept");
    const sub = document.getElementById("wSubDept");
    const juris = document.getElementById("wJuris");
    const desig = document.getElementById("wDesig");
    fillSelect(dept, Store.visibleDepartments());
    if (defaultDept) dept.value = defaultDept;
    syncDeptTrigger();
    // A Department Admin can only create users within their own
    // department — the field is locked to it, not just pre-selected.
    const scope = Store.myScope();
    const deptTrigger = document.getElementById("wDeptTrigger");
    if (scope.role === "dept-admin") {
      dept.value = scope.dept;
      deptTrigger.disabled = true;
    } else {
      deptTrigger.disabled = false;
    }
    syncDeptTrigger();
    // A Sub-Department Admin is locked one level further, to their own
    // sub-department too.
    const subDeptTrigger = document.getElementById("wSubDeptTrigger");
    subDeptTrigger.disabled = scope.role === "dept-admin" && !!scope.subDept;
    const syncDeptScoped = (preferredSubDept) => {
      fillSelect(sub, Store.visibleSubDepartments(dept.value));
      const forcedSubDept = scope.role === "dept-admin" && scope.subDept ? scope.subDept : preferredSubDept;
      if (forcedSubDept && [...sub.options].some((o) => o.value === forcedSubDept)) sub.value = forcedSubDept;
      syncSubDeptTrigger();
      fillSelect(juris, Store.visibleOffices(dept.value, sub.value).map((o) => o.name), "Select Jurisdiction");
      fillSelect(desig, Store.visibleDeptDesignations(dept.value, sub.value).map((d) => d.name), "Select Designation");
      syncJurisTrigger();
      syncDesigTrigger();
    };
    syncDeptScoped(defaultSubDept);
    if (dept._syncDeptScoped) dept.removeEventListener("change", dept._syncDeptScoped);
    dept._syncDeptScoped = () => syncDeptScoped();
    dept.addEventListener("change", dept._syncDeptScoped);
    if (sub._syncSubScoped) sub.removeEventListener("change", sub._syncSubScoped);
    sub._syncSubScoped = () => {
      fillSelect(juris, Store.visibleOffices(dept.value, sub.value).map((o) => o.name), "Select Jurisdiction");
      fillSelect(desig, Store.visibleDeptDesignations(dept.value, sub.value).map((d) => d.name), "Select Designation");
      syncJurisTrigger();
      syncDesigTrigger();
    };
    sub.addEventListener("change", sub._syncSubScoped);
  }

  // ---- Reporting Officer preview (Step 1) — read-only, computed the same
  // way the record's own reportsTo field is at submit time, so what's shown
  // before creating the login always matches what actually gets saved. ----
  function updateReportsToPreview() {
    const dept = document.getElementById("wDept").value;
    const desig = document.getElementById("wDesig").value;
    const el2 = document.getElementById("wReportsToValue");
    if (!dept || !desig || typeof Store === "undefined") { el2.textContent = "—"; return; }
    const match = Store.deptDesignations(dept).find((d) => d.name === desig);
    el2.textContent = (match && match.reportsTo) || "Top Level";
  }
  document.getElementById("wJuris").addEventListener("change", updateReportsToPreview);
  document.getElementById("wDesig").addEventListener("change", updateReportsToPreview);

  // ---- Single vs Bulk mode ----
  let wizMode = "single";
  function applyWizMode() {
    const isBulk = wizMode === "bulk";
    wizard.querySelector(".modal").classList.toggle("is-bulk-mode", isBulk);
    document.querySelectorAll("#wizModeToggle .mode-toggle-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === wizMode));
    // Sub-Department stays visible in both modes — like Department, it's one
    // value that applies to the whole file in bulk mode, not a per-row
    // column, since a bulk upload happens from inside one specific
    // sub-department's roster page.
    document.getElementById("wJurisField").hidden = isBulk;
    document.getElementById("wDesigField").hidden = isBulk;
    document.getElementById("wReportsToField").hidden = isBulk || !document.getElementById("wDesig").value;
    document.getElementById("wBulkDeptHint").hidden = !isBulk;
    document.getElementById("singleUserPanel").hidden = isBulk;
    document.getElementById("bulkUploadPanel").hidden = !isBulk;
    document.getElementById("wizSubmit").hidden = isBulk;
    document.getElementById("bulkCreateBtn").hidden = !isBulk;
  }
  document.querySelectorAll("#wizModeToggle .mode-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => { wizMode = btn.dataset.mode; applyWizMode(); });
  });
  document.getElementById("wDesig").addEventListener("change", applyWizMode);

  let editingOfficerId = null;
  function openWizard(editRecord, defaultDept, defaultSubDept) {
    editingOfficerId = editRecord ? editRecord.id : null;
    populateWizard(
      editRecord ? editRecord.dept : defaultDept,
      editRecord ? editRecord.subDept : defaultSubDept
    );
    document.getElementById("linkExistingPanel").hidden = true;
    document.getElementById("linkExistingQuery").value = "";
    document.getElementById("linkExistingResult").innerHTML = "";
    setFieldHintError("wMobileHint", WMOBILE_HINT, "");
    setFieldHintError("wEmailHint", WEMAIL_HINT, "");
    setFieldHintError("wSsoHint", WSSO_HINT, "");
    wizMode = "single";
    resetBulkPanel();

    const titleEl = wizard.querySelector(".wizard-title h2");
    const submitBtn = document.getElementById("wizSubmit");
    if (editRecord) {
      titleEl.textContent = "Edit User";
      document.getElementById("wJuris").value = editRecord.jurisdiction || "";
      document.getElementById("wDesig").value = editRecord.designation || "";
      syncJurisTrigger();
      syncDesigTrigger();
      document.getElementById("wName").value = editRecord.name || "";
      document.getElementById("wSso").value = editRecord.sso || "";
      document.getElementById("wMobile").value = editRecord.mobile || "";
      document.getElementById("wEmail").value = editRecord.email || "";
      submitBtn.innerHTML = '<span class="material-icons">check</span>Save Changes';
    } else {
      titleEl.textContent = "Add New User";
      document.getElementById("wName").value = "";
      document.getElementById("wSso").value = "";
      document.getElementById("wMobile").value = "";
      document.getElementById("wEmail").value = "";
      submitBtn.innerHTML = '<span class="material-icons">check</span>Submit';
    }
    applyWizMode();
    updateReportsToPreview();
    showStep(1);
    open(wizard);
  }
  window.openOfficerWizard = openWizard;

  // ---- Wizard navigation ----
  document.getElementById("wizNext").addEventListener("click", () => showStep(2));
  document.getElementById("wizBack").addEventListener("click", () => showStep(1));
  wizard.querySelectorAll("[data-wiz-close]").forEach((b) => b.addEventListener("click", () => close(wizard)));

  // ---- Contact duplicate-checking (no live OTP — see admin-login-modals.js
  // for the same reasoning: the department person creating this login can't
  // receive a code sent to someone else's phone, so uniqueness is what's
  // actually checked; the new login verifies itself later via the link sent
  // to its own mobile/email). ----
  function setFieldHintError(hintId, defaultHTML, errorText) {
    const el = document.getElementById(hintId);
    if (!el) return;
    if (errorText) {
      el.innerHTML = `<span class="material-icons">error</span>${esc(errorText)}`;
      el.classList.add("field-error");
    } else {
      el.innerHTML = defaultHTML;
      el.classList.remove("field-error");
    }
  }
  const WSSO_HINT = '<span class="material-icons">info</span>SSO Username format: First initial + last name. Example: TSUNIL';
  const WMOBILE_HINT = '<span class="material-icons">info</span>A verification link is sent to this number once the login is created';
  const WEMAIL_HINT = '<span class="material-icons">info</span>A verification link is sent here too — either one activates the account';
  function validateOfficerContact() {
    if (typeof Store === "undefined") return true;
    const dupes = Store.findDuplicateContact({
      mobile: document.getElementById("wMobile").value.trim(),
      email: document.getElementById("wEmail").value.trim(),
      sso: document.getElementById("wSso").value.trim(),
      excludeKind: "officer",
      excludeId: editingOfficerId,
    }) || {};
    setFieldHintError("wMobileHint", WMOBILE_HINT, dupes.mobile ? "This mobile number is already registered to another account" : "");
    setFieldHintError("wEmailHint", WEMAIL_HINT, dupes.email ? "This email is already registered to another account" : "");
    setFieldHintError("wSsoHint", WSSO_HINT, dupes.sso ? "This SSO username is already taken" : "");
    return !dupes.mobile && !dupes.email && !dupes.sso;
  }
  ["wMobile", "wEmail", "wSso"].forEach((id) => {
    document.getElementById(id).addEventListener("input", validateOfficerContact);
  });

  document.getElementById("wizSubmit").addEventListener("click", () => {
    // gather inputs
    const name = document.getElementById("wName").value.trim();
    if (!name) {
      alert("Please enter the officer's full name.");
      document.getElementById("wName").focus();
      return;
    }
    if (!validateOfficerContact()) return;
    const sso = document.getElementById("wSso").value.trim();
    const mobile = document.getElementById("wMobile").value.trim();
    const email = document.getElementById("wEmail").value.trim();
    const desig = document.getElementById("wDesig").value;
    const juris = document.getElementById("wJuris").value;
    const dept = document.getElementById("wDept").value;
    const subDept = document.getElementById("wSubDept").value;

    // create/update a real officer record in the shared store
    if (typeof Store !== "undefined") {
      const match = Store.deptDesignations(dept).find((d) => d.name === desig);
      const payload = {
        name, role: desig, designation: desig, dept, subDept, jurisdiction: juris,
        sso, mobile, email,
        reportsTo: (match && match.reportsTo) || "Top Level",
      };
      if (editingOfficerId) {
        Store.updateOfficer(editingOfficerId, payload);
      } else {
        payload.status = "pending";
        payload.verifyToken = Store.genToken();
        Store.addOfficer(payload);
      }
    }

    // populate success summary
    document.getElementById("successTitle").textContent = editingOfficerId
      ? "User Details Updated Successfully!"
      : "New User Account Added — Pending Verification";
    document.getElementById("sumName").textContent = name;
    document.getElementById("sumSso").textContent = sso;
    document.getElementById("sumDesig").textContent = desig;
    document.getElementById("sumJuris").textContent = juris;
    document.getElementById("credText").textContent = editingOfficerId
      ? `${name}'s details have been updated.`
      : `A verification link has been sent to ${email} and ${mobile}. Their account activates once they set a password — track it under Pending Accounts until then.`;
    close(wizard);
    open(successModal);
  });

  // ---- Bulk Upload ----
  // Each row gets the SAME treatment as a single manually-created user:
  // required-field checks, a duplicate-contact check against everyone
  // already in the system, AND a check against every other row in this
  // same file (two rows sharing a mobile number is just as real a
  // collision as one matching an existing account). Only rows with zero
  // errors get created; every created row is "pending" with its own
  // verification link, exactly like the single-user flow.
  const BULK_HEADERS = ["Full Name", "SSO Username", "Mobile Number", "Work Email", "Jurisdiction", "Designation"];
  let bulkRows = []; // parsed + validated rows, kept so "Create Accounts" doesn't need to reparse

  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  function csvEscape(v) {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  document.getElementById("bulkDownloadTemplate").addEventListener("click", () => {
    const csv = BULK_HEADERS.map(csvEscape).join(",");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "bulk-user-template.csv");
  });

  function resetBulkPanel() {
    bulkRows = [];
    document.getElementById("bulkFileInput").value = "";
    document.getElementById("bulkFileName").textContent = "";
    document.getElementById("bulkPreviewWrap").hidden = true;
    document.getElementById("bulkResultsWrap").hidden = true;
    document.getElementById("bulkCreateBtn").disabled = true;
    document.getElementById("bulkCreateBtn").innerHTML = '<span class="material-icons">check</span>Create Accounts';
  }

  function validateBulkRow(cells, dept, subDept, seen) {
    const [name, sso, mobile, email, jurisdiction, designation] = [0, 1, 2, 3, 4, 5].map((i) => (cells[i] || "").trim());
    const errors = [];
    if (!name) errors.push("Full Name is required");
    if (!sso) errors.push("SSO Username is required");
    if (!/^\d{10}$/.test(mobile)) errors.push("Mobile Number must be exactly 10 digits");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Work Email doesn't look valid");

    if (mobile || email || sso) {
      const dupes = Store.findDuplicateContact({ mobile, email, sso }) || {};
      if (dupes.mobile) errors.push("Mobile number already registered to another account");
      if (dupes.email) errors.push("Email already registered to another account");
      if (dupes.sso) errors.push("SSO username already taken");
    }
    // duplicate within this same file — checked per field, independently,
    // same granularity as Store.findDuplicateContact above. A combined key
    // of all three fields would miss two rows that only share an email.
    const emailKey = email.toLowerCase();
    const ssoKey = sso.toLowerCase();
    if (mobile && seen.mobiles.has(mobile)) errors.push("Mobile number is duplicated in another row in this file");
    if (emailKey && seen.emails.has(emailKey)) errors.push("Email is duplicated in another row in this file");
    if (ssoKey && seen.ssos.has(ssoKey)) errors.push("SSO username is duplicated in another row in this file");
    if (mobile) seen.mobiles.add(mobile);
    if (emailKey) seen.emails.add(emailKey);
    if (ssoKey) seen.ssos.add(ssoKey);

    if (jurisdiction) {
      const offices = Store.deptOffices(dept, subDept).map((o) => o.name);
      if (!offices.includes(jurisdiction)) errors.push(`Jurisdiction "${jurisdiction}" not found for this department/sub-department`);
    }
    if (designation) {
      const desigs = Store.deptDesignations(dept, subDept).map((d) => d.name);
      if (!desigs.includes(designation)) errors.push(`Designation "${designation}" not found for this department/sub-department`);
    }
    return { name, sso, mobile, email, jurisdiction, designation, errors };
  }

  function renderBulkPreview() {
    const body = document.getElementById("bulkPreviewBody");
    body.innerHTML = "";
    const validCount = bulkRows.filter((r) => !r.errors.length).length;
    bulkRows.forEach((r, i) => {
      const ok = !r.errors.length;
      const tr = document.createElement("tr");
      tr.className = ok ? "is-ok" : "is-error";
      tr.innerHTML = `<td>${i + 1}</td><td>${esc(r.name)}</td><td>${esc(r.sso)}</td><td>${esc(r.mobile)}</td><td>${esc(r.email)}</td><td>${esc(r.jurisdiction || "—")}</td><td>${esc(r.designation || "—")}</td>
        <td>${ok ? '<span class="bulk-status is-ok"><span class="material-icons">check_circle</span>Ready</span>' : `<span class="bulk-status is-error"><span class="material-icons">error</span>${esc(r.errors.join("; "))}</span>`}</td>`;
      body.appendChild(tr);
    });
    document.getElementById("bulkPreviewSummary").innerHTML =
      `<span class="material-icons">description</span>${bulkRows.length} row${bulkRows.length === 1 ? "" : "s"} found — <strong>${validCount} ready</strong>, ${bulkRows.length - validCount} with errors`;
    document.getElementById("bulkPreviewWrap").hidden = false;
    document.getElementById("bulkResultsWrap").hidden = true;
    const createBtn = document.getElementById("bulkCreateBtn");
    createBtn.disabled = validCount === 0;
    createBtn.innerHTML = `<span class="material-icons">check</span>Create ${validCount} Account${validCount === 1 ? "" : "s"}`;
  }

  document.getElementById("bulkFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById("bulkFileName").textContent = file.name;
    const dept = document.getElementById("wDept").value;
    const subDept = document.getElementById("wSubDept").value;
    const reader = new FileReader();
    reader.onload = () => {
      const allRows = parseCsv(String(reader.result));
      if (!allRows.length) { bulkRows = []; renderBulkPreview(); return; }
      const dataRows = allRows.slice(1); // skip header row
      const seen = { mobiles: new Set(), emails: new Set(), ssos: new Set() };
      bulkRows = dataRows
        .filter((r) => r.some((cell) => (cell || "").trim()))
        .map((r) => validateBulkRow(r, dept, subDept, seen));
      renderBulkPreview();
    };
    reader.readAsText(file);
  });

  document.getElementById("bulkCreateBtn").addEventListener("click", () => {
    const dept = document.getElementById("wDept").value;
    const subDept = document.getElementById("wSubDept").value;
    const valid = bulkRows.filter((r) => !r.errors.length);
    const failed = bulkRows.filter((r) => r.errors.length);
    valid.forEach((r) => {
      const match = r.designation ? Store.deptDesignations(dept, subDept).find((d) => d.name === r.designation) : null;
      Store.addOfficer({
        name: r.name, role: r.designation, designation: r.designation, dept, subDept, jurisdiction: r.jurisdiction,
        sso: r.sso, mobile: r.mobile, email: r.email,
        reportsTo: (match && match.reportsTo) || "Top Level",
        status: "pending",
        verifyToken: Store.genToken(),
      });
    });
    document.getElementById("bulkResultsBanner").innerHTML =
      `<span class="material-icons">${failed.length ? "info" : "check_circle"}</span>` +
      `<strong>${valid.length} of ${bulkRows.length}</strong> accounts created — each is Pending until its owner sets a password. ` +
      (failed.length ? `${failed.length} row${failed.length === 1 ? "" : "s"} need fixing and re-uploading.` : "All rows created successfully.");
    const failuresBody = document.getElementById("bulkFailuresBody");
    failuresBody.innerHTML = "";
    failed.forEach((r, i) => {
      const originalIndex = bulkRows.indexOf(r) + 1;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${originalIndex}</td><td>${esc(r.name || "—")}</td><td>${esc(r.errors.join("; "))}</td>`;
      failuresBody.appendChild(tr);
    });
    document.getElementById("bulkPreviewWrap").hidden = true;
    document.getElementById("bulkResultsWrap").hidden = false;
    document.getElementById("bulkResultsWrap").querySelector(".bulk-preview-table-wrap").hidden = failed.length === 0;
    document.getElementById("bulkCreateBtn").disabled = true;
    document.getElementById("bulkCreateBtn").innerHTML = '<span class="material-icons">check</span>Accounts Created';
  });

  // ---- Success modal ----
  successModal.querySelectorAll("[data-success-close]").forEach((b) => b.addEventListener("click", () => close(successModal)));
  document.getElementById("successAddAnother").addEventListener("click", () => {
    close(successModal);
    openWizard();
  });

  // ---- Transfer modal ----
  // Only officers actually unlinked from a department (via the "Unlink
  // Officer" action — see Store.unlinkOfficer) show up here. This used to
  // list arbitrary officers regardless of status, which conflated "someone
  // transferred away from their old post" with "someone already has a job
  // elsewhere" — see the separate "Link an existing SSO account" search
  // below for that second case.
  const transferList = document.getElementById("transferList");
  const transferSearch = document.getElementById("transferSearch");
  function transferPool() {
    if (typeof Store === "undefined") return [];
    return Store.transferredOfficers();
  }
  function currentWizardContext() {
    return {
      dept: document.getElementById("wDept").value,
      subDept: document.getElementById("wSubDept").value,
      jurisdiction: document.getElementById("wJuris").value,
      designation: document.getElementById("wDesig").value,
    };
  }
  function renderTransfer(query) {
    const q = (query || "").trim().toLowerCase();
    transferList.innerHTML = "";
    const pool = transferPool().filter((o) =>
      !q || `${o.name} ${o.lastDesignation || o.designation || ""} ${o.lastDept || ""}`.toLowerCase().includes(q)
    );
    if (!pool.length) {
      transferList.innerHTML = `<div class="empty-list">No transferred officers waiting to be linked right now.</div>`;
      return;
    }
    pool.forEach((o) => {
      const card = document.createElement("div");
      card.className = "officer-card";
      card.innerHTML = officerCard(
        `<button class="btn-add-officer" data-transfer-add="${o.id}">Link Officer</button>`,
        { ...o, role: `Previously: ${o.lastDesignation || "—"} (${o.lastDept || "—"})`, dept: "Unlinked", subDept: "—", jurisdiction: "—" }
      );
      transferList.appendChild(card);
    });
  }
  if (transferSearch) transferSearch.addEventListener("input", (e) => renderTransfer(e.target.value));
  transferList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-transfer-add]");
    if (!btn) return;
    const id = Number(btn.dataset.transferAdd);
    Store.linkOfficer(id, currentWizardContext());
    btn.textContent = "Linked ✓";
    btn.disabled = true;
    btn.classList.add("is-added");
  });
  document.getElementById("openTransfer").addEventListener("click", () => { renderTransfer(""); open(transferModal); });
  transferModal.querySelectorAll("[data-transfer-close]").forEach((b) => b.addEventListener("click", () => close(transferModal)));

  // ---- Link an existing SSO account ----
  // Distinct from the transfer list above: this searches EVERY officer (not
  // just ones explicitly unlinked) by contact info. If a match already
  // belongs to a department, linking here would silently move them out of
  // their real job, so that's refused with an explanation instead.
  const linkExistingPanel = document.getElementById("linkExistingPanel");
  const linkExistingQuery = document.getElementById("linkExistingQuery");
  const linkExistingFind = document.getElementById("linkExistingFind");
  const linkExistingResult = document.getElementById("linkExistingResult");
  document.getElementById("openLinkExisting").addEventListener("click", () => {
    linkExistingPanel.hidden = !linkExistingPanel.hidden;
    if (!linkExistingPanel.hidden) linkExistingQuery.focus();
  });
  function findExistingAccount(query) {
    const q = query.trim().toLowerCase();
    if (!q || typeof Store === "undefined") return null;
    return Store.officers().find(
      (o) => (o.email || "").toLowerCase() === q || (o.mobile || "") === query.trim() || (o.sso || "").toLowerCase() === q
    ) || null;
  }
  function renderLinkExistingResult(officer) {
    if (!officer) {
      linkExistingResult.innerHTML = `<p class="empty-list">No matching account found. Try a different email, mobile number, or SSO username.</p>`;
      return;
    }
    if (officer.dept) {
      linkExistingResult.innerHTML = `<p class="empty-list">This account already belongs to ${esc(officer.dept)}${officer.subDept ? " — " + esc(officer.subDept) : ""}. Unlink them there first, or use "Transferred Officer" once they are.</p>`;
      return;
    }
    const card = document.createElement("div");
    card.className = "officer-card";
    card.innerHTML = officerCard(
      `<button class="btn-add-officer" id="linkExistingConfirm">Link to This Department</button>`,
      { ...officer, dept: "Unlinked", subDept: "—", jurisdiction: "—" }
    );
    linkExistingResult.innerHTML = "";
    linkExistingResult.appendChild(card);
    document.getElementById("linkExistingConfirm").addEventListener("click", (e) => {
      Store.linkOfficer(officer.id, currentWizardContext());
      e.target.textContent = "Linked ✓";
      e.target.disabled = true;
      e.target.classList.add("is-added");
    });
  }
  linkExistingFind.addEventListener("click", () => renderLinkExistingResult(findExistingAccount(linkExistingQuery.value)));
  linkExistingQuery.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); linkExistingFind.click(); }
  });

  // ---- Backdrop click + Esc ----
  [wizard, successModal, transferModal].forEach((m) => {
    m.addEventListener("mousedown", (e) => { if (e.target === m) close(m); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!transferModal.hidden) return close(transferModal);
    if (!successModal.hidden) return close(successModal);
    if (!wizard.hidden) return close(wizard);
  });

  // ---- Global open triggers ----
  // On a department- or sub-department-scoped page (e.g.
  // users-officers.html?dept=...&sub=...), default the wizard to that exact
  // context instead of making the admin pick it again. Resolved against the
  // real 75-department directory (deptBySlug/subDeptBySlug) — deptByJurSlug
  // only ever matched the small 3-department onboarded list, so this used
  // to silently fail to default anything for the other 72 departments.
  function resolveDefaultContext(params) {
    let defaultDept = null;
    let defaultSubDept = null;
    if (typeof Store !== "undefined") {
      const deptSlug = params.get("dept");
      defaultDept = deptSlug ? Store.deptBySlug(deptSlug) : null;
      if (defaultDept) {
        const resolvedSub = Store.subDeptBySlug(defaultDept, params.get("sub"));
        defaultSubDept = resolvedSub !== null ? resolvedSub : null;
      }
    }
    return { defaultDept, defaultSubDept };
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest('[data-open="officer"]')) return;
    const { defaultDept, defaultSubDept } = resolveDefaultContext(new URLSearchParams(window.location.search));
    openWizard(null, defaultDept, defaultSubDept);
  });

  // ---- Auto-open ----
  // Reached via a redirect (e.g. Create Admin Login's "Create a new user"
  // banner, which hands off here instead of duplicating this form) —
  // ?openAdd=1 opens the wizard immediately instead of making the admin
  // find and click "Add New User" themselves after landing.
  const initialParams = new URLSearchParams(window.location.search);
  if (initialParams.get("openAdd") === "1") {
    const { defaultDept, defaultSubDept } = resolveDefaultContext(initialParams);
    openWizard(null, defaultDept, defaultSubDept);
    initialParams.delete("openAdd");
    const cleanQuery = initialParams.toString();
    window.history.replaceState({}, "", window.location.pathname + (cleanQuery ? `?${cleanQuery}` : ""));
  }
})();
