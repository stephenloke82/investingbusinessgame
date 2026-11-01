// Real-life budgeting data: housing, transport, lifestyle, family, insurance and taxes.
// All money is in start-year dollars; the engine scales it by inflation (CPI) each month.

export interface RentOption {
  id: string;
  label: string;
  rent: number;
  /** People it comfortably fits (you + spouse + kids). */
  fits: number;
  /** Monthly happiness effect while living here. */
  happiness: number;
  blurb: string;
}

export const RENT_OPTIONS: RentOption[] = [
  { id: 'family', label: 'Live with family', rent: 350, fits: 2, happiness: -6, blurb: 'Cheapest way to start. Great for building savings fast, less privacy.' },
  { id: 'roommates', label: 'Shared apartment', rent: 950, fits: 2, happiness: -2, blurb: 'Split rent with roommates.' },
  { id: 'apartment', label: '1-bed apartment', rent: 1650, fits: 2, happiness: 2, blurb: 'Your own place.' },
  { id: 'rental-house', label: '3-bed rental house', rent: 2500, fits: 5, happiness: 4, blurb: 'Room for a family, no maintenance bills.' },
  { id: 'luxury-apartment', label: 'Luxury apartment', rent: 3600, fits: 2, happiness: 6, blurb: 'Doorman, gym, view. Very expensive for what it is.' },
];

export interface HomeOption {
  id: string;
  label: string;
  price: number;
  fits: number;
  happiness: number;
  blurb: string;
}

export const HOME_OPTIONS: HomeOption[] = [
  { id: 'condo', label: 'Starter condo', price: 260000, fits: 3, happiness: 4, blurb: 'Build equity, low maintenance. HOA fees included in maintenance.' },
  { id: 'starter-home', label: 'Starter home', price: 360000, fits: 4, happiness: 6, blurb: 'A yard and room to grow.' },
  { id: 'family-home', label: 'Family home', price: 540000, fits: 6, happiness: 8, blurb: 'Space for a bigger family.' },
  { id: 'luxury-home', label: 'Luxury home', price: 1150000, fits: 7, happiness: 10, blurb: 'Beautiful, but taxes, insurance and upkeep scale with the price.' },
];

export const HOME_RULES = {
  minDownPct: 5,
  /** Private mortgage insurance, % of loan per year, if down payment < 20%. */
  pmiRate: 0.7,
  closingCostPct: 3,
  sellingCostPct: 6,
  propertyTaxPct: 1.1,
  /** Maintenance + home insurance, % of value per year. */
  upkeepPct: 1.4,
  /** Real (above inflation) home price growth per year, %. */
  realGrowthPct: 0.8,
  mortgageYears: 30,
};

export interface TransportOption {
  id: string;
  label: string;
  /** Purchase price (paid with cash or a car loan). 0 for none. */
  price: number;
  /** Gas, insurance, maintenance per month. */
  running: number;
  happiness: number;
  isCar: boolean;
  blurb: string;
}

export const TRANSPORT_OPTIONS: TransportOption[] = [
  { id: 'transit', label: 'Public transit / bike', price: 0, running: 110, happiness: -2, isCar: false, blurb: 'Cheapest by far. Less convenient.' },
  { id: 'used-car', label: 'Reliable used car', price: 14000, running: 380, happiness: 1, isCar: true, blurb: 'The best value for most people.' },
  { id: 'new-car', label: 'New car', price: 38000, running: 340, happiness: 3, isCar: true, blurb: 'Loses about 20% of its value the moment you drive away.' },
  { id: 'luxury-car', label: 'Luxury car', price: 72000, running: 520, happiness: 4, isCar: true, blurb: 'Feels great for a few months. Costs a fortune for years.' },
];

export const CAR_LOAN = { rate: 0.075, months: 60 };

export interface LifestyleOption {
  id: 'frugal' | 'moderate' | 'comfortable' | 'lavish';
  label: string;
  food: number;
  fun: number;
  /** Extra spending (travel, clothes, gifts, gadgets) as a share of after-tax income: lifestyle grows with income. */
  incomeShare: number;
  happiness: number;
  blurb: string;
}

