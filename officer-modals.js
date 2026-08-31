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
  <!-- Add New Officer wizard -->
  <div class="modal-backdrop" id="officerWizard" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Add New Officer">
      <button class="modal-close" data-wiz-close aria-label="Close" style="position:absolute;top:28px;right:28px;">
        <span class="material-icons">close</span>
      </button>
      <div class="wizard-title">
        <img src="assets/imgImage10.png" alt="" />
        <h2>Add New Officer</h2>
      </div>
      <div class="stepper" id="wizStepper"></div>

      <!-- Step 1: Add Department Info -->
      <div class="wizard-step" data-step="1">
        <form class="form-fields" onsubmit="return false">
          <div class="field">
            <label class="field-label" for="wDept">Select Department</label>
            <select class="field-control" id="wDept">
              <option>TN Information Technology and Digital Services (IT&amp;DS)</option>
              <option>Revenue and Disaster Management</option>
              <option>Rural Development and Panchayat Raj Department</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="wSubDept">Select Sub Department</label>
            <select class="field-control" id="wSubDept">
              <option>Tamil Nadu e-Governance Agency (TNeGA)</option>
              <option>ELCOT</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="wJuris">Select Jurisdiction</label>
            <select class="field-control" id="wJuris">
              <option value="" disabled selected>Select Jurisdiction</option>
              <option>Chennai</option>
              <option>Coimbatore</option>
              <option>Madurai</option>
            </select>
            <span class="field-hint"><span class="material-icons">info</span>Can't find the jurisdiction? Add it in <a href="agency.html">Jurisdiction Management</a></span>
          </div>
          <div class="field">
            <label class="field-label" for="wDesig">Select Designation</label>
            <select class="field-control" id="wDesig">
              <option value="" disabled selected>Type or search Designation</option>
              <option>Backend Developer</option>
              <option>District Collector</option>
              <option>Tahsildar</option>
            </select>
            <span class="field-hint"><span class="material-icons">info</span>Can't find the designation? Add it in <a href="agency-designation.html">Designation Management</a></span>
          </div>
        </form>
        <div class="modal-footer wide">
          <button class="btn btn-outline btn-officer" data-wiz-close><span class="material-icons">cancel</span>Close</button>
          <button class="btn btn-primary btn-officer" id="wizNext"><span class="material-icons">add</span>Next</button>
        </div>
      </div>

      <!-- Step 2: Add User Details -->
      <div class="wizard-step" data-step="2" hidden>
        <div class="transfer-banner" id="openTransfer" role="button" tabindex="0">
          <span class="tb-link">Click here to add a Transferred Officer to Your Department</span>
          <span class="tb-sub">Search for the transferred officer by name and submit a request to assign them to your department.</span>
        </div>
        <div class="or-divider">or</div>
        <form class="form-fields" onsubmit="return false">
          <div class="field">
            <label class="field-label" for="wName">Enter Full Name</label>
            <input class="field-control" id="wName" type="text" value="T Sunil Kumar" />
            <span class="field-hint"><span class="material-icons">info</span>Enter the name as per records</span>
          </div>
          <div class="field">
            <label class="field-label" for="wSso">Create SSO User Name</label>
            <input class="field-control" id="wSso" type="text" value="TSunil" />
            <span class="field-hint"><span class="material-icons">info</span>SSO Username format: First initial + last name. Example: TSUNIL</span>
          </div>
          <div class="field">
            <label class="field-label" for="wMobile">Enter Mobile Number</label>
            <input class="field-control" id="wMobile" type="text" value="8638270481" />
            <span class="field-hint"><span class="material-icons">info</span>Use an active mobile number to receive Password verification</span>
          </div>
          <div class="field">
            <label class="field-label" for="wEmail">Enter work Email Id</label>
            <input class="field-control" id="wEmail" type="text" value="sunilkumarwork@email.com" />
            <span class="field-hint"><span class="material-icons">info</span>Use an active email address to receive Password verification</span>
          </div>
        </form>
        <a href="#" class="link-btn" id="wizDraft">Save as Draft</a>
        <div class="modal-footer wide">
          <button class="btn btn-outline btn-officer" id="wizBack"><span class="material-icons">chevron_left</span>Back</button>
          <button class="btn btn-primary btn-officer" id="wizSubmit"><span class="material-icons">check</span>Submit</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Success modal -->
  <div class="modal-backdrop" id="successModal" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Officer added">
      <div class="success-body">
        <div class="success-check">&#10003;</div>
        <h2 class="success-title">New officer Account Added Successfully!</h2>
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
          <button class="btn btn-outline btn-officer" id="successAddAnother"><span class="material-icons">add</span>Add New Officer</button>
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
  function populateWizard() {
    if (typeof Store === "undefined") return;
    const dept = document.getElementById("wDept");
    const sub = document.getElementById("wSubDept");
    const juris = document.getElementById("wJuris");
    const desig = document.getElementById("wDesig");
    fillSelect(dept, Store.departments());
    const syncSub = () => fillSelect(sub, Store.subDepartments(dept.value));
    syncSub();
    dept.addEventListener("change", syncSub);
    fillSelect(juris, Store.officeNames(), "Select Jurisdiction");
    fillSelect(desig, Store.designations().map((d) => d.name), "Type or search Designation");
  }

  function openWizard() {
    populateWizard();
    showStep(1);
    open(wizard);
  }
  window.openOfficerWizard = openWizard;

  // ---- Wizard navigation ----
  document.getElementById("wizNext").addEventListener("click", () => showStep(2));
  document.getElementById("wizBack").addEventListener("click", () => showStep(1));
  wizard.querySelectorAll("[data-wiz-close]").forEach((b) => b.addEventListener("click", () => close(wizard)));
  document.getElementById("wizDraft").addEventListener("click", (e) => { e.preventDefault(); close(wizard); });

  document.getElementById("wizSubmit").addEventListener("click", () => {
    // gather inputs
    const name = (document.getElementById("wName").value || "T Sunil Kumar").trim();
    const sso = (document.getElementById("wSso").value || "TSunil").trim();
    const mobile = (document.getElementById("wMobile").value || "8638270481").trim();
    const email = (document.getElementById("wEmail").value || "sunilkumarwork@email.com").trim();
    const desig = document.getElementById("wDesig").value || "Backend Developer";
    const juris = document.getElementById("wJuris").value || "Chennai";
    const dept = document.getElementById("wDept").value || "Department of Agriculture";
    const subDept = document.getElementById("wSubDept").value || "Tamil Nadu e-Governance Agency (TNeGA)";

    // create a real officer record in the shared store
    if (typeof Store !== "undefined") {
      const match = Store.designations().find((d) => d.name === desig);
      Store.addOfficer({
        name, role: desig, designation: desig, dept, subDept, jurisdiction: juris,
        sso, mobile, email,
        reportsTo: (match && match.reportsTo) || "—",
        status: "active",
      });
    }

    // populate success summary
    document.getElementById("sumName").textContent = name;
    document.getElementById("sumSso").textContent = sso;
    document.getElementById("sumDesig").textContent = desig;
    document.getElementById("sumJuris").textContent = juris;
    document.getElementById("credText").textContent =
      `Login credentials have been sent to ${email} and +91 ${mobile}`;
    close(wizard);
    open(successModal);
  });

  // ---- Success modal ----
  successModal.querySelectorAll("[data-success-close]").forEach((b) => b.addEventListener("click", () => close(successModal)));
  document.getElementById("successAddAnother").addEventListener("click", () => {
    close(successModal);
    openWizard();
  });

  // ---- Transfer modal ----
  const transferList = document.getElementById("transferList");
  const transferSearch = document.getElementById("transferSearch");
  // A small pool of "transferable" officers (drawn from the store when present).
  function transferPool() {
    if (typeof Store === "undefined") {
      return [{ name: "Sunil Kumar", role: "UI/UX Designer" }];
    }
    return Store.officers().slice(0, 6);
  }
  function renderTransfer(query) {
    const q = (query || "").trim().toLowerCase();
    transferList.innerHTML = "";
    const pool = transferPool().filter((o) =>
      !q || `${o.name} ${o.role || o.designation || ""} ${o.jurisdiction || ""}`.toLowerCase().includes(q)
    );
    if (!pool.length) {
      transferList.innerHTML = `<div class="empty-list">No officers found.</div>`;
      return;
    }
    pool.forEach((o, i) => {
      const label = i % 2 === 0 ? "Add Officer" : "Request to Add Officer";
      const card = document.createElement("div");
      card.className = "officer-card";
      card.innerHTML = officerCard(`<button class="btn-add-officer" data-transfer-add="${esc(o.name)}">${label}</button>`, o);
      transferList.appendChild(card);
    });
  }
  if (transferSearch) transferSearch.addEventListener("input", (e) => renderTransfer(e.target.value));
  transferList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-transfer-add]");
    if (!btn) return;
    btn.textContent = "Added ✓";
    btn.disabled = true;
    btn.classList.add("is-added");
  });
  document.getElementById("openTransfer").addEventListener("click", () => { renderTransfer(""); open(transferModal); });
  transferModal.querySelectorAll("[data-transfer-close]").forEach((b) => b.addEventListener("click", () => close(transferModal)));

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
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-open="officer"]')) openWizard();
  });
})();
