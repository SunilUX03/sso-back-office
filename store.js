// ============================================================
// TN SSO — Shared client-side store (single source of truth).
// Persists to localStorage; falls back to in-memory if blocked
// (e.g. some file:// contexts). Arrays are mutated IN PLACE so
// references handed to pages via getters stay valid across
// store mutations. Subscribe with Store.on(fn).
// Load this BEFORE any page script.
// ============================================================
window.Store = (function () {
  const KEY = "tnsso.v12";

  // ---- Default seed data ----------------------------------
  // The 3 departments actually "onboarded" in this demo (Admin Logins /
  // User Management / App Management all revolve around these). Real
  // names, taken from the reference system's own department list.
  const DEPARTMENTS = [
    "Information Technology Department",
    "Revenue and Disaster Management Department",
    "Rural Development & Panchayat Raj Department",
  ];
  // Two real sub-departments per onboarded department (first = the
  // "flagship" one that carries full jurisdiction/designation seed
  // data below; the second exists as a real name only).
  const SUB_DEPARTMENTS = {
    "Information Technology Department": [
      "Tamilnadu e-Governance Agency (TNeGA)/ Directorate of e-Governance(AB)",
      "Electronics Corporation of Tamilnadu Ltd (ELCOT)(AB)",
    ],
    "Revenue and Disaster Management Department": [
      "Commissionerate of Land Administration",
      "Commissionerate of Survey and Settlement",
    ],
    "Rural Development & Panchayat Raj Department": [
      "Rural Development and Panchayat Raj Department",
      "State Institute of Rural Development (SIRD)",
    ],
  };
  // Every real sub-department carries full jurisdiction/designation data
  // under its FLAGSHIP sub-department (the first entry above).
  const FLAGSHIP_SUBDEPT = {
    "Information Technology Department": SUB_DEPARTMENTS["Information Technology Department"][0],
    "Revenue and Disaster Management Department": SUB_DEPARTMENTS["Revenue and Disaster Management Department"][0],
    "Rural Development & Panchayat Raj Department": SUB_DEPARTMENTS["Rural Development & Panchayat Raj Department"][0],
  };

  // ---- Full real Department -> Sub-Department list (75 departments,
  // 361 sub-departments), sourced from the reference system
  // (tnsso.tn.gov.in/back_office_portal). Used to power realistic
  // Department / Sub-Department pickers across Jurisdiction Management,
  // Designation Management and Hierarchy Map. Only the 3 flagship
  // sub-departments above carry real jurisdiction/designation trees —
  // every other one auto-vivifies an empty ("Not yet configured") bucket.
  //
  // "GOVERNMENT OF TAMILNADU" was removed from this list entirely — in
  // the source data it was a department whose only "sub-department" was
  // itself, which is really just the state, the implicit root every
  // other department sits under (Hierarchy Map's future home for it),
  // not a peer department. The other ~40 departments with that same
  // self-titled pattern (district collectorates, Legislative Assembly,
  // etc.) are real distinct entities that simply have no sub-agencies —
  // for those their sub-department array is now empty, since the pinned
  // "This Department" card (Store.generalSubDept()) already covers
  // exactly that case without a redundant duplicate-looking card.
  const ALL_DEPARTMENTS = [
    "Adi Dravidar and Tribal Welfare Department",
    "Agriculture and Farmers Welfare Department",
    "Animal Husbandry Dairying and Fisheries Department",
    "BC MBC & Minorities Welfare Department",
    "Commercial Taxes & Registration Department",
    "Cooperation Food and Consumer Protection Department",
    "Energy Department",
    "Environment & Forest Department",
    "Finance Department",
    "Handlooms, Handicrafts, Textiles & Khadi Department",
    "Health & Family Welfare Department",
    "Higher Education Department",
    "Highways and Minor Ports Department",
    "Home Phohibition and Excersice Department",
    "Housing and Urban Development Department",
    "Human Resource Managment Department",
    "Industries Department",
    "Information Technology Department",
    "Labour & Employment Department",
    "LAW Department",
    "Legislative Assembly Department",
    "Micro, Small & Medium Enterprises Department",
    "Municipal Administration & Water Supply Department",
    "Public Department",
    "Public Works Department",
    "Planning Development and Special Inititiatives Department",
    "Revenue and Disaster Management Department",
    "Rural Development & Panchayat Raj Department",
    "School Education Department",
    "Social Welfare and Women Empowerment Department",
    "Social Reforms",
    "Tamil Development and Information Department",
    "Tamil Development 10th Floor",
    "Transport Department",
    "Tourism & Culture Department",
    "Water Resource Department",
    "Welfare of Differently Abled Department",
    "Youth Welfare & Sport Development Department",
    "Mudhalvarin Mugavari Department",
    "COLLECTORATE OF SIVAGANGAI DISTRICT",
    "COLLECTORATE OF KALLAKURICHI DISTRICT",
    "COLLECTORATE OF COIMBATORE DISTRICT",
    "COLLECTORATE OF KANCHEEPURAM DISTRICT",
    "COLLECTORATE OF RAMANATHAPURAM DISTRICT",
    "COLLECTORATE OF NAGAPATTINAM DISTRICT",
    "COLLECTORATE OF NAMAKKAL DISTRICT",
    "COLLECTORATE OF CHENNAI DISTRICT",
    "COLLECTORATE OF DINDIGUL DISTRICT",
    "COLLECTORATE OF TIRUPPUR DISTRICT",
    "COLLECTORATE OF TIRUCHIRAPPALLI DISTRICT",
    "COLLECTORATE OF KARUR DISTRICT",
    "COLLECTORATE OF THOOTHUKUDI DISTRICT",
    "COLLECTORATE OF ERODE DISTRICT",
    "COLLECTORATE OF KRISHNAGIRI DISTRICT",
    "COLLECTORATE OF KANNIYAKUMARI DISTRICT",
    "COLLECTORATE OF THENI DISTRICT",
    "COLLECTORATE OF TIRUVARUR DISTRICT",
    "COLLECTORATE OF TIRUVANNAMALAI DISTRICT",
    "COLLECTORATE OF VIRUDHUNAGAR DISTRICT",
    "COLLECTORATE OF TIRUPATHUR DISTRICT",
    "COLLECTORATE OF DHARMAPURI DISTRICT",
    "COLLECTORATE OF RANIPET DISTRICT",
    "COLLECTORATE OF MADURAI DISTRICT",
    "COLLECTORATE OF THANJAVUR DISTRICT",
    "COLLECTORATE OF TENKASI DISTRICT",
    "COLLECTORATE OF SALEM DISTRICT",
    "COLLECTORATE OF PERAMBALUR DISTRICT",
    "COLLECTORATE OF CUDDALORE DISTRICT",
    "COLLECTORATE OF MAYILADUTHURAI DISTRICT",
    "COLLECTORATE OF CHENGALPATTU DISTRICT",
    "COLLECTORATE OF PUDUKKOTTAI DISTRICT",
    "COLLECTORATE OF VILUPPURAM DISTRICT",
    "COLLECTORATE OF TIRUNELVELI DISTRICT",
    "COLLECTORATE OF VELLORE DISTRICT",
    "COLLECTORATE OF TIRUVALLUR DISTRICT",
  ];

  const ALL_SUB_DEPARTMENTS = {
    "Adi Dravidar and Tribal Welfare Department": ["Commissionerate of AdiDravidar Welfare", "Directorate of Tribal Welfare", "Tamil Nadu AdiDravidarHousing and Development Corporation Limited(TAHDCO)(AB)", "Tamilnadu State Commission for the Scheduled Castes and Scheduled Tribes", "Tribal research center, ooty"],
    "Agriculture and Farmers Welfare Department": ["Tamil Nadu Horticulture Development Agency(TANHODA)(AB)", "Directorate of Agricultural Marketing and Agri Business", "Commissionerate of Sugar", "Tamil Nadu Agricultural University(AB)", "Agricultural Marketing Board(AB)", "Agricultural Engineering Department", "The Commissioner of Agriculture", "Tamil Nadu State Seed Development Agency(TANSEDA)(AB)", "Department of Seed certification and Organic Certification", "Directorate of Horticulture & Plantation Crops", "Directorate of Agriculture", "Tamil Nadu Watershed Development Agency(TAWDEVA)(AB)", "Horticultural Producers Co-operative Enterprises Ltd(TANHOPE)(AB)"],
    "Animal Husbandry Dairying and Fisheries Department": ["Commissionerate of Animal Husbandry and Veterinary Services", "Tamil Nadu Live Stock Development Agency(AB)", "Tamil Nadu Veterinary and Animal Sciences University (TANUVAS)(AB)", "Tamilnadu Fishermen Welfare Board(AB)", "Commissionerate of Fisheries and Fisherman welfare", "Tamilnadu State Apex Fisheries Co-operative Federation Ltd(AB)", "Commissionerate of Milk Production and Dairy Development", "Aavin (Tamil Nadu Cooperative Milk Producers' Federation)(AB)", "Tamil Nadu Fisheries Development Corporation(AB)", "Tamil Nadu Dr.J.Jayalalithaa Fisheries University (TNJFU)(AB)"],
    "BC MBC & Minorities Welfare Department": ["Tamil Nadu Backward Classes Economic Development Corporation(AB)", "Directorate of Minorities Welfare", "Directorate of Backward Classes Welfare", "Tamil Nadu Minorities Economic Development Corporation Ltd(TAMCO)(AB)", "Directorate of Most Backward Classes and Denotified Communities Welfare Department", "Tamil Nadu Backward Classes Commission", "Minorities Commission", "Tamil Nadu Vanniyakula Kshatriya Public Charitable Trusts and Endowments Board(AB)", "amil Nadu Hajj Committee(AB)", "Tamil Nadu Waqf Board(AB)", "Tamil Nadu Linguistic Minorities Social and Economic Development Corporation (TALMEDCO)(AB)"],
    "Commercial Taxes & Registration Department": ["Commercial Taxes Department", "Tamil Nadu Sales Tax Appellate Tribunal(TNSTAT)", "Registration Department"],
    "Cooperation Food and Consumer Protection Department": ["Registrar of Cooperative Societies", "Tamil Nadu Warehousing Corporation(AB)", "District Consumer Disputes Redressal Commission(AB)", "Co-operative Spinning Mill Federation Ltd (TANSPIN)(AB)", "Consumers Co-operative Federation(AB)", "Tamil Nadu Civil Supplies Corporation(AB)", "State Consumer Disputes Redressal Commission(AB)", "Co-operative Housing Federation(AB)", "Commissionerate of Civil Supplies and Consumer Protection Department"],
    "Energy Department": ["Tamil Nadu Chief Electrical Inspectorate Department", "Tamil Nadu Generation and Distribution Corporation Limited (TANGEDCO) (TNEB)(AB)", "Tamil Nadu Electricity Regulatory Commission (TNERC)(AB)", "The Tamil Nadu Transmission Corporation Limited (TANTRANSCO)(AB)", "Tamil Nadu Power Finance &Infrastrutcure Development Corporation (TNPF & IDC)(AB)", "Tamil Nadu Energy Development Agency (TEDA)(AB)"],
    "Environment & Forest Department": ["Biodiversity Conservation And Greening Society(AB)", "Tamil Nadu Tea Plantation Corporation (TANTEA)(AB)", "Forest Department", "Tamil Nadu Pollution Control Board(TNPCB)(AB)", "Forest Plantation Corporation Ltd (TAFCORN)(AB)", "Directorate of Environment", "Arasu Rubber Corporation Ltd(AB)", "Tamilnadu State Wetland Authority/ Mission Director Green Tamilnadu Mission"],
    "Finance Department": ["State Government Audit Department", "Directorate of Hindu relegious Institutions Audit Department", "Directorate of Audit for Milk Cooperatives", "Tamil Nadu State Finance Commission", "Directorate of Small Saving", "Cooperative Audit", "Local Fund Audit Department", "Treasuries and Accounts Department", "Director General of Audit", "Government Data Centre", "Tamil Nadu Infrastructure Development Board", "Directorate of Pension"],
    "Handlooms, Handicrafts, Textiles & Khadi Department": ["Handloom Weavers' Co-operative Society (Co-optex)(AB)", "Commisionerate of Handlooms", "Tamil Nadu Khadi And Village Industries Board (TNKVIB)(AB)", "Sericulture Department", "Tamil Nadu Palm Products Development Board(TNPPDB)(AB)", "Commisionerate of Textiles", "Handloom Development Corporation(AB)", "Institute of Textile TechnologyC12", "Handicrafts Development Corporation(AB)"],
    "Health & Family Welfare Department": ["Board(MRB)(AB)", "Directorate of Indian Medicine and Homoeopathy", "Directorate of Drugs Control", "Tamil Nadu Medical Services Corporation Limited", "Tamil Nadu State AIDS Control Society(AB)", "Tamil Nadu State Health Mission (NHM)", "Directorate of Food Safety and Drugs Administration", "The Tamil Nadu Medical Service Recruitment", "Tamil Nadu State Blindness Control Society(AB)", "Directorate of State Health Transport", "Directorate of Public Health and Preventive Medicine", "Directorate of Medical and Rural Health Services(ESI)", "Directorate of Medical Education & Research", "Tamil Nadu Health System Project", "Medicinal Plant Farms and Herbal Medicine Corporation Ltd (TAMPCOL)(AB)", "Directorate of Family Welfare"],
    "Higher Education Department": ["Madurai Kamaraj University", "Tamil Nadu State Council for Technical Education (TANSCTE)(AB)", "Annamalai University", "Madras University", "Directorate of Technical Education", "Directorate Of Collegiate Education", "Tamil Nadu State Council for Science and Technology(TNSCST)(AB)", "Private Colleges Appellate Tribunal", "RashtriyaUchchatarShikshaAbhiyan (RUSA)", "Tamil Nadu State Council for Higher Education (TANSCHE)(AB)", "Anna University", "Periyar University", "Alagappa University", "Bharathidasan University", "Thiruvalluvar University", "Mother Teresa Women's University", "Tamil Nadu Archives and Historical Research 23. Science City", "ManonmaniamSundaranar University", "Bharathiar University", "Tamil Nadu Teachers Education University", "Tamil Nadu Open University", "Tamil Nadu Science & Technology Centre (TNSTC)"],
    "Highways and Minor Ports Department": ["Tamil Nadu Road Sector Project, Highways", "Planning, Designs and Investigation Wing, Highways", "Highways Research Station, Highways", "Director General, Highways", "NABARD and Rural roads, Highways", "Poompuhar Shipping Corporation(AB)", "Tamil Nadu Road Infrastructure Development Corporation", "Chennai Kanniyakumari Industrial Corridor & Chennai Peripheral Ring Road Project Project(CKICP)", "Construction and Maintenance wing, Highways", "METRO Highways", "Maritime Board(AB)", "Projects Wing, Highways", "National Highways", "Road Development Company Limited (TNRDC)"],
    "Home Phohibition and Excersice Department": ["Directorate of Prosecution", "Tamil Nadu Police Housing Corporation", "Commissioner of Police, Chennai", "Armed Police", "All Women Police Stations", "Director General of Prisons and Correctional Services", "Economic Offences Wing", "CID Crime Branch", "Tamil Nadu Uniformed Services Recruitment Board(AB)", "Registrar General, High Court", "Q Branch CID", "Director General of Police", "Prohibition Enforcement Wing", "State Crime Records Bureau", "Commisisonerate of Prohibition and Excise", "Transport & Road Safety Department", "Fire and Rescue Services Department", "Tamil Nadu State Marketing Corporation Ltd (TASMAC)(AB)", "Human Resources Development", "Home Guards & Civil Defence", "Police Stations", "Labour Court", "Civil Supplies CID", "Coastal Security Group", "Police Training College", "Police Training Acedamy", "Office of Official Assignee", "Tamil Nadu State Judicial Academy", "Staff Welfare", "Forensic Sciences Department", "Railway Police"],
    "Housing and Urban Development Department": ["Directorate of Town and Country Planning(DTCP)", "Chennai Unified Metrpolitan Transport Authority", "Tamil Nadu Urban Habitat DevelopmentBoard(TNUHB)(AB)", "Tamil Nadu Housing Board(AB)", "Tamil Nadu Urban Development Project", "The Registrat of Co-Operative Societies", "Market Management Committee(AB)", "Chennai Metropolitan Development Authority (CMDA)(AB)", "Tamil Nadu Infrastructure Fund Management Corporation (TNIFMC)(AB)", "Tamil Nadu Real Estate Regulatory Authority (TNRERA)"],
    "Human Resource Managment Department": ["Directorate of Vigilance & Anti Corruption", "All Indai Civil Services Coaching Center", "Tamil Nadu Information Commission", "Tamil Nadu lokayuktha", "Commissionerate of Disciplinary Proceedings", "Tamil Nadu Public Service Commission(TNPSC)", "Anna Administrative Staff College", "Directorate General of training"],
    "Industries Department": ["Tidel Park Coimbatore Limited", "Institute of Leather Technology", "Tamil Nadu Minerals Limited(TAMIN)(AB)", "Leather Development Corporation", "Tamil Nadu Salt Corporation Limited(AB)", "Department Of Geology and Mining", "Tamil Nadu Cements Corporation(TANCEM)(AB)", "Ticel Bio Park Limited", "Tidel Park Limited", "Tamil Nadu News Print Papers Limited(TNPL)(AB)", "Tamil Nadu Industrial Development Corporation (TIDCO)(AB)", "Guidance TamilNadu", "Commissionerate of Industries and Commerce", "Industrial Investment Corporation (TIIC)(AB)", "Industrial Guidance and Export Promotion Bureau (GUIDANCE)(AB)", "Tamil Nadu Magnesite Limited(TANMAG)(AB)", "State Industrial Promotion Corporation Of Tamil Nadu(SIPCOT)(AB)"],
    "Information Technology Department": ["Tamil Nadu Fibrenet Corporation Limited(TANFINET)(AB)", "Tamil Virtual Academy(AB)", "Arasu Cable TV Corporation Ltd(AB)", "Tamilnadu e-Governance Agency (TNeGA)/ Directorate of e-Governance(AB)", "ICT Academy Of Tamil Nadu (ICTACT)(AB)", "Electronics Corporation of Tamilnadu Ltd (ELCOT)(AB)"],
    "Labour & Employment Department": ["Directorate of Employment and Training", "Labour Welfare Board(AB)", "Commissionerate of Labour", "Institute of Labour Studies", "Tamil Nadu Skill Development Corporation", "Directorate of Industrial Safety and Health", "Construction Workers Welfare Board(AB)", "Overseas Manpower Corporation(AB)", "Tamil Nadu Traders Welfare Board(AB)"],
    "LAW Department": ["The Tamil Nadu Dr.Ambedkar Law University", "State Official Language (Legislative) Commission", "State Law Commission", "The Tamil Nadu National Law University", "Directorate Of Legal Studies"],
    "Legislative Assembly Department": [],
    "Micro, Small & Medium Enterprises Department": ["Tamilnadu Bureau for Facilitating MSMES of Tamilnadu", "TAICO Bank(AB)", "Tamil Nadu Startup and Innovation Mission (TANSIM)", "Tamil Nadu Coir Business Development Corportation ltd.(TANCOIR)", "Tamilnadu Small Industries Development Corporation (TANSIDCO)(AB)", "SAGOSERVE(AB)", "Trade and Investment Promotion Bureau", "Entrepreneurship Development and Innovation Institute"],
    "Municipal Administration & Water Supply Department": ["Tamil Nadu Urban Finance and Infrastructure Development", "Tamil Nadu Water Supply and Drainage Board (TWAD)", "Tamil Nadu Urban Infrastrcuture Financial Services Ltd.(TNUIFSL)", "New Tiruppur Area Development CorporationLimited", "Chennai Rivers Restoration Trust", "Greater Chennai Corporation", "Directorate of Municipal Administration", "Tamil Nadu Water Investment Company Limited", "Directorate of Town Panchayat", "Chennai Metro Water Supply & SewerageBoard (CMWS&SB)"],
    "Public Department": ["Guest Houses New Delhi", "Guest house OOTY", "Guest House(Chepauk-Chennai)", "Tamil Nadu State Wide Area Network TNSWAN(AB)", "Office of Government Pleader", "Chief Minister's Special Cell", "Guest House(Chintadripet)", "Department of Ex-Servicemen's Welfare", "Commissionerate of Rehabilitation and Welfare of Non Resident Tamils", "City Government Pleader", "Tamil Nadu Ex-Servicemen's Corporation (TEXCO)(AB)", "Advisory Board NSA", "Advisory Board COFEPOSA(AB)"],
    "Public Works Department": ["Buildings centre and Conservation Devision Circle PWD", "Tamizhaga Arasu Building Research Station", "Directorate of Boilers", "Construction and maintenance wing", "Planning and designs circle", "Quality Control Division", "Architecture wing PWD", "Public Works Staff Training Institute Trichy and Chennai", "Electrical wing"],
    "Planning Development and Special Inititiatives Department": ["State Planning Commission", "Directorate of Evaluation and Applied Research", "Special Area Development Programme", "Madras Institute of Development Studies", "Department of Economics and Statistics", "Chennai Metro Rail Limited"],
    "Revenue and Disaster Management Department": ["Commissionerate of Urban Land Ceiling andUrban Land Tax", "Commissionerate of Revenue Administration", "Commissionerate of Land Administration", "Commissionerate of Land Reforms", "Commissionerate of Survey and Settlement"],
    "Rural Development & Panchayat Raj Department": ["Tamil Nadu Coastal Sustainable Livelihoods Society", "State Institute of Rural Development (SIRD)", "Director General(Training) DRO & PR", "Tamil Nadu Rural Transformation Project", "Tamil Nadu State Election Commission (SEC)", "Rural Development and Panchayat Raj Department", "Tamil Nadu Corporation for Development of Women Ltd(AB)", "Social Audit Society of Tamil Nadu", "Tsunami Project Implementation Unit"],
    "School Education Department": ["Directorate of Government Examinations", "Directorate of Elementary Education", "Directorate of Non-formal and Adult Education", "Directorate of Public Libraries", "Directorate of Matriculation Schools", "Directorate of SamagraShiksha Teachers Recruitment Board", "Directorate of State Council of Educational Research and Training", "Commissionerate of School Education", "Tamil Nadu Text Book and Educational Services Corporation"],
    "Social Welfare and Women Empowerment Department": ["Directorate of Social Defence", "Tamil Nadu Transgender Welfare Board(AB)", "PuratchiThalaivar M.G.R. Nutritious Meal Programme", "Tamil Nadu Widows and deserted Women Welfare Board", "Tamil Nadu State Commission for Women(SCW)(AB)", "Directorate of Social Welfare", "Tamil NaduState Commission for Protection of Child Rights SCPCR", "Directorate of Integrated Child Development Services"],
    "Social Reforms": [],
    "Tamil Development and Information Department": ["Tamil Development Department", "Stationery and Printing Department", "Tamil University", "Tamil Nadu Films Division", "State Information centre", "Institute of printing technology", "Film Development Corporation Ltd", "Information and Public Relations Department", "Central Press", "Tamilnadu Government M.G.R Film & Television Institute", "Tamil Etymological Dictionary Project", "International Institute of Tamil Studies", "Government Branch Press", "Government Stationery Stores", "Tamil Arasu Publication", "Cine Workers Welfare Board", "KalaivanarArangam I&PRO", "Valluvarkottam I&PRO", "Rajaji Hall and PRO"],
    "Tamil Development 10th Floor": [],
    "Transport Department": ["Pallavan Transport Consultancy Services Ltd. (PTCS)(AB)", "Motor Vehicles Maintenance Department", "Tamil Nadu State Transport Corporation (Salem) Ltd(AB)", "Tamil Nadu State Express Transport Corporation(AB)", "State transport authority", "Tamil Nadu State Transport Corporation (Coimbatore) Ltd.(AB)", "Tamil Nadu State Transport Corporation (Kumbakonam) Ltd(AB)", "Tamil Nadu Transport Development Finance Corporation Ltd(AB)", "Tamil Nadu State Transport Corporation (Villupuram) Ltd(AB)", "State Transport Appellate Tribunal", "Institute of Road Transport", "Tamil Nadu State Transport Corporation (Madurai) Ltd.(AB)", "Tamil Nadu State Transport Corporation (Tirunelveli) Ltd(AB)", "Metropolitan Transport Corporation(AB)", "Transport Department"],
    "Tourism & Culture Department": ["Tamil Nadu Tourism Development Corporation Ltd. (TTDC)(AB)", "Directorate of Tousism", "Art and Culture Department", "Commissionerate of Hindu Religious and Charitable Endowments Department", "Tamil nadu Folk Artistswelfare Board(AB)", "TN DR.JJ Music and Fine Arts university(AB)", "Directorate of Museum", "Commissionerate of Archaeology"],
    "Water Resource Department": ["Chief Engineer WRD,Operation & Maintenance", "Chief Engineer WRD,Coimbatore Region", "Chief Engineer WRD,Trichy Region", "Chief Engineer & Director WRD,Institute for Water Studies", "Chief Engineer & Director WRD,Irrigation Management Training Institute", "Chief Engineer WRD,Chennai Region", "Chief Engineer WRD,Design,Research and Construction Support", "Chief Engineer WRD,Plan Formulation", "Chief Engineer WRD ,State Ground & Surface Water Resources Data Centre", "Engineer in Chief WRD", "Chief Engineer WRD,Madurai Region"],
    "Welfare of Differently Abled Department": ["Directorate of Welfare of Differently Abled", "State Commission for Differently Abled(SCAD)"],
    "Youth Welfare & Sport Development Department": ["Nehru Yuva Kandra Sangathenm", "Tamil Nadu Physical Education and Sports University(AB)", "National Service Scheme", "Sports Development Authority of Tamil Nadu", "National Cadet Corps Department"],
    "Mudhalvarin Mugavari Department": [],
    "COLLECTORATE OF SIVAGANGAI DISTRICT": [],
    "COLLECTORATE OF KALLAKURICHI DISTRICT": [],
    "COLLECTORATE OF COIMBATORE DISTRICT": [],
    "COLLECTORATE OF KANCHEEPURAM DISTRICT": [],
    "COLLECTORATE OF RAMANATHAPURAM DISTRICT": [],
    "COLLECTORATE OF NAGAPATTINAM DISTRICT": [],
    "COLLECTORATE OF NAMAKKAL DISTRICT": [],
    "COLLECTORATE OF CHENNAI DISTRICT": [],
    "COLLECTORATE OF DINDIGUL DISTRICT": [],
    "COLLECTORATE OF TIRUPPUR DISTRICT": [],
    "COLLECTORATE OF TIRUCHIRAPPALLI DISTRICT": [],
    "COLLECTORATE OF KARUR DISTRICT": [],
    "COLLECTORATE OF THOOTHUKUDI DISTRICT": [],
    "COLLECTORATE OF ERODE DISTRICT": [],
    "COLLECTORATE OF KRISHNAGIRI DISTRICT": [],
    "COLLECTORATE OF KANNIYAKUMARI DISTRICT": [],
    "COLLECTORATE OF THENI DISTRICT": [],
    "COLLECTORATE OF TIRUVARUR DISTRICT": [],
    "COLLECTORATE OF TIRUVANNAMALAI DISTRICT": [],
    "COLLECTORATE OF VIRUDHUNAGAR DISTRICT": [],
    "COLLECTORATE OF TIRUPATHUR DISTRICT": [],
    "COLLECTORATE OF DHARMAPURI DISTRICT": [],
    "COLLECTORATE OF RANIPET DISTRICT": [],
    "COLLECTORATE OF MADURAI DISTRICT": [],
    "COLLECTORATE OF THANJAVUR DISTRICT": [],
    "COLLECTORATE OF TENKASI DISTRICT": [],
    "COLLECTORATE OF SALEM DISTRICT": [],
    "COLLECTORATE OF PERAMBALUR DISTRICT": [],
    "COLLECTORATE OF CUDDALORE DISTRICT": [],
    "COLLECTORATE OF MAYILADUTHURAI DISTRICT": [],
    "COLLECTORATE OF CHENGALPATTU DISTRICT": [],
    "COLLECTORATE OF PUDUKKOTTAI DISTRICT": [],
    "COLLECTORATE OF VILUPPURAM DISTRICT": [],
    "COLLECTORATE OF TIRUNELVELI DISTRICT": [],
    "COLLECTORATE OF VELLORE DISTRICT": [],
    "COLLECTORATE OF TIRUVALLUR DISTRICT": [],
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

  function subKey(deptName, subDeptName) {
    return deptName + "::" + (subDeptName || "");
  }
  // Old (pre sub-department) callers pass no subDeptName at all — resolve
  // them to that department's flagship sub-department so their behavior
  // is unchanged. New, sub-department-aware pages always pass one.
  function resolveSub(deptName, subDeptName) {
    return subDeptName !== undefined ? subDeptName : FLAGSHIP_SUBDEPT[deptName] || "";
  }

  // Per sub-department jurisdiction trees (Jurisdiction Management). Keyed
  // by "Department::Sub-Department" — only the 3 flagship combos below
  // carry real data, sized differently so the "share by department" donut
  // and per-department stat chips are real.
  function seedDepartmentJurisdictions() {
    const data = {};
    data[subKey("Information Technology Department", FLAGSHIP_SUBDEPT["Information Technology Department"])] = {
      levels: LEVELS.slice(),
      seq: 7,
      offices: [
        { id: 1, name: "Tamil Nadu", levelIndex: 0, parentId: null, reportsTo: "Top Level" },
        { id: 2, name: "Chennai Region", levelIndex: 1, parentId: 1, reportsTo: "Tamil Nadu" },
        { id: 3, name: "Coimbatore Region", levelIndex: 1, parentId: 1, reportsTo: "Tamil Nadu" },
        { id: 4, name: "Chennai", levelIndex: 2, parentId: 2, reportsTo: "Chennai Region" },
        { id: 5, name: "Coimbatore", levelIndex: 2, parentId: 3, reportsTo: "Coimbatore Region" },
        { id: 6, name: "Chennai IT Corridor Sub-Division", levelIndex: 3, parentId: 4, reportsTo: "Chennai" },
        { id: 7, name: "Coimbatore North Sub-Division", levelIndex: 3, parentId: 5, reportsTo: "Coimbatore" },
      ],
    };
    data[subKey("Revenue and Disaster Management Department", FLAGSHIP_SUBDEPT["Revenue and Disaster Management Department"])] = {
      levels: LEVELS.slice(),
      seq: 17,
      offices: [
        { id: 1, name: "Tamil Nadu", levelIndex: 0, parentId: null, reportsTo: "Top Level" },
        { id: 2, name: "Chennai Region", levelIndex: 1, parentId: 1, reportsTo: "Tamil Nadu" },
        { id: 3, name: "Madurai Region", levelIndex: 1, parentId: 1, reportsTo: "Tamil Nadu" },
        { id: 4, name: "Kancheepuram", levelIndex: 2, parentId: 2, reportsTo: "Chennai Region" },
        { id: 5, name: "Thiruvallur", levelIndex: 2, parentId: 2, reportsTo: "Chennai Region" },
        { id: 6, name: "Madurai", levelIndex: 2, parentId: 3, reportsTo: "Madurai Region" },
        { id: 7, name: "Theni", levelIndex: 2, parentId: 3, reportsTo: "Madurai Region" },
        { id: 8, name: "Kanchipuram Sub-Division", levelIndex: 3, parentId: 4, reportsTo: "Kancheepuram" },
        { id: 9, name: "Ponneri Sub-Division", levelIndex: 3, parentId: 5, reportsTo: "Thiruvallur" },
        { id: 10, name: "Madurai North Sub-Division", levelIndex: 3, parentId: 6, reportsTo: "Madurai" },
        { id: 11, name: "Kanchipuram Taluk", levelIndex: 4, parentId: 8, reportsTo: "Kanchipuram Sub-Division" },
        { id: 12, name: "Ponneri Taluk", levelIndex: 4, parentId: 9, reportsTo: "Ponneri Sub-Division" },
        { id: 13, name: "Madurai North Taluk", levelIndex: 4, parentId: 10, reportsTo: "Madurai North Sub-Division" },
        { id: 14, name: "Kancheepuram Firka", levelIndex: 5, parentId: 11, reportsTo: "Kanchipuram Taluk" },
        { id: 15, name: "Ponneri Firka", levelIndex: 5, parentId: 12, reportsTo: "Ponneri Taluk" },
        { id: 16, name: "Konerikuppam", levelIndex: 6, parentId: 14, reportsTo: "Kancheepuram Firka" },
        { id: 17, name: "Ariyambakkam", levelIndex: 6, parentId: 15, reportsTo: "Ponneri Firka" },
      ],
    };
    data[subKey("Rural Development & Panchayat Raj Department", FLAGSHIP_SUBDEPT["Rural Development & Panchayat Raj Department"])] = {
      levels: LEVELS.slice(),
      seq: 12,
      offices: [
        { id: 1, name: "Tamil Nadu", levelIndex: 0, parentId: null, reportsTo: "Top Level" },
        { id: 2, name: "Trichy Region", levelIndex: 1, parentId: 1, reportsTo: "Tamil Nadu" },
        { id: 3, name: "Salem Region", levelIndex: 1, parentId: 1, reportsTo: "Tamil Nadu" },
        { id: 4, name: "Trichy", levelIndex: 2, parentId: 2, reportsTo: "Trichy Region" },
        { id: 5, name: "Thanjavur", levelIndex: 2, parentId: 2, reportsTo: "Trichy Region" },
        { id: 6, name: "Salem", levelIndex: 2, parentId: 3, reportsTo: "Salem Region" },
        { id: 7, name: "Namakkal", levelIndex: 2, parentId: 3, reportsTo: "Salem Region" },
        { id: 8, name: "Srirangam Sub-Division", levelIndex: 3, parentId: 4, reportsTo: "Trichy" },
        { id: 9, name: "Thanjavur Sub-Division", levelIndex: 3, parentId: 5, reportsTo: "Thanjavur" },
        { id: 10, name: "Salem Sub-Division", levelIndex: 3, parentId: 6, reportsTo: "Salem" },
        { id: 11, name: "Srirangam Taluk", levelIndex: 4, parentId: 8, reportsTo: "Srirangam Sub-Division" },
        { id: 12, name: "Salem Taluk", levelIndex: 4, parentId: 10, reportsTo: "Salem Sub-Division" },
      ],
    };
    return data;
  }

  function slugify(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  // Fixed demo password gating the "deactivate a department / sub-department"
  // action on the Edit Dept & Sub Dept Names page — there's no real backend
  // or login system here, so this is a real check against one known value
  // rather than a rubber-stamped confirm dialog.
  const SUPER_ADMIN_PASSWORD = "Admin@123";

  // A department is a jurisdiction-bearing entity in its own right, not just
  // a folder of sub-departments (e.g. a Secretary's post sits at the
  // department's own secretariat level, not inside any one agency under
  // it). GENERAL_SUBDEPT ("" internally, "general" in URLs) represents that
  // department-level bucket — a pinned, always-available entry alongside
  // each department's real sub-departments.
  const GENERAL_SUBDEPT = "";
  const GENERAL_SLUG = "general";

  const DESIGNATIONS = [
    { id: 1, name: "Commissioner of Land Administration", code: "Commissioner", levelIndex: 0, reportsTo: "Top Level" },
    { id: 2, name: "Division Commisoner", code: "DC", levelIndex: 1, reportsTo: "Commissioner of Land Administration" },
    { id: 3, name: "District Collector", code: "DC", levelIndex: 2, reportsTo: "Division Commisoner" },
    { id: 4, name: "Sub Divisional Officer/Sub Collector", code: "RDO", levelIndex: 3, reportsTo: "District Collector" },
    { id: 5, name: "Tahsildar", code: "Th", levelIndex: 4, reportsTo: "Sub Collector" },
    { id: 6, name: "Revenue Inspector", code: "RI", levelIndex: 5, reportsTo: "Tahsildar" },
    { id: 7, name: "Village Administrative Officer", code: "VAO", levelIndex: 6, reportsTo: "Revenue Inspector" },
  ];

  // Per sub-department designations (Designation Management), keyed the
  // same way as jurisdictions above. Each chain is sized to match that
  // sub-department's own jurisdiction depth (Store.deptLevels).
  function seedDepartmentDesignations() {
    const data = {};
    data[subKey("Information Technology Department", FLAGSHIP_SUBDEPT["Information Technology Department"])] = {
      seq: 4,
      designations: [
        { id: 1, name: "Secretary, IT Department", code: "Secretary", levelIndex: 0, reportsToType: "office", reportsToId: "Tamil Nadu", reportsTo: "Tamil Nadu" },
        { id: 2, name: "Regional IT Director", code: "RID", levelIndex: 1, reportsToType: "officer", reportsToId: 1, reportsTo: "Secretary, IT Department" },
        { id: 3, name: "District IT Officer", code: "DITO", levelIndex: 2, reportsToType: "officer", reportsToId: 2, reportsTo: "Regional IT Director" },
        { id: 4, name: "IT Corridor Manager", code: "ICM", levelIndex: 3, reportsToType: "officer", reportsToId: 3, reportsTo: "District IT Officer" },
      ],
    };
    data[subKey("Revenue and Disaster Management Department", FLAGSHIP_SUBDEPT["Revenue and Disaster Management Department"])] = {
      seq: 7,
      designations: [
        { id: 1, name: "Commissioner of Land Administration", code: "Commissioner", levelIndex: 0, reportsToType: "office", reportsToId: "Tamil Nadu", reportsTo: "Tamil Nadu" },
        { id: 2, name: "Division Commissioner", code: "DC", levelIndex: 1, reportsToType: "officer", reportsToId: 1, reportsTo: "Commissioner of Land Administration" },
        { id: 3, name: "District Collector", code: "Collector", levelIndex: 2, reportsToType: "officer", reportsToId: 2, reportsTo: "Division Commissioner" },
        { id: 4, name: "Sub Divisional Officer / Sub Collector", code: "RDO", levelIndex: 3, reportsToType: "officer", reportsToId: 3, reportsTo: "District Collector" },
        { id: 5, name: "Tahsildar", code: "Th", levelIndex: 4, reportsToType: "officer", reportsToId: 4, reportsTo: "Sub Divisional Officer / Sub Collector" },
        { id: 6, name: "Revenue Inspector", code: "RI", levelIndex: 5, reportsToType: "officer", reportsToId: 5, reportsTo: "Tahsildar" },
        { id: 7, name: "Village Administrative Officer", code: "VAO", levelIndex: 6, reportsToType: "officer", reportsToId: 6, reportsTo: "Revenue Inspector" },
      ],
    };
    data[subKey("Rural Development & Panchayat Raj Department", FLAGSHIP_SUBDEPT["Rural Development & Panchayat Raj Department"])] = {
      seq: 5,
      designations: [
        { id: 1, name: "Commissioner, Rural Development", code: "Commissioner", levelIndex: 0, reportsToType: "office", reportsToId: "Tamil Nadu", reportsTo: "Tamil Nadu" },
        { id: 2, name: "Joint Director", code: "JD", levelIndex: 1, reportsToType: "officer", reportsToId: 1, reportsTo: "Commissioner, Rural Development" },
        { id: 3, name: "Project Director, DRDA", code: "PD", levelIndex: 2, reportsToType: "officer", reportsToId: 2, reportsTo: "Joint Director" },
        { id: 4, name: "Assistant Project Officer", code: "APO", levelIndex: 3, reportsToType: "officer", reportsToId: 3, reportsTo: "Project Director, DRDA" },
        { id: 5, name: "Block Development Officer", code: "BDO", levelIndex: 4, reportsToType: "officer", reportsToId: 4, reportsTo: "Assistant Project Officer" },
      ],
    };
    return data;
  }

  // Officers, assigned to real departments with real jurisdiction +
  // designation combinations that actually exist in that department's
  // flagship sub-department (see seedDepartmentJurisdictions /
  // seedDepartmentDesignations above).
  function seedOfficers() {
    const itds = "Information Technology Department";
    const revenue = "Revenue and Disaster Management Department";
    const ruralDev = "Rural Development & Panchayat Raj Department";
    const itdsSub = FLAGSHIP_SUBDEPT[itds];
    const revenueSub = FLAGSHIP_SUBDEPT[revenue];
    const ruralDevSub = FLAGSHIP_SUBDEPT[ruralDev];
    const rows = [
      // Information Technology Department
      { name: "Sunil Kumar", dept: itds, subDept: itdsSub, jurisdiction: "Chennai", designation: "District IT Officer", reportsTo: "Regional IT Director" },
      { name: "Priya Raman", dept: itds, subDept: itdsSub, jurisdiction: "Chennai IT Corridor Sub-Division", designation: "IT Corridor Manager", reportsTo: "District IT Officer" },
      { name: "Arjun Nair", dept: itds, subDept: itdsSub, jurisdiction: "Chennai Region", designation: "Regional IT Director", reportsTo: "Secretary, IT Department" },
      { name: "Lakshmi Iyer", dept: itds, subDept: itdsSub, jurisdiction: "Coimbatore", designation: "District IT Officer", reportsTo: "Regional IT Director" },
      // Revenue and Disaster Management Department
      { name: "Karthik Subramani", dept: revenue, subDept: revenueSub, jurisdiction: "Kancheepuram", designation: "District Collector", reportsTo: "Division Commissioner" },
      { name: "Deepa Menon", dept: revenue, subDept: revenueSub, jurisdiction: "Kanchipuram Taluk", designation: "Tahsildar", reportsTo: "Sub Divisional Officer / Sub Collector" },
      { name: "Ramesh Babu", dept: revenue, subDept: revenueSub, jurisdiction: "Kancheepuram Firka", designation: "Revenue Inspector", reportsTo: "Tahsildar" },
      { name: "Anitha Selvam", dept: revenue, subDept: revenueSub, jurisdiction: "Konerikuppam", designation: "Village Administrative Officer", reportsTo: "Revenue Inspector" },
      { name: "Vijay Anand", dept: revenue, subDept: revenueSub, jurisdiction: "Chennai Region", designation: "Division Commissioner", reportsTo: "Commissioner of Land Administration" },
      { name: "Meena Krishnan", dept: revenue, subDept: revenueSub, jurisdiction: "Madurai", designation: "District Collector", reportsTo: "Division Commissioner" },
      { name: "Suresh Pillai", dept: revenue, subDept: revenueSub, jurisdiction: "Madurai North Sub-Division", designation: "Sub Divisional Officer / Sub Collector", reportsTo: "District Collector" },
      // Rural Development & Panchayat Raj Department
      { name: "Divya Mohan", dept: ruralDev, subDept: ruralDevSub, jurisdiction: "Trichy", designation: "Project Director, DRDA", reportsTo: "Joint Director" },
      { name: "Naveen Raj", dept: ruralDev, subDept: ruralDevSub, jurisdiction: "Srirangam Taluk", designation: "Block Development Officer", reportsTo: "Assistant Project Officer" },
      // last two start out deactivated so the Deactivated tab isn't empty
      { name: "Kavya Suresh", dept: ruralDev, subDept: ruralDevSub, jurisdiction: "Trichy Region", designation: "Joint Director", reportsTo: "Commissioner, Rural Development", status: "deactivated" },
      { name: "Hari Prasad", dept: ruralDev, subDept: ruralDevSub, jurisdiction: "Salem Sub-Division", designation: "Assistant Project Officer", reportsTo: "Project Director, DRDA", status: "deactivated" },
    ];
    return rows.map((r, i) => {
      const parts = r.name.split(" ");
      const sso = (parts[0][0] + parts[parts.length - 1]).replace(/\s/g, "");
      return {
        id: i + 1,
        name: r.name,
        role: r.designation,
        designation: r.designation,
        dept: r.dept,
        subDept: r.subDept,
        jurisdiction: r.jurisdiction,
        sso,
        mobile: "86" + String(500000000 + i * 137911).slice(0, 9),
        email: sso.toLowerCase() + "@gmail.com",
        reportsTo: r.reportsTo,
        status: r.status || "active",
      };
    });
  }

  // A handful of real registered applications, scoped to the same three
  // departments that already have real jurisdiction/designation data —
  // everywhere else in the 75-department directory starts out
  // "Not Configured", exactly like Jurisdiction/Designation Management.
  function seedApplications() {
    const itds = "Information Technology Department";
    const revenue = "Revenue and Disaster Management Department";
    const ruralDev = "Rural Development & Panchayat Raj Department";
    const rows = [
      {
        name: "TNeGA Citizen Services Portal", dept: itds,
        subDept: "Tamilnadu e-Governance Agency (TNeGA)/ Directorate of e-Governance(AB)",
        type: "Web Application", status: "active",
        description: "Central citizen-facing portal for e-Governance services.",
        audience: "public", loginMode: "mobile-otp",
      },
      {
        name: "TANFINET Network Operations", dept: itds,
        subDept: "Tamil Nadu Fibrenet Corporation Limited(TANFINET)(AB)",
        type: "Web Application", status: "active",
        description: "Monitoring and provisioning console for the state fibre network.",
        audience: "officers", loginMode: "password",
      },
      {
        name: "ELCOT Vendor Registration", dept: itds,
        subDept: "Electronics Corporation of Tamilnadu Ltd (ELCOT)(AB)",
        type: "Web & Mobile", status: "inactive",
        description: "Vendor onboarding and empanelment for ELCOT procurement.",
        audience: "public", loginMode: "email-otp",
      },
      {
        name: "Land Records Management System", dept: revenue,
        subDept: "Commissionerate of Land Administration",
        type: "Web Application", status: "active",
        description: "Digitised land records lookup and mutation tracking.",
        audience: "public", loginMode: "aadhaar",
      },
      {
        name: "Disaster Alert & Response App", dept: revenue,
        subDept: "", type: "Mobile Application", status: "active",
        description: "Field alerts and response coordination during emergencies.",
        audience: "public", loginMode: "mobile-otp",
      },
      {
        name: "Panchayat MIS", dept: ruralDev,
        subDept: "", type: "Web Application", status: "active",
        description: "Management information system for local Panchayat bodies.",
        audience: "officers", loginMode: "password",
      },
      {
        name: "SIRD Training Tracker", dept: ruralDev,
        subDept: "State Institute of Rural Development (SIRD)",
        type: "Mobile Application", status: "inactive",
        description: "Tracks training program enrolment and completion for rural staff.",
        audience: "officers", loginMode: "password",
      },
    ];
    return rows.map((r, i) => {
      const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const hasWeb = r.type === "Web Application" || r.type === "Web & Mobile";
      const hasMobile = r.type === "Mobile Application" || r.type === "Web & Mobile";
      return {
        id: i + 1,
        name: r.name,
        dept: r.dept,
        subDept: r.subDept,
        type: r.type,
        status: r.status,
        description: r.description,
        audience: r.audience,
        loginMode: r.loginMode,
        clientId: "tnsso_" + r.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) + "_" + (100 + i),
        webUrl: hasWeb ? "https://" + slug + ".tn.gov.in" : "",
        appUrl: hasMobile ? "https://play.google.com/store/apps/details?id=in.tn.gov." + slug.replace(/-/g, "") : "",
        redirectUrl: "https://" + slug + ".tn.gov.in/auth/callback",
      };
    });
  }

  function seedDepartmentAdmins() {
    // One onboarded admin per seed department, so the Departments page
    // isn't empty on first load.
    return DEPARTMENTS.map((name, i) => ({
      id: i + 1,
      dept: name,
      code: ["ITD", "RDM", "RDPR"][i] || "",
      name: ["Meena Krishnan", "Suresh Pillai", "Divya Mohan"][i] || "Admin " + (i + 1),
      email: "admin" + (i + 1) + "@tn.gov.in",
      mobile: "9" + String(800000000 + i * 111111).slice(0, 9),
      sso: "deptadmin" + (i + 1),
      status: "active",
    }));
  }

  // The logged-in Super Admin's own profile (Profile page) — a single
  // record, not a list, since this prototype only ever has one signed-in
  // admin. Login History is separate, read-only seed data for the same page.
  function seedSuperAdmin() {
    return {
      name: "Sunil Kumar T",
      role: "Super Admin",
      department: "Information Technology Department",
      email: "sunil.kumar@tn.gov.in",
      mobile: "+91 98765 43210",
      ssoUsername: "superadmin",
      // Demo-only credential for the Login page — this is a static
      // front-end prototype with no real auth backend, so this is
      // deliberately a known, shareable value, not a real secret.
      password: "TnSso@2026",
      avatar: "assets/imgImage12.png",
    };
  }
  function seedLoginHistory() {
    return [
      { id: 1, device: "Chrome on macOS", icon: "laptop_mac", ip: "10.12.4.201", location: "Chennai, TN", timestamp: "Today, 9:42 AM", current: true },
      { id: 2, device: "Chrome on macOS", icon: "laptop_mac", ip: "10.12.4.201", location: "Chennai, TN", timestamp: "Yesterday, 6:15 PM", current: false },
      { id: 3, device: "Edge on Windows", icon: "computer", ip: "49.204.11.87", location: "Chennai, TN", timestamp: "3 days ago, 11:03 AM", current: false },
      { id: 4, device: "Safari on iPhone", icon: "phone_iphone", ip: "49.204.11.87", location: "Chennai, TN", timestamp: "5 days ago, 3:47 PM", current: false },
      { id: 5, device: "Chrome on macOS", icon: "laptop_mac", ip: "10.12.4.201", location: "Chennai, TN", timestamp: "8 days ago, 9:12 AM", current: false },
    ];
  }

  // The real department/sub-department directory, mutable (create, rename,
  // deactivate/reactivate) via the Edit Dept & Sub Dept Names admin page.
  // Seeded from the real ALL_DEPARTMENTS/ALL_SUB_DEPARTMENTS lists above.
  function seedDirectory() {
    const departments = ALL_DEPARTMENTS.map((name) => ({ name, status: "active" }));
    const subDepartments = {};
    ALL_DEPARTMENTS.forEach((name) => {
      subDepartments[name] = (ALL_SUB_DEPARTMENTS[name] || []).map((s) => ({ name: s, status: "active" }));
    });
    return { departments, subDepartments };
  }

  function defaults() {
    return {
      departments: DEPARTMENTS.slice(),
      subDepartments: JSON.parse(JSON.stringify(SUB_DEPARTMENTS)),
      departmentAdmins: seedDepartmentAdmins(),
      levels: LEVELS.slice(),
      offices: JSON.parse(JSON.stringify(OFFICES)),
      departmentJurisdictions: seedDepartmentJurisdictions(),
      departmentDesignations: seedDepartmentDesignations(),
      designations: JSON.parse(JSON.stringify(DESIGNATIONS)),
      officers: seedOfficers(),
      applications: seedApplications(),
      superAdmin: seedSuperAdmin(),
      loginHistory: seedLoginHistory(),
      directory: seedDirectory(),
      seqs: { office: 7, designation: 7, officer: 15, department: DEPARTMENTS.length, application: 7 },
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
    departmentAdmins() { return data.departmentAdmins || (data.departmentAdmins = []); },
    departmentAdmin(dept) { return this.departmentAdmins().find((a) => a.dept === dept) || null; },
    offices() { return data.offices; },
    officeNames() { return data.offices.map((o) => o.name); },
    designations() { return data.designations; },
    officers() { return data.officers; },

    // ---- applications (App Management) ----
    // Scoped against the real 75-department directory (allDepartments/
    // allSubDepartments below), same as Jurisdiction/Designation — most
    // departments start with zero registered applications ("Not
    // Configured"), which is the expected, honest default rather than
    // hardcoded department cards that don't correspond to anything real.
    applications() { return data.applications || (data.applications = []); },
    // ---- Super Admin profile (Profile page) ----
    superAdmin() { return data.superAdmin; },
    updateSuperAdmin(patch) {
      Object.assign(data.superAdmin, patch);
      persist();
      return data.superAdmin;
    },
    loginHistory() { return data.loginHistory || []; },
    // ---- Home page: "Getting Started" cards, dismissed for real (not just
    // removed from the DOM until the next reload) ----
    isGettingStartedDismissed(key) {
      return !!(data.gettingStartedDismissed && data.gettingStartedDismissed[key]);
    },
    dismissGettingStarted(key) {
      if (!data.gettingStartedDismissed) data.gettingStartedDismissed = {};
      data.gettingStartedDismissed[key] = true;
      persist();
    },
    appsByDept(deptName, subDeptName) {
      return this.applications().filter((a) => a.dept === deptName && (subDeptName == null || a.subDept === subDeptName));
    },
    deptApplicationCount(deptName) {
      return this.applications().filter((a) => a.dept === deptName).length;
    },
    addApplication(payload) {
      if (!data.seqs.application) data.seqs.application = this.applications().length;
      const record = Object.assign({ status: "active" }, payload, { id: ++data.seqs.application });
      this.applications().push(record);
      persist();
      return record;
    },
    updateApplication(id, patch) {
      const a = this.applications().find((x) => x.id === id);
      if (!a) return null;
      Object.assign(a, patch);
      persist();
      return a;
    },
    setApplicationStatus(id, status) {
      const a = this.applications().find((x) => x.id === id);
      if (a) { a.status = status; persist(); }
    },

    // ---- full real Department / Sub-Department directory ----
    // Used by Jurisdiction Management, Designation Management, Hierarchy
    // Map, and App Management's own pickers — kept separate from
    // departments()/subDepartments() above so Admin Logins and User
    // Management's small "onboarded" lists are unaffected.
    // Deactivated entries are hidden from these two — the Edit Dept &
    // Sub Dept Names page uses the *Records variants below instead, since
    // it needs to see (and reactivate) deactivated ones too.
    allDepartments() {
      return data.directory.departments.filter((d) => d.status === "active").map((d) => d.name);
    },
    allSubDepartments(deptName) {
      return (data.directory.subDepartments[deptName] || []).filter((s) => s.status === "active").map((s) => s.name);
    },
    allDepartmentRecords() { return data.directory.departments; },
    allSubDepartmentRecords(deptName) { return data.directory.subDepartments[deptName] || []; },
    verifyAdminPassword(pw) { return pw === SUPER_ADMIN_PASSWORD; },

    // ---- Edit Dept & Sub Dept Names (directory management) ----
    directoryDepartmentExists(name) {
      return data.directory.departments.some((d) => d.name.toLowerCase() === name.toLowerCase());
    },
    addDirectoryDepartment(name) {
      const record = { name, status: "active" };
      data.directory.departments.push(record);
      data.directory.subDepartments[name] = [];
      persist();
      return record;
    },
    // Renames a department everywhere its name is used as a key or value —
    // its own directory entry, its sub-department bucket, every existing
    // jurisdiction/designation record filed under it, and (if it's one of
    // the 3 onboarded departments) the Admin Logins / User Management side
    // of the data too — so nothing already configured looks like it
    // vanished just because the department's name changed.
    renameDirectoryDepartment(oldName, newName) {
      const record = data.directory.departments.find((d) => d.name === oldName);
      if (!record || oldName === newName) return record || null;
      record.name = newName;
      if (data.directory.subDepartments[oldName]) {
        data.directory.subDepartments[newName] = data.directory.subDepartments[oldName];
        delete data.directory.subDepartments[oldName];
      }
      const oldPrefix = oldName + "::";
      const newPrefix = newName + "::";
      [data.departmentJurisdictions, data.departmentDesignations].forEach((bucketMap) => {
        if (!bucketMap) return;
        Object.keys(bucketMap).forEach((key) => {
          if (key.indexOf(oldPrefix) === 0) {
            bucketMap[newPrefix + key.slice(oldPrefix.length)] = bucketMap[key];
            delete bucketMap[key];
          }
        });
      });
      if (FLAGSHIP_SUBDEPT[oldName] !== undefined) {
        FLAGSHIP_SUBDEPT[newName] = FLAGSHIP_SUBDEPT[oldName];
        delete FLAGSHIP_SUBDEPT[oldName];
      }
      const onboardedIndex = data.departments.indexOf(oldName);
      if (onboardedIndex !== -1) {
        data.departments[onboardedIndex] = newName;
        if (data.subDepartments[oldName]) {
          data.subDepartments[newName] = data.subDepartments[oldName];
          delete data.subDepartments[oldName];
        }
        this.departmentAdmins().forEach((a) => { if (a.dept === oldName) a.dept = newName; });
        data.officers.forEach((o) => { if (o.dept === oldName) o.dept = newName; });
      }
      persist();
      return record;
    },
    setDirectoryDepartmentStatus(name, status) {
      const record = data.directory.departments.find((d) => d.name === name);
      if (record) { record.status = status; persist(); }
      return record || null;
    },
    directorySubDepartmentExists(deptName, name) {
      return (data.directory.subDepartments[deptName] || []).some((s) => s.name.toLowerCase() === name.toLowerCase());
    },
    addDirectorySubDepartment(deptName, name) {
      if (!data.directory.subDepartments[deptName]) data.directory.subDepartments[deptName] = [];
      const record = { name, status: "active" };
      data.directory.subDepartments[deptName].push(record);
      persist();
      return record;
    },
    // Renames a sub-department everywhere its name is used, mirroring
    // renameDirectoryDepartment above but scoped to one department.
    renameDirectorySubDepartment(deptName, oldName, newName) {
      const list = data.directory.subDepartments[deptName] || [];
      const record = list.find((s) => s.name === oldName);
      if (!record || oldName === newName) return record || null;
      record.name = newName;
      const oldKey = subKey(deptName, oldName);
      const newKey = subKey(deptName, newName);
      [data.departmentJurisdictions, data.departmentDesignations].forEach((bucketMap) => {
        if (bucketMap && bucketMap[oldKey]) {
          bucketMap[newKey] = bucketMap[oldKey];
          delete bucketMap[oldKey];
        }
      });
      if (FLAGSHIP_SUBDEPT[deptName] === oldName) FLAGSHIP_SUBDEPT[deptName] = newName;
      if (data.subDepartments[deptName]) {
        const i = data.subDepartments[deptName].indexOf(oldName);
        if (i !== -1) data.subDepartments[deptName][i] = newName;
      }
      data.officers.forEach((o) => {
        if (o.dept === deptName && o.subDept === oldName) o.subDept = newName;
      });
      persist();
      return record;
    },
    setDirectorySubDepartmentStatus(deptName, name, status) {
      const record = (data.directory.subDepartments[deptName] || []).find((s) => s.name === name);
      if (record) { record.status = status; persist(); }
      return record || null;
    },

    // ---- departments (Super Admin onboarding via "Create Admin Login") ----
    // name is picked from the real department directory (Store.allDepartments),
    // so it may already be one of the onboarded departments — only add it to
    // the small onboarded list if it isn't there yet, rather than pushing a
    // duplicate every time a second admin login is created for it. subDept is
    // optional context only (which real sub-department prompted the login) —
    // it never narrows what the resulting admin can see.
    addDepartment({ name, code, admin, subDept, pending }) {
      if (!data.departments.includes(name)) {
        data.departments.push(name);
        if (!data.subDepartments[name]) data.subDepartments[name] = [];
      }
      if (!data.seqs.department) data.seqs.department = data.departments.length;
      const record = {
        id: ++data.seqs.department,
        dept: name,
        subDept: subDept || "",
        code: code || "",
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile,
        sso: admin.sso,
        status: pending ? "pending" : "active",
        verifyToken: pending ? this.genToken() : null,
      };
      this.departmentAdmins().push(record);
      persist();
      return record;
    },
    updateDepartment(id, { name, code, admin, subDept }) {
      const a = this.departmentAdmins().find((x) => x.id === id);
      if (!a) return null;
      if (name && name !== a.dept) {
        if (!data.departments.includes(name)) {
          data.departments.push(name);
          if (!data.subDepartments[name]) data.subDepartments[name] = [];
        }
        a.dept = name;
      }
      a.subDept = subDept || "";
      a.code = code || "";
      a.name = admin.name;
      a.email = admin.email;
      a.mobile = admin.mobile;
      a.sso = admin.sso;
      persist();
      return a;
    },
    setDepartmentAdminStatus(id, status) {
      const a = this.departmentAdmins().find((x) => x.id === id);
      if (a) { a.status = status; persist(); }
    },

    // ---- account verification (officers + department admins share this) ----
    // A login created by an admin on someone else's behalf starts "pending"
    // instead of asking the creator to verify a phone/email they don't have
    // access to. A verification link (carrying this token) goes to the new
    // account's own mobile/email; opening it lets them set their own
    // password and flips status to "active". Mobile/email/SSO username must
    // be unique across BOTH officers and department admins — one person,
    // one login — so duplicate-checking spans both tables.
    genToken() {
      return Math.random().toString(36).slice(2) + Date.now().toString(36);
    },
    findDuplicateContact({ mobile, email, sso, excludeKind, excludeId }) {
      const norm = (v) => String(v || "").trim().toLowerCase();
      const pool = data.officers
        .map((o) => ({ kind: "officer", id: o.id, mobile: o.mobile, email: o.email, sso: o.sso }))
        .concat(this.departmentAdmins().map((a) => ({ kind: "admin", id: a.id, mobile: a.mobile, email: a.email, sso: a.sso })))
        .filter((rec) => !(excludeKind && rec.kind === excludeKind && rec.id === excludeId));
      const mobileN = String(mobile || "").trim();
      const emailN = norm(email);
      const ssoN = norm(sso);
      const hits = {};
      if (mobileN) { const hit = pool.find((r) => String(r.mobile || "").trim() === mobileN); if (hit) hits.mobile = hit; }
      if (emailN) { const hit = pool.find((r) => norm(r.email) === emailN); if (hit) hits.email = hit; }
      if (ssoN) { const hit = pool.find((r) => norm(r.sso) === ssoN); if (hit) hits.sso = hit; }
      return Object.keys(hits).length ? hits : null;
    },
    findAccountByToken(token) {
      if (!token) return null;
      const officer = data.officers.find((o) => o.verifyToken === token);
      if (officer) return { kind: "officer", record: officer };
      const admin = this.departmentAdmins().find((a) => a.verifyToken === token);
      if (admin) return { kind: "admin", record: admin };
      return null;
    },
    activateAccount(token, password) {
      const found = this.findAccountByToken(token);
      if (!found) return null;
      found.record.status = "active";
      found.record.password = password;
      found.record.verifyToken = null;
      persist();
      return found;
    },
    resendVerification(kind, id) {
      const record = kind === "officer" ? data.officers.find((o) => o.id === id) : this.departmentAdmins().find((a) => a.id === id);
      if (!record) return null;
      record.verifyToken = this.genToken();
      record.verifySentAt = Date.now();
      persist();
      return record;
    },
    updatePendingContact(kind, id, patch) {
      const record = kind === "officer" ? data.officers.find((o) => o.id === id) : this.departmentAdmins().find((a) => a.id === id);
      if (!record) return null;
      Object.assign(record, patch);
      persist();
      return record;
    },
    pendingOfficers() { return data.officers.filter((o) => o.status === "pending"); },
    pendingDepartmentAdmins() { return this.departmentAdmins().filter((a) => a.status === "pending"); },

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

    // ---- jurisdiction, per sub-department (Jurisdiction Management) ----
    // subDeptName is optional: omitted, it resolves to that department's
    // flagship sub-department (keeps every pre-existing caller working
    // unchanged); passed explicitly, it scopes to that exact real
    // sub-department (most of which are empty until an admin adds data).
    deptSlug(name) { return slugify(name); },
    // The pinned "department itself" entry uses a fixed slug ("general")
    // since its real value is an empty string internally, but its
    // DISPLAY label is just the department's own name — there's nothing
    // else to call it, since it IS the department.
    generalSubDept() { return GENERAL_SUBDEPT; },
    generalLabel(deptName) { return deptName; },
    subDeptSlug(name) { return name === GENERAL_SUBDEPT ? GENERAL_SLUG : slugify(name); },
    subDeptLabel(deptName, subDeptName) { return subDeptName === GENERAL_SUBDEPT ? deptName : subDeptName; },
    deptByJurSlug(slug) {
      return this.departments().find((d) => slugify(d) === slug) || null;
    },
    deptBySlug(slug) {
      return this.allDepartments().find((d) => slugify(d) === slug) || null;
    },
    // Returns null only when the slug matches nothing at all — the
    // General entry is a legitimate match that resolves to "" (falsy),
    // so callers must check for null, not just falsiness.
    subDeptBySlug(deptName, slug) {
      if (slug === GENERAL_SLUG) return GENERAL_SUBDEPT;
      return this.allSubDepartments(deptName).find((s) => slugify(s) === slug) ?? null;
    },
    deptJurisdiction(deptName, subDeptName) {
      const sub = resolveSub(deptName, subDeptName);
      const key = subKey(deptName, sub);
      if (!data.departmentJurisdictions) data.departmentJurisdictions = {};
      if (!data.departmentJurisdictions[key]) {
        data.departmentJurisdictions[key] = { levels: LEVELS.slice(), offices: [], seq: 0 };
      }
      return data.departmentJurisdictions[key];
    },
    deptOffices(deptName, subDeptName) { return this.deptJurisdiction(deptName, subDeptName).offices; },
    deptLevels(deptName, subDeptName) { return this.deptJurisdiction(deptName, subDeptName).levels; },
    setDeptLevels(deptName, levels, subDeptName) {
      replaceInPlace(this.deptLevels(deptName, subDeptName), levels);
      persist();
    },
    addDeptOffice(deptName, o, subDeptName) {
      const bucket = this.deptJurisdiction(deptName, subDeptName);
      o.id = ++bucket.seq;
      bucket.offices.push(o);
      persist();
      return o;
    },
    updateDeptOffice(deptName, id, patch, subDeptName) {
      const o = this.deptOffices(deptName, subDeptName).find((x) => x.id === id);
      if (!o) return null;
      Object.assign(o, patch);
      persist();
      return o;
    },
    // Deletes the office and every descendant beneath it (children,
    // grandchildren, ...) so nothing is left pointing at a parent that
    // no longer exists.
    removeDeptOffice(deptName, id, subDeptName) {
      const offices = this.deptOffices(deptName, subDeptName);
      const toRemove = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        offices.forEach((o) => {
          if (o.parentId != null && toRemove.has(o.parentId) && !toRemove.has(o.id)) {
            toRemove.add(o.id);
            grew = true;
          }
        });
      }
      replaceInPlace(offices, offices.filter((o) => !toRemove.has(o.id)));
      persist();
    },
    deptOfficeChildCount(deptName, id, subDeptName) {
      return this.deptOffices(deptName, subDeptName).filter((o) => o.parentId === id).length;
    },
    // Totals across every REAL department (all 76), summed across each
    // department's real sub-departments — used by Jurisdiction
    // Management's landing-page donut / department cards.
    deptJurisdictionTotals() {
      return this.allDepartments().map((d) => ({
        label: d,
        value: this.allSubDepartments(d)
          .concat([GENERAL_SUBDEPT])
          .reduce((sum, s) => sum + this.deptOffices(d, s).length, 0),
      }));
    },
    deptLevelCounts(deptName, subDeptName) {
      const levels = this.deptLevels(deptName, subDeptName);
      const offices = this.deptOffices(deptName, subDeptName);
      return levels.slice(1).map((label, i) => {
        const levelIndex = i + 1;
        return { label, value: offices.filter((o) => o.levelIndex === levelIndex).length };
      });
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

    // ---- designations, per sub-department (Designation Management) ----
    deptDesignationBucket(deptName, subDeptName) {
      const sub = resolveSub(deptName, subDeptName);
      const key = subKey(deptName, sub);
      if (!data.departmentDesignations) data.departmentDesignations = {};
      if (!data.departmentDesignations[key]) {
        data.departmentDesignations[key] = { designations: [], seq: 0 };
      }
      return data.departmentDesignations[key];
    },
    deptDesignations(deptName, subDeptName) { return this.deptDesignationBucket(deptName, subDeptName).designations; },
    addDeptDesignation(deptName, d, subDeptName) {
      const bucket = this.deptDesignationBucket(deptName, subDeptName);
      d.id = ++bucket.seq;
      bucket.designations.push(d);
      persist();
      return d;
    },
    updateDeptDesignation(deptName, id, patch, subDeptName) {
      const d = this.deptDesignations(deptName, subDeptName).find((x) => x.id === id);
      if (!d) return null;
      Object.assign(d, patch);
      persist();
      return d;
    },
    // Returns the list of designations that report to this one (blockers),
    // or removes it and returns null if nothing depends on it.
    removeDeptDesignation(deptName, id, subDeptName) {
      const list = this.deptDesignations(deptName, subDeptName);
      const dependents = list.filter((d) => d.reportsToType === "officer" && d.reportsToId === id);
      if (dependents.length) return dependents;
      replaceInPlace(list, list.filter((d) => d.id !== id));
      persist();
      return null;
    },
    deptDesignationTotals() {
      return this.allDepartments().map((d) => ({
        label: d,
        value: this.allSubDepartments(d)
          .concat([GENERAL_SUBDEPT])
          .reduce((sum, s) => sum + this.deptDesignations(d, s).length, 0),
      }));
    },
    deptDesignationLevelCounts(deptName, subDeptName) {
      const levels = this.deptLevels(deptName, subDeptName);
      const designations = this.deptDesignations(deptName, subDeptName);
      return levels.map((label, levelIndex) => ({
        label,
        value: designations.filter((d) => d.levelIndex === levelIndex).length,
      }));
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
    updateOfficer(id, patch) {
      const o = data.officers.find((x) => x.id === id);
      if (!o) return null;
      Object.assign(o, patch);
      persist();
      return o;
    },
    removeOfficer(id) {
      replaceInPlace(data.officers, data.officers.filter((o) => o.id !== id));
      persist();
    },
    // "Unlink" is a transfer, not a deletion — the record has to survive so
    // the officer can be found and re-linked into their new department's
    // "transferred officer" list. Clearing dept/subDept/jurisdiction is what
    // makes transferredOfficers() below pick them up.
    unlinkOfficer(id) {
      const o = data.officers.find((x) => x.id === id);
      if (!o) return null;
      o.lastDept = o.dept;
      o.lastDesignation = o.designation;
      o.dept = "";
      o.subDept = "";
      o.jurisdiction = "";
      persist();
      return o;
    },
    transferredOfficers() {
      return data.officers.filter((o) => !o.dept);
    },
    linkOfficer(id, { dept, subDept, jurisdiction, designation, reportsTo }) {
      const o = data.officers.find((x) => x.id === id);
      if (!o) return null;
      Object.assign(o, { dept, subDept, jurisdiction, designation, reportsTo });
      persist();
      return o;
    },
    officerCount(status) {
      return status ? data.officers.filter((o) => o.status === status).length : data.officers.length;
    },
    deptOfficerCount(deptName, status) {
      return data.officers.filter((o) => o.dept === deptName && (!status || o.status === status)).length;
    },
    deptOfficerTotals() {
      return this.departments().map((d) => ({
        label: d,
        value: this.deptOfficerCount(d),
      }));
    },
  };
})();
