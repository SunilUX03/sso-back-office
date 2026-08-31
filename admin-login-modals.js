// ============================================================
// TN SSO — "Onboard New Department" wizard (Super Admin only)
// + success modal. Built from real UX4G components (Modal,
// Button, Input, Badge) — see ux4g-al-* rules in styles.css for
// the small step-indicator glue between them.
// Exposes window.openDepartmentWizard(). Open triggers: any
// element with [data-open="department"].
// Load AFTER store.js and BEFORE admin-logins.js.
// ============================================================
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function field(label, control, opts) {
    opts = opts || {};
    const req = opts.required ? ' <span class="ux4g-al-req">*</span>' : "";
    return `<div class="ux4g-al-field"><label class="ux4g-label-m-default">${label}${req}</label>${control}</div>`;
  }
  function input(id, ph, type) {
    return `<div class="ux4g-input ux4g-input-md"><input class="ux4g-input-input" id="${id}" type="${type || "text"}" placeholder="${esc(ph)}" /></div>`;
  }
  function textarea(id, ph) {
    return `<div class="ux4g-textarea ux4g-textarea-md"><textarea class="ux4g-textarea-input" id="${id}" rows="3" placeholder="${esc(ph)}"></textarea></div>`;
  }

  // ---- inject markup ---------------------------------------
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <div class="ux4g-modal-backdrop ux4g-modal-backdrop-50" id="deptWizard">
    <div class="ux4g-modal">
      <div class="ux4g-modal-box ux4g-modal-m">
        <div class="ux4g-modal-header">
          <div class="ux4g-modal-header-title-content">
            <div>
              <div class="ux4g-modal-header-title">Onboard New Department</div>
              <div class="ux4g-modal-header-sub-heading" id="dwStepSub">Step 1 of 3 &middot; Department Identity</div>
            </div>
          </div>
          <button class="ux4g-modal-close" data-dw-close aria-label="Close" type="button">
            <span class="ux4g-icon-outlined ux4g-modal-close-icon">close</span>
          </button>
        </div>

        <div class="ux4g-modal-body">
          <div class="ux4g-al-steps" id="dwStepper"></div>

          <!-- Step 1: Department Identity -->
          <div class="ux4g-al-wizard-step" data-step="1">
            <form class="ux4g-al-form-grid" onsubmit="return false">
              ${field("Department Name", input("dwName", "e.g. Department of Agriculture"), { required: true })}
              ${field("Short Code", input("dwCode", "e.g. AGRI"), { required: true })}
              ${field("Description", textarea("dwDesc", "Brief about this department (optional)"))}
            </form>
          </div>

          <!-- Step 2: Department Admin -->
          <div class="ux4g-al-wizard-step" data-step="2" hidden>
            <p class="ux4g-al-step-intro">Who will administer this department?</p>
            <form class="ux4g-al-form-grid" onsubmit="return false">
              ${field("Admin Full Name", input("dwAdminName", "Enter full name"), { required: true })}
              ${field("Email", input("dwAdminEmail", "name@tn.gov.in", "email"), { required: true })}
              ${field("Mobile Number", input("dwAdminMobile", "10-digit mobile number", "tel"), { required: true })}
              ${field("SSO Username", input("dwAdminSso", "Login username for this admin"), { required: true })}
            </form>
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
          <button class="ux4g-btn ux4g-btn-primary ux4g-btn-md" id="dwSubmitBtn" type="button" hidden>Onboard Department</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Success modal -->
  <div class="ux4g-modal-backdrop ux4g-modal-backdrop-50" id="deptSuccess">
    <div class="ux4g-modal">
      <div class="ux4g-modal-box ux4g-modal-s ux4g-modal-center-content">
        <div class="ux4g-modal-header">
          <div class="ux4g-modal-header-title-content"></div>
          <button class="ux4g-modal-close" data-ds-close aria-label="Close" type="button">
            <span class="ux4g-icon-outlined ux4g-modal-close-icon">close</span>
          </button>
        </div>
        <div class="ux4g-modal-body">
          <div class="ux4g-al-success-check"><span class="ux4g-icon-outlined" style="font-size:28px">check</span></div>
          <div class="ux4g-modal-body-title">Department Onboarded Successfully!</div>
          <p>The department has been added and its admin login created. Credentials have been sent to the admin's registered email address.</p>
          <div class="ux4g-al-review-card">
            <div class="ux4g-al-review-row"><span>Department Name</span><strong id="dsName">&mdash;</strong></div>
            <div class="ux4g-al-review-row"><span>Admin Name</span><strong id="dsAdminName">&mdash;</strong></div>
            <div class="ux4g-al-review-row"><span>SSO Username</span><strong id="dsAdminSso">&mdash;</strong></div>
            <div class="ux4g-al-review-row"><span>Status</span><strong class="ux4g-al-status is-active"><span class="ux4g-badge-dot-success"></span>Active</strong></div>
          </div>
        </div>
        <div class="ux4g-modal-actions" style="justify-content:center">
          <button class="ux4g-btn ux4g-btn-primary ux4g-btn-md" id="dsAddAnother" type="button">Onboard Another Department</button>
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
  const steps = wizard.querySelectorAll(".ux4g-al-wizard-step");
  const nextBtn = wizard.querySelector("[data-dw-next]");
  const backBtn = wizard.querySelector("[data-dw-back]");
  const submitBtn = document.getElementById("dwSubmitBtn");
  const STEP_LABELS = ["Department Identity", "Department Admin", "Review & Submit"];
  let current = 1;

  function lock() { document.body.style.overflow = "hidden"; }
  function unlock() { if (!wizard.classList.contains("is-open") && !success.classList.contains("is-open")) document.body.style.overflow = ""; }
  function open(m) { m.classList.add("is-open"); lock(); }
  function close(m) { m.classList.remove("is-open"); unlock(); }

  function renderStepper(active) {
    let html = "";
    STEP_LABELS.forEach((label, i) => {
      const n = i + 1;
      const done = n < active;
      const badgeCls = done || n === active ? "ux4g-badge-digit-primary" : "ux4g-badge-digit-neutral";
      html += `<div class="ux4g-al-step ${n === active ? "is-active" : ""}">
        <span class="${badgeCls}">${done ? "&#10003;" : n}</span>
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
    if (n === STEP_LABELS.length) renderReview();
    wizard.querySelector(".ux4g-modal-box").scrollTop = 0;
  }

  // ---- review ------------------------------------------------
  function val(id, fallback) { const e = document.getElementById(id); return (e && e.value && e.value.trim()) || fallback; }
  function reviewRow(label, value) {
    return `<div class="ux4g-al-review-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }
  function renderReview() {
    document.getElementById("dwReview").innerHTML = `
      <div class="ux4g-al-review-card">
        <div class="ux4g-al-review-card-title">Department Identity</div>
        ${reviewRow("Department Name", val("dwName", "—"))}
        ${reviewRow("Short Code", val("dwCode", "—"))}
        ${reviewRow("Description", val("dwDesc", "—"))}
      </div>
      <div class="ux4g-al-review-card">
        <div class="ux4g-al-review-card-title">Department Admin</div>
        ${reviewRow("Admin Name", val("dwAdminName", "—"))}
        ${reviewRow("Email", val("dwAdminEmail", "—"))}
        ${reviewRow("Mobile Number", val("dwAdminMobile", "—"))}
        ${reviewRow("SSO Username", val("dwAdminSso", "—"))}
      </div>`;
  }

  // ---- navigation ------------------------------------------
  nextBtn.addEventListener("click", () => showStep(Math.min(current + 1, STEP_LABELS.length)));
  backBtn.addEventListener("click", () => showStep(Math.max(current - 1, 1)));
  wizard.querySelectorAll("[data-dw-close]").forEach((b) => b.addEventListener("click", () => close(wizard)));

  submitBtn.addEventListener("click", () => {
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
    if (success.classList.contains("is-open")) return close(success);
    if (wizard.classList.contains("is-open")) return close(wizard);
  });

  // ---- global open trigger ---------------------------------
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-open="department"]')) { e.preventDefault(); openWizard(); }
  });
})();
