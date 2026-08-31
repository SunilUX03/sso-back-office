// ============================================================
// TN SSO — "Onboard / Edit Department" wizard (Super Admin only)
// + success modal. Built from real UX4G components (Modal,
// Button, Input, Badge, OTP) — see ux4g-al-* rules in styles.css
// for the small step-indicator glue between them.
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
              <div class="ux4g-modal-header-title" id="dwTitle">Onboard New Department</div>
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
              <div class="ux4g-al-field">
                <label class="ux4g-label-m-default">Mobile Number <span class="ux4g-al-req">*</span></label>
                <div class="ux4g-al-otp-row">
                  <div class="ux4g-input ux4g-input-md"><input class="ux4g-input-input" id="dwAdminMobile" type="tel" placeholder="10-digit mobile number" maxlength="10" /></div>
                  <button class="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md" id="dwSendOtp" type="button">Send OTP</button>
                </div>
                <div class="ux4g-otp" id="dwOtpBlock" hidden>
                  <span class="ux4g-otp-label">Enter the 6-digit OTP sent to this number</span>
                  <div class="ux4g-otp-group" id="dwOtpGroup"></div>
                  <div class="ux4g-otp-meta ux4g-otp-meta-between">
                    <span class="ux4g-otp-helper" id="dwOtpTimer">Resend in 00:30</span>
                    <a class="ux4g-otp-resend" href="#" id="dwOtpResend">Resend OTP</a>
                  </div>
                </div>
                <div class="ux4g-al-otp-verified" id="dwMobileVerified" hidden>
                  <span class="ux4g-icon-outlined" style="font-size:16px">check_circle</span>
                  Mobile number verified
                </div>
              </div>
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
          <div class="ux4g-modal-body-title" id="dsTitle">Department Onboarded Successfully!</div>
          <p id="dsSubtext">The department has been added and its admin login created. Credentials have been sent to the admin's registered email address.</p>
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
  const titleEl = document.getElementById("dwTitle");
  const steps = wizard.querySelectorAll(".ux4g-al-wizard-step");
  const nextBtn = wizard.querySelector("[data-dw-next]");
  const backBtn = wizard.querySelector("[data-dw-back]");
  const submitBtn = document.getElementById("dwSubmitBtn");
  const mobileInput = document.getElementById("dwAdminMobile");
  const sendOtpBtn = document.getElementById("dwSendOtp");
  const otpBlock = document.getElementById("dwOtpBlock");
  const otpGroup = document.getElementById("dwOtpGroup");
  const otpResend = document.getElementById("dwOtpResend");
  const otpTimer = document.getElementById("dwOtpTimer");
  const mobileVerifiedEl = document.getElementById("dwMobileVerified");
  const STEP_LABELS = ["Department Identity", "Department Admin", "Review & Submit"];
  let current = 1;
  let editingId = null;
  let mobileVerified = false;
  let resendTimer = null;

  function lock() { document.body.style.overflow = "hidden"; }
  function unlock() { if (!wizard.classList.contains("is-open") && !success.classList.contains("is-open")) document.body.style.overflow = ""; }
  function open(m) { m.classList.add("is-open"); lock(); }
  function close(m) { m.classList.remove("is-open"); unlock(); }

  // ---- Mobile OTP verification (mock — no real SMS gateway) ----
  function buildOtpSlots() {
    otpGroup.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      const wrap2 = document.createElement("div");
      wrap2.className = "ux4g-input ux4g-otp-slot";
      wrap2.innerHTML = `<input class="ux4g-input-input ux4g-otp-input" maxlength="1" inputmode="numeric" autocomplete="one-time-code" />`;
      otpGroup.appendChild(wrap2);
    }
    const slots = Array.from(otpGroup.querySelectorAll(".ux4g-otp-input"));
    slots.forEach((slot, i) => {
      slot.addEventListener("input", () => {
        slot.value = slot.value.replace(/\D/g, "").slice(0, 1);
        if (slot.value && slots[i + 1]) slots[i + 1].focus();
        checkOtpComplete(slots);
      });
      slot.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !slot.value && slots[i - 1]) slots[i - 1].focus();
      });
    });
  }
  function checkOtpComplete(slots) {
    const code = slots.map((s) => s.value).join("");
    if (code.length === 6) verifyOtp();
  }
  function verifyOtp() {
    // Mock verification: any 6-digit code is accepted (no SMS backend in this prototype).
    mobileVerified = true;
    otpBlock.hidden = true;
    mobileVerifiedEl.hidden = false;
    mobileInput.setAttribute("readonly", "readonly");
    clearInterval(resendTimer);
    updateNextEnabled();
  }
  function startResendTimer() {
    let secs = 30;
    otpResend.classList.add("ux4g-otp-resend-disabled");
    otpTimer.hidden = false;
    otpResend.style.pointerEvents = "none";
    clearInterval(resendTimer);
    otpTimer.textContent = `Resend in 00:${String(secs).padStart(2, "0")}`;
    resendTimer = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        clearInterval(resendTimer);
        otpTimer.hidden = true;
        otpResend.classList.remove("ux4g-otp-resend-disabled");
        otpResend.style.pointerEvents = "";
        return;
      }
      otpTimer.textContent = `Resend in 00:${String(secs).padStart(2, "0")}`;
    }, 1000);
  }
  sendOtpBtn.addEventListener("click", () => {
    if (!/^\d{10}$/.test(mobileInput.value.trim())) {
      mobileInput.focus();
      return;
    }
    sendOtpBtn.hidden = true;
    mobileInput.setAttribute("readonly", "readonly");
    otpBlock.hidden = false;
    buildOtpSlots();
    otpGroup.querySelector(".ux4g-otp-input").focus();
    startResendTimer();
  });
  otpResend.addEventListener("click", (e) => {
    e.preventDefault();
    if (otpResend.classList.contains("ux4g-otp-resend-disabled")) return;
    buildOtpSlots();
    otpGroup.querySelector(".ux4g-otp-input").focus();
    startResendTimer();
  });
  mobileInput.addEventListener("input", () => {
    // Editing the number after verification requires re-verifying.
    if (mobileVerified) {
      mobileVerified = false;
      mobileVerifiedEl.hidden = true;
      updateNextEnabled();
    }
  });
  function resetMobileVerification(prefillVerified) {
    mobileVerified = !!prefillVerified;
    mobileInput.removeAttribute("readonly");
    sendOtpBtn.hidden = false;
    otpBlock.hidden = true;
    mobileVerifiedEl.hidden = !prefillVerified;
    clearInterval(resendTimer);
  }
  function updateNextEnabled() {
    if (current === 2) nextBtn.disabled = !mobileVerified;
    else nextBtn.disabled = false;
  }

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
    updateNextEnabled();
    if (n === STEP_LABELS.length) renderReview();
    wizard.querySelector(".ux4g-modal-box").scrollTop = 0;
  }

  // ---- review ------------------------------------------------
  function val(id, fallback) { const e = document.getElementById(id); return (e && e.value && e.value.trim()) || fallback; }
  function reviewRow(label, value) {
    return `<div class="ux4g-al-review-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }
  function deptDisplay(name, code) {
    return code ? `${name} (${code})` : name;
  }
  function renderReview() {
    document.getElementById("dwReview").innerHTML = `
      <div class="ux4g-al-review-card">
        <div class="ux4g-al-review-card-title">Department Identity</div>
        ${reviewRow("Department", deptDisplay(val("dwName", "—"), val("dwCode", "")))}
        ${reviewRow("Description", val("dwDesc", "—"))}
      </div>
      <div class="ux4g-al-review-card">
        <div class="ux4g-al-review-card-title">Department Admin</div>
        ${reviewRow("Admin Name", val("dwAdminName", "—"))}
        ${reviewRow("Email", val("dwAdminEmail", "—"))}
        ${reviewRow("Mobile Number", val("dwAdminMobile", "—") + (mobileVerified ? " ✓ verified" : ""))}
        ${reviewRow("SSO Username", val("dwAdminSso", "—"))}
      </div>`;
  }

  // ---- navigation ------------------------------------------
  nextBtn.addEventListener("click", () => {
    if (current === 2 && !mobileVerified) return;
    showStep(Math.min(current + 1, STEP_LABELS.length));
  });
  backBtn.addEventListener("click", () => showStep(Math.max(current - 1, 1)));
  wizard.querySelectorAll("[data-dw-close]").forEach((b) => b.addEventListener("click", () => close(wizard)));

  submitBtn.addEventListener("click", () => {
    const name = val("dwName", "New Department");
    const code = val("dwCode", "");
    const admin = {
      name: val("dwAdminName", "New Admin"),
      email: val("dwAdminEmail", "—"),
      mobile: val("dwAdminMobile", "—"),
      sso: val("dwAdminSso", "—"),
    };
    if (editingId) {
      Store.updateDepartment(editingId, { name, code, admin });
      document.getElementById("dsTitle").textContent = "Department Updated Successfully!";
      document.getElementById("dsSubtext").textContent = "The department and its admin login have been updated.";
      document.getElementById("dsAddAnother").hidden = true;
    } else {
      Store.addDepartment({ name, code, admin });
      document.getElementById("dsTitle").textContent = "Department Onboarded Successfully!";
      document.getElementById("dsSubtext").textContent = "The department has been added and its admin login created. Credentials have been sent to the admin's registered email address.";
      document.getElementById("dsAddAnother").hidden = false;
    }
    document.getElementById("dsName").textContent = deptDisplay(name, code);
    document.getElementById("dsAdminName").textContent = admin.name;
    document.getElementById("dsAdminSso").textContent = admin.sso;
    close(wizard);
    open(success);
  });

  function openWizard(editRecord) {
    wizard.querySelectorAll("input, textarea").forEach((el) => (el.value = ""));
    editingId = editRecord ? editRecord.id : null;
    if (editRecord) {
      titleEl.textContent = "Edit Department";
      submitBtn.textContent = "Save Changes";
      document.getElementById("dwName").value = editRecord.dept || "";
      document.getElementById("dwCode").value = editRecord.code || "";
      document.getElementById("dwAdminName").value = editRecord.name || "";
      document.getElementById("dwAdminEmail").value = editRecord.email || "";
      mobileInput.value = editRecord.mobile || "";
      document.getElementById("dwAdminSso").value = editRecord.sso || "";
      resetMobileVerification(true);
    } else {
      titleEl.textContent = "Onboard New Department";
      submitBtn.textContent = "Onboard Department";
      resetMobileVerification(false);
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
