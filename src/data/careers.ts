import type { CareerTrack, CertDef } from '../types';

// Career tracks. Salaries are annual, in start-year dollars, and are raised
// automatically with inflation plus merit raises during the game.
// To add a track: copy one, give it a new id, and adjust levels.
// minSkill/minMonths/certs are the requirements to be promoted INTO that level.

export const CAREERS: CareerTrack[] = [
  {
    id: 'software',
    name: 'Software Engineering',
    requiresDegree: true,
    blurb: 'High pay and fast growth. Skills matter more than titles; job-hopping can pay well.',
    match401k: 4,
    healthBenefits: true,
    layoffRisk: 1.3,
    levels: [
      { title: 'Junior Developer', salary: 78000, minSkill: 0, minMonths: 0 },
      { title: 'Software Developer', salary: 98000, minSkill: 35, minMonths: 18 },
      { title: 'Senior Developer', salary: 132000, minSkill: 55, minMonths: 24 },
      { title: 'Staff Engineer', salary: 168000, minSkill: 70, minMonths: 30, certs: ['cloud'] },
      { title: 'Principal Engineer', salary: 210000, minSkill: 82, minMonths: 36 },
      { title: 'Director of Engineering', salary: 255000, minSkill: 88, minMonths: 36, certs: ['leadership'] },
      { title: 'VP of Engineering', salary: 320000, minSkill: 94, minMonths: 48 },
    ],
  },
  {
    id: 'nursing',
    name: 'Nursing & Health Care',
    requiresDegree: true,
    blurb: 'Steady demand in any economy. Certifications unlock big pay jumps.',
    match401k: 4,
    healthBenefits: true,
    layoffRisk: 0.3,
    levels: [
      { title: 'Registered Nurse', salary: 70000, minSkill: 0, minMonths: 0 },
      { title: 'Registered Nurse II', salary: 80000, minSkill: 30, minMonths: 18 },
      { title: 'Charge Nurse', salary: 92000, minSkill: 50, minMonths: 24 },
      { title: 'Nurse Practitioner', salary: 125000, minSkill: 65, minMonths: 24, certs: ['np'] },
      { title: 'Nurse Manager', salary: 140000, minSkill: 78, minMonths: 36, certs: ['leadership'] },
      { title: 'Director of Nursing', salary: 170000, minSkill: 88, minMonths: 48 },
    ],
  },
  {
    id: 'finance',
    name: 'Accounting & Finance',
    requiresDegree: true,
    blurb: 'A clear ladder. Getting your CPA is the key that opens the upper levels.',
    match401k: 5,
    healthBenefits: true,
    layoffRisk: 0.8,
    levels: [
      { title: 'Staff Accountant', salary: 62000, minSkill: 0, minMonths: 0 },
      { title: 'Senior Accountant', salary: 78000, minSkill: 30, minMonths: 18 },
      { title: 'Accounting Manager', salary: 102000, minSkill: 50, minMonths: 24, certs: ['cpa'] },
      { title: 'Senior Manager', salary: 130000, minSkill: 65, minMonths: 30 },
      { title: 'Controller', salary: 165000, minSkill: 78, minMonths: 36, certs: ['leadership'] },
      { title: 'Chief Financial Officer', salary: 240000, minSkill: 90, minMonths: 48 },
    ],
  },
  {
    id: 'trades',
    name: 'Electrician (Skilled Trades)',
    requiresDegree: false,
    blurb: 'Earn while you learn, no degree needed. Licenses raise pay, and trades pair well with your own business.',
    match401k: 3,
    healthBenefits: true,
    layoffRisk: 0.9,
    levels: [
      { title: 'Apprentice Electrician', salary: 42000, minSkill: 0, minMonths: 0 },
      { title: 'Journeyman Electrician', salary: 64000, minSkill: 30, minMonths: 24, certs: ['journeyman'] },
      { title: 'Master Electrician', salary: 86000, minSkill: 55, minMonths: 30, certs: ['master-elec'] },
      { title: 'Foreman', salary: 100000, minSkill: 68, minMonths: 30 },
      { title: 'Project Manager', salary: 120000, minSkill: 80, minMonths: 36, certs: ['leadership'] },
      { title: 'Operations Director', salary: 150000, minSkill: 90, minMonths: 48 },
    ],
  },
  {
    id: 'sales',
    name: 'Sales & Marketing',
    requiresDegree: false,
    blurb: 'Pay follows performance. Great for people skills; the network you build carries over to business.',
    match401k: 3,
    healthBenefits: true,
    layoffRisk: 1.2,
    levels: [
      { title: 'Sales Associate', salary: 44000, minSkill: 0, minMonths: 0 },
      { title: 'Account Executive', salary: 62000, minSkill: 30, minMonths: 15 },
      { title: 'Senior Account Executive', salary: 85000, minSkill: 50, minMonths: 24 },
      { title: 'Sales Manager', salary: 110000, minSkill: 65, minMonths: 30, certs: ['leadership'] },
      { title: 'Regional Sales Director', salary: 145000, minSkill: 78, minMonths: 36 },
      { title: 'VP of Sales', salary: 195000, minSkill: 90, minMonths: 48, certs: ['mba'] },
    ],
  },
  {
    id: 'teaching',
    name: 'Teaching & Education',
    requiresDegree: true,
    blurb: 'Modest pay, very stable, good benefits and summers. Proof that a steady saver can still build real wealth.',
    match401k: 5,
    healthBenefits: true,
    layoffRisk: 0.2,
    levels: [
      { title: 'Teacher', salary: 50000, minSkill: 0, minMonths: 0 },
      { title: 'Experienced Teacher', salary: 58000, minSkill: 30, minMonths: 24 },
      { title: 'Lead Teacher', salary: 68000, minSkill: 50, minMonths: 30, certs: ['masters-ed'] },
      { title: 'Assistant Principal', salary: 88000, minSkill: 68, minMonths: 36, certs: ['leadership'] },
      { title: 'Principal', salary: 110000, minSkill: 80, minMonths: 48 },
    ],
  },
  {
    id: 'retail',
    name: 'Retail & Restaurant Management',
    requiresDegree: false,
    blurb: 'Start anywhere, climb fast with hard work. Running a store is great practice for running your own business.',
    match401k: 2,
    healthBenefits: false,
    layoffRisk: 1.1,
    levels: [
      { title: 'Crew Member', salary: 31000, minSkill: 0, minMonths: 0 },
      { title: 'Shift Lead', salary: 37000, minSkill: 20, minMonths: 9 },
      { title: 'Assistant Manager', salary: 47000, minSkill: 35, minMonths: 15 },
      { title: 'Store Manager', salary: 64000, minSkill: 52, minMonths: 24, certs: ['management'] },
      { title: 'District Manager', salary: 90000, minSkill: 70, minMonths: 36 },
      { title: 'Regional Vice President', salary: 130000, minSkill: 85, minMonths: 48, certs: ['leadership'] },
    ],
  },
];