export const LIFESTYLE_OPTIONS: LifestyleOption[] = [
  { id: 'frugal', label: 'Frugal', food: 380, fun: 150, incomeShare: 0.04, happiness: -4, blurb: 'Cook at home, free fun. Maximum saving.' },
  { id: 'moderate', label: 'Moderate', food: 550, fun: 300, incomeShare: 0.15, happiness: 0, blurb: 'A balanced life. Eating out sometimes.' },
  { id: 'comfortable', label: 'Comfortable', food: 800, fun: 600, incomeShare: 0.25, happiness: 3, blurb: 'Nice dinners, regular trips.' },
  { id: 'lavish', label: 'Lavish', food: 1200, fun: 1500, incomeShare: 0.4, happiness: 5, blurb: 'Only a little happier than comfortable, at three times the cost.' },
];

export const FAMILY_COSTS = {
  /** Extra food/fun for a spouse as a fraction of your own. */
  spouseShare: 0.8,
  /** Monthly cost per child under 5 (childcare, diapers...). */
  childUnder5: 1250,
  /** Monthly cost per child aged 5-17. */
  child5to17: 750,
  pet: 110,
  /** Base utilities + phone/internet, plus per extra person. */
  utilitiesBase: 330,
  utilitiesPerPerson: 45,
  /** Clothing, toiletries, household supplies, out-of-pocket medical, per person per month. */
  personalPerPerson: 180,
};

export interface InsuranceOption {
  id: 'health' | 'renters' | 'disability' | 'life' | 'umbrella';
  label: string;
  monthly: number;
  blurb: string;
}

export const INSURANCE_OPTIONS: InsuranceOption[] = [
  { id: 'health', label: 'Health insurance', monthly: 480, blurb: 'Covers ~80% of medical bills. Much cheaper (about $150) when your employer provides it.' },
  { id: 'renters', label: "Renter's insurance", monthly: 18, blurb: 'Cheap protection for your belongings. Homeowners insurance is included in home upkeep.' },
  { id: 'disability', label: 'Disability insurance', monthly: 60, blurb: 'Pays 60% of your salary if illness or injury stops you working.' },
  { id: 'life', label: 'Term life insurance', monthly: 35, blurb: 'Protects your family if something happens to you. Important once you have kids.' },
  { id: 'umbrella', label: 'Umbrella liability', monthly: 30, blurb: 'Extra liability protection for lawsuits. Useful for business owners.' },
];

export const EMPLOYER_HEALTH_PREMIUM = 150;
export const HEALTH_DEPENDENT_EXTRA = 300;
export const INSURED_MEDICAL_SHARE = 0.2;

// Simplified US-style taxes (approximate, for teaching only).
export const TAX = {
  /** Brackets for a single filer: [upper limit, rate]. Married filers get double the limits. */
  brackets: [
    [11900, 0.1],
    [48500, 0.12],
    [103400, 0.22],
    [197300, 0.24],
    [250500, 0.32],
    [626400, 0.35],
    [Infinity, 0.37],
  ] as [number, number][],
  standardDeduction: 15000,
  /** Flat state income tax rate. */
  stateRate: 0.04,
  /** Payroll (Social Security + Medicare) on wages and business draws. */
  payrollRate: 0.0765,
  payrollWageCap: 176100,
  longTermGainsRate: 0.15,
  qualifiedDividendRate: 0.15,
  /** Early withdrawal penalty from retirement accounts before 59.5. */
  earlyWithdrawalPenalty: 0.1,
};

export const RETIREMENT_LIMITS = {
  k401: 23500,
  roth: 7000,
};

export const CREDIT = {
  rate: 0.24,
  /** Minimum payment as a fraction of balance. */
  minPaymentPct: 0.03,
  minPaymentFloor: 35,
  /** Credit limit in start-year dollars, plus a share of annual income. */
  baseLimit: 4000,
  limitIncomeShare: 0.2,
  /** Rate on a hardship loan the game uses when your cards are maxed out. */
  hardshipRate: 0.18,
};
