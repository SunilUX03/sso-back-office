// ============================================================
// TN SSO — App Management : department detail (All Apps)
// Figma node 1-13071 (frames 34.1 / 34.2)
// ============================================================

// ---- Overview KPI cards ----
const KPI_CARDS = [
  { icon: "layers", number: "35", label: "Applications" },
  { icon: "layers", number: "15", label: "Web Applications" },
  { icon: "layers", number: "20", label: "Mobile Applications" },
];

// ---- App catalogue (cycled to 12 cards) ----
const APP_TYPES = [
  {
    name: "Direct Benefit Transfer", dept: "Department of Finance", icon: "payments",
    desc: "An app for automated money transfer to the beneficiaries of all citizens of Tamil Nadu.",
    web: true, mobile: false,
  },
  {
    name: "Crop Survey Dashboard", dept: "Department of Agriculture", icon: "agriculture",
    desc: "An app for real-time, GPS-based crop data collection and verification across Tamil Nadu",
    web: true, mobile: true,
  },
  {
    name: "Tamil Nadu GIS", dept: "Department of Agriculture", icon: "public",
    desc: "TN GIS System platform for spatial data visualisation, land records, and decision-making",
    web: true, mobile: true,
  },
  {
    name: "TANFINET Portal", dept: "IT & DS Department", icon: "cell_tower",
    desc: "High-speed broadband connectivity to all 12,525 Village Panchayats in Tamil Nadu",
    web: true, mobile: true,
  },
];
const APPS = Array.from({ length: 12 }, (_, i) => {
  const t = APP_TYPES[i % APP_TYPES.length];
  return Object.assign({}, t, { running: i % 2 === 1 });
});

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

// ---- Render KPI cards ----
const kpiGrid = document.querySelector(".kpi-grid");
KPI_CARDS.forEach((c) => {
  kpiGrid.appendChild(
    el(
      "article",
      "kpi-card",
      `<div class="kpi-top">
         <span class="icon-badge"><span class="material-icons">${c.icon}</span></span>
         <span class="kpi-external" aria-hidden="true"><span class="material-icons">open_in_new</span></span>
       </div>
       <div class="kpi-number">${c.number}</div>
       <div class="kpi-label">${c.label}</div>`
    )
  );
});

// ---- Render application cards ----
const appGrid = document.querySelector(".app-grid");
function accessIcons(a) {
  let h = "";
  if (a.mobile) h += `<span class="app-access-icon" title="Mobile app"><span class="material-icons">phone_iphone</span></span>`;
  if (a.web) h += `<span class="app-access-icon" title="Browser"><span class="material-icons">desktop_windows</span></span>`;
  return h;
}
function statusBtn(a) {
  return a.running
    ? `<button class="app-status-btn is-stop" title="Stop application"><span class="material-icons">stop</span></button>`
    : `<button class="app-status-btn is-play" title="Start application"><span class="material-icons">play_arrow</span></button>`;
}
APPS.forEach((a) => {
  const card = el("article", "app-card");
  card.innerHTML = `
    <div class="app-card-top">
      <span class="app-logo"><span class="material-icons">${a.icon}</span></span>
      <div class="app-access-icons">${accessIcons(a)}</div>
    </div>
    <h3 class="app-name">${a.name}</h3>
    <span class="chip">${a.dept}</span>
    <p class="app-desc">${a.desc}</p>
    <button class="btn btn-primary-alt btn-block view-app-btn"><span class="material-icons" style="font-size:16px">visibility</span>View App</button>
    <div class="app-card-actions">
      <button class="btn btn-outline"><span class="material-icons" style="font-size:16px">edit</span>Edit Details</button>
      ${statusBtn(a)}
    </div>`;
  appGrid.appendChild(card);
});

// ---- Access modal ("Select one to access the application") ----
const accessModal = document.getElementById("accessModal");
function openAccess() { accessModal.hidden = false; document.body.style.overflow = "hidden"; }
function closeAccess() { accessModal.hidden = true; document.body.style.overflow = ""; }
appGrid.addEventListener("click", (e) => {
  if (e.target.closest(".view-app-btn")) openAccess();
  else if (e.target.closest(".app-status-btn")) {
    const btn = e.target.closest(".app-status-btn");
    const stop = btn.classList.toggle("is-stop");
    btn.classList.toggle("is-play", !stop);
    btn.querySelector(".material-icons").textContent = stop ? "stop" : "play_arrow";
  }
});
accessModal.querySelectorAll("[data-access-close], .access-option").forEach((b) =>
  b.addEventListener("click", closeAccess)
);
accessModal.addEventListener("mousedown", (e) => { if (e.target === accessModal) closeAccess(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !accessModal.hidden) closeAccess(); });
