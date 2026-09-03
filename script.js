// ============================================================
// TN SSO — Back Office Home : dynamic content + interactions
// ============================================================

// ---- Coverage metrics: for a given "has this been set up here?" test,
// how many of the 75 real departments and how many of their real
// sub-departments have it. Shared shape for Jurisdiction, Designation,
// and Officer coverage below, so each Overview card reads the same way:
// "X of 75 departments, Y of N sub-departments." ----
const TOTAL_DEPARTMENTS = Store.visibleDepartments().length;
const TOTAL_SUBDEPARTMENTS = Store.visibleDepartments().reduce((sum, d) => sum + Store.visibleSubDepartments(d).length, 0);
function coverageStats(hasFn) {
  let deptCount = 0;
  let subDeptCount = 0;
  Store.visibleDepartments().forEach((dept) => {
    const subs = Store.visibleSubDepartments(dept);
    let deptHasAny = hasFn(dept, "");
    subs.forEach((sub) => {
      if (hasFn(dept, sub)) {
        subDeptCount++;
        deptHasAny = true;
      }
    });
    if (deptHasAny) deptCount++;
  });
  return { depts: deptCount, subDepts: subDeptCount };
}

// ---- Overview: three "X of 75 departments / Y of N sub-departments"
// coverage cards (Jurisdiction, Designation, Officers) plus one Web vs
// Mobile application-mix donut — real Store data throughout. Below
// Sub-Department (a jurisdiction-office admin), "coverage across
// departments" stops meaning anything — there's only the one office and
// its own subtree — so those three cards switch to real counts scoped to
// that subtree instead of a ratio against the whole org. ----
function getComboStatCards() {
  const scope = Store.myScope();
  if (scope.role === "dept-admin" && scope.office) {
    const offices = Store.visibleOffices(scope.dept, scope.subDept);
    const designations = Store.visibleDeptDesignations(scope.dept, scope.subDept);
    const officers = Store.visibleOfficers();
    const activeOfficers = officers.filter((o) => o.status === "active");
    const levelsWithOffices = new Set(offices.map((o) => o.levelIndex)).size;
    const levelsWithDesignations = new Set(designations.map((d) => d.levelIndex)).size;
    return [
      {
        icon: "account_tree", title: "Jurisdiction Management", link: "jurisdiction.html",
        items: [
          { number: offices.length, label: "Jurisdiction Records" },
          { number: Math.max(offices.length - 1, 0), label: "Offices Under Me" },
        ],
      },
      {
        icon: "badge", title: "Designation Management", link: "designation.html",
        items: [
          { number: designations.length, label: "Designations" },
          { number: levelsWithDesignations, label: "Levels Covered" },
        ],
      },
      {
        icon: "group", title: "Officers", link: "users.html",
        items: [
          { number: officers.length, label: "Total Officers" },
          { number: activeOfficers.length, label: "Active Officers" },
        ],
      },
    ];
  }
  const jurisdiction = coverageStats((dept, sub) => Store.deptOffices(dept, sub).length > 0);
  const designation = coverageStats((dept, sub) => Store.deptDesignations(dept, sub).length > 0);
  const activeOfficers = Store.officers().filter((o) => o.status === "active");
  const officerCoverage = coverageStats((dept, sub) => activeOfficers.some((o) => o.dept === dept && (o.subDept || "") === sub));
  return [
    {
      icon: "account_tree", title: "Jurisdiction Management", link: "jurisdiction.html",
      items: [
        { number: jurisdiction.depts, denom: TOTAL_DEPARTMENTS, label: "Departments Configured" },
        { number: jurisdiction.subDepts, denom: TOTAL_SUBDEPARTMENTS, label: "Sub-Departments Configured" },
      ],
    },
    {
      icon: "badge", title: "Designation Management", link: "designation.html",
      items: [
        { number: designation.depts, denom: TOTAL_DEPARTMENTS, label: "Departments Configured" },
        { number: designation.subDepts, denom: TOTAL_SUBDEPARTMENTS, label: "Sub-Departments Configured" },
      ],
    },
    {
      icon: "group", title: "Officers", link: "users.html",
      items: [
        { number: officerCoverage.depts, denom: TOTAL_DEPARTMENTS, label: "Departments with Active Officers" },
        { number: officerCoverage.subDepts, denom: TOTAL_SUBDEPARTMENTS, label: "Sub-Departments with Active Officers" },
      ],
    },
  ];
}

