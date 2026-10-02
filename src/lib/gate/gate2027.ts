// src/lib/gate/gate2027.ts — official GATE 2027 facts and syllabus changes, for /gate/2027 and the subject pages.
//
// Source: GATE 2027 Information Brochure, IIT Madras (revised 27 September 2026), https://gate2027ib.iitm.ac.in/GATE2027-IB.pdf
// Syllabus changes were found by comparing each paper's 2027 syllabus (brochure Appendix D) line by line with the
// official 2026 syllabus (IIT Guwahati). Wording follows the official text. Re-check if IIT Madras revises the brochure.

export const GATE_2027 = {
  organiser: "IIT Madras",
  website: "https://gate2027.iitm.ac.in",
  brochure: "https://gate2027ib.iitm.ac.in/GATE2027-IB.pdf",
  brochureRevised: "27 September 2026",
  checked: "2026-10-02", // when this file was last compared with the brochure
  examDays: ["2027-02-06", "2027-02-07", "2027-02-13", "2027-02-14", "2027-02-20", "2027-02-21"],
  sessions: { forenoon: "9:30 AM to 12:30 PM", afternoon: "2:30 PM to 5:30 PM" },
  timeline: [
    ["Application portal closed (regular period)", "2026-10-05"],
    ["Application portal closes (with late fee)", "2026-10-12"],
    ["Exam cities notified to candidates", "2027-01-04"],
    ["Admit cards", "To be announced"],
    ["Examination", "6, 7, 13, 14, 20 and 21 February 2027"],
    ["Results", "2027-03-19"],
  ] as [string, string][],
  papers: 30,
  newPaper: "Robotics and Automation (RA)",
  fee: { reserved: [1000, 1500], others: [2000, 2500] }, // per paper: [regular, extended period], ₹
} as const;

export type SyllabusChange = { status: "unchanged" | "minor" | "revised"; summary: string; added: string[]; removed: string[] };

