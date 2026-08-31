// ============================================================
// TN SSO — "Add New Application" wizard (5 steps) + success modal.
// Injected into <body>. Exposes window.openAppWizard().
// Open triggers: any element with [data-open="app"].
// Load AFTER store.js (optional) and BEFORE page scripts.
// Figma node 1-13071 (frames 35–40).
// ============================================================
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---- data sources (fall back to seed lists when Store is absent) ----
  function departments() {
    return (typeof Store !== "undefined" && Store.departments()) || [
      "TN Information Technology and Digital Services (IT&DS)",
      "Revenue and Disaster Management",
      "Rural Development and Panchayat Raj Department",
    ];
  }
  function subDepartments(dept) {
    if (typeof Store !== "undefined") return Store.subDepartments(dept);
    return ["Tamil Nadu e-Governance Agency (TNeGA)", "ELCOT"];
  }
  function jurisdictions() {
    return (typeof Store !== "undefined" && Store.officeNames()) || [
      "Alandur", "Anna Nagar", "Bargur", "Bhuvanagiri", "Chennai Region", "Kancheepuram",
    ];
  }
  function designations() {
    return (typeof Store !== "undefined" && Store.designations().map((d) => d.name)) || [
      "Nodal Officer", "District Officer", "District Collector", "Tahsildar",
    ];
  }

  // ---- reusable multi-select component ----------------------
  // Returns a wrapper element; read current values via el._getValues().
  function makeMultiSelect(opts) {
    const placeholder = opts.placeholder || "Select...";
    const searchLabel = opts.searchLabel || "Search";
    const searchPlaceholder = opts.searchPlaceholder || "search";
    const items = opts.items || [];
    const selected = new Set();

    const wrap = document.createElement("div");
    wrap.className = "ms";
    wrap.innerHTML = `
      <div class="ms-control" tabindex="0" role="combobox" aria-expanded="false">
        <span class="ms-placeholder">${esc(placeholder)}</span>
      </div>
      <div class="ms-panel" hidden>
        <div class="ms-search-label">${esc(searchLabel)}</div>
        <input class="ms-search" type="text" placeholder="${esc(searchPlaceholder)}" />
        <div class="ms-selected-count">Selected 0</div>
        <div class="ms-list"></div>
      </div>`;

    const control = wrap.querySelector(".ms-control");
    const panel = wrap.querySelector(".ms-panel");
    const search = wrap.querySelector(".ms-search");
    const list = wrap.querySelector(".ms-list");
    const countEl = wrap.querySelector(".ms-selected-count");

    function renderControl() {
      control.innerHTML = "";
      if (selected.size === 0) {
        control.innerHTML = `<span class="ms-placeholder">${esc(placeholder)}</span>`;
        return;
      }
      [...selected].slice(0, 3).forEach((v) => {
        const chip = document.createElement("span");
        chip.className = "ms-chip";
        chip.innerHTML = `${esc(v)}<button type="button" aria-label="Remove ${esc(v)}"><span class="material-icons">close</span></button>`;
        chip.querySelector("button").addEventListener("click", (e) => {
          e.stopPropagation();
          selected.delete(v);
          renderAll();
        });
        control.appendChild(chip);
      });
      const more = document.createElement("span");
      more.className = "ms-count";
      more.textContent = `${selected.size} selected`;
      control.appendChild(more);
    }

    function renderList() {
      const q = search.value.trim().toLowerCase();
      list.innerHTML = "";
      items
        .filter((it) => !q || it.toLowerCase().includes(q))
        .forEach((it) => {
          const id = "ms-" + Math.abs(hash(opts.placeholder + it));
          const row = document.createElement("label");
          row.className = "ms-opt";
          row.htmlFor = id;
          row.innerHTML = `<input type="checkbox" id="${id}" ${selected.has(it) ? "checked" : ""}/><span>${esc(it)}</span>`;
          row.querySelector("input").addEventListener("change", (e) => {
            if (e.target.checked) selected.add(it);
            else selected.delete(it);
            renderControl();
            countEl.textContent = `Selected ${selected.size}`;
          });
          list.appendChild(row);
        });
      countEl.textContent = `Selected ${selected.size}`;
    }

    function renderAll() { renderControl(); renderList(); }

    function open() { panel.hidden = false; control.setAttribute("aria-expanded", "true"); search.focus(); }
    function close() { panel.hidden = true; control.setAttribute("aria-expanded", "false"); }

    control.addEventListener("click", () => (panel.hidden ? open() : close()));
    control.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); panel.hidden ? open() : close(); } });
    search.addEventListener("input", renderList);
    document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(); });

    wrap._getValues = () => [...selected];
    wrap._clear = () => { selected.clear(); renderAll(); };
    renderAll();
    return wrap;
  }
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; }

  // ---- field helpers ---------------------------------------
  function field(label, control, opts) {
    opts = opts || {};
    const req = opts.required ? ' <span class="field-req">*</span>' : "";
    const span = opts.span ? " col-2" : "";
    return `<div class="field${span}"><label class="field-label">${label}${req}</label>${control}</div>`;
  }
  function input(id, ph) { return `<input class="field-control" id="${id}" type="text" placeholder="${esc(ph)}" />`; }
  function select(id, optionsHTML) { return `<select class="field-control" id="${id}">${optionsHTML}</select>`; }
  function opts(arr, ph) {
    let h = ph ? `<option value="" disabled selected>${esc(ph)}</option>` : "";
    arr.forEach((o) => (h += `<option>${esc(o)}</option>`));
    return h;
  }

  // ---- inject markup ---------------------------------------
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <div class="modal-backdrop" id="appWizard" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Add New Application">
      <button class="modal-close" data-aw-close aria-label="Close" style="position:absolute;top:24px;right:24px;">
        <span class="material-icons">close</span>
      </button>
      <div class="wizard-title is-left">
        <img src="assets/imgImage10.png" alt="" />
        <h2>Add New Application</h2>
      </div>
      <div class="stepper" id="awStepper"></div>

      <!-- Step 1: App Identity -->
      <div class="wizard-step" data-step="1">
        <form class="form-grid" onsubmit="return false">
          ${field("Application Name", input("awName", "Enter application name"), { required: true })}
          ${field("Application Type", select("awType", opts(["Web Application", "Mobile Application", "Web & Mobile"], "e.g. Web App, Mobile App")), { required: true })}
          ${field("Login Mode", select("awLogin", opts(["SSO", "SSO + OTP", "OTP only"], "Select login mode")), { required: true })}
          ${field("Multiple Tab Support", select("awTabs", opts(["Yes", "No"], "Yes / No")), { required: true })}
          ${field("Domain URL web", input("awDomain", "https://example.tn.gov.in"), { required: true, span: true })}
          ${field("App URL", input("awAppUrl", "Playstore/TnGov.tn.gov.in"), { required: true, span: true })}
          <div class="field col-2">
            <div class="upload-row">
              <div>
                <label class="field-label">App Image / Logo <span class="field-req">*</span></label>
                <div class="upload-box" id="awUpload">
                  <span class="material-icons">cloud_upload</span>
                  <span class="upload-label">Click to upload</span>
                  <span class="upload-hint">jpg, jpeg, png, webp &middot; max 2MB &middot; 1:1</span>
                </div>
              </div>
              <div>
                <label class="field-label">App Description <span class="field-req">*</span></label>
                <textarea class="field-control" id="awDesc" rows="4" maxlength="200" placeholder="Write a brief about this application (max 200 chars)"></textarea>
                <div class="char-count"><span id="awDescCount">0</span>/200</div>
              </div>
            </div>
          </div>
        </form>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg" data-aw-close>Cancel</button>
          <button class="btn btn-primary-alt btn-lg" data-aw-next>Next Step</button>
        </div>
      </div>

      <!-- Step 2: Access Control -->
      <div class="wizard-step" data-step="2" hidden>
        <p class="wizard-subtitle">Who can access this application?</p>
        <form class="form-grid" onsubmit="return false">
          ${field("Department", select("awDept", ""), { required: true })}
          ${field("Sub Department", select("awSubDept", ""), { required: true })}
          <div class="field"><label class="field-label">Select Jurisdiction office <span class="field-req">*</span></label><div id="awJurisMS"></div></div>
          <div class="field"><label class="field-label">Designation <span class="field-req">*</span></label><div id="awDesigMS"></div></div>
        </form>
        <div class="role-toolbar">
          <button class="add-role-btn" id="awAddRole"><span class="material-icons" style="font-size:16px">add</span>Add User Role</button>
        </div>
        <table class="role-table">
          <thead>
            <tr><th>Department</th><th>Sub Dept</th><th>Designation</th><th>Jurisdiction</th><th>Action</th></tr>
          </thead>
          <tbody id="awRoleBody"></tbody>
        </table>
        <div class="role-empty" id="awRoleEmpty">No roles added yet. Click "+ Add User Role" to add access rules.</div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg" data-aw-back>Back</button>
          <button class="btn-text" data-aw-close>Cancel</button>
          <button class="btn btn-primary-alt btn-lg" data-aw-next>Next Step</button>
        </div>
      </div>

      <!-- Step 3: Contact Details -->
      <div class="wizard-step" data-step="3" hidden>
        <h3 class="form-section-title">System Integrator</h3>
        <form class="form-grid" onsubmit="return false">
          ${field("Company Name", input("awSiCompany", "Enter company name"), { required: true })}
          ${field("Name", input("awSiName", "Enter contact name"), { required: true })}
          ${field("Email", input("awSiEmail", "Enter email address"), { required: true })}
          ${field("Mobile No.", input("awSiMobile", "Enter mobile number"), { required: true })}
        </form>
        <hr class="form-divider" />
        <h3 class="form-section-title">Department Contact Person</h3>
        <form class="form-grid form-grid-3" onsubmit="return false">
          ${field("Name", input("awDcName", "Enter contact name"), { required: true })}
          ${field("Select Jurisdiction office", select("awDcJuris", opts(jurisdictions(), "Enter designation")), { required: true })}
          ${field("Select Designation", select("awDcDesig", opts(designations(), "Enter designation")), { required: true })}
        </form>
        <form class="form-grid" onsubmit="return false" style="margin-top:18px">
          ${field("Email", input("awDcEmail", "Enter email address"), { required: true })}
          ${field("Mobile No.", input("awDcMobile", "Enter mobile number"), { required: true })}
        </form>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg" data-aw-back>Back</button>
          <button class="btn-text" data-aw-close>Cancel</button>
          <button class="btn btn-primary-alt btn-lg" data-aw-next>Next Step</button>
        </div>
      </div>

      <!-- Step 4: Technical Details -->
      <div class="wizard-step" data-step="4" hidden>
        <p class="wizard-subtitle">Configure SSO connection settings for this application</p>
        <form class="form-fields" onsubmit="return false">
          ${field("Redirection URL", input("awRedirect", "https://example.tn.gov.in/auth/callback"), { required: true })}
          ${field("Registration URL", input("awRegister", "https://example.tn.gov.in/register"))}
          ${field("Logout URL", input("awLogout", "https://example.tn.gov.in/logout"), { required: true })}
        </form>
        <form class="form-grid" onsubmit="return false" style="margin-top:18px">
          ${field("Staging IP Address", input("awStageIp", "e.g. 192.168.1.1"))}
          ${field("Production IP Address", input("awProdIp", "e.g. 10.0.0.1"), { required: true })}
        </form>
        <form class="form-fields" onsubmit="return false" style="margin-top:18px">
          ${field("Values to be Returned", input("awValues", "e.g. user_id, email, role, name"))}
        </form>
        <div class="note-box note-warn">
          <span class="material-icons">lightbulb</span>
          <span>You can save this form as a draft at any time and return to complete it later.</span>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg" data-aw-back>Back</button>
          <button class="btn-text" data-aw-draft>Save as Draft</button>
          <button class="btn btn-primary-alt btn-lg" data-aw-next>Review &amp; Submit</button>
        </div>
      </div>

      <!-- Step 5: Review & Submit -->
      <div class="wizard-step" data-step="5" hidden>
        <p class="wizard-subtitle">Review all details before submitting. Use Edit to go back to any section.</p>
        <div id="awReview"></div>
        <div class="note-box note-success">
          <span>By registering this application, you confirm all details are accurate and agree to TNeGA SSO usage policies.</span>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg" data-aw-back>Back</button>
          <button class="btn-text" data-aw-close>Cancel</button>
          <button class="btn btn-primary-alt btn-lg" id="awRegisterBtn">Register Application</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Success modal -->
  <div class="modal-backdrop" id="appSuccess" hidden>
    <div class="modal modal-sm" role="dialog" aria-modal="true" aria-label="Application registered">
      <button class="modal-close" data-as-close aria-label="Close" style="position:absolute;top:24px;right:24px;">
        <span class="material-icons">close</span>
      </button>
      <div class="success-body">
        <div class="success-check">&#10003;</div>
        <h2 class="success-title">Application Registered Successfully!</h2>
        <p class="wizard-subtitle" style="margin:0;text-align:center">
          Your application has been successfully registered on the TNeGA Single Sign-On portal.<br />
          Credentials have been sent to your registered email address.
        </p>
        <div class="detail-table">
          <div class="detail-table-head">Application Details</div>
          <div class="detail-row"><span class="detail-key">Application Name</span><span class="detail-val" id="asName">TNSSP Student Portal</span></div>
          <div class="detail-row"><span class="detail-key">Application ID</span><span class="detail-val">SSO-APP-2024-0042</span></div>
          <div class="detail-row"><span class="detail-key">Client ID</span><span class="detail-val">tnssp_client_8f3a2e91</span></div>
          <div class="detail-row"><span class="detail-key">Registered On</span><span class="detail-val">15 May 2026</span></div>
          <div class="detail-row"><span class="detail-key">Status</span><span class="detail-val status-active">Active</span></div>
        </div>
        <div class="note-box note-warn" style="margin-top:0">
          <span class="material-icons">vpn_key</span>
          <span>Client Secret has been sent to your registered email. Use the Application ID and Client ID to complete your SSO integration.</span>
        </div>
        <div class="modal-footer wide">
          <button class="btn btn-outline btn-officer" data-as-close>View Application</button>
          <button class="btn btn-primary-alt btn-officer" id="asAddAnother">Add Another Application</button>
          <button class="btn-text" data-as-close>Go to Dashboard</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap);

  // ---- refs ------------------------------------------------
  const wizard = document.getElementById("appWizard");
  const success = document.getElementById("appSuccess");
  const stepperEl = document.getElementById("awStepper");
  const steps = wizard.querySelectorAll(".wizard-step");
  const STEP_LABELS = ["App Identity", "Access Control", "Contact Details", "Technical Details", "Review & Submit"];
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
    if (n === 5) renderReview();
    wizard.querySelector(".modal").scrollTop = 0;
  }

  // ---- step 1: char counter + upload affordance ----
  const desc = document.getElementById("awDesc");
  desc.addEventListener("input", () => (document.getElementById("awDescCount").textContent = String(desc.value.length)));
  document.getElementById("awUpload").addEventListener("click", () => {
    const u = document.getElementById("awUpload");
    u.querySelector(".upload-label").textContent = "logo.png selected";
  });

  // ---- step 2: department/sub-department + multi-selects + role table ----
  const deptSel = document.getElementById("awDept");
  const subSel = document.getElementById("awSubDept");
  deptSel.innerHTML = opts(departments(), "");
  function syncSub() { subSel.innerHTML = opts(subDepartments(deptSel.value), ""); }
  syncSub();
  deptSel.addEventListener("change", syncSub);

  const jurisMS = makeMultiSelect({
    placeholder: "Select Jurisdiction(s)", searchLabel: "Search for jurisdiction?",
    searchPlaceholder: "search Jurisdiction", items: jurisdictions(),
  });
  const desigMS = makeMultiSelect({
    placeholder: "Select Designation(s)", searchLabel: "Search Designation",
    searchPlaceholder: "search Designation", items: designations(),
  });
  document.getElementById("awJurisMS").appendChild(jurisMS);
  document.getElementById("awDesigMS").appendChild(desigMS);

  const roleBody = document.getElementById("awRoleBody");
  const roleEmpty = document.getElementById("awRoleEmpty");
  const roles = [];
  function renderRoles() {
    roleBody.innerHTML = "";
    roleEmpty.style.display = roles.length ? "none" : "";
    roles.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${esc(r.dept)}</td><td>${esc(r.sub)}</td><td>${esc(r.desig)}</td><td>${esc(r.juris)}</td>
        <td><button class="role-remove" data-role-i="${i}" aria-label="Remove role"><span class="material-icons">delete</span></button></td>`;
      roleBody.appendChild(tr);
    });
  }
  document.getElementById("awAddRole").addEventListener("click", () => {
    const juris = jurisMS._getValues();
    const desig = desigMS._getValues();
    roles.push({
      dept: deptSel.value || "—",
      sub: subSel.value || "—",
      desig: desig.join(", ") || "—",
      juris: juris.join(", ") || "—",
    });
    jurisMS._clear();
    desigMS._clear();
    renderRoles();
  });
  roleBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-role-i]");
    if (!btn) return;
    roles.splice(Number(btn.dataset.roleI), 1);
    renderRoles();
  });

  // ---- step 5: review render -------------------------------
  function val(id, fallback) { const e = document.getElementById(id); return (e && e.value && e.value.trim()) || fallback; }
  function reviewCard(title, step, pairs) {
    const items = pairs.map((p) => `<div class="review-item"><span class="review-label">${esc(p[0])}</span><span class="review-value">${esc(p[1])}</span></div>`).join("");
    return `<div class="review-card">
      <div class="review-head"><span class="review-title">${esc(title)}</span><a href="#" class="review-edit" data-aw-edit="${step}">Edit</a></div>
      <div class="review-grid">${items}</div>
    </div>`;
  }
  function renderReview() {
    const roleDesig = roles.map((r) => r.desig).join("; ") || "Nodal Officer, District Officer";
    const roleJuris = roles.map((r) => r.juris).join("; ") || "District Collectorate";
    document.getElementById("awReview").innerHTML =
      reviewCard("1. App Identity", 1, [
        ["Application Name", val("awName", "TNSSP Student Portal")],
        ["Application Type", val("awType", "Web Application")],
        ["Login Mode", val("awLogin", "SSO + OTP")],
        ["Multiple Tab Support", val("awTabs", "Yes")],
        ["Domain URL", val("awDomain", "https://ssp.tn.gov.in")],
        ["App Description", val("awDesc", "Tamil Nadu State Scholarship Portal")],
      ]) +
      reviewCard("2. Access Control", 2, [
        ["Department", val("awDept", "BC/MBC Welfare Department")],
        ["Sub Department", val("awSubDept", "Scholarship Division")],
        ["Designation", roleDesig],
        ["Office", roleJuris],
      ]) +
      reviewCard("3. Contact Details", 3, [
        ["Company (SI)", val("awSiCompany", "TNeGA Technology Solutions")],
        ["SI Email", val("awSiEmail", "tech@tnega.tn.gov.in")],
        ["Dept Contact Person", val("awDcName", "Arumugam R.")],
        ["Dept Email", val("awDcEmail", "bc.welfare@tn.gov.in")],
      ]) +
      reviewCard("4. Technical Configuration", 4, [
        ["Redirection URL", val("awRedirect", "https://ssp.tn.gov.in/auth/callback")],
        ["Logout URL", val("awLogout", "https://ssp.tn.gov.in/logout")],
        ["Production IP", val("awProdIp", "10.0.0.42")],
        ["Values Returned", val("awValues", "user_id, role, district_code")],
      ]);
  }
  document.getElementById("awReview").addEventListener("click", (e) => {
    const edit = e.target.closest("[data-aw-edit]");
    if (!edit) return;
    e.preventDefault();
    showStep(Number(edit.dataset.awEdit));
  });

  // ---- navigation ------------------------------------------
  wizard.addEventListener("click", (e) => {
    if (e.target.closest("[data-aw-next]")) showStep(Math.min(current + 1, 5));
    else if (e.target.closest("[data-aw-back]")) showStep(Math.max(current - 1, 1));
    else if (e.target.closest("[data-aw-close]")) close(wizard);
    else if (e.target.closest("[data-aw-draft]")) close(wizard);
  });
  document.getElementById("awRegisterBtn").addEventListener("click", () => {
    document.getElementById("asName").textContent = val("awName", "TNSSP Student Portal");
    close(wizard);
    open(success);
  });

  function openWizard() { showStep(1); open(wizard); }
  window.openAppWizard = openWizard;

  // ---- success modal ---------------------------------------
  success.querySelectorAll("[data-as-close]").forEach((b) => b.addEventListener("click", () => close(success)));
  document.getElementById("asAddAnother").addEventListener("click", () => { close(success); openWizard(); });

  // ---- backdrop + Esc --------------------------------------
  [wizard, success].forEach((m) => m.addEventListener("mousedown", (e) => { if (e.target === m) close(m); }));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!success.hidden) return close(success);
    if (!wizard.hidden) return close(wizard);
  });

  // ---- global open trigger ---------------------------------
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-open="app"]')) { e.preventDefault(); openWizard(); }
  });
})();
