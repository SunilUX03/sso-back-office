// ============================================================
// TN SSO — Hierarchy Map (org chart).
// Every level — State, Department, Sub-Department, and (once reached)
// a configured sub-department's real jurisdiction/designation tree —
// renders through the same connector-line org-chart node style, so the
// whole map looks and behaves consistently. With 75 departments this is
// a wide canvas that scrolls both ways.
// Filters (Department, Sub-Department, Configured Only) prune which
// departments/sub-departments appear at all. The View dropdown
// (Jurisdiction + Designation / Jurisdiction / Designation) controls
// what a configured sub-department's leaf content shows: its real
// jurisdiction offices with designations inline, jurisdiction offices
// alone, or the designation/reporting chain alone.
// ============================================================

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---- Jurisdiction tree (from this sub-department's offices), annotated
//      with the designation(s) that head each level. ----
function buildJurisdictionTree(deptName, subDeptName) {
  const offices = Store.deptOffices(deptName, subDeptName);
  const levels = Store.deptLevels(deptName, subDeptName);
  const designations = Store.deptDesignations(deptName, subDeptName);
  const byId = {};
  offices.forEach((o) => {
    const desigs = designations.filter((d) => d.levelIndex === o.levelIndex).map((d) => d.name);
    byId[o.id] = {
      id: "j-" + o.id,
      title: o.name,
      sub: levels[o.levelIndex] || "—",
      desig: desigs.length ? desigs.join(", ") : "",
      children: [],
    };
  });
  let root = null;
  offices.forEach((o) => {
    const node = byId[o.id];
    const kids = offices.filter((c) => c.parentId === o.id).length;
    node.meta = kids ? `${kids} Sub jurisdiction office${kids > 1 ? "s" : ""}` : "";
    if (o.parentId && byId[o.parentId]) byId[o.parentId].children.push(node);
    else if (!o.parentId) root = node;
  });
  return root || { id: "j-empty", title: "Not yet configured", sub: "No jurisdiction offices added yet", children: [] };
}

// ---- Designation / reporting tree — the same office shape as the
// jurisdiction tree above (offices already form the real parent-child
// chain), just relabeled: each node is titled by the designation
// assigned to that office's level rather than the office's own name,
// and its footer counts direct reports instead of sub-offices. An
// office whose level has no designation assigned yet is labeled
// plainly rather than guessing. ----
function buildDesignationTree(deptName, subDeptName) {
  const offices = Store.deptOffices(deptName, subDeptName);
  const levels = Store.deptLevels(deptName, subDeptName);
  const designations = Store.deptDesignations(deptName, subDeptName);
  const byId = {};
  offices.forEach((o) => {
    const desig = designations.find((d) => d.levelIndex === o.levelIndex);
    byId[o.id] = {
      id: "d-" + o.id,
      title: desig ? desig.name : "Not yet assigned",
      sub: levels[o.levelIndex] || "—",
      children: [],
    };
  });
  let root = null;
  offices.forEach((o) => {
    const node = byId[o.id];
    const kids = offices.filter((c) => c.parentId === o.id).length;
    node.meta = kids ? `${kids} reporting` : "";
    if (o.parentId && byId[o.parentId]) byId[o.parentId].children.push(node);
    else if (!o.parentId) root = node;
  });
  return root || { id: "d-empty", title: "Not yet configured", sub: "No designations added yet", children: [] };
}

function hasJurisdictionData(deptName, subDeptName) {
  return Store.deptOffices(deptName, subDeptName).length > 0;
}
function hasDesignationData(deptName, subDeptName) {
  return Store.deptDesignations(deptName, subDeptName).length > 0;
}

const collapsed = new Set();

// Every department node starts collapsed, so the map opens showing the
// state at the top with all real departments as branches underneath it
// — one level deep — without immediately expanding into anyone's
// sub-departments or jurisdiction/designation detail.
function collapseToDepartmentsOnly() {
  collapsed.clear();
  Store.allDepartments().forEach((d) => collapsed.add("dept-" + Store.deptSlug(d)));
}
collapseToDepartmentsOnly();

function countNodes(node) {
  let n = 1;
  (node.children || []).forEach((c) => (n += countNodes(c)));
  return n;
}

// ---- Filter state ----
let deptFilter = "";
let subDeptFilter = "";
let configuredOnly = false;
let viewMode = "combined"; // "combined" | "jurisdiction" | "designation"

function subDeptHasAnyData(deptName, subDeptName, isGeneral) {
  return hasJurisdictionData(deptName, subDeptName) || hasDesignationData(deptName, subDeptName);
}
function departmentHasAnyData(deptName) {
  if (subDeptHasAnyData(deptName, Store.generalSubDept(), true)) return true;
  return Store.allSubDepartments(deptName).some((s) => subDeptHasAnyData(deptName, s, false));
}

// ---- Build the whole-government tree ----
// Every sub-department's own jurisdiction/designation tree is built by
// the same buildJurisdictionTree/buildDesignationTree used throughout
// the site — its node ids (e.g. "j-1") are only unique *within* that one
// sub-department's bucket, so they're re-scoped with a unique prefix
// before being nested into the single big tree, or two different
// departments' offices with the same numeric id would expand/collapse
// together.
function prefixIds(node, scope) {
  return {
    ...node,
    id: scope + "::" + node.id,
    children: (node.children || []).map((c) => prefixIds(c, scope)),
  };
}
// A configured sub-department's leaf content, shaped by the View
// dropdown: the combined jurisdiction+designation tree (default), the
// jurisdiction tree alone (designation pill stripped), or the
// designation/reporting tree.
function stripDesig(node) {
  const { desig, ...rest } = node;
  return { ...rest, children: (node.children || []).map(stripDesig) };
}
function buildLeafTree(deptName, subDeptName) {
  if (viewMode === "designation") return buildDesignationTree(deptName, subDeptName);
  const tree = buildJurisdictionTree(deptName, subDeptName);
  return viewMode === "jurisdiction" ? stripDesig(tree) : tree;
}
function buildSubDeptNode(deptName, subDeptName, isGeneral) {
  const label = isGeneral ? Store.generalLabel(deptName) : subDeptName;
  const scope = "sub-" + Store.deptSlug(deptName) + "-" + Store.subDeptSlug(subDeptName);
  const configured = subDeptHasAnyData(deptName, subDeptName, isGeneral);
  const children = configured ? [prefixIds(buildLeafTree(deptName, subDeptName), scope)] : [];
  return {
    id: scope,
    kind: "outline",
    title: label,
    sub: isGeneral ? "General / Department-Level" : "Sub-Department",
    configured,
    children,
  };
}
function buildDepartmentNode(deptName) {
  let realSubs = Store.allSubDepartments(deptName);
  if (subDeptFilter) realSubs = realSubs.filter((s) => s === subDeptFilter);
  if (configuredOnly) realSubs = realSubs.filter((s) => subDeptHasAnyData(deptName, s, false));

  const generalNode = buildSubDeptNode(deptName, Store.generalSubDept(), true);
  const includeGeneral = !subDeptFilter && (!configuredOnly || generalNode.configured);

  const children = (includeGeneral ? [generalNode] : []).concat(
    realSubs.map((s) => buildSubDeptNode(deptName, s, false))
  );
  return {
    id: "dept-" + Store.deptSlug(deptName),
    kind: "outline",
    title: deptName,
    sub: `${Store.allSubDepartments(deptName).length} sub-department${Store.allSubDepartments(deptName).length === 1 ? "" : "s"}`,
    children,
  };
}
function buildFullTree() {
  let depts = Store.allDepartments();
  if (deptFilter) depts = depts.filter((d) => d === deptFilter);
  if (configuredOnly) depts = depts.filter((d) => departmentHasAnyData(d));

  return {
    id: "root",
    kind: "outline",
    title: "Government of Tamil Nadu",
    sub: "State",
    children: depts.map((d) => buildDepartmentNode(d)).filter((d) => d.children.length || !configuredOnly),
  };
}

// ---- recursive render: connector-line org-chart, used for every level
// of the whole tree ----
function nodeHTML(node, isChild) {
  const hasChildren = node.children && node.children.length;
  const isCollapsed = collapsed.has(node.id);
  const footInner = node.meta
    ? `<span>${esc(node.meta)}</span><span class="material-icons foot-chevron">${isCollapsed ? "expand_more" : "expand_less"}</span>`
    : hasChildren
      ? `<span class="material-icons foot-chevron">${isCollapsed ? "expand_more" : "expand_less"}</span>`
      : `<span class="material-icons foot-chevron is-muted">expand_more</span>`;

  const desigLine = node.desig
    ? `<div class="org-node-desig"><span class="material-icons">badge</span>${esc(node.desig)}</div>`
    : "";

  let subtree = "";
  if (hasChildren && !isCollapsed) {
    subtree = `<div class="org-subtree"><div class="org-branch">${node.children
      .map((c) => nodeHTML(c, true))
      .join("")}</div></div>`;
  }

  return `
    <div class="org-node-wrap${isChild ? " is-child" : ""}">
      <div class="org-node" data-id="${esc(node.id)}">
        <div class="org-node-title">${esc(node.title)}</div>
        <div class="org-node-sub">${esc(node.sub)}</div>
        ${desigLine}
        <button class="org-node-foot" ${hasChildren ? `data-toggle-node="${esc(node.id)}"` : "disabled"}>${footInner}</button>
      </div>
      ${subtree}
    </div>`;
}

const orgTree = document.getElementById("orgTree");
const orgCount = document.getElementById("orgCount");

let lastTree = null;
function render() {
  const tree = buildFullTree();
  lastTree = tree;
  orgTree.innerHTML = tree.children.length
    ? nodeHTML(tree, false)
    : `<div class="empty-list">No departments or sub-departments match your search or filter.</div>`;
  orgCount.textContent = countNodes(tree);
}

// With up to 75 departments branching side by side, the connector-line
// chart centers "Government of Tamil Nadu" over the full width of that
// row — tens of thousands of pixels wide — which leaves the root card
// scrolled far off-screen by default. Re-center the canvas's horizontal
// scroll on it whenever a filter/search/expand-all changes the whole
// structure (but not on an individual card's own expand click, which
// should leave the user's scroll position alone).
function centerRootInView() {
  const rootNode = orgTree.querySelector('.org-node[data-id="root"]');
  const canvas = document.getElementById("orgCanvas");
  if (!rootNode || !canvas) return;
  const rootRect = rootNode.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const rootCenterX = rootRect.left + rootRect.width / 2 - canvasRect.left + canvas.scrollLeft;
  canvas.scrollLeft = Math.max(0, rootCenterX - canvas.clientWidth / 2);
}
function renderAndCenter() {
  render();
  centerRootInView();
}

// ---- expand / collapse (delegated to the org-chart footer buttons) ----
orgTree.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest("[data-toggle-node]");
  if (!toggleBtn) return;
  const id = toggleBtn.dataset.toggleNode;
  if (collapsed.has(id)) collapsed.delete(id);
  else collapsed.add(id);
  render();
});

