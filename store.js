// ============================================================
// TN SSO — Shared client-side store (single source of truth).
// Persists to localStorage; falls back to in-memory if blocked
// (e.g. some file:// contexts). Arrays are mutated IN PLACE so
// references handed to pages via getters stay valid across
// store mutations. Subscribe with Store.on(fn).
// Load this BEFORE any page script.
// ============================================================
window.Store = (function () {
  const KEY = "tnsso.v1";

  // ---- Default seed data ----------------------------------
  const DEPARTMENTS = [
    "TN Information Technology and Digital Services (IT&DS)",
    "Revenue and Disaster Management",
    "Rural Development and Panchayat Raj Department",
  ];
  const SUB_DEPARTMENTS = {
    "TN Information Technology and Digital Services (IT&DS)": [
      "Tamil Nadu e-Governance Agency (TNeGA)",
      "ELCOT",
    ],
    "Revenue and Disaster Management": ["Land Administration", "Survey & Settlement"],
    "Rural Development and Panchayat Raj Department": ["District Rural Development Agency"],
  };
  const LEVELS = [
    "State",
    "Division",
    "District",
    "Sub Division",
    "Taluk / Tehsil / Mandal",
    "Firka / Revenue Circle",
    "Village",
  ];
  const OFFICES = [
    { id: 1, name: "Tamil Nadu", subLabel: "head office", levelIndex: 0, parentId: null, reportsTo: "Top Level", subCount: 6 },
    { id: 2, name: "Chennai Region", levelIndex: 1, parentId: 1, reportsTo: "Tamil Nadu", subCount: 5 },
    { id: 3, name: "Kancheepuram", levelIndex: 2, parentId: 2, reportsTo: "Chennai", subCount: 4 },
    { id: 4, name: "Kanchipuram Sub-Division", levelIndex: 3, parentId: 3, reportsTo: "Kancheepuram", subCount: 3 },
    { id: 5, name: "Kanchipuram Taluk", levelIndex: 4, parentId: 4, reportsTo: "Kanchipuram Sub-Division", subCount: 2 },
    { id: 6, name: "Kancheepuram Firka", levelIndex: 5, parentId: 5, reportsTo: "Kanchipuram Taluk", subCount: 1 },
    { id: 7, name: "Konerikuppam", levelIndex: 6, parentId: 6, reportsTo: "Kanchipuram Firka", subCount: 0 },
  ];
  const DESIGNATIONS = [
    { id: 1, name: "Commissioner of Land Administration", code: "Commissioner", levelIndex: 0, reportsTo: "Top Level" },
    { id: 2, name: "Division Commisoner", code: "DC", levelIndex: 1, reportsTo: "Commissioner of Land Administration" },
    { id: 3, name: "District Collector", code: "DC", levelIndex: 2, reportsTo: "Division Commisoner" },
    { id: 4, name: "Sub Divisional Officer/Sub Collector", code: "RDO", levelIndex: 3, reportsTo: "District Collector" },
    { id: 5, name: "Tahsildar", code: "Th", levelIndex: 4, reportsTo: "Sub Collector" },
    { id: 6, name: "Revenue Inspector", code: "RI", levelIndex: 5, reportsTo: "Tahsildar" },
    { id: 7, name: "Village Administrative Officer", code: "VAO", levelIndex: 6, reportsTo: "Revenue Inspector" },
  ];

  function seedOfficers() {
    const names = [
      "Sunil Kumar", "Priya Raman", "Arjun Nair", "Lakshmi Iyer", "Karthik Subramani",
      "Deepa Menon", "Ramesh Babu", "Anitha Selvam", "Vijay Anand", "Meena Krishnan",
      "Suresh Pillai", "Divya Mohan", "Naveen Raj", "Kavya Suresh", "Hari Prasad",
    ];
    const roles = ["District Collector", "Tahsildar", "Revenue Inspector", "Village Administrative Officer", "Sub Divisional Officer/Sub Collector"];
    const juris = ["Chennai Region", "Kancheepuram", "Kanchipuram Taluk", "Tamil Nadu", "Konerikuppam"];
    return names.map((name, i) => {
      const parts = name.split(" ");
      const sso = (parts[0][0] + parts[parts.length - 1]).replace(/\s/g, "");
      return {
        id: i + 1,
        name,
        role: roles[i % roles.length],
        designation: roles[i % roles.length],
        dept: "Department of Agriculture",
        subDept: "Tamil Nadu e-Governance Agency (TNeGA)",
        jurisdiction: juris[i % juris.length],
        sso,
        mobile: "86" + String(500000000 + i * 137911).slice(0, 9),
        email: sso.toLowerCase() + "@gmail.com",
        reportsTo: roles[(i + 1) % roles.length],
        // last two start out deactivated so the Deactivated tab isn't empty
        status: i >= names.length - 2 ? "deactivated" : "active",
      };
    });
  }

  function defaults() {
    return {
      departments: DEPARTMENTS.slice(),
      subDepartments: JSON.parse(JSON.stringify(SUB_DEPARTMENTS)),
      levels: LEVELS.slice(),
      offices: JSON.parse(JSON.stringify(OFFICES)),
      designations: JSON.parse(JSON.stringify(DESIGNATIONS)),
      officers: seedOfficers(),
      seqs: { office: 7, designation: 7, officer: 15 },
    };
  }

  // ---- Persistence (resilient) ----------------------------
  let storageOk = true;
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      storageOk = false;
      return null;
    }
  }
  let data = read() || defaults();

  function persist() {
    if (storageOk) {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) {
        storageOk = false;
      }
    }
    emit();
  }

  // ---- Pub/sub --------------------------------------------
  const subs = [];
  function emit() {
    subs.forEach((fn) => {
      try { fn(data); } catch (e) { /* ignore subscriber errors */ }
    });
  }

  // ---- In-place array helpers (keep external refs valid) --
  function replaceInPlace(arr, next) {
    arr.length = 0;
    next.forEach((x) => arr.push(x));
  }

  return {
    on(fn) { subs.push(fn); return fn; },
    commit() { persist(); },
    reset() { data = defaults(); persist(); },
    all() { return data; },

    // ---- reference getters (live arrays) ----
    get levels() { return data.levels; },
    departments() { return data.departments; },
    subDepartments(dept) { return data.subDepartments[dept] || []; },
    offices() { return data.offices; },
    officeNames() { return data.offices.map((o) => o.name); },
    designations() { return data.designations; },
    officers() { return data.officers; },

    // ---- jurisdiction ----
    setLevels(levels) { replaceInPlace(data.levels, levels); persist(); },
    addOffice(o) {
      o.id = ++data.seqs.office;
      data.offices.push(o);
      persist();
      return o;
    },
    removeOffice(id) {
      replaceInPlace(data.offices, data.offices.filter((o) => o.id !== id && o.parentId !== id));
      persist();
    },

    // ---- designations ----
    addDesignation(d) {
      d.id = ++data.seqs.designation;
      data.designations.push(d);
      persist();
      return d;
    },
    removeDesignation(id) {
      replaceInPlace(data.designations, data.designations.filter((d) => d.id !== id));
      persist();
    },

    // ---- officers ----
    addOfficer(o) {
      o.id = ++data.seqs.officer;
      if (!o.status) o.status = "active";
      data.officers.unshift(o);
      persist();
      return o;
    },
    setOfficerStatus(id, status) {
      const o = data.officers.find((x) => x.id === id);
      if (o) { o.status = status; persist(); }
    },
    removeOfficer(id) {
      replaceInPlace(data.officers, data.officers.filter((o) => o.id !== id));
      persist();
    },
    officerCount(status) {
      return status ? data.officers.filter((o) => o.status === status).length : data.officers.length;
    },
  };
})();
