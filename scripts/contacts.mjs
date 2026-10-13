// Contact details + canonical identity for the current cohort. Keyed by slug.
// Source: the CVs in "Fellowship Applicants/" (named in `cv`).
// `sheet` maps to the worksheet name in the scoring workbook once interviews are
// scored (null = not scored yet / no sheet).
// `cvSummary` is the panel's read of the CV — shown on the candidate's file to
// panel and admin only, never to the candidate.

export const CONTACTS = [
  {
    slug: 'edwin-gli', sheet: null, cv: 'EDWIN ELORM GLI.pdf',
    name: 'Edwin Elorm Gli', gender: null, dob: null,
    email: 'eddgli.eg@gmail.com', phone: '0550244219', address: null,
    category: 'Experienced Professional',
    discipline: 'BSc Information Technology', unit: null,
    institution: 'Kwame Nkrumah University of Science and Technology', country: null, canCommit: null,
    cvSummary: `IT Officer with a claimed 7+ years in IT infrastructure, networking and end-user support.

Experience
• IT Officer, University of Ghana Computing Systems (2017–2018): day-to-day IT operations, routers/switches/firewalls, support for 10,000+ users, IT policy, Active Directory, staff training.
• Junior IT Officer, Akoa Beverages Ltd (2017–2021): first-line support, system monitoring, user documentation; claims a 60% cut in security incidents.
• Projects: network optimisation (80% faster), cybersecurity strategy (70% fewer vulnerabilities), migration of 10 servers to a virtualised environment (60% lower hardware cost).

Education & certifications
• BSc Information Technology — KNUST (2022–2024) and Ghana Technology University College (2016–2018).
• Huawei Routing & Switching; Microsoft Azure Fundamentals; an online cybersecurity course (“Hackers Exposed”).
• Broad stack: Windows Server/Linux, VMware/Hyper-V, MySQL/SQL Server, Nagios/Zabbix, Veeam/Acronis, Python/JS, WordPress, CCTV.

Strengths
Wide hands-on infrastructure range — networking, virtualisation, directory services, backups and security basics — with experience supporting a large user base.

Points to probe
• The two roles overlap (2017–2018 vs 2017–2021), and the dates add up to about four years, not the 7+ claimed. Apart from the KNUST degree (2022–2024), what has Edwin done since 2021?
• Two BSc IT degrees from different institutions — why the second?
• The CV still contains a template placeholder (“[number] users”) and lists a certification under Professional Memberships — attention to detail.
• The percentage claims (80%, 70%, 60%) — ask how each was measured.`,
  },
  {
    slug: 'george-eluba', sheet: null, cv: 'GEORGE ELUBA-CV.pdf',
    name: 'George Eluba', gender: null, dob: null,
    email: 'georgeeluba@gmail.com', phone: '0240300123', address: null,
    category: 'Experienced Professional',
    discipline: 'MSc IT for Business (in progress)', unit: null,
    institution: 'University of Ghana', country: 'Ghana', canCommit: null,
    cvSummary: `IT specialist with 5+ years in network infrastructure, network security and systems support, currently consulting.

Experience
• IT/Technical Consultant, Prymage Consultancy Ltd, Accra (Feb 2021–present): runs client IT infrastructure and networks (99% uptime), supports business applications and ERP for remote and on-site staff, designs secure cloud and on-premise remote-access set-ups, recommends process improvements.
• Junior Network Security Engineer, National Information Technology Agency (NITA) (Sep 2019–Aug 2020): network security for government agencies (MDAs), log monitoring, VPNs, provisioning, firewall issues.
• IT Intern, Ghana COCOBOD (Jun–Jul 2018).

Education
• MSc IT for Business — University of Ghana (expected completion August 2026).
• BSc Information Technology — University of Cape Coast (2019).
• Computer Networking Management — Koforidua Technical University (2015).
• Lists “AI productivity” as a skill.

Strengths
The most clearly network-security-oriented profile in the group, with public-sector security exposure at NITA and five-plus years of continuous client-facing consulting. Three named, contactable references.

Points to probe
• Whether the MSc (due August 2026) has been completed.
• The gap between NITA (Aug 2020) and Prymage (Feb 2021).
• What “99% uptime” covers and how it was measured; size of the client estate George looks after.
• No certifications listed — any vendor certs (Cisco, Fortinet, Microsoft)?`,
  },
  {
    slug: 'henry-ninson', sheet: null, cv: 'Henry A Ninson’s Resume.pdf',
    name: 'Henry Abetey Ninson', gender: null, dob: null,
    email: 'abeninhen@gmail.com', phone: '+233595198383', address: 'Accra, Ghana',
    category: 'Experienced Professional',
    discipline: 'Graduate Certificate in Information Technology', unit: null,
    institution: 'Algoma University, Canada', country: 'Ghana', canCommit: null,
    cvSummary: `IT support analyst with a strong cybersecurity certification set; most of Henry’s career so far has been in administration.

Experience
• Surveillance Officer (IT & Systems Support), Enterprise Computing Ltd, Tema (Dec 2023–Jul 2024): monitored IT and surveillance systems across several sites, resolved Level 1–2 issues, handled real-time incidents, kept logs and asset records, escalated complex faults.
• Assistant Administrative Officer, Electoral Commission of Ghana, Winneba (Oct 2019–Dec 2023): data handling and records validation for large-scale processes, user guidance on internal systems.
• National Service, Electoral Commission HQ, Accra (2017–2018): administrative support.

Education & certifications
• Graduate Certificate in IT — Algoma University, Canada (2020–2023).
• BSc Computer Science & Management — Wisconsin International University College (2013–2017).
• Certified Ethical Hacker (EC-Council); Certified in Cybersecurity (ISC2); ISO/IEC 27001:2022 Lead Auditor.

Strengths
Security and governance credentials well beyond Henry’s years in hands-on IT — the ISO 27001 Lead Auditor certification points towards compliance and audit work. Clear writing about incident handling and user communication.

Points to probe
• Direct IT experience is about eight months; the longer Electoral Commission role was administrative.
• No role is listed after July 2024 (a gap of more than a year) — what has Henry been doing?
• The Canadian certificate (2020–2023) ran alongside the Winneba role — studied remotely?
• How the certifications have been applied in practice (any audits, assessments or security incidents Henry led).`,
  },
  {
    slug: 'rowland-asorwoe', sheet: null, cv: 'rowland_asorwoe_cv.pdf',
    name: 'Rowland Asorwoe', gender: null, dob: null,
    email: 'rorosorwoe@gmail.com', phone: '+233539239619 / +233203933334', address: 'Ho, Ghana',
    category: 'Experienced Professional',
    discipline: 'BSc Computer Science', unit: null,
    institution: 'Kwame Nkrumah University of Science and Technology', country: 'Ghana', canCommit: null,
    cvSummary: `Full-stack developer (JavaScript/TypeScript, React/Next.js, Node/Express, Python), with teaching and operations experience; based in Ho.

Experience
• Manager, Serinity Acers, Ho (Mar 2024–present): runs day-to-day operations; moved the business onto digital record-keeping.
• Field Officer, Ghana Statistical Service (Jan–Mar 2024, Dzodze; Oct 2024–Sep 2025, Ashanti Kpoeta): survey data collection, validation and cleaning.
• Web Technologies Instructor, Ho Node HUB (Jan 2022–Sep 2023): taught HTML/CSS and web fundamentals, mentored learners through projects and deployment, trained women in rural communities in digital literacy.
• Administrative Assistant, University of Health and Allied Sciences (2020–2021).

Education & certifications
• BSc Computer Science — KNUST (2020); dissertation on chest X-ray classification with machine learning.
• Cisco Junior Cybersecurity Analyst Career Pathway (2025).

Projects
Chest X-ray classifier (TensorFlow CNN); task manager (React/Node/MongoDB, JWT auth); e-commerce platform (React/Express/PostgreSQL, Stripe payments); portfolio site. Also lists Docker, Vercel/Netlify/Render, Jest/Cypress and OWASP Top 10.

Strengths
The only software developer in the group, with a modern stack, security awareness and a record of teaching and mentoring — a good communicator on technical topics.

Points to probe
• No employed developer role so far; Rowland’s development work comes from teaching and personal projects. Ask for repositories or live links.
• The Manager role (Mar 2024–present) overlaps the second Statistical Service post — what is Rowland’s current time commitment?
• Location is Ho — availability for on-site work in Accra.`,
  },
]

// The cohort these candidates are seeded into. Created if missing; its weights
// and interview questions are then managed in Admin → Interview Questions.
export const COHORT = { slug: 'october-2026', name: 'October 2026' }

// Assessment dimensions. `weight` is the default for a new cohort (total 50);
// each cohort sets its own in the admin page.
export const CRITERIA = [
  { key: 'behavioural', label: 'Behavioural', weight: 15 },
  { key: 'technical', label: 'Technical Competencies', weight: 15 },
  { key: 'experience', label: 'Experience', weight: 10 },
  { key: 'appearance', label: 'Appearance & Presence', weight: 10 },
]

export const PANELISTS = [
  'Ekow Thompson',
  'Ewuradjoa Aikins',
  'Phyllis Woode-Nartey',
  'Jason Nartey',
]