// Expand All / Collapse All merged into a single toggle button — it
// remembers which state it last set and flips to the other one.
const toggleExpandBtn = document.getElementById("toggleExpand");
let isExpanded = false;
function updateToggleExpandLabel() {
  toggleExpandBtn.innerHTML = isExpanded
    ? `<span class="material-icons" style="font-size:18px">unfold_less</span>Collapse All`
    : `<span class="material-icons" style="font-size:18px">unfold_more</span>Expand All`;
}
function setExpanded(value) {
  isExpanded = value;
  if (value) collapsed.clear();
  else collapseToDepartmentsOnly();
  updateToggleExpandLabel();
}
toggleExpandBtn.addEventListener("click", () => {
  setExpanded(!isExpanded);
  renderAndCenter();
});
updateToggleExpandLabel();

// ---- Search / Department / Sub-Department filters / Configured toggle ----
function closeFilterMenus() {
  document.querySelectorAll(".filter-menu").forEach((m) => m.remove());
}
function openMenu(anchor, options, activeValue, onPick) {
  closeFilterMenus();
  const menu = document.createElement("div");
  menu.className = "filter-menu";
  options.forEach((opt) => {
    const b = document.createElement("button");
    b.textContent = opt.label;
    if (opt.value === activeValue) b.classList.add("is-active");
    b.addEventListener("click", () => {
      onPick(opt.value, opt.label);
      closeFilterMenus();
    });
    menu.appendChild(b);
  });
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top = `${r.bottom + 4}px`;
  menu.style.left = `${r.left}px`;
  menu.style.minWidth = `${r.width}px`;
}