// ---- Applications: Web vs Mobile is a type split, not a coverage count,
// so it reads better as one donut than as two more number tiles. ----
const APP_TYPE_COLORS = { web: "#002385", mobile: "#0ea5e9", both: "#64748b" };
function getAppTypeBreakdown() {
  const active = Store.visibleApplications().filter((a) => a.status === "active");
  let web = 0, mobile = 0, both = 0;
  active.forEach((a) => {
    if (a.type === "Web & Mobile") both++;
    else if (a.type === "Mobile Application") mobile++;
    else web++;
  });
  return { web, mobile, both, total: active.length };
}
function buildDonutSvg(segments, size) {
  size = size || 96;
  const r = size / 2 - 9;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (!total) {
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--stroke-100)" stroke-width="14" />
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="var(--muted)">0</text>
    </svg>`;
  }
  let offset = 0;
  const rings = segments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const dash = (seg.value / total) * circumference;
      const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="14" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" />`;
      offset += dash;
      return circle;
    })
    .join("");
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    ${rings}
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="var(--heading)">${total}</text>
  </svg>`;
}

// ---- Needs Your Attention — only pending accounts, since that's the one
// thing on Home an admin can't already see at a glance elsewhere. Hidden
// entirely when there's nothing pending, so it doesn't turn into wallpaper. ----
function getAttentionCards() {
  const cards = [];
  const pendingOfficers = Store.pendingOfficers ? Store.pendingOfficers() : [];
  const pendingAdmins = Store.pendingDepartmentAdmins ? Store.pendingDepartmentAdmins() : [];
  if (pendingOfficers.length) {
    cards.push({
      icon: "hourglass_empty",
      number: String(pendingOfficers.length),
      label: `Officer${pendingOfficers.length === 1 ? "" : "s"} Awaiting Verification`,
      link: "users.html",
    });
  }
  if (pendingAdmins.length) {
    cards.push({
      icon: "hourglass_empty",
      number: String(pendingAdmins.length),
      label: `Admin${pendingAdmins.length === 1 ? "" : "s"} Awaiting Verification`,
      link: "admin-logins.html",
    });
  }
  return cards;
}

// ---- Needs Your Attention — only pending accounts, since that's the one
// thing on Home an admin can't already see at a glance elsewhere. Hidden
// entirely when there's nothing pending, so it doesn't turn into wallpaper. ----
function getAttentionCards() {
  const cards = [];
  const scope = Store.myScope();
  const inScope = (dept, subDept) =>
    scope.role !== "dept-admin" || (dept === scope.dept && (!scope.subDept || (subDept || "") === scope.subDept));
  const pendingOfficers = (Store.pendingOfficers ? Store.pendingOfficers() : []).filter((o) => inScope(o.dept, o.subDept));
  const pendingAdmins = (Store.pendingDepartmentAdmins ? Store.pendingDepartmentAdmins() : []).filter((a) => inScope(a.dept, a.subDept));
  if (pendingOfficers.length) {
    cards.push({
      icon: "hourglass_empty",
      number: String(pendingOfficers.length),
      label: `Officer${pendingOfficers.length === 1 ? "" : "s"} Awaiting Verification`,
      link: "users.html",
    });
  }
  if (pendingAdmins.length) {
    cards.push({
      icon: "hourglass_empty",
      number: String(pendingAdmins.length),
      label: `Admin${pendingAdmins.length === 1 ? "" : "s"} Awaiting Verification`,
      link: "admin-logins.html",
    });
  }
  return cards;
}

// ---- Quick Access cards — only real, working actions ----
const QUICK_CARDS = [
  { icon: "add_box", label: "Register Application", trigger: "app" },
  { icon: "person_add", label: "Create User", trigger: "officer" },
  { icon: "admin_panel_settings", label: "Create Admin Login", trigger: "department" },
  { icon: "account_tree", label: "Jurisdiction Management", link: "jurisdiction.html" },
  { icon: "badge", label: "Designation Management", link: "designation.html" },
];

// ---- Learning Centre cards ----
const LEARNING_CARDS = [
  { img: "assets/imgImage15.png", title: "How to setup organisation" },
  { img: "assets/imgImage21.png", title: "How to add Designation" },
  { img: "assets/imgImage22.png", title: "How to add reporting flow" },
  { img: "assets/imgImage23.png", title: "How to add Jurisdiction" },
];
const LEARNING_DESC =
  "Teaches you how to add details in jurisdiction, Designation & Reporting";

// ---- FAQ rows ----
const FAQ_ITEMS = Array.from({ length: 6 }, () => ({
  question: "Frequently Asked question 1",
  answer:
    "Add the relevant answer content here. This section explains the steps and guidance for the question above.",
}));

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

// ---- Welcome banner: real identity + last login, same source as Profile ----
function renderBanner() {
  const scope = Store.myScope();
  let name, role, department, lastLogin;
  if (scope.role === "dept-admin") {
    const admin = Store.departmentAdmins().find((a) => a.dept === scope.dept && (a.subDept || "") === scope.subDept && (a.office || "") === scope.office);
    name = admin ? admin.name : scope.dept;
    role = scope.office ? "Jurisdiction Admin" : scope.subDept ? "Sub-Department Admin" : "Department Admin";
    department = scope.office
      ? `${scope.office} · ${scope.dept}`
      : scope.subDept
      ? `${scope.subDept} · ${scope.dept}`
      : scope.dept;
    lastLogin = "—";
  } else {
    const p = Store.superAdmin();
    name = p.name;
    role = p.role;
    department = p.department;
    const history = Store.loginHistory();
    lastLogin = history.length ? history[0].timestamp : "—";
  }
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName = name.split(" ")[0];
  document.getElementById("bannerGreeting").textContent = `${greeting}, ${firstName}`;
  document.getElementById("bannerSubtitle").innerHTML =
    `${role} &nbsp;&middot;&nbsp; ${department} &nbsp;&middot;&nbsp; Last login: ${lastLogin}`;
}
renderBanner();
Store.on(renderBanner);

function renderCardGrid(gridEl, cards) {
  gridEl.innerHTML = "";
  cards.forEach((c) => {
    const card = el(
      "a",
      "kpi-card",
      `<span class="icon-badge"><span class="material-icons">${c.icon}</span></span>
         <div class="kpi-number">${c.number}</div>
         <div class="kpi-label">${c.label}</div>`
    );
    card.href = c.link || "#";
    gridEl.appendChild(card);
  });
}

// ---- Render Overview (three coverage cards + one app-type donut) and
// Attention cards (re-renders when Store changes) ----
const overviewGrid = document.getElementById("overviewGrid");
const attentionSection = document.getElementById("attentionSection");
const attentionGrid = document.getElementById("attentionGrid");

function renderComboStatCards() {
  overviewGrid.innerHTML = "";
  getComboStatCards().forEach((c) => {
    const card = el(
      "a",
      "combo-stat-card",
      `<div class="combo-stat-header">
         <span class="icon-badge"><span class="material-icons">${c.icon}</span></span>
         <span class="combo-stat-title">${c.title}</span>
       </div>
       <div class="combo-stat-body">
         ${c.items
           .map(
             (item) => `
           <div class="combo-stat-item">
             <div class="combo-stat-number">${item.number}${item.denom != null ? ` <span class="combo-stat-denom">of ${item.denom}</span>` : ""}</div>
             <div class="combo-stat-label">${item.label}</div>
           </div>`
           )
           .join('<div class="combo-stat-divider"></div>')}
       </div>`
    );
    card.href = c.link;
    overviewGrid.appendChild(card);
  });

  // App Management doesn't exist below Sub-Department — applications
  // aren't tied to a specific jurisdiction office in the data model.
  const scope = Store.myScope();
  if (scope.role === "dept-admin" && scope.office) return;

  const breakdown = getAppTypeBreakdown();
  const donutSegments = [
    { value: breakdown.web, color: APP_TYPE_COLORS.web },
    { value: breakdown.mobile, color: APP_TYPE_COLORS.mobile },
    { value: breakdown.both, color: APP_TYPE_COLORS.both },
  ];
  const legendRows = [
    { label: "Web", value: breakdown.web, color: APP_TYPE_COLORS.web },
    { label: "Mobile", value: breakdown.mobile, color: APP_TYPE_COLORS.mobile },
    { label: "Web & Mobile", value: breakdown.both, color: APP_TYPE_COLORS.both },
  ].filter((row) => row.value > 0);
  const appCard = el(
    "a",
    "combo-stat-card app-chart-card",
    `<div class="combo-stat-header">
       <span class="icon-badge"><span class="material-icons">apps</span></span>
       <span class="combo-stat-title">Applications (Active)</span>
     </div>
     <div class="app-chart-body">
       <div class="app-donut">${buildDonutSvg(donutSegments, 78)}</div>
       <div class="app-chart-legend">
         ${legendRows
           .map((row) => `<div class="legend-row"><span class="legend-swatch" style="background:${row.color}"></span>${row.label} <strong>${row.value}</strong></div>`)
           .join("") || `<div class="legend-row">No active applications yet.</div>`}
       </div>
     </div>`
  );
  appCard.href = "app-management.html";
  overviewGrid.appendChild(appCard);
}

function renderKpiCards() {
  renderComboStatCards();
  const attentionCards = getAttentionCards();
  attentionSection.hidden = attentionCards.length === 0;
  renderCardGrid(attentionGrid, attentionCards);
}
renderKpiCards();
Store.on(renderKpiCards);

// ---- Render Quick Access cards ----
// App Management doesn't exist below Sub-Department — applications aren't
// tied to a specific jurisdiction office in the data model.
const isOfficeScoped = Store.myScope().role === "dept-admin" && !!Store.myScope().office;
const visibleQuickCards = isOfficeScoped ? QUICK_CARDS.filter((c) => c.trigger !== "app") : QUICK_CARDS;
const quickTrack = document.getElementById("quickTrack");
visibleQuickCards.forEach((c) => {
  const html = `<span class="icon-badge icon-badge-sm"><span class="material-icons">${c.icon}</span></span>
       <span class="quick-label">${c.label}</span>`;
  const card = c.trigger
    ? el("button", "quick-card", html)
    : el("a", "quick-card", html);
  if (c.trigger) {
    card.type = "button";
    card.dataset.open = c.trigger;
  } else {
    card.href = c.link || "#";
  }
  quickTrack.appendChild(card);
});

// ---- Quick Access carousel arrows ----
const quickPrev = document.getElementById("quickPrev");
const quickNext = document.getElementById("quickNext");
function updateQuickNav() {
  quickPrev.disabled = quickTrack.scrollLeft <= 4;
  quickNext.disabled = quickTrack.scrollLeft + quickTrack.clientWidth >= quickTrack.scrollWidth - 4;
}
quickPrev.addEventListener("click", () => quickTrack.scrollBy({ left: -240 }));
quickNext.addEventListener("click", () => quickTrack.scrollBy({ left: 240 }));
quickTrack.addEventListener("scroll", updateQuickNav);
window.addEventListener("resize", updateQuickNav);
updateQuickNav();

// ---- Render Learning Centre cards ----
const learningGrid = document.querySelector(".learning-grid");
LEARNING_CARDS.forEach((c) => {
  learningGrid.appendChild(
    el(
      "article",
      "learning-card",
      `<div class="learning-image"><img src="${c.img}" alt="" /></div>
       <h3 class="learning-title">${c.title}</h3>
       <p class="learning-desc">${LEARNING_DESC}</p>
       <button class="btn btn-primary btn-block">View Tutorial</button>`
    )
  );
});

// ---- Getting Started: for now, each card just shows until the admin
// dismisses it once — dismissing persists for real (Store, not just the
// DOM) so it doesn't reappear on the next visit. (Not gated on whether
// setup looks "done" — that's a deliberate demo-mode call for now.) ----
const gettingStartedSection = document.getElementById("gettingStartedSection");
const orgSetupCard = document.getElementById("orgSetupCard");
const appSetupCard = document.getElementById("appSetupCard");
function renderGettingStarted() {
  const showOrg = !Store.isGettingStartedDismissed("org");
  const showApp = !Store.isGettingStartedDismissed("app");
  orgSetupCard.hidden = !showOrg;
  appSetupCard.hidden = !showApp;
  gettingStartedSection.hidden = !(showOrg || showApp);
}
renderGettingStarted();
Store.on(renderGettingStarted);

document.querySelectorAll(".stepper-close").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".stepper-card");
    Store.dismissGettingStarted(card.dataset.gettingStarted);
    renderGettingStarted();
  });
});

// ---- Render FAQ rows + wire accordion ----
const faqList = document.querySelector(".faq-list");
FAQ_ITEMS.forEach((item, i) => {
  const row = el("div", "faq-row");
  row.innerHTML = `
    <button class="faq-question" aria-expanded="false" aria-controls="faq-ans-${i}">
      <span>${item.question}</span>
      <span class="faq-toggle"><span class="material-icons">keyboard_arrow_down</span></span>
    </button>
    <div class="faq-answer" id="faq-ans-${i}" role="region">
      <p>${item.answer}</p>
    </div>`;
  faqList.appendChild(row);

  const btn = row.querySelector(".faq-question");
  btn.addEventListener("click", () => {
    const open = row.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
  });
});

// ---- Force a repaint after everything is on the page ----
// Chromium can leave below-the-fold content painted incorrectly on first
// load even when its computed styles are already correct (opacity/display
// report fine, but the pixels lag until a repaint is triggered). Nudging
// a reflow right after load fixes it without the user needing to
// hover/scroll/resize first.
window.addEventListener("load", () => {
  requestAnimationFrame(() => {
    document.body.style.transform = "translateZ(0)";
    requestAnimationFrame(() => {
      document.body.style.transform = "";
    });
  });
});
