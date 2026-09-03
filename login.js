// ============================================================
// TN SSO — Login: Login ID (Name / Email / Mobile / SSO Username)
// + Password + a security-check captcha, then an OTP second step.
// This is a static prototype with no real auth backend, so both
// the captcha and the OTP are simple, honestly-labeled demo
// mechanics rather than anything that pretends to be real security.
// ============================================================
(function () {
  const stepCredentials = document.getElementById("stepCredentials");
  const stepOtp = document.getElementById("stepOtp");
  const stepSuccess = document.getElementById("stepSuccess");

  // ---- Security check: a simple math challenge. A real image CAPTCHA
  // needs a server this static site doesn't have — this still requires
  // a person to actually solve something before continuing. ----
  let captchaAnswer = 0;
  function newCaptcha() {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    captchaAnswer = a + b;
    document.getElementById("captchaChallenge").textContent = `${a} + ${b}`;
    document.getElementById("captchaAnswer").value = "";
  }
  newCaptcha();
  document.getElementById("captchaRefresh").addEventListener("click", newCaptcha);

  // ---- Password show/hide ----
  const pwInput = document.getElementById("loginPassword");
  const toggleBtn = document.getElementById("togglePassword");
  toggleBtn.addEventListener("click", () => {
    const show = pwInput.type === "password";
    pwInput.type = show ? "text" : "password";
    toggleBtn.querySelector(".material-icons").textContent = show ? "visibility_off" : "visibility";
    toggleBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  // ---- Credential matching: any of Name / Email / Mobile / SSO Username,
  // against either the one Super Admin or an active Department Admin —
  // whichever this Login ID belongs to decides what the resulting session
  // can see. ----
  function normalizeMobile(v) { return String(v || "").replace(/\D/g, "").slice(-10); }
  function idMatchesRecord(record, value) {
    const v = value.trim().toLowerCase();
    if (!v) return false;
    if ((record.name || "").toLowerCase() === v) return true;
    if ((record.email || "").toLowerCase() === v) return true;
    const ssoField = record.ssoUsername || record.sso || "";
    if (ssoField.toLowerCase() === v) return true;
    const digits = value.replace(/\D/g, "");
    return digits.length > 0 && normalizeMobile(record.mobile) === digits.slice(-10);
  }
  function findLoginRecord(value) {
    if (idMatchesRecord(Store.superAdmin(), value)) return { kind: "super-admin", record: Store.superAdmin() };
    const admin = Store.departmentAdmins().find((a) => a.status === "active" && idMatchesRecord(a, value));
    if (admin) return { kind: "dept-admin", record: admin };
    return null;
  }

  const credError = document.getElementById("credError");
  const credErrorText = document.getElementById("credErrorText");
  function showCredError(msg) {
    credErrorText.textContent = msg;
    credError.hidden = false;
  }
  function hideCredError() { credError.hidden = true; }

  let pendingLogin = null;
  document.getElementById("continueBtn").addEventListener("click", () => {
    hideCredError();
    const idValue = document.getElementById("loginId").value;
    const password = pwInput.value;
    const captchaInput = document.getElementById("captchaAnswer").value.trim();

    if (!idValue.trim() || !password) {
      showCredError("Enter your Login ID and password.");
      return;
    }
    if (!captchaInput || Number(captchaInput) !== captchaAnswer) {
      showCredError("That security check answer isn't correct.");
      newCaptcha();
      return;
    }
    const found = findLoginRecord(idValue);
    if (!found) {
      showCredError("We couldn't find an account matching that ID.");
      return;
    }
    if (password !== found.record.password) {
      showCredError("Incorrect password.");
      return;
    }
    pendingLogin = found;
    goToOtpStep();
  });

  // ---- OTP step: generated and shown on screen, since there's no real
  // SMS/email service in this prototype to send it through. ----
  let otpCode = "";
  const otpError = document.getElementById("otpError");
  function genOtp() {
    otpCode = String(Math.floor(100000 + Math.random() * 900000));
    document.getElementById("otpDemoCode").textContent = otpCode;
    document.getElementById("otpInput").value = "";
    otpError.hidden = true;
  }
  function goToOtpStep() {
    stepCredentials.hidden = true;
    stepOtp.hidden = false;
    genOtp();
    document.getElementById("otpInput").focus();
  }
  document.getElementById("backToCreds").addEventListener("click", () => {
    stepOtp.hidden = true;
    stepCredentials.hidden = false;
  });
  document.getElementById("resendOtp").addEventListener("click", genOtp);

  document.getElementById("verifyOtpBtn").addEventListener("click", () => {
    const entered = document.getElementById("otpInput").value.trim();
    if (!entered || entered !== otpCode) {
      otpError.hidden = false;
      return;
    }
    stepOtp.hidden = true;
    stepSuccess.hidden = false;
    document.getElementById("successName").textContent = pendingLogin.record.name.split(" ")[0];
    if (pendingLogin.kind === "dept-admin") {
      Store.setSession({ role: "dept-admin", dept: pendingLogin.record.dept, subDept: pendingLogin.record.subDept || "", office: pendingLogin.record.office || "", name: pendingLogin.record.name });
    } else {
      Store.setSession({ role: "super-admin", name: pendingLogin.record.name });
    }
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1100);
  });

  // ---- Enter-key convenience on the last field of each step ----
  document.getElementById("captchaAnswer").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("continueBtn").click();
  });
  document.getElementById("otpInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("verifyOtpBtn").click();
  });
})();
