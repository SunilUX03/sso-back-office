// ============================================================
// TN SSO — Hierarchy Map (org chart).
// The map is GENERATED from the live Store data owned by the
// Jurisdiction Management and Designation Management modules.
//   • Jurisdiction + Designation (default): the jurisdiction office
//     tree, each node annotated with the designation(s) that head
//     that level.
//   • Jurisdiction: office tree only.
//   • Designation: the designation reporting-line tree.
// ============================================================

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// designation names that sit at a given jurisdiction level
function designationsAtLevel(levelIndex) {
  return Store.designations()
    .filter((d) => d.levelIndex === levelIndex)
    .map((d) => d.name);
}

// ---- Jurisdiction tree (from Store offices), optionally with the
//      heading designation per level attached. ----
function buildJurisdictionTree(withDesignations) {
  const offices = Store.offices();
  const levels = Store.levels;
  const byId = {};
  offices.forEach((o) => {
    const desigs = withDesignations ? designationsAtLevel(o.levelIndex) : [];
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
  return root || { id: "j-empty", title: "No jurisdictions defined", sub: "Add offices in Jurisdiction Management", children: [] };
}

// ---- Designation tree (from Store designations, via reportsTo). ----
function buildDesignationTree() {
  const ds = Store.designations();
  const levels = Store.levels;
  const nodes = ds.map((d) => ({
    id: "g-" + d.id,
    raw: d,
    title: d.name,
    sub: (levels[d.levelIndex] || "") + (d.code && d.code !== "—" ? " · " + d.code : ""),
    children: [],
  }));
  const byName = {};
  nodes.forEach((n) => (byName[n.raw.name.trim().toLowerCase()] = n));

  const roots = [];
  nodes.forEach((n) => {
    const rt = (n.raw.reportsTo || "").trim();
    let parent = null;
    if (rt && !/^top level$/i.test(rt)) {
      parent = byName[rt.toLowerCase()];
      if (!parent) {
        // fuzzy: one name contains the other
        parent = nodes.find((x) =>
          x !== n &&
          (x.raw.name.toLowerCase().includes(rt.toLowerCase()) ||
            rt.toLowerCase().includes(x.raw.name.toLowerCase()))
        );
      }
      if (!parent) {
        // fallback: nearest designation at a higher (lower-index) level
        parent = nodes
          .filter((x) => x !== n && x.raw.levelIndex < n.raw.levelIndex)
          .sort((a, b) => b.raw.levelIndex - a.raw.levelIndex)[0] || null;
      }
    }
    if (parent && parent !== n) parent.children.push(n);
    else roots.push(n);
  });

  nodes.forEach((n) => {
    n.meta = n.children.length ? `${n.children.length} reporting` : "";
  });

  if (roots.length === 1) return roots[0];
  return { id: "g-root", title: "All Designations", sub: "Reporting lines", meta: `${roots.length} top roles`, children: roots };
}

const VIEWS = {
  combined: { label: "Jurisdiction + Designation", tree: () => buildJurisdictionTree(true) },
  jurisdiction: { label: "Jurisdiction", tree: () => buildJurisdictionTree(false) },
  designation: { label: "Designation", tree: () => buildDesignationTree() },
};
let currentView = "combined";
const collapsed = new Set();

function countNodes(node) {
  let n = 1;
  (node.children || []).forEach((c) => (n += countNodes(c)));
  return n;
}

// ---- recursive render ----
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

function render() {
  const tree = VIEWS[currentView].tree();
  orgTree.innerHTML = nodeHTML(tree, false);
  orgCount.textContent = countNodes(tree);
}

// ---- expand / collapse ----
orgTree.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-toggle-node]");
  if (!btn) return;
  const id = btn.dataset.toggleNode;
  if (collapsed.has(id)) collapsed.delete(id);
  else collapsed.add(id);
  render();
});

// ---- Select Type dropdown ----
const selectType = document.getElementById("selectType");
const selectTypeLabel = document.getElementById("selectTypeLabel");
selectTypeLabel.textContent = VIEWS[currentView].label;

function closeTypeMenus() {
  document.querySelectorAll(".filter-menu").forEach((m) => m.remove());
}
selectType.addEventListener("click", (e) => {
  e.stopPropagation();
  if (document.querySelector(".filter-menu")) { closeTypeMenus(); return; }
  const menu = document.createElement("div");
  menu.className = "filter-menu";
  Object.entries(VIEWS).forEach(([key, v]) => {
    const b = document.createElement("button");
    b.textContent = v.label;
    if (key === currentView) b.classList.add("is-active");
    b.addEventListener("click", () => {
      currentView = key;
      selectTypeLabel.textContent = v.label;
      collapsed.clear();
      render();
      closeTypeMenus();
    });
    menu.appendChild(b);
  });
  document.body.appendChild(menu);
  const r = selectType.getBoundingClientRect();
  menu.style.top = `${r.bottom + 4}px`;
  menu.style.left = `${r.left}px`;
  menu.style.minWidth = `${r.width}px`;
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".filter-menu") && !e.target.closest("#selectType")) closeTypeMenus();
});

// ---- Download Map (print-friendly) ----
document.getElementById("downloadMap").addEventListener("click", () => window.print());

// ---- tab navigation ----
document.querySelectorAll(".tab-switch .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.dataset.href) window.location.href = tab.dataset.href;
  });
});

// regenerate if the underlying data changes
Store.on(() => render());

render();
