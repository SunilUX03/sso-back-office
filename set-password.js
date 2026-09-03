// ============================================================
// TN SSO — Verify account / set password. Reached via the
// verification link sent to a newly-created officer or admin
// login's own email/mobile (?token=...). Shows their Username /
// Email / Mobile locked (read-only — that's what the link proves),
// and lets them pick a password to activate the account. Built as
// one page with two use cases in mind: today it's "verify + create
// password"; the same locked-fields-plus-password layout is what a
// future "forgot password" reset would reuse.
// ============================================================
(function () {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const found = token ? Store.findAccountByToken(token) : null;

  const authForm = document.getElementById("authForm");
  const authSuccess = document.getElementById("authSuccess");
  const authInvalid = document.getElementById("authInvalid");

  if (!found || found.record.status !== "pending") {
    authForm.hidden = true;
    authInvalid.hidden = false;
    if (found && found.record.status === "active") {
      authInvalid.querySelector(".auth-title").textContent = "Already activated";
      authInvalid.querySelector(".auth-subtitle").textContent =
        "This account has already been verified and its password set. You can sign in directly.";
    }
    return;
  }

  const { kind, record } = found;
  document.getElementById("lockedSso").textContent = record.sso || "—";
  document.getElementById("lockedEmail").textContent = record.email || "—";
  document.getElementById("lockedMobile").textContent = record.mobile || "—";

  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const matchHint = document.getElementById("matchHint");
  const submitBtn = document.getElementById("submitBtn");
  const checklist = document.getElementById("pwChecklist");

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
    submitBtn.disabled = !(rulesOk && match);
  }

  newPassword.addEventListener("input", updateSubmitState);
  confirmPassword.addEventListener("input", updateSubmitState);

  submitBtn.addEventListener("click", () => {
    if (submitBtn.disabled) return;
    Store.activateAccount(token, newPassword.value);
    authForm.hidden = true;
    authSuccess.hidden = false;
  });
})();
