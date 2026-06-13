// Contact details + canonical identity for all 20 shortlisted candidates.
// Source: "Shortlisted 20 fellowship applicants.pdf". Keyed by slug.
// `sheet` maps to the worksheet name in DATJF_Interview_Scoring.xlsx (null = not scored / no sheet).

export const CONTACTS = [
  {
    slug: 'padmore-yankey', sheet: 'Padmore', name: 'Padmore Yankey', gender: 'Male',
    dob: '2004-03-06', email: 'yankeypadmore@gmail.com', phone: '+233508930504',
    address: 'Accra, Ghana', category: 'Tertiary Student',
    discipline: 'BA Political Science, Philosophy and Classics', unit: 'College of Humanities',
    institution: 'University of Ghana', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'belinda-quansah', sheet: 'Belinda', name: 'Belinda Annan Quansah', gender: 'Female',
    dob: '2001-06-16', email: 'belle.quansah@gmail.com', phone: '+233571936122',
    address: 'Bubiashie, Accra', category: 'Tertiary Student',
    discipline: 'Strategic Communication', unit: 'Kojo Yankah School of Communication Studies',
    institution: 'Africa University for Communication and Business', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'seyram-ametepeh', sheet: 'Seyram', name: 'Seyram Esi Ametepeh', gender: 'Female',
    dob: '2003-09-07', email: 'seyram.e.am@gmail.com', phone: '+233597324701',
    address: '6 Naa Otobia LN, Darkuman Kokompe, Accra', category: 'Recent Graduate',
    discipline: 'Accounting', unit: 'Department of Accounting',
    institution: 'University of Cape Coast', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'precious-konadu', sheet: 'Precious', name: 'Precious Akomea Konadu', gender: 'Female',
    dob: '1999-12-22', email: 'precious.konaduakomea@gmail.com', phone: '0554192173',
    address: 'Adenta, Accra', category: 'Industry Enthusiast / Self-Taught Creative',
    discipline: 'Digital Marketing', unit: 'Applied Science (HR Management)',
    institution: 'University of Ghana', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'ernest-adofo', sheet: 'Ernest', name: 'Ernest Adofo', gender: 'Male',
    dob: '1994-06-13', email: 'ernestadofo64@gmail.com', phone: '+233543595245',
    address: 'Angetebu Street, Adabraka, Accra', category: 'Tertiary Student',
    discipline: 'Livestream & Media Production Operations', unit: 'Institute of Film and Television',
    institution: 'UNIMAC - IFT', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'rasheed-zakariah', sheet: 'Rasheed', name: 'Rasheed Zakariah', gender: 'Male',
    dob: '1999-08-08', email: 'zakariahrasheed8@gmail.com', phone: '+233545540079',
    address: 'Kumasi, Ghana', category: 'Recent Graduate',
    discipline: 'BFA Ceramics', unit: 'Faculty of Art, KNUST',
    institution: 'Kwame Nkrumah University of Science and Technology', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'diana-nartey', sheet: 'Diana', name: 'Diana Nartey', gender: 'Female',
    dob: '1995-12-26', email: 'narteydiana2020@gmail.com', phone: '0559298696',
    address: '13 Tanpkle Street, East Legon, Accra', category: 'Industry Enthusiast / Self-Taught Creative',
    discipline: 'Business Administration', unit: 'Business',
    institution: 'University of the People', country: 'USA', canCommit: true,
  },
  {
    slug: 'dora-addotey', sheet: 'Dora Addotey', name: 'Dora Naana Addotey', gender: 'Female',
    dob: '1988-04-13', email: 'naanaedwynns@gmail.com', phone: '+233205584840',
    address: 'AK-585-2309, Accra', category: 'Industry Enthusiast / Self-Taught Creative',
    discipline: 'Finance and Management', unit: 'School of Business',
    institution: 'Kwame Nkrumah University of Science and Technology', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'derrick-crowis', sheet: 'Derrick Crowis', name: 'Derrick Sena Crowis', gender: 'Male',
    dob: '1991-05-07', email: 'derrickcrowis@gmail.com', phone: '0599665033',
    address: '9 Afadi Nsuro St, GA-504-304, Accra', category: "Master's (Post Graduate)",
    discipline: 'Communication Strategist', unit: 'School of Communication and Media Studies',
    institution: 'University of Education, Winneba', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'sampson-klu', sheet: 'Sampson', name: 'Sampson Kofi Klu', gender: 'Male',
    dob: '2000-10-06', email: 'mr.sampsonklu@gmail.com', phone: '+233551519151',
    address: 'Akwei Odankwa Street, Accra', category: 'Recent Graduate',
    discipline: 'Management', unit: 'Management',
    institution: 'University of Gold Coast (Accra Business School)', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'rhemah-forkuo', sheet: 'Rhemah', name: 'Rhemah Forkuo', gender: 'Female',
    dob: null, email: 'missarjowahforkuorhemah@gmail.com', phone: '+233591900010',
    address: 'Anyaa-Ridge, Accra', category: "Master's (Post Graduate) / PhD candidate",
    discipline: 'International Relations', unit: 'Legon Centre for International Affairs and Diplomacy',
    institution: 'University of Ghana', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'kevin-kodjo', sheet: 'Kevin', name: 'Kevin Kodjo', gender: 'Male',
    dob: '1993-11-28', email: 'kevin.jacques.kodjo@gmail.com', phone: '+233546648833',
    address: "King Solomon's Height, Spintex Road, Accra", category: 'Industry Enthusiast / Self-Taught Creative',
    discipline: 'Graphic Design', unit: 'Marketing',
    institution: 'Mytibrands', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'freda-twum', sheet: 'Freda', name: 'Freda Asantewaa Twum', gender: 'Female',
    dob: '2001-05-19', email: 'evergreenasantewaa@gmail.com', phone: '+233243401732',
    address: 'P.O. Box 37, Assin Foso', category: "Master's (Post Graduate)",
    discipline: 'MA Brands and Communication Studies Management', unit: 'Department of Marketing, Faculty of Management Studies',
    institution: 'University of Professional Studies', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'theodora-amo-yartey', sheet: 'Theodora', name: 'Theodora Amo-Yartey', gender: 'Female',
    dob: '1998-04-16', email: 'theodorachase65@gmail.com', phone: '+233571971920',
    address: 'Chantan Street, Accra', category: "Master's (Post Graduate)",
    discipline: 'English / Telesales Marketing', unit: 'Department of English',
    institution: 'University of Ghana', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'isaac-dwamena', sheet: 'Isaac', name: 'Isaac Dwamena', gender: 'Male',
    dob: '2003-10-06', email: 'iadwamena2024@gmail.com', phone: '+233594050164',
    address: 'GE-167, Gbawe Road, Accra', category: 'Tertiary Student',
    discipline: 'BSc Administration (Marketing & Entrepreneurship)', unit: 'Department of Marketing and Entrepreneurship',
    institution: 'University of Ghana', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'nathaniel-nunoo', sheet: null, name: 'Nathaniel Nunoo', gender: 'Male',
    dob: '2005-08-24', email: 'nathan.nii.official@gmail.com', phone: '0246401422',
    address: 'Dansoman, Accra', category: 'Tertiary Student',
    discipline: 'Management Studies', unit: 'School of Business',
    institution: 'University of Cape Coast', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'janelle-gavu', sheet: 'Janelle', name: 'Janelle Mawuli Gavu', gender: 'Female',
    dob: '2002-05-31', email: 'gavu.janellesam@gmail.com', phone: '+233201603322',
    address: '43 Tei Tawiah Street, Odorkor, Accra', category: 'Recent Graduate',
    discipline: 'Advertising and Public Relations', unit: 'Communication Arts Department',
    institution: 'Academic City University', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'miracle-naza', sheet: null, name: 'Miracle Naza', gender: 'Female',
    dob: '1995-07-17', email: 'miraclenaza.mn@gmail.com', phone: '+233204804499',
    address: '25 Dela Avenue, Accra', category: 'Industry Enthusiast / Self-Taught Creative',
    discipline: 'Mass Communications Studies', unit: 'Relations',
    institution: 'Ghana Institute of Journalism', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'melvin-zoogah', sheet: null, name: 'Melvin Zoogah', gender: 'Male',
    dob: '2004-12-08', email: 'melvinzoogah@gmail.com', phone: '0542059020',
    address: 'Assakae, Takoradi', category: 'Tertiary Student',
    discipline: 'Digital Marketing and Creative Strategy', unit: 'KNUST School of Business',
    institution: 'Kwame Nkrumah University of Science and Technology', country: 'Ghana', canCommit: true,
  },
  {
    slug: 'willkings-avonor', sheet: 'Wilkings', name: 'Willkings Avonor', gender: 'Male',
    dob: '1997-01-05', email: 'avonorwillkings@gmail.com', phone: '0599429157',
    address: '9 Corn Street, Madina Estate, UPSA, Accra', category: 'Tertiary Student',
    discipline: 'Public Relations', unit: 'School of Communication Studies',
    institution: 'Wisconsin International University College', country: 'Ghana', canCommit: true,
  },
]

export const CRITERIA = [
  { key: 'cultural_fit', label: 'Personality & Cultural Fit', weight: 15 },
  { key: 'critical_thinking', label: 'Critical Thinking & Creativity', weight: 10 },
  { key: 'communication', label: 'Communication & Confidence', weight: 10 },
  { key: 'commitment', label: 'Commitment & Professionalism', weight: 10 },
  { key: 'appearance', label: 'Appearance & Presentation', weight: 5 },
]

export const PANELISTS = [
  'Ekow Thompson',
  'Ewuradjoa Aikins',
  'Phyllis Woode-Nartey',
  'Jason Nartey',
]