export const CERTS: CertDef[] = [
  { id: 'cloud', name: 'Cloud Architecture Certification', track: 'software', cost: 1500, months: 4, minSkill: 45, skillBoost: 6, blurb: 'Needed for Staff Engineer.' },
  { id: 'np', name: 'Nurse Practitioner Program', track: 'nursing', cost: 28000, months: 24, minSkill: 45, skillBoost: 12, blurb: 'A big investment that lifts your pay by tens of thousands a year.' },
  { id: 'cpa', name: 'CPA License', track: 'finance', cost: 4000, months: 12, minSkill: 35, skillBoost: 10, blurb: 'The key credential for management in accounting.' },
  { id: 'journeyman', name: 'Journeyman License', track: 'trades', cost: 800, months: 6, minSkill: 20, skillBoost: 6, blurb: 'Required to work unsupervised.' },
  { id: 'master-elec', name: 'Master Electrician License', track: 'trades', cost: 1500, months: 9, minSkill: 45, skillBoost: 8, blurb: 'Lets you pull permits and run jobs.' },
  { id: 'masters-ed', name: "Master's in Education", track: 'teaching', cost: 18000, months: 24, minSkill: 35, skillBoost: 10, blurb: 'Moves you up the salary schedule.' },
  { id: 'management', name: 'Store Management Certificate', track: 'retail', cost: 600, months: 3, minSkill: 30, skillBoost: 5, blurb: 'Required to run a store.' },
  { id: 'leadership', name: 'Leadership Program', track: '*', cost: 3500, months: 6, minSkill: 55, skillBoost: 6, blurb: 'Required for senior management roles in every track.' },
  { id: 'mba', name: 'MBA (part-time)', track: '*', cost: 60000, months: 30, minSkill: 50, skillBoost: 14, blurb: 'Expensive. Pays off mostly in sales and business leadership.' },
  { id: 'public-speaking', name: 'Public Speaking Course', track: '*', cost: 400, months: 2, minSkill: 0, skillBoost: 3, blurb: 'Cheap, quick, and boosts your reputation too.' },
  { id: 'excel', name: 'Spreadsheet & Data Skills', track: '*', cost: 300, months: 2, minSkill: 0, skillBoost: 3, blurb: 'Useful in every job and for running a business.' },
];

/** Fictional employer names used when you change jobs. */
export const EMPLOYERS: Record<string, string[]> = {
  software: ['Brightloop Labs', 'Northwind Systems', 'Quantum Pear', 'Cobalt Cloud', 'Pixel Harbor', 'Atlas Data'],
  nursing: ['St. Mercy Hospital', 'Riverside Health', 'Valley Medical Center', 'Lakeshore Clinic', 'Summit Health'],
  finance: ['Granite & Co. CPAs', 'Bluebird Financial', 'Harbor Accounting', 'Keystone Partners', 'Ledgerline'],
  trades: ['Sparks Electric', 'Volt Brothers', 'Current Builders', 'Bright Wire Co.', 'Metro Electrical'],
  sales: ['Apex Supply', 'Horizon Media', 'Peak Solutions', 'Evergreen Brands', 'Signal Marketing'],
  teaching: ['Lincoln High School', 'Maple Elementary', 'Westside Academy', 'Oak Ridge Middle School'],
  retail: ['FreshMart', 'Burger Barn', 'Value Depot', 'Corner Cafe Group', 'Outfitters Plus'],
};

export const CAREER_BY_ID = Object.fromEntries(CAREERS.map((c) => [c.id, c])) as Record<string, CareerTrack>;
export const CERT_BY_ID = Object.fromEntries(CERTS.map((c) => [c.id, c])) as Record<string, CertDef>;