/** 2026 → 2027 syllabus changes for the subjects Lemyte carries. */
export const SYLLABUS_2027: Record<string, SyllabusChange> = {
  EE: {
    status: "unchanged",
    summary: "The Electrical Engineering syllabus is the same as in GATE 2026: every section and topic carries over word for word.",
    added: [],
    removed: [],
  },
  DA: {
    status: "unchanged",
    summary: "The topics are unchanged. The 2027 syllabus only numbers the existing parts as Sections 1 to 7.",
    added: [],
    removed: [],
  },
  CS: {
    status: "revised",
    summary:
      "Computer Networks is cut down to its core, and Digital Logic and Computer Organization now ask for design (ALU, control unit, memory interfacing) rather than just concepts.",
    added: [
      "Boolean minimization by algebraic technique, Karnaugh map and tabular method; design of combinational and sequential circuits",
      "Design of the ALU, and of the control unit (hardwired and microprogrammed)",
      "Memory interfacing; memory hierarchy performance and cache memory mapping",
      "Network performance metrics; socket API",
    ],
    removed: [
      "Secondary storage (memory hierarchy now covers cache and interfacing)",
      "OSI and TCP/IP protocol stacks by name (now 'principles of layering'); framing; Ethernet bridging",
      "Shortest-path and flooding routing (distance vector and link state remain)",
      "IP addressing as a separate item; ARP, DHCP and ICMP",
      "UDP (TCP flow and congestion control remain)",
      "SMTP, FTP and email (DNS and HTTP remain)",
    ],
  },
  EC: {
    status: "revised",
    summary: "Topics were added across mathematics, signals, devices, analog circuits, control and communications; very little was removed.",
    added: [
      "Correlation and regression analysis",
      "Nyquist sampling theorem, sampling and reconstruction; FIR and IIR filter design",
      "Formation of energy bands in solids; scaling in MOSFETs",
      "Op-amp dominant-pole (Miller) compensation and phase margin",
      "Compensators and the PID controller (replacing lag, lead and lag-lead compensation)",
      "Source coding (information theory)",
    ],
    removed: ["First-order nonlinear differential equations (the syllabus now lists linear and Euler-Cauchy equations)", "Discrete-time processing of continuous-time signals"],
  },
  ME: {
    status: "revised",
    summary: "Mostly additions: two-degree-of-freedom vibration, control basics, combustion, additive manufacturing, automation and quality topics.",
    added: [
      "Free and forced vibration of two-degree-of-freedom systems; damping estimation; transmissibility ratio",
      "Control systems: transfer function and PID controller",
      "Boiling and condensation; one-dimensional high-speed compressible flow through converging and converging-diverging nozzles",
      "Basics of combustion: air-fuel ratio and equivalence ratio; pumps and pump characteristics",
      "Crystal structure of metals; polymers, composites and ceramics; casting defects; solid-state welding; non-destructive testing",
      "Tool geometry (ASA and ORS systems); additive manufacturing processes and products",
      "Pneumatic, electro-pneumatic and hydraulic actuators; programmable logic controllers",
      "Work study, productivity, six sigma, and quality and reliability concepts",
    ],
    removed: ["Lagrange's equation", "Heisler's charts (unsteady conduction stays)", "Testing with the universal testing machine (now 'mechanical properties of materials')"],
  },
  CE: {
    status: "revised",
    summary:
      "The biggest change among the subjects we cover: structural analysis is reorganised, water resources, environmental, transportation and surveying gain topics, and Construction Materials and Management becomes its own section.",
    added: [
      "Probability: axioms and theorems, statistical independence; PMF, PDF and CDF",
      "Work and energy methods (virtual work, Castigliano's second theorem); moving loads; stiffness matrix method",
      "Design and detailing of isolated footings; sheet piles; ground improvement techniques",
      "Prismatic and mobile channels; rapidly varied flow; flow past sharp-crested weirs; streamflow measurement",
      "River training structures, earthen dams, seepage through dams, well irrigation",
      "Tertiary wastewater treatment; sludge treatment; basics of landfill design",
      "Road design using IRC codes, design vehicle, interchanges, level of service; four-step travel demand modelling",
      "GNSS and geodetic surveying; cartography and map projections; digital photogrammetry and parallax",
      "Construction Management: estimation and costing, AOA/AON networks, project monitoring, equipment, contracts; cement chemistry",
    ],
    removed: [
      "Free vibration of undamped SDOF systems (Engineering Mechanics)",
      "Prestressed concrete beams; plate girders and trusses in steel design",
      "Dynamic pile formulae",
      "Horizontal and vertical curves (surveying); remote sensing and GIS",
    ],
  },
  AE: {
    status: "revised",
    summary:
      "Flight Mechanics and Space Dynamics are merged (six sections become five), numerical methods move into the core topics, Fanno and Rayleigh flow become special topics, and several advanced special topics are dropped.",
    added: [
      "Numerical methods: bisection, Newton-Raphson, numerical differentiation, trapezoidal and Simpson's rules, regression and interpolation",
      "Classification of PDEs; wave, Laplace and heat equations by separation of variables",
      "High-lift devices; CL-alpha curve; rigid-body momentum balance; Hohmann orbital transfers",
      "Fluid kinematics (streamline, streakline, pathline); Hagen-Poiseuille and Couette flow; manometers and Pitot probes",
      "Stress-strain curves of steel and aluminium; unsymmetric thin-walled sections",
      "Gas turbine combustor: types, configurations, stoichiometric fuel-to-air ratio",
    ],
    removed: [
      "Laplace transforms; mean value theorem",
      "Wind tunnel testing; shock-boundary layer interaction",
      "Vibration of beams; Airy's stress function; characteristics of aircraft structures and materials",
      "Surge and stall",
    ],
  },
};

export const daysUntil = (iso: string, now = new Date()) => Math.max(0, Math.ceil((new Date(`${iso}T09:30:00+05:30`).getTime() - now.getTime()) / 86_400_000));

export const fmtDay = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) : iso;
