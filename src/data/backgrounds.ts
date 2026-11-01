// Starting backgrounds double as difficulty levels.
// Money is in start-year dollars.

export interface Background {
  id: string;
  name: string;
  difficulty: 'easy' | 'normal' | 'hard';
  blurb: string;
  startAge: number;
  cash: number;
  hasDegree: boolean;
  studentLoan: number;
  creditCard: number;
  /** Starting skill in your chosen career. */
  skill: number;
  /** Starting career level (0 = entry level). */
  startLevel: number;
  lifestyle: 'frugal' | 'moderate' | 'comfortable' | 'lavish';
  housing: string;
  transport: string;
  /** Kids at start (ages in years). */
  kids: number[];
  married: boolean;
  spouseIncome: number;
  /** Event frequency multiplier for bad events. */
  badLuck: number;
}

export const BACKGROUNDS: Background[] = [
  {
    id: 'scholarship',
    name: 'Scholarship Graduate',
    difficulty: 'easy',
    blurb: 'Fresh degree, no student loans, a little savings, living at home for now. A gentle start.',
    startAge: 22,
    cash: 6000,
    hasDegree: true,
    studentLoan: 0,
    creditCard: 0,
    skill: 15,
    startLevel: 0,
    lifestyle: 'moderate',
    housing: 'family',
    transport: 'transit',
    kids: [],
    married: false,
    spouseIncome: 0,
    badLuck: 0.8,
  },
  {
    id: 'grad',
    name: 'Graduate with Student Loans',
    difficulty: 'normal',
    blurb: 'A degree and $38,000 of student debt. The most common starting point.',
    startAge: 22,
    cash: 2500,
    hasDegree: true,
    studentLoan: 38000,
    creditCard: 1500,
    skill: 12,
    startLevel: 0,
    lifestyle: 'moderate',
    housing: 'roommates',
    transport: 'used-car',
    kids: [],
    married: false,
    spouseIncome: 0,
    badLuck: 1,
  },
  {
    id: 'worker',
    name: 'Straight to Work',
    difficulty: 'normal',
    blurb: 'No degree and no student debt. Start in the trades, sales or retail and climb with certifications.',
    startAge: 19,
    cash: 1200,
    hasDegree: false,
    studentLoan: 0,
    creditCard: 2500,
    skill: 8,
    startLevel: 0,
    lifestyle: 'moderate',
    housing: 'family',
    transport: 'used-car',
    kids: [],
    married: false,
    spouseIncome: 0,
    badLuck: 1,
  },
  {
    id: 'late',
    name: 'Late Starter',
    difficulty: 'hard',
    blurb: 'Age 35, a single parent with a 7-year-old, $9,000 of credit card debt and almost no savings. Some work experience helps. Proof it is never too late.',
    startAge: 35,
    cash: 500,
    hasDegree: false,
    studentLoan: 0,
    creditCard: 9000,
    skill: 38,
    startLevel: 2,
    lifestyle: 'frugal',
    housing: 'apartment',
    transport: 'used-car',
    kids: [7],
    married: false,
    spouseIncome: 0,
    badLuck: 1.2,
  },
];

export const BACKGROUND_BY_ID = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b])) as Record<string, Background>;
