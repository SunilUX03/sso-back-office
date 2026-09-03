// ============================================================
// TN SSO — My Profile: the logged-in Super Admin's own identity
// (editable) and account security (change password + login
// history). Settings and notification preferences are deliberately
// out of scope here — those belong on a separate Settings page.
// ============================================================
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---- Identity header ----
function renderProfile() {
  const p = Store.superAdmin();
  document.getElementById("profileName").textContent = p.name;
  document.getElementById("profileRole").textContent = p.role;
  document.getElementById("profileDept").textContent = p.department;
  document.getElementById("profileEmail").textContent = p.email;
  document.getElementById("profileMobile").textContent = p.mobile;
  document.getElementById("profileAvatar").src = p.avatar;
}

// ---- Login History ----
function renderLoginHistory() {
  const list = document.getElementById("loginHistoryList");
  list.innerHTML = Store.loginHistory()
    .map(
      (h) => `
      <div class="login-history-row">
        <span class="login-history-icon"><span class="material-icons">${esc(h.icon)}</span></span>
        <div class="login-history-info">
          <div class="login-history-device">${esc(h.device)}${h.current ? ' <span class="chip">This device</span>' : ""}</div>
          <div class="login-history-meta">${esc(h.ip)} &middot; ${esc(h.location)} &middot; ${esc(h.timestamp)}</div>
        </div>
      </div>`
    )
    .join("");
}

function renderAll() {
  renderProfile();
  renderLoginHistory();
}
renderAll();
Store.on(renderAll);