const selectDept = document.getElementById("selectDept");
const selectDeptLabel = document.getElementById("selectDeptLabel");
const selectSubDept = document.getElementById("selectSubDept");
const selectSubDeptLabel = document.getElementById("selectSubDeptLabel");

selectDept.addEventListener("click", (e) => {
  e.stopPropagation();
  if (document.querySelector(".filter-menu")) { closeFilterMenus(); return; }
  const options = [{ label: "All Departments", value: "" }].concat(
    Store.allDepartments().map((d) => ({ label: d, value: d }))
  );
  openMenu(selectDept, options, deptFilter, (value, label) => {
    deptFilter = value;
    selectDeptLabel.textContent = label;
    subDeptFilter = "";
    selectSubDeptLabel.textContent = "All Sub-Departments";
    selectSubDept.disabled = !value;
    setExpanded(true);
    renderAndCenter();
  });
});
selectSubDept.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!deptFilter || selectSubDept.disabled) return;
  if (document.querySelector(".filter-menu")) { closeFilterMenus(); return; }
  const options = [{ label: "All Sub-Departments", value: "" }].concat(
    Store.allSubDepartments(deptFilter).map((s) => ({ label: s, value: s }))
  );
  openMenu(selectSubDept, options, subDeptFilter, (value, label) => {
    subDeptFilter = value;
    selectSubDeptLabel.textContent = label;
    setExpanded(true);
    renderAndCenter();
  });
});

