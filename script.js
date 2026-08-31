// ============================================================
// TN SSO — Back Office Home : dynamic content + interactions
// ============================================================

// ---- Overview KPI cards ----
const KPI_CARDS = [
  { icon: "domain", number: "5", label: "Sub Departments", link: "jurisdiction.html" },
  { icon: "apps", number: "35", label: "Registered applications", link: "#" },
  { icon: "account_tree", number: "80,000", label: "Divisions", link: "jurisdiction.html" },
  { icon: "location_city", number: "1,24,500", label: "Districts", link: "jurisdiction.html" },
  { icon: "hub", number: "1,24,500", label: "Sub Divisions", link: "jurisdiction.html" },
  { icon: "map", number: "1,24,500", label: "Talukas/Mandal/Tehsil", link: "jurisdiction.html" },
  { icon: "explore", number: "1,24,500", label: "Firka/ Revenue Circle", link: "jurisdiction.html" },
  { icon: "holiday_village", number: "1,24,500", label: "Village", link: "jurisdiction.html" },
];

// ---- Quick Access cards ----
const QUICK_CARDS = [
  { label: "Add New Jurisdiction", link: "agency.html" },
  { label: "Add New Designation", link: "agency-designation.html" },
  { label: "Add New Reporting", link: "jurisdiction.html" },
  { label: "Add New Officer", link: "users.html" },
  { label: "Add New Application", link: "#" },
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

// ---- Render KPI cards ----
const kpiGrid = document.querySelector(".kpi-grid");
KPI_CARDS.forEach((c) => {
  const card = el(
    "a",
    "kpi-card",
    `<div class="kpi-top">
         <span class="icon-badge"><span class="material-icons">${c.icon}</span></span>
         <span class="kpi-external" aria-hidden="true"><span class="material-icons">open_in_new</span></span>
       </div>
       <div class="kpi-number">${c.number}</div>
       <div class="kpi-label">${c.label}</div>`
  );
  card.href = c.link || "#";
  kpiGrid.appendChild(card);
});

// ---- Render Quick Access cards ----
const quickGrid = document.querySelector(".quick-grid");
QUICK_CARDS.forEach((c) => {
  const card = el(
    "a",
    "quick-card",
    `<div class="quick-top">
         <span class="icon-badge"><img class="badge-img" src="assets/imgIconBadge.svg" alt="" /></span>
         <span class="kpi-external" aria-hidden="true"><span class="material-icons">open_in_new</span></span>
       </div>
       <div class="quick-label">${c.label}</div>`
  );
  card.href = c.link || "#";
  quickGrid.appendChild(card);
});

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
