// ============================================================
// TN SSO — "Onboard New Department" wizard (Super Admin only)
// + success modal. Injected into <body>. Exposes
// window.openDepartmentWizard(). Open triggers: any element
// with [data-open="department"].
// Load AFTER store.js and BEFORE departments.js.
// ============================================================
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function field(label, control, opts) {
    opts = opts || {};
    const req = opts.required ? ' <span class="field-req">*</span>' : "";
    const span = opts.span ? " col-2" : "";
    return `<div class="field${span}"><label class="field-label">${label}${req}</label>${control}</div>`;
  }
  function input(id, ph, type) {
    return `<input class="field-control" id="${id}" type="${type || "text"}" placeholder="${esc(ph)}" />`;
  }
  function textarea(id, ph) {
    return `<textarea class="field-control" id="${id}" rows="3" placeholder="${esc(ph)}"></textarea>`;
  }

  // ---- inject markup ---------------------------------------
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <div class="modal-backdrop" id="deptWizard" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Onboard New Department">
      <button class="modal-close" data-dw-close aria-label="Close" style="position:absolute;top:24px;right:24px;">
        <span class="material-icons">close</span>
      </button>
      <div class="wizard-title is-left">
        <img src="assets/imgImage10.png" alt="" />
        <h2>Onboard New Department</h2>
      </div>
      <div class="stepper" id="dwStepper"></div>

      <!-- Step 1: Department Identity -->
      <div class="wizard-step" data-step="1">
        <form class="form-grid" onsubmit="return false">
          ${field("Department Name", input("dwName", "e.g. Department of Agriculture"), { required: true, span: true })}
          ${field("Short Code", input("dwCode", "e.g. AGRI"), { required: true })}
          ${field("Description", textarea("dwDesc", "Brief about this department (optional)"), { span: true })}
        </form>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg" data-dw-close>Cancel</button>
          <button class="btn btn-primary-alt btn-lg" data-dw-next>Next Step</button>
        </div>
      </div>

      <!-- Step 2: Department Admin -->
      <div class="wizard-step" data-step="2" hidden>
        <p class="wizard-subtitle">Who will administer this department?</p>
        <form class="form-grid" onsubmit="return false">
          ${field("Admin Full Name", input("dwAdminName", "Enter full name"), { required: true, span: true })}
          ${field("Email", input("dwAdminEmail", "name@tn.gov.in", "email"), { required: true })}
          ${field("Mobile Number", input("dwAdminMobile", "10-digit mobile number", "tel"), { required: true })}
          ${field("SSO Username", input("dwAdminSso", "Login username for this admin"), { required: true, span: true })}
        </form>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg" data-dw-back>Back</button>
          <button class="btn btn-primary-alt btn-lg" data-dw-next>Next Step</button>
        </div>
      </div>

      <!-- Step 3: Review -->
      <div class="wizard-step" data-step="3" hidden>
        <p class="wizard-subtitle">Review before onboarding</p>
        <div id="dwReview"></div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg" data-dw-back>Back</button>
          <button class="btn btn-primary-alt btn-lg" id="dwSubmitBtn">Onboard Department</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Success modal -->
  <div class="modal-backdrop" id="deptSuccess" hidden>
    <div class="modal modal-sm" role="dialog" aria-modal="true" aria-label="Department onboarded">
      <button class="modal-close" data-ds-close aria-label="Close" style="position:absolute;top:24px;right:24px;">
        <span class="material-icons">close</span>
      </button>
      <div class="success-body">
        <div class="success-check">&#10003;</div>
        <h2 class="success-title">Department Onboarded Successfully!</h2>
        <p class="wizard-subtitle" style="margin:0;text-align:center">
          The department has been added and its admin login created.<br />
          Credentials have been sent to the admin's registered email address.
        </p>
        <div class="detail-table">
          <div class="detail-table-head">Department Details</div>
          <div class="detail-row"><span class="detail-key">Department Name</span><span class="detail-val" id="dsName">&mdash;</span></div>
          <div class="detail-row"><span class="detail-key">Admin Name</span><span class="detail-val" id="dsAdminName">&mdash;</span></div>
          <div class="detail-row"><span class="detail-key">SSO Username</span><span class="detail-val" id="dsAdminSso">&mdash;</span></div>
          <div class="detail-row"><span class="detail-key">Status</span><span class="detail-val status-active">Active</span></div>
        </div>
        <div class="note-box note-warn" style="margin-top:0">
          <span class="material-icons">vpn_key</span>
          <span>A temporary password has been sent to the admin's email. They'll be asked to set a new one on first login.</span>
        </div>
        <div class="modal-footer wide">
          <button class="btn btn-primary-alt btn-officer" id="dsAddAnother">Onboard Another Department</button>
          <button class="btn-text" data-ds-close>Go to Dashboard</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap);

  // ---- refs ------------------------------------------------
  const wizard = document.getElementById("deptWizard");
  const success = document.getElementById("deptSuccess");
  const stepperEl = document.getElementById("dwStepper");
  const steps = wizard.querySelectorAll(".wizard-step");
  const STEP_LABELS = ["Department Identity", "Department Admin", "Review & Submit"];
  let current = 1;

  function lock() { document.body.style.overflow = "hidden"; }
  function unlock() { if (wizard.hidden && success.hidden) document.body.style.overflow = ""; }
  function open(m) { m.hidden = false; lock(); }
  function close(m) { m.hidden = true; unlock(); }

  function renderStepper(active) {
    let html = "";
    STEP_LABELS.forEach((label, i) => {
      const n = i + 1;
      const cls = n < active ? "is-done" : n === active ? "is-active" : "";
      const inner = n < active ? "&#10003;" : String(n);
      html += `<div class="step-item ${cls}"><span class="step-circle-num">${inner}</span><span class="step-label">${label}</span></div>`;
      if (i < STEP_LABELS.length - 1) html += `<div class="step-connector ${active > n ? "is-done" : ""}"></div>`;
    });
    stepperEl.innerHTML = html;
  }
  function showStep(n) {
    current = n;
    steps.forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
    renderStepper(n);
    if (n === 3) renderReview();
    wizard.querySelector(".modal").scrollTop = 0;
  }

  // ---- review ------------------------------------------------
  function val(id, fallback) { const e = document.getElementById(id); return (e && e.value && e.value.trim()) || fallback; }
  function reviewCard(title, step, pairs) {
    const items = pairs.map((p) => `<div class="review-item"><span class="review-label">${esc(p[0])}</span><span class="review-value">${esc(p[1])}</span></div>`).join("");
    return `<div class="review-card">
      <div class="review-head"><span class="review-title">${esc(title)}</span><a href="#" class="review-edit" data-dw-edit="${step}">Edit</a></div>
      <div class="review-grid">${items}</div>
    </div>`;
  }
  function renderReview() {
    document.getElementById("dwReview").innerHTML =
      reviewCard("1. Department Identity", 1, [
        ["Department Name", val("dwName", "—")],
        ["Short Code", val("dwCode", "—")],
        ["Description", val("dwDesc", "—")],
      ]) +
      reviewCard("2. Department Admin", 2, [
        ["Admin Name", val("dwAdminName", "—")],
        ["Email", val("dwAdminEmail", "—")],
        ["Mobile Number", val("dwAdminMobile", "—")],
        ["SSO Username", val("dwAdminSso", "—")],
      ]);
  }
  document.getElementById("dwReview")?.addEventListener("click", (e) => {
    const edit = e.target.closest("[data-dw-edit]");
    if (!edit) return;
    e.preventDefault();
    showStep(Number(edit.dataset.dwEdit));
  });

  // ---- navigation ------------------------------------------
  wizard.addEventListener("click", (e) => {
    if (e.target.closest("[data-dw-next]")) showStep(Math.min(current + 1, 3));
    else if (e.target.closest("[data-dw-back]")) showStep(Math.max(current - 1, 1));
    else if (e.target.closest("[data-dw-close]")) close(wizard);
    else if (e.target.closest("[data-dw-edit]")) return;
  });

  document.getElementById("dwSubmitBtn").addEventListener("click", () => {
    const name = val("dwName", "New Department");
    const admin = {
      name: val("dwAdminName", "New Admin"),
      email: val("dwAdminEmail", "—"),
      mobile: val("dwAdminMobile", "—"),
      sso: val("dwAdminSso", "—"),
    };
    Store.addDepartment({ name, admin });
    document.getElementById("dsName").textContent = name;
    document.getElementById("dsAdminName").textContent = admin.name;
    document.getElementById("dsAdminSso").textContent = admin.sso;
    close(wizard);
    open(success);
  });

  function openWizard() {
    wizard.querySelectorAll("input, textarea").forEach((el) => (el.value = ""));
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
    if (!success.hidden) return close(success);
    if (!wizard.hidden) return close(wizard);
  });

  // ---- global open trigger ---------------------------------
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-open="department"]')) { e.preventDefault(); openWizard(); }
  });
})();
