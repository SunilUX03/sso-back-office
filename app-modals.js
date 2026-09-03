// ============================================================
// TN SSO — "Register Application" wizard (5 steps) + success modal.
// Injected into <body>. Exposes window.openAppWizard(editRecord).
// Open triggers: any element with [data-open="app"].
//
// Step-by-step on purpose — nodal officers found the earlier
// single-page version harder to get through than a wizard that
// shows progress. Within that, the form still only asks what
// applies: Application Type shows only the relevant link field(s),
// "Who can use it" starts with an audience choice (a public app has
// no officer-jurisdiction rules to configure), and access defaults
// to open rather than starting from an empty allow-list.
//
// Every dropdown here is the same custom trigger-button + .filter-menu
// popup the rest of the app uses (e.g. Create Admin Login's
// Department/Sub-Department pickers) instead of a bare native
// <select>, and the stepper reuses the exact .ux4g-al-steps component
// Create Admin Login uses, so this wizard doesn't look like a
// different app from the one next to it.
//
// Load AFTER store.js (optional) and BEFORE page scripts.
// ============================================================
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---- data sources (real 75-department directory, same one Jurisdiction
  // Management / Designation Management / App Management's own department
  // list use — falls back to a small seed list only when Store is absent) ----
  function departments() {
    return (typeof Store !== "undefined" && Store.visibleDepartments()) || [
      "TN Information Technology and Digital Services (IT&DS)",
      "Revenue and Disaster Management",
      "Rural Development and Panchayat Raj Department",
    ];
  }
  function subDepartments(dept) {
    if (typeof Store !== "undefined") return Store.allSubDepartments(dept);
    return ["Tamil Nadu e-Governance Agency (TNeGA)", "ELCOT"];
  }
  // Reads ?dept=&sub= from the current page's URL (set when the wizard is
  // opened from a department-scoped App Management page) and resolves them
  // against the real directory, so Register Application defaults to the
  // department the admin was already looking at.
  function resolveContext() {
    if (typeof Store === "undefined") return { dept: null, subDept: null };
    const params = new URLSearchParams(location.search);
    const deptSlug = params.get("dept");
    if (!deptSlug) return { dept: null, subDept: null };
    const dept = Store.deptBySlug(deptSlug);
    if (!dept) return { dept: null, subDept: null };
    const subSlug = params.get("sub");
    const subDept = subSlug != null ? Store.subDeptBySlug(dept, subSlug) : null;
    return { dept, subDept: subDept == null ? null : subDept };
  }

  // ---- shared custom-dropdown popup (same component as Create Admin
  // Login's Department/Sub-Department pickers) ---------------------
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
  // reads/writes via .value, exactly like Create Admin Login's dwDept.
  function selectTrigger(id, placeholder) {
    return `<button type="button" class="ux4g-al-select" id="${id}Trigger">
        <span class="ux4g-al-select-label is-placeholder" id="${id}TriggerLabel">${esc(placeholder)}</span>
        <span class="ux4g-icon-outlined">expand_more</span>
      </button>
      <select class="ux4g-al-select-native" id="${id}"></select>`;
  }
  // Wires a trigger button to its hidden <select>: opens the shared
  // .filter-menu built from the select's own <option>s, and keeps the
  // trigger's label in sync whenever the select's options or value change
  // programmatically (call the returned function again after repopulating).
  function bindSelectTrigger(id, placeholder) {
    const select = document.getElementById(id);
    const trigger = document.getElementById(id + "Trigger");
    const label = document.getElementById(id + "TriggerLabel");
    function sync() {
      const opt = select.options[select.selectedIndex];
      const hasValue = opt && opt.value !== "";
      // When nothing real is selected, show the select's own current
      // placeholder <option> text (it changes as fields get repopulated —
      // e.g. "Select a level first" vs "Select jurisdiction" — rather than
      // the label this trigger was first created with).
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

  // ---- reusable multi-select component ----------------------
  // Returns a wrapper element; read current values via el._getValues().
  // _setItems() lets the caller swap the option list after creation —
  // used here so picking a Level narrows the Jurisdiction list to just
  // that level's offices.
  function makeMultiSelect(opts) {
    const placeholder = opts.placeholder || "Select...";
    const searchLabel = opts.searchLabel || "Search";
    const searchPlaceholder = opts.searchPlaceholder || "search";
    let items = opts.items || [];
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
      if (!items.length) list.innerHTML = `<div class="ms-empty">Nothing to select yet.</div>`;
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
    wrap._setItems = (newItems) => { items = newItems || []; selected.clear(); search.value = ""; renderAll(); };
    renderAll();
    return wrap;
  }
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; }

  // ---- field helpers ---------------------------------------
  function field(label, control, opts) {
    opts = opts || {};
    const req = opts.required ? ' <span class="field-req">*</span>' : "";
    const span = opts.span ? " col-2" : "";
    const id = opts.id ? ` id="${esc(opts.id)}"` : "";
    return `<div class="field${span}"${id}><label class="field-label">${label}${req}</label>${control}</div>`;
  }
  function input(id, ph) { return `<input class="field-control" id="${id}" type="text" placeholder="${esc(ph)}" />`; }
  function opts(arr, ph) {
    let h = ph ? `<option value="" disabled selected>${esc(ph)}</option>` : "";
    arr.forEach((o) => (h += `<option>${esc(o)}</option>`));
    return h;
  }

  const DESC_WORD_LIMIT = 40;
  const LOGIN_MODES = [
    { value: "password", title: "Username & Password", desc: "Officers sign in with their existing TN SSO account." },
    { value: "mobile-otp", title: "Mobile Number – OTP", desc: "A one-time code sent to the person's phone." },
    { value: "email-otp", title: "Email – OTP", desc: "A one-time code sent to the person's email." },
    { value: "aadhaar", title: "Aadhaar Authentication", desc: "Verified against the person's Aadhaar ID — for higher-assurance apps." },
  ];
  const STEP_LABELS = ["App Identity", "Who Can Use It", "Contact Details", "Technical Details", "Review & Submit"];

  // ---- inject markup ---------------------------------------
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <div class="modal-backdrop" id="appWizard" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Register Application">
      <button class="modal-close" data-aw-close aria-label="Close" style="position:absolute;top:24px;right:24px;">
        <span class="material-icons">close</span>
      </button>
      <div class="wizard-title is-left">
        <img src="assets/imgImage10.png" alt="" />
        <div>
          <h2 id="awTitle">Register Application</h2>
          <div class="ux4g-modal-header-sub-heading" id="awStepSub"></div>
        </div>
      </div>
      <div class="ux4g-al-steps" id="awStepper"></div>

      <div class="note-box note-danger" id="awFormError" hidden></div>

      <!-- Step 1: App Identity -->
      <div class="wizard-step" data-step="1">
        <h3 class="form-section-title">1. App Identity</h3>
        <form class="form-grid" onsubmit="return false">
          ${field("Department", selectTrigger("awDept", "Select department"), { required: true })}
          ${field("Sub Department", selectTrigger("awSubDept", "Select department first"), { required: true })}
          ${field("Application Name", input("awName", "Enter application name"), { required: true })}
          ${field("Application Type", selectTrigger("awType", "Select application type"), { required: true })}
          ${field("Multiple Tab Support", selectTrigger("awTabs", "Yes / No"), { required: true, span: true })}
        </form>
        <hr class="form-divider" />
        <form class="form-grid" onsubmit="return false">
          ${field("Web URL", input("awDomain", "https://example.tn.gov.in"), { required: true, span: true, id: "awWebField" })}
          ${field("App Store / Play Store Link", input("awAppUrl", "https://play.google.com/store/apps/details?id=..."), { required: true, span: true, id: "awMobileField" })}
          <div class="field col-2">
            <label class="field-label">App Image / Logo</label>
            <div class="upload-box" id="awUpload">
              <span class="material-icons">cloud_upload</span>
              <span class="upload-label">Click to upload</span>
              <span class="upload-hint">jpg, jpeg, png, webp &middot; max 2MB &middot; 1:1</span>
            </div>
          </div>
        </form>
        <hr class="form-divider" />
        <p class="wizard-subtitle" style="margin-bottom:8px">What login method does this application use?</p>
        <div class="signin-choice" id="awLoginModeChoice"></div>
        <hr class="form-divider" />
        <div class="field">
          <label class="field-label">Short Description <span class="field-req">*</span></label>
          <textarea class="field-control" id="awDesc" rows="3" placeholder="Write a brief about this application (max ${DESC_WORD_LIMIT} words)"></textarea>
          <div class="char-count"><span id="awDescCount">0</span>/${DESC_WORD_LIMIT} words</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary-alt btn-lg is-text-only" data-aw-next>Next Step</button>
        </div>
      </div>

      <!-- Step 2: Who Can Use It -->
      <div class="wizard-step" data-step="2" hidden>
        <h3 class="form-section-title">2. Who Can Use It</h3>
        <p class="wizard-subtitle" style="margin-bottom:8px">Who is this application for?</p>
        <div class="signin-choice has-3" id="awAudienceChoice">
          <label class="signin-option is-selected">
            <input type="radio" name="awAudience" value="officers" checked />
            <span class="signin-option-title">Government Officers</span>
            <span class="signin-option-desc">Used by departments and staff via their TN SSO account.</span>
          </label>
          <label class="signin-option">
            <input type="radio" name="awAudience" value="public" />
            <span class="signin-option-title">General Public</span>
            <span class="signin-option-desc">Open to any citizen.</span>
          </label>
          <label class="signin-option">
            <input type="radio" name="awAudience" value="both" />
            <span class="signin-option-title">Both Officers &amp; Public</span>
            <span class="signin-option-desc">Officers and citizens both use this application.</span>
          </label>
        </div>

        <div id="awOfficerPanel">
          <hr class="form-divider" />
          <label class="toggle-row">
            <input type="checkbox" id="awOpenAccess" checked />
            <span id="awOpenAccessCopy">This app is open to all officers by default.</span>
          </label>
          <hr class="form-divider" />
          <div id="awRestrictedPanel" hidden>
            <p class="wizard-subtitle">Restrict this application to specific offices or roles instead.</p>
            <form class="form-grid form-grid-3" onsubmit="return false">
              ${field("Level", selectTrigger("awLevel", "Select level"))}
              <div class="field"><label class="field-label">Jurisdiction office</label><div id="awJurisMS"></div></div>
              <div class="field"><label class="field-label">Designation</label><div id="awDesigMS"></div></div>
            </form>
            <div class="role-toolbar">
              <button class="add-role-btn" id="awAddRole" type="button"><span class="material-icons" style="font-size:16px">add</span>Add User Role</button>
            </div>
            <table class="role-table">
              <thead>
                <tr><th>Department</th><th>Sub Dept</th><th>Designation</th><th>Jurisdiction</th><th>Action</th></tr>
              </thead>
              <tbody id="awRoleBody"></tbody>
            </table>
            <div class="role-empty" id="awRoleEmpty">No roles added yet. Click "+ Add User Role" to add access rules.</div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline btn-lg is-text-only" data-aw-back>Back</button>
          <button class="btn btn-primary-alt btn-lg is-text-only" data-aw-next>Next Step</button>
        </div>
      </div>

      <!-- Step 3: Contact Details -->
      <div class="wizard-step" data-step="3" hidden>
        <h3 class="form-section-title">3. Contact Details</h3>
        <h4 class="subsection-title">System Integrator</h4>
        <form class="form-grid" onsubmit="return false">
          ${field("Company Name", input("awSiCompany", "Enter company name"))}
          ${field("Name", input("awSiName", "Enter contact name"))}
          ${field("Email", input("awSiEmail", "Enter email address"))}
          ${field("Mobile No.", input("awSiMobile", "Enter mobile number"))}
        </form>
        <hr class="form-divider" />
        <h4 class="subsection-title">Department Contact Person</h4>
        <form class="form-grid" onsubmit="return false">
          ${field("Name", input("awDcName", "Enter contact name"))}
          ${field("Level", selectTrigger("awDcLevel", "Select level"))}
          ${field("Select Jurisdiction office", selectTrigger("awDcJuris", "Select a level first"))}
          ${field("Select Designation", selectTrigger("awDcDesig", "Select designation"))}
        </form>
        <form class="form-grid" onsubmit="return false" style="margin-top:18px">
          ${field("Email", input("awDcEmail", "Enter email address"))}
          ${field("Mobile No.", input("awDcMobile", "Enter mobile number"))}
        </form>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg is-text-only" data-aw-back>Back</button>
          <button class="btn btn-primary-alt btn-lg is-text-only" data-aw-next>Next Step</button>
        </div>
      </div>

      <!-- Step 4: Technical Details -->
      <div class="wizard-step" data-step="4" hidden>
        <h3 class="form-section-title">4. Technical Details</h3>
        <p class="wizard-subtitle">For your IT team or System Integrator — SSO connection settings for this application.</p>
        <form class="form-fields" onsubmit="return false">
          ${field("Redirection URL", input("awRedirect", "https://example.tn.gov.in/auth/callback"))}
          ${field("Registration URL", input("awRegister", "https://example.tn.gov.in/register"))}
          ${field("Logout URL", input("awLogout", "https://example.tn.gov.in/logout"))}
        </form>
        <hr class="form-divider" />
        <form class="form-grid" onsubmit="return false">
          ${field("Staging IP Address", input("awStageIp", "e.g. 192.168.1.1"))}
          ${field("Production IP Address", input("awProdIp", "e.g. 10.0.0.1"))}
        </form>
        <hr class="form-divider" />
        <form class="form-fields" onsubmit="return false">
          ${field("Values to be Returned", input("awValues", "e.g. user_id, email, role, name"))}
        </form>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg is-text-only" data-aw-back>Back</button>
          <button class="btn btn-primary-alt btn-lg is-text-only" data-aw-next>Review &amp; Submit</button>
        </div>
      </div>

      <!-- Step 5: Review & Submit -->
      <div class="wizard-step" data-step="5" hidden>
        <h3 class="form-section-title">5. Review &amp; Submit</h3>
        <p class="wizard-subtitle">Review all details before submitting. Use Edit to go back to any section.</p>
        <div id="awReview"></div>
        <div class="note-box note-success">
          <span>By registering this application, you confirm all details are accurate and agree to TNeGA SSO usage policies.</span>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-lg is-text-only" data-aw-back>Back</button>
          <button class="btn btn-primary-alt btn-lg is-text-only" id="awRegisterBtn">Register Application</button>
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
          <div class="detail-row"><span class="detail-key">Client ID</span><span class="detail-val" id="asClientId">tnssp_client_8f3a2e91</span></div>
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
  const stepSubEl = document.getElementById("awStepSub");
  const steps = wizard.querySelectorAll(".wizard-step");
  let current = 1;

  function lock() { document.body.style.overflow = "hidden"; }
  function unlock() { if (wizard.hidden && success.hidden) document.body.style.overflow = ""; }
  function open(m) { m.hidden = false; lock(); }
  function close(m) { m.hidden = true; unlock(); }

  function val(id, fallback) { const e = document.getElementById(id); return (e && e.value && e.value.trim()) || fallback || ""; }

  function renderStepper(active) {
    let html = "";
    STEP_LABELS.forEach((label, i) => {
      const n = i + 1;
      const done = n < active;
      const isActive = n === active;
      const badgeInner = done ? '<span class="ux4g-icon-outlined">check</span>' : n;
      html += `<div class="ux4g-al-step ${isActive ? "is-active" : ""} ${done ? "is-done" : ""}">
        <span class="ux4g-al-step-badge">${badgeInner}</span>
        <span class="ux4g-al-step-label">${esc(label)}</span>
      </div>`;
      if (i < STEP_LABELS.length - 1) html += `<div class="ux4g-al-step-line ${active > n ? "is-done" : ""}"></div>`;
    });
    stepperEl.innerHTML = html;
    stepSubEl.textContent = `Step ${active} of ${STEP_LABELS.length} · ${STEP_LABELS[active - 1]}`;
  }
  function showStep(n) {
    current = n;
    steps.forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
    renderStepper(n);
    formError.hidden = true;
    if (n === 5) renderReview();
  }

  // ---- Login method choice (Step 1) ----
  const loginModeChoice = document.getElementById("awLoginModeChoice");
  loginModeChoice.innerHTML = LOGIN_MODES.map(
    (m, i) => `
    <label class="signin-option${i === 0 ? " is-selected" : ""}">
      <input type="radio" name="awLoginMode" value="${esc(m.value)}" ${i === 0 ? "checked" : ""} />
      <span class="signin-option-title">${esc(m.title)}</span>
      <span class="signin-option-desc">${esc(m.desc)}</span>
    </label>`
  ).join("");
  loginModeChoice.querySelectorAll('input[name="awLoginMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      loginModeChoice.querySelectorAll(".signin-option").forEach((opt) => opt.classList.remove("is-selected"));
      radio.closest(".signin-option").classList.add("is-selected");
    });
  });

  // ---- Short Description: word count, not character count ----
  const desc = document.getElementById("awDesc");
  const descCount = document.getElementById("awDescCount");
  function countWords(text) {
    const t = text.trim();
    return t ? t.split(/\s+/).length : 0;
  }
  desc.addEventListener("input", () => {
    const words = desc.value.trim() ? desc.value.trim().split(/\s+/) : [];
    if (words.length > DESC_WORD_LIMIT) desc.value = words.slice(0, DESC_WORD_LIMIT).join(" ");
    descCount.textContent = String(countWords(desc.value));
  });
  document.getElementById("awUpload").addEventListener("click", () => {
    const u = document.getElementById("awUpload");
    u.querySelector(".upload-label").textContent = "logo.png selected";
  });

  // ---- Application Type controls which link field(s) show ----
  const typeSel = document.getElementById("awType");
  const webField = document.getElementById("awWebField");
  const mobileField = document.getElementById("awMobileField");
  typeSel.innerHTML = opts(["Web Application", "Mobile Application", "Web & Mobile"]);
  const syncTypeTrigger = bindSelectTrigger("awType", "Select application type");
  function syncTypeFields() {
    const t = typeSel.value;
    webField.hidden = t === "Mobile Application";
    mobileField.hidden = t === "Web Application";
  }
  typeSel.addEventListener("change", syncTypeFields);
  syncTypeFields();

  // ---- Multiple Tab Support ----
  const tabsSel = document.getElementById("awTabs");
  tabsSel.innerHTML = opts(["Yes", "No"], "Yes / No");
  bindSelectTrigger("awTabs", "Yes / No");

  // ---- Department / Sub Department (shared by Step 2 + Step 3 below) ----
  const deptSel = document.getElementById("awDept");
  const subSel = document.getElementById("awSubDept");
  deptSel.innerHTML = opts(departments());
  const syncDeptTrigger = bindSelectTrigger("awDept", "Select department");
  const syncSubTrigger = bindSelectTrigger("awSubDept", "Select department first");
  function syncSub(preferredSubDept) {
    const options = [{ label: "General / Department-Level (this department itself)", value: "" }].concat(
      subDepartments(deptSel.value).map((s) => ({ label: s, value: s }))
    );
    subSel.innerHTML = options
      .map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`)
      .join("");
    if (preferredSubDept != null && options.some((o) => o.value === preferredSubDept)) subSel.value = preferredSubDept;
    syncSubTrigger();
  }
  syncSub();
  deptSel.addEventListener("change", () => { syncDeptTrigger(); syncSub(); syncLevelAndJuris(); syncDcLevel(); });
  subSel.addEventListener("change", () => { syncLevelAndJuris(); syncDcLevel(); });

  // ---- Step 2: audience choice, then open-by-default toggle + restricted picker ----
  // Only "Government Officers" needs any further setup here — Public and
  // Both mean everyone already has access, so the officer-only
  // open/restrict toggle (and its jurisdiction picker) doesn't apply.
  const officerPanel = document.getElementById("awOfficerPanel");
  function syncAudiencePanels(value) {
    officerPanel.hidden = value !== "officers";
  }
  wizard.querySelectorAll('input[name="awAudience"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      wizard.querySelectorAll("#awAudienceChoice .signin-option").forEach((opt) => opt.classList.remove("is-selected"));
      radio.closest(".signin-option").classList.add("is-selected");
      syncAudiencePanels(radio.value);
    });
  });

  const openAccessCb = document.getElementById("awOpenAccess");
  const restrictedPanel = document.getElementById("awRestrictedPanel");
  openAccessCb.addEventListener("change", () => { restrictedPanel.hidden = openAccessCb.checked; });

  const levelSel = document.getElementById("awLevel");
  const syncLevelTrigger = bindSelectTrigger("awLevel", "Select level");
  const jurisMS = makeMultiSelect({
    placeholder: "Select Jurisdiction(s)", searchLabel: "Search for jurisdiction?",
    searchPlaceholder: "search Jurisdiction", items: [],
  });
  const desigMS = makeMultiSelect({
    placeholder: "Select Designation(s)", searchLabel: "Search Designation",
    searchPlaceholder: "search Designation", items: [],
  });
  document.getElementById("awJurisMS").appendChild(jurisMS);
  document.getElementById("awDesigMS").appendChild(desigMS);

  function syncJurisItems() {
    if (typeof Store === "undefined") return;
    const levelIndex = Number(levelSel.value);
    const offices = Store.visibleOffices(deptSel.value, subSel.value)
      .filter((o) => o.levelIndex === levelIndex)
      .map((o) => o.name);
    jurisMS._setItems(offices);
  }
  function syncLevelAndJuris() {
    if (typeof Store === "undefined") return;
    const levels = Store.deptLevels(deptSel.value, subSel.value);
    levelSel.innerHTML = levels.map((l, i) => `<option value="${i}">${esc(l)}</option>`).join("");
    syncLevelTrigger();
    syncJurisItems();
    desigMS._setItems(Store.visibleDeptDesignations(deptSel.value, subSel.value).map((d) => d.name));
  }
  levelSel.addEventListener("change", () => { syncLevelTrigger(); syncJurisItems(); });

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

  // ---- Step 3: Department Contact Person — Level first, then Jurisdiction/Designation ----
  const dcLevelSel = document.getElementById("awDcLevel");
  const dcJurisSel = document.getElementById("awDcJuris");
  const dcDesigSel = document.getElementById("awDcDesig");
  const syncDcLevelTrigger = bindSelectTrigger("awDcLevel", "Select level");
  const syncDcJurisTrigger = bindSelectTrigger("awDcJuris", "Select a level first");
  const syncDcDesigTrigger = bindSelectTrigger("awDcDesig", "Select designation");
  function syncDcJuris() {
    if (typeof Store === "undefined") return;
    const levelIndex = Number(dcLevelSel.value);
    const offices = Store.visibleOffices(deptSel.value, subSel.value).filter((o) => o.levelIndex === levelIndex);
    dcJurisSel.disabled = !offices.length;
    dcJurisSel.innerHTML = offices.length
      ? opts(offices.map((o) => o.name), "Select jurisdiction")
      : '<option value="" disabled selected>Select a level with offices</option>';
    syncDcJurisTrigger();
  }
  function syncDcLevel() {
    if (typeof Store === "undefined") return;
    const levels = Store.deptLevels(deptSel.value, subSel.value);
    dcLevelSel.innerHTML = levels.map((l, i) => `<option value="${i}">${esc(l)}</option>`).join("");
    syncDcLevelTrigger();
    syncDcJuris();
    dcDesigSel.innerHTML = opts(Store.visibleDeptDesignations(deptSel.value, subSel.value).map((d) => d.name), "Select designation");
    syncDcDesigTrigger();
  }
  dcLevelSel.addEventListener("change", () => { syncDcLevelTrigger(); syncDcJuris(); });

  // ---- Step 5: review render -------------------------------
  function reviewCard(title, step, pairs) {
    const items = pairs.map((p) => `<div class="review-item"><span class="review-label">${esc(p[0])}</span><span class="review-value">${esc(p[1])}</span></div>`).join("");
    return `<div class="review-card">
      <div class="review-head"><span class="review-title">${esc(title)}</span><a href="#" class="review-edit" data-aw-edit="${step}">Edit</a></div>
      <div class="review-grid">${items}</div>
    </div>`;
  }
  const AUDIENCE_LABELS = { officers: "Government Officers", public: "General Public", both: "Both Officers & Public" };
  function renderReview() {
    const audience = document.querySelector('input[name="awAudience"]:checked').value;
    const loginMode = LOGIN_MODES.find((m) => m.value === document.querySelector('input[name="awLoginMode"]:checked').value);
    const links = [webField.hidden ? null : ["Web URL", val("awDomain", "—")], mobileField.hidden ? null : ["App Store / Play Store Link", val("awAppUrl", "—")]].filter(Boolean);
    const accessSummary = audience === "public"
      ? "Open to the general public"
      : openAccessCb.checked
      ? "Open to all officers"
      : roles.length
      ? roles.map((r) => `${r.desig} @ ${r.juris}`).join("; ")
      : "Restricted (no roles added yet)";

    document.getElementById("awReview").innerHTML =
      reviewCard("1. App Identity", 1, [
        ["Department", val("awDept")],
        ["Sub Department", val("awSubDept", "General / Department-Level")],
        ["Application Name", val("awName")],
        ["Application Type", typeSel.value],
        ...links,
        ["Login Method", loginMode ? loginMode.title : "—"],
        ["Short Description", val("awDesc") || desc.value.trim()],
      ]) +
      reviewCard("2. Who Can Use It", 2, [
        ["Audience", AUDIENCE_LABELS[audience] || audience],
        ["Access", accessSummary],
      ]) +
      reviewCard("3. Contact Details", 3, [
        ["Company (SI)", val("awSiCompany", "—")],
        ["SI Email", val("awSiEmail", "—")],
        ["Dept Contact Person", val("awDcName", "—")],
        ["Dept Email", val("awDcEmail", "—")],
      ]) +
      reviewCard("4. Technical Details", 4, [
        ["Redirection URL", val("awRedirect", "—")],
        ["Logout URL", val("awLogout", "—")],
        ["Production IP", val("awProdIp", "—")],
        ["Values Returned", val("awValues", "—")],
      ]);
  }
  document.getElementById("awReview").addEventListener("click", (e) => {
    const edit = e.target.closest("[data-aw-edit]");
    if (!edit) return;
    e.preventDefault();
    showStep(Number(edit.dataset.awEdit));
  });

  // ---- validation ------------------------------------------
  function validate() {
    const problems = [];
    if (!val("awName")) problems.push("Application Name is required.");
    if (!desc.value.trim()) problems.push("Short Description is required.");
    if (!webField.hidden && !val("awDomain")) problems.push("Web URL is required for a Web Application.");
    if (!mobileField.hidden && !val("awAppUrl")) problems.push("App Store / Play Store Link is required for a Mobile Application.");
    return problems;
  }

  // ---- navigation ------------------------------------------
  wizard.addEventListener("click", (e) => {
    if (e.target.closest("[data-aw-next]")) showStep(Math.min(current + 1, 5));
    else if (e.target.closest("[data-aw-back]")) showStep(Math.max(current - 1, 1));
    else if (e.target.closest("[data-aw-close]")) close(wizard);
  });

  // ---- submit ------------------------------------------------
  function genClientId(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24);
    return "tnsso_" + slug + "_" + Math.floor(100 + Math.random() * 900);
  }
  const formError = document.getElementById("awFormError");
  document.getElementById("awRegisterBtn").addEventListener("click", () => {
    const problems = validate();
    if (problems.length) {
      formError.hidden = false;
      formError.innerHTML = `<span class="material-icons">error_outline</span><span>${problems.map(esc).join("<br />")}</span>`;
      formError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    formError.hidden = true;

    const name = val("awName", "Untitled Application");
    const audience = document.querySelector('input[name="awAudience"]:checked').value;
    const loginMode = document.querySelector('input[name="awLoginMode"]:checked').value;
    const payload = {
      name,
      type: typeSel.value || "Web Application",
      description: desc.value.trim(),
      dept: deptSel.value,
      subDept: subSel.value,
      audience,
      loginMode,
      webUrl: webField.hidden ? "" : val("awDomain"),
      appUrl: mobileField.hidden ? "" : val("awAppUrl"),
      redirectUrl: val("awRedirect", ""),
    };
    let record = null;
    if (typeof Store !== "undefined") {
      record = editingApp
        ? Store.updateApplication(editingApp.id, payload)
        : Store.addApplication(Object.assign({ clientId: genClientId(name) }, payload));
    }
    document.getElementById("asName").textContent = name;
    const clientIdEl = document.getElementById("asClientId");
    if (clientIdEl) clientIdEl.textContent = (record && record.clientId) || "—";
    close(wizard);
    open(success);
  });

  let editingApp = null;
  function openWizard(editRecord) {
    editingApp = editRecord || null;
    document.getElementById("awTitle").textContent = editingApp ? "Edit Application" : "Register Application";
    document.getElementById("awRegisterBtn").textContent = editingApp ? "Save Changes" : "Register Application";
    formError.hidden = true;

    const ctx = editingApp ? { dept: editingApp.dept, subDept: editingApp.subDept } : resolveContext();
    document.getElementById("awName").value = editingApp ? editingApp.name : "";
    typeSel.value = editingApp ? editingApp.type : "Web Application";
    syncTypeTrigger();
    syncTypeFields();
    desc.value = editingApp ? editingApp.description || "" : "";
    descCount.textContent = String(countWords(desc.value));
    document.getElementById("awDomain").value = editingApp ? editingApp.webUrl || "" : "";
    document.getElementById("awAppUrl").value = editingApp ? editingApp.appUrl || "" : "";
    document.getElementById("awRedirect").value = editingApp ? editingApp.redirectUrl || "" : "";

    const loginModeValue = editingApp && editingApp.loginMode ? editingApp.loginMode : LOGIN_MODES[0].value;
    loginModeChoice.querySelectorAll('input[name="awLoginMode"]').forEach((r) => {
      r.checked = r.value === loginModeValue;
      r.closest(".signin-option").classList.toggle("is-selected", r.checked);
    });

    // A Department Admin can only register applications under their own
    // department — the field is locked to it, not just pre-selected. A
    // Sub-Department Admin is locked one level further, to their own
    // sub-department too.
    const scope = typeof Store !== "undefined" ? Store.myScope() : { role: "super-admin" };
    const deptTrigger = document.getElementById("awDeptTrigger");
    const subDeptTrigger = document.getElementById("awSubDeptTrigger");
    if (scope.role === "dept-admin") {
      deptSel.innerHTML = opts(departments());
      deptSel.value = scope.dept;
      deptTrigger.disabled = true;
    } else {
      deptTrigger.disabled = false;
      if (ctx.dept && [...deptSel.options].some((o) => o.value === ctx.dept)) deptSel.value = ctx.dept;
    }
    syncDeptTrigger();
    syncSub(scope.role === "dept-admin" && scope.subDept ? scope.subDept : ctx.subDept);
    subDeptTrigger.disabled = scope.role === "dept-admin" && !!scope.subDept;
    syncLevelAndJuris();
    syncDcLevel();

    const audienceValue = editingApp && AUDIENCE_LABELS[editingApp.audience] ? editingApp.audience : "officers";
    wizard.querySelectorAll('input[name="awAudience"]').forEach((r) => {
      r.checked = r.value === audienceValue;
      r.closest(".signin-option").classList.toggle("is-selected", r.checked);
    });
    syncAudiencePanels(audienceValue);

    openAccessCb.checked = true;
    restrictedPanel.hidden = true;
    roles.length = 0;
    renderRoles();

    showStep(1);
    open(wizard);
  }
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