// ============================================================
// Edit Profile modal
// ============================================================
(function () {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <div class="modal-backdrop" id="editProfileModal" hidden>
    <div class="modal modal-sm" role="dialog" aria-modal="true" aria-label="Edit Profile">
      <button class="modal-close" data-ep-close aria-label="Close" type="button" style="position:absolute;top:24px;right:24px;">
        <span class="material-icons">close</span>
      </button>
      <div class="wizard-title is-left">
        <span class="material-icons" style="font-size:40px;color:var(--primary)">account_circle</span>
        <h2>Edit Profile</h2>
      </div>
      <form class="form-grid" onsubmit="return false">
        <div class="field col-2">
          <label class="field-label">Name <span class="field-req">*</span></label>
          <input class="field-control" id="epName" type="text" placeholder="Enter your name" />
        </div>
        <div class="field col-2">
          <label class="field-label">Department</label>
          <input class="field-control" id="epDept" type="text" placeholder="Enter your department" />
        </div>
        <div class="field">
          <label class="field-label">Email <span class="field-req">*</span></label>
          <input class="field-control" id="epEmail" type="text" placeholder="Enter your email" />
        </div>
        <div class="field">
          <label class="field-label">Mobile No. <span class="field-req">*</span></label>
          <input class="field-control" id="epMobile" type="text" placeholder="Enter your mobile number" />
        </div>
        <div class="field col-2 ux4g-al-field-hint" id="epChangeHint" hidden>
          Changing your email or mobile number requires a one-time verification code before it's saved.
        </div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-outline btn-lg is-text-only" data-ep-close type="button">Cancel</button>
        <button class="btn btn-primary-alt btn-lg is-text-only" id="epSaveBtn" type="button">Save Changes</button>
      </div>
    </div>
  </div>

  <!-- OTP step — only shown when Email and/or Mobile actually changed -->
  <div class="modal-backdrop" id="otpModal" hidden>
    <div class="modal modal-sm" role="dialog" aria-modal="true" aria-label="Verify to continue">
      <button class="modal-close" data-otp-close aria-label="Close" type="button" style="position:absolute;top:24px;right:24px;">
        <span class="material-icons">close</span>
      </button>
      <div class="wizard-title is-left">
        <span class="material-icons" style="font-size:40px;color:var(--primary)">verified_user</span>
        <h2>Verify to Continue</h2>
      </div>
      <p class="wizard-subtitle">Enter the one-time code sent to confirm this change.</p>

      <div class="field" id="otpEmailField" hidden>
        <label class="field-label">Code sent to <strong id="otpEmailTarget"></strong></label>
        <input class="field-control" id="otpEmailCode" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" />
        <div class="ux4g-al-field-hint">Demo code (no real SMS/email in this prototype): <strong id="otpEmailDemo"></strong></div>
      </div>
      <div class="field" id="otpMobileField" hidden style="margin-top:14px;">
        <label class="field-label">Code sent to <strong id="otpMobileTarget"></strong></label>
        <input class="field-control" id="otpMobileCode" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" />
        <div class="ux4g-al-field-hint">Demo code (no real SMS/email in this prototype): <strong id="otpMobileDemo"></strong></div>
      </div>

      <div class="note-box note-danger" id="otpError" hidden style="margin-top:14px;">
        <span class="material-icons">error_outline</span>
        <span>That code doesn't match. Please check and try again.</span>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline btn-lg is-text-only" data-otp-close type="button">Cancel</button>
        <button class="btn btn-primary-alt btn-lg is-text-only" id="otpVerifyBtn" type="button">Verify &amp; Save</button>
      </div>
    </div>
  </div>

  <input type="file" id="avatarFileInput" accept="image/*" hidden />`;
  document.body.appendChild(wrap);

  const modal = document.getElementById("editProfileModal");
  const otpModal = document.getElementById("otpModal");
  function lock() { document.body.style.overflow = "hidden"; }
  function unlock() { if (modal.hidden && otpModal.hidden) document.body.style.overflow = ""; }
  function open() {
    const p = Store.superAdmin();
    document.getElementById("epName").value = p.name;
    document.getElementById("epDept").value = p.department;
    document.getElementById("epEmail").value = p.email;
    document.getElementById("epMobile").value = p.mobile;
    document.getElementById("epChangeHint").hidden = true;
    modal.hidden = false;
    lock();
  }
  function close() { modal.hidden = true; unlock(); }

  document.getElementById("editProfileBtn").addEventListener("click", open);
  modal.querySelectorAll("[data-ep-close]").forEach((b) => b.addEventListener("click", close));
  modal.addEventListener("mousedown", (e) => { if (e.target === modal) close(); });

  function checkContactChange() {
    const p = Store.superAdmin();
    const emailChanged = document.getElementById("epEmail").value.trim() !== p.email;
    const mobileChanged = document.getElementById("epMobile").value.trim() !== p.mobile;
    document.getElementById("epChangeHint").hidden = !(emailChanged || mobileChanged);
  }
  document.getElementById("epEmail").addEventListener("input", checkContactChange);
  document.getElementById("epMobile").addEventListener("input", checkContactChange);

  // ---- OTP step ----
  function genOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }
  let pendingPatch = null;
  let expectedEmailOtp = null;
  let expectedMobileOtp = null;

  function openOtp(patch, emailChanged, mobileChanged) {
    pendingPatch = patch;
    document.getElementById("otpError").hidden = true;

    const emailField = document.getElementById("otpEmailField");
    emailField.hidden = !emailChanged;
    if (emailChanged) {
      expectedEmailOtp = genOtp();
      document.getElementById("otpEmailTarget").textContent = patch.email;
      document.getElementById("otpEmailDemo").textContent = expectedEmailOtp;
      document.getElementById("otpEmailCode").value = "";
    }

    const mobileField = document.getElementById("otpMobileField");
    mobileField.hidden = !mobileChanged;
    if (mobileChanged) {
      expectedMobileOtp = genOtp();
      document.getElementById("otpMobileTarget").textContent = patch.mobile;
      document.getElementById("otpMobileDemo").textContent = expectedMobileOtp;
      document.getElementById("otpMobileCode").value = "";
    }

    modal.hidden = true;
    otpModal.hidden = false;
    lock();
  }
  function closeOtp() { otpModal.hidden = true; unlock(); pendingPatch = null; }

  otpModal.querySelectorAll("[data-otp-close]").forEach((b) => b.addEventListener("click", closeOtp));
  otpModal.addEventListener("mousedown", (e) => { if (e.target === otpModal) closeOtp(); });

  document.getElementById("otpVerifyBtn").addEventListener("click", () => {
    if (!pendingPatch) return;
    const emailOk = document.getElementById("otpEmailField").hidden || document.getElementById("otpEmailCode").value.trim() === expectedEmailOtp;
    const mobileOk = document.getElementById("otpMobileField").hidden || document.getElementById("otpMobileCode").value.trim() === expectedMobileOtp;
    if (!emailOk || !mobileOk) {
      document.getElementById("otpError").hidden = false;
      return;
    }
    Store.updateSuperAdmin(pendingPatch);
    closeOtp();
  });

  document.getElementById("epSaveBtn").addEventListener("click", () => {
    const name = document.getElementById("epName").value.trim();
    const email = document.getElementById("epEmail").value.trim();
    const mobile = document.getElementById("epMobile").value.trim();
    if (!name || !email || !mobile) return;

    const current = Store.superAdmin();
    const patch = { name, department: document.getElementById("epDept").value.trim(), email, mobile };
    const emailChanged = email !== current.email;
    const mobileChanged = mobile !== current.mobile;

    if (emailChanged || mobileChanged) {
      openOtp(patch, emailChanged, mobileChanged);
    } else {
      Store.updateSuperAdmin(patch);
      close();
    }
  });

  // ---- Change photo — a real client-side preview (FileReader), persisted
  // to Store, since there's no upload backend in this prototype to send it to. ----
  const avatarFileInput = document.getElementById("avatarFileInput");
  document.getElementById("editAvatarBtn").addEventListener("click", () => avatarFileInput.click());
  avatarFileInput.addEventListener("change", () => {
    const file = avatarFileInput.files && avatarFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => Store.updateSuperAdmin({ avatar: reader.result });
    reader.readAsDataURL(file);
    avatarFileInput.value = "";
  });
})();

// ============================================================
// Change Password modal — reuses the same live requirements
// checklist as set-password.js (Verify Account / Set Password),
// so a returning admin sees identical password rules either way.
// ============================================================
(function () {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <div class="modal-backdrop" id="pwModal" hidden>
    <div class="modal modal-sm" role="dialog" aria-modal="true" aria-label="Change Password">
      <button class="modal-close" data-pw-close aria-label="Close" type="button" style="position:absolute;top:24px;right:24px;">
        <span class="material-icons">close</span>
      </button>
      <div class="wizard-title is-left">
        <span class="material-icons" style="font-size:40px;color:var(--primary)">lock</span>
        <h2>Change Password</h2>
      </div>
      <form onsubmit="return false">
        <div class="ux4g-al-field">
          <label class="ux4g-label-m-default">Current Password <span class="ux4g-al-req">*</span></label>
          <div class="ux4g-input ux4g-input-md">
            <input class="ux4g-input-input" id="curPassword" type="password" placeholder="Enter current password" autocomplete="current-password" />
          </div>
        </div>
        <div class="ux4g-al-field" style="margin-top:14px;">
          <label class="ux4g-label-m-default">New Password <span class="ux4g-al-req">*</span></label>
          <div class="ux4g-input ux4g-input-md">
            <input class="ux4g-input-input" id="pwNewPassword" type="password" placeholder="Create a new password" autocomplete="new-password" />
          </div>
        </div>
        <div class="ux4g-al-field" style="margin-top:14px;">
          <label class="ux4g-label-m-default">Confirm New Password <span class="ux4g-al-req">*</span></label>
          <div class="ux4g-input ux4g-input-md">
            <input class="ux4g-input-input" id="pwConfirmPassword" type="password" placeholder="Re-enter the new password" autocomplete="new-password" />
          </div>
          <span class="ux4g-al-field-hint" id="pwMatchHint" hidden>Passwords don't match yet.</span>
        </div>

        <ul class="pw-checklist" id="pwChecklist">
          <li data-rule="len"><span class="material-icons">radio_button_unchecked</span>At least 8 characters</li>
          <li data-rule="upper"><span class="material-icons">radio_button_unchecked</span>One uppercase letter</li>
          <li data-rule="num"><span class="material-icons">radio_button_unchecked</span>One number</li>
          <li data-rule="special"><span class="material-icons">radio_button_unchecked</span>One special character (@ # $ % &amp; !)</li>
        </ul>

        <div class="note-box note-success" id="pwSuccessNote" hidden>
          <span class="material-icons">check_circle</span>
          <span>Your password has been updated.</span>
        </div>

        <button class="ux4g-btn ux4g-btn-primary ux4g-btn-md" id="pwSubmitBtn" type="button" style="width:100%;margin-top:8px;" disabled>
          Update Password
        </button>
      </form>
    </div>
  </div>`;
  document.body.appendChild(wrap);

  const modal = document.getElementById("pwModal");
  const curPassword = document.getElementById("curPassword");
  const newPassword = document.getElementById("pwNewPassword");
  const confirmPassword = document.getElementById("pwConfirmPassword");
  const matchHint = document.getElementById("pwMatchHint");
  const submitBtn = document.getElementById("pwSubmitBtn");
  const checklist = document.getElementById("pwChecklist");
  const successNote = document.getElementById("pwSuccessNote");

  const RULES = {
    len: (v) => v.length >= 8,
    upper: (v) => /[A-Z]/.test(v),
    num: (v) => /[0-9]/.test(v),
    special: (v) => /[@#$%&!^*_\-+=]/.test(v),
  };

  function updateChecklist() {
    const v = newPassword.value;
    let allPass = true;
    Object.keys(RULES).forEach((rule) => {
      const pass = RULES[rule](v);
      if (!pass) allPass = false;
      const li = checklist.querySelector(`[data-rule="${rule}"]`);
      li.classList.toggle("is-met", pass);
      li.querySelector(".material-icons").textContent = pass ? "check_circle" : "radio_button_unchecked";
    });
    return allPass;
  }
  function updateSubmitState() {
    const rulesOk = updateChecklist();
    const match = newPassword.value && newPassword.value === confirmPassword.value;
    matchHint.hidden = !confirmPassword.value || match;
    submitBtn.disabled = !(curPassword.value && rulesOk && match);
  }
  [curPassword, newPassword, confirmPassword].forEach((el) => el.addEventListener("input", updateSubmitState));

  function lock() { document.body.style.overflow = "hidden"; }
  function unlock() { document.body.style.overflow = ""; }
  function open() {
    curPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    successNote.hidden = true;
    updateSubmitState();
    modal.hidden = false;
    lock();
  }
  function close() { modal.hidden = true; unlock(); }

  document.getElementById("changePasswordBtn").addEventListener("click", open);
  modal.querySelectorAll("[data-pw-close]").forEach((b) => b.addEventListener("click", close));
  modal.addEventListener("mousedown", (e) => { if (e.target === modal) close(); });

  submitBtn.addEventListener("click", () => {
    if (submitBtn.disabled) return;
    successNote.hidden = false;
    submitBtn.disabled = true;
    setTimeout(close, 1200);
  });
})();