const selectViewMode = document.getElementById("selectViewMode");
const selectViewModeLabel = document.getElementById("selectViewModeLabel");
const VIEW_MODE_OPTIONS = [
  { label: "Jurisdiction + Designation", value: "combined" },
  { label: "Jurisdiction", value: "jurisdiction" },
  { label: "Designation", value: "designation" },
];
selectViewMode.addEventListener("click", (e) => {
  e.stopPropagation();
  if (document.querySelector(".filter-menu")) { closeFilterMenus(); return; }
  openMenu(selectViewMode, VIEW_MODE_OPTIONS, viewMode, (value, label) => {
    viewMode = value;
    selectViewModeLabel.textContent = label;
    renderAndCenter();
  });
});

const configuredToggle = document.getElementById("configuredToggle");
configuredToggle.addEventListener("click", () => {
  configuredOnly = !configuredOnly;
  configuredToggle.classList.toggle("is-on", configuredOnly);
  configuredToggle.setAttribute("aria-pressed", String(configuredOnly));
  setExpanded(true);
  renderAndCenter();
});

document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".filter-menu") &&
    !e.target.closest("#selectDept") &&
    !e.target.closest("#selectSubDept") &&
    !e.target.closest("#selectViewMode") &&
    !e.target.closest("#downloadMap")
  ) closeFilterMenus();
});

// ---- Download (PDF / CSV) ----
function flattenForExport(node, ctx, rows) {
  if (node.kind === "outline") {
    if (node.id === "root") {
      (node.children || []).forEach((c) => flattenForExport(c, ctx, rows));
    } else if (node.id.indexOf("dept-") === 0) {
      (node.children || []).forEach((c) => flattenForExport(c, { ...ctx, dept: node.title }, rows));
    } else {
      (node.children || []).forEach((c) => flattenForExport(c, { ...ctx, subDept: node.title }, rows));
    }
  } else {
    rows.push({ dept: ctx.dept || "", subDept: ctx.subDept || "", name: node.title, level: node.sub || "", designations: node.desig || "" });
    (node.children || []).forEach((c) => flattenForExport(c, ctx, rows));
  }
}
function csvEscape(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function downloadCsv() {
  const rows = [];
  flattenForExport(lastTree || buildFullTree(), {}, rows);
  const header = ["Department", "Sub-Department", "Jurisdiction Office / Level", "Level", "Designations"];
  const lines = [header.join(",")].concat(
    rows.map((r) => [r.dept, r.subDept, r.name, r.level, r.designations].map(csvEscape).join(","))
  );
  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), "hierarchy-map.csv");
}
function downloadPdf() {
  // With up to 75 departments branching side by side, the unfiltered map
  // can be over 100,000px wide — scaling that down to fit one printable
  // page shrinks everything to illegible. Warn before that happens and
  // point at the fix (narrow to a department first) rather than silently
  // handing back a page of unreadable text.
  const naturalWidth = orgTree.scrollWidth;
  if (naturalWidth > 4 * PRINT_MAX_WIDTH_PX) {
    const proceed = confirm(
      "This map is very wide right now, so the printed PDF would shrink everything to an unreadable size.\n\n" +
      "For a readable PDF, pick a Department (and optionally a Sub-Department) from the filters above first, then print.\n\n" +
      "Print anyway?"
    );
    if (!proceed) return;
  }
  window.print();
}
const downloadMap = document.getElementById("downloadMap");
downloadMap.addEventListener("click", (e) => {
  e.stopPropagation();
  if (document.querySelector(".filter-menu")) { closeFilterMenus(); return; }
  openMenu(
    downloadMap,
    [
      { label: "Download as PDF", value: "pdf" },
      { label: "Download as CSV", value: "csv" },
    ],
    "",
    (value) => {
      if (value === "pdf") downloadPdf();
      else if (value === "csv") downloadCsv();
    }
  );
});

// The connector-line org-chart can be far wider than any printable page
// (up to 75 departments branch side by side). Right before printing,
// shrink the whole tree down to fit the page width — and shrink its own
// box to match, so print doesn't leave a huge blank area to the right —
// then put it back afterward so the on-screen view is unaffected.
const PRINT_MAX_WIDTH_PX = 1050;
function fitChartsForPrint() {
  orgTree.style.transform = "";
  orgTree.style.width = "";
  orgTree.style.height = "";
  const naturalWidth = orgTree.scrollWidth;
  const naturalHeight = orgTree.scrollHeight;
  if (naturalWidth > PRINT_MAX_WIDTH_PX) {
    const scale = PRINT_MAX_WIDTH_PX / naturalWidth;
    orgTree.style.transform = `scale(${scale})`;
    orgTree.style.transformOrigin = "top left";
    orgTree.style.width = `${naturalWidth * scale}px`;
    orgTree.style.height = `${naturalHeight * scale}px`;
  }
}
function unfitChartsAfterPrint() {
  orgTree.style.transform = "";
  orgTree.style.width = "";
  orgTree.style.height = "";
}
window.addEventListener("beforeprint", fitChartsForPrint);
window.addEventListener("afterprint", unfitChartsAfterPrint);

// ---- Full screen: the toggle at the canvas's top-right corner puts the
// canvas wrapper into the browser's real Fullscreen API. While full
// screen, the filter toolbar (which normally sits beside the "Hierarchy
// Map" heading, now off-screen) is moved into a single right-aligned
// strip ABOVE the canvas — not floating on top of it — so the canvas
// gets the rest of the screen with nothing overlapping it. The toggle
// itself moves into that same strip as its rightmost control so it can
// still be clicked to exit; everything moves back on exit, however that
// exit happens (the toggle again, Esc, or the browser's own control).
const orgCanvasWrap = document.getElementById("orgCanvasWrap");
const fullscreenToggle = document.getElementById("fullscreenToggle");
const fullscreenToolbar = document.getElementById("fullscreenToolbar");
const jurToolbar = document.querySelector(".jur-toolbar");
const jurToolbarRight = document.querySelector(".jur-toolbar-right");
const orgToolbarRow2 = document.querySelector(".org-toolbar-row2");

fullscreenToggle.addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else orgCanvasWrap.requestFullscreen();
});

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = document.fullscreenElement === orgCanvasWrap;
  orgCanvasWrap.classList.toggle("is-fullscreen", isFullscreen);
  fullscreenToggle.querySelector(".material-icons").textContent = isFullscreen ? "fullscreen_exit" : "fullscreen";
  if (isFullscreen) {
    fullscreenToolbar.appendChild(jurToolbarRight);
    fullscreenToolbar.appendChild(orgToolbarRow2);
    fullscreenToolbar.appendChild(fullscreenToggle);
  } else {
    jurToolbar.appendChild(jurToolbarRight);
    jurToolbar.insertAdjacentElement("afterend", orgToolbarRow2);
    orgCanvasWrap.insertBefore(fullscreenToggle, fullscreenToolbar);
  }
});

// ---- tab navigation ----
document.querySelectorAll(".tab-switch .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.dataset.href) window.location.href = tab.dataset.href;
  });
});

// regenerate if the underlying data changes
Store.on(() => render());

renderAndCenter();
