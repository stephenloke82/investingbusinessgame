// =============================================================================
// GAME EVENTS — edit freely!
// =============================================================================
//
// Each month the engine draws one event the player is eligible for and asks
// them to choose. To add an event, copy an existing one and change it.
//
// Fields (see GameEventDef / EventEffect in src/types.ts for the full list):
//   id         unique string (never reuse; saves remember which events happened)
//   category   'life' | 'family' | 'career' | 'business' | 'market' | 'money' | 'health'
//   title/text what the player sees. Placeholders: {name} {employer} {ticker}
//              {company} {business} {spouse} {amount}
//   conditions when the event can appear (age, employed, hasBusiness, regime...)
//   weight     relative chance of being drawn (default 1)
//   major      true = pauses fast-forward so the player decides themselves
//   once       true = can only happen once per game
//   cooldown   months before the same event can show up again
//   needsTicker 'held' (a stock the player owns) or 'any' (fills {ticker}/{company})
//   lesson     the guide's teaching note shown with the event
//   choices    2-4 options. Exactly ONE choice must have `auto: true`: that is
//              the sensible default used during fast-forward/autopilot.
//              At least one choice must have no `requiresCash`, so a broke
//              player is never stuck.
//
// Money: every amount (cash, creditDebt, bizCash, requiresCash) is written in
// START-YEAR dollars. The engine scales it by inflation automatically.
// `cashIncomeMonths: -1` means "costs one month of your gross income".
//
// Medical costs are written at the UNINSURED scale; the engine reduces them
// automatically when the player has health insurance.
//
// Market events never decide what the market does next: trade choices only
// buy or sell, and the seeded simulation determines the outcome.
// =============================================================================

import type { GameEventDef } from '../types';

export const EVENTS: GameEventDef[] = [
  // ---------------------------------------------------------------------------
  // CAREER
  // ---------------------------------------------------------------------------
  {
    id: 'career_stretch_project',
    category: 'career',
    title: 'A stretch project',
    text: 'Your manager at {employer} asks if you want to lead a high-visibility project. It is a step up from your usual work.',
    conditions: { employed: true },
    cooldown: 18,
    choices: [
      {
        label: 'Take it on',
        hint: 'Risky but great for your career',
        auto: true,
        effect: {
          stress: 6,
          chance: {
            p: 0.65,
            success: { performance: 12, skill: 2, reputation: 6 },
            fail: { performance: -6, stress: 6 },
            successText: 'The project shipped on time. Leadership noticed your name.',
            failText: 'The project stumbled. You learned a lot, but it was a rough quarter.',
          },
        },
      },
      {
        label: 'Politely decline',
        hint: 'Keep your current workload',
        effect: { performance: -2, result: 'Someone else took the project. Maybe next time.' },
      },
    ],
    lesson: 'Your career is your biggest wealth-building engine early on. Taking smart risks at work often pays far more than any stock tip.',
  },
  {
    id: 'career_recruiter_offer',
    category: 'career',
    title: 'A recruiter calls',
    text: 'A recruiter has a role at a competitor that pays about {amount} more per year than you earn now.',
    conditions: { employed: true, minMonth: 12 },
    major: true,
    cooldown: 30,
    weight: 0.8,
    choices: [
      {
        label: 'Take the new job',
        hint: '+15% salary, new employer',
        effect: { action: 'jobOffer', salaryPct: 15, stress: 5, result: 'You signed the offer and started a new chapter.' },
      },
      {
        label: 'Use it to negotiate a raise',
        hint: 'Might work, might sour things',
        effect: {
          chance: {
            p: 0.55,
            success: { salaryPct: 8 },
            fail: { performance: -4, reputation: -2 },
            successText: 'Your employer matched part of the offer. Raise secured!',
            failText: 'Your boss did not budge and seems a little annoyed.',
          },
        },
      },
      {
        label: 'Stay where you are',
        auto: true,
        effect: { result: 'You decided to stay. Loyalty has its comforts.' },
      },
    ],
    lesson: 'Changing jobs is one of the fastest ways to raise your income. Every extra dollar you earn and invest compounds for decades.',
  },
  {
    id: 'career_layoff_recession',
    category: 'career',
    title: 'Layoffs announced',
    text: 'The economy is struggling and {employer} is cutting jobs. Your position has been eliminated.',
    conditions: { employed: true, regime: ['bear', 'crash'] },
    major: true,
    weight: 1.6,
    cooldown: 36,
    choices: [
      {
        label: 'Start job hunting right away',
        auto: true,
        effect: { action: 'layoff', stress: 15, reputation: 2, result: 'You updated your resume and started reaching out to your network.' },
      },
      {
        label: 'Take a month to recharge first',
        effect: { action: 'layoff', stress: 8, happiness: 4, result: 'You took a short break before the search.' },
      },
    ],
    lesson: 'This is exactly why an emergency fund matters: 3-6 months of expenses in cash lets you job hunt without selling investments at a bad time.',
  },
  {
    id: 'career_layoff_rare',
    category: 'career',
    title: 'Restructuring',
    text: '{employer} is restructuring and your team is being dissolved. You will receive a small severance.',
    conditions: { employed: true, regime: ['normal', 'bull', 'recovery'] },
    major: true,
    weight: 0.25,
    cooldown: 60,
    choices: [
      {
        label: 'Accept severance and job hunt',
        auto: true,
        effect: { action: 'layoff', cashIncomeMonths: 1, stress: 12, result: 'You received one month of pay as severance.' },
      },
      {
        label: 'Negotiate a bigger package',
        effect: {
          action: 'layoff',
          stress: 14,
          chance: {
            p: 0.5,
            success: { cashIncomeMonths: 3 },
            fail: { cashIncomeMonths: 1 },
            successText: 'HR agreed to three months of severance.',
            failText: 'HR held firm at one month of severance.',
          },
        },
      },
    ],
    lesson: 'Layoffs can happen even in good times. Cash savings plus a strong network are your safety net.',
  },
  {
    id: 'career_conference',
    category: 'career',
    title: 'Industry conference',
    text: 'There is a big industry conference next month. Your employer will not pay, but the networking could be valuable.',
    conditions: { employed: true },
    cooldown: 24,
    choices: [
      {
        label: 'Go (costs $1,200)',
        requiresCash: 1200,
        effect: { cash: -1200, reputation: 8, skill: 2, stress: 2, result: 'You came home with new contacts and fresh ideas.' },
      },
      {
        label: 'Watch the free livestream',
        auto: true,
        effect: { skill: 1, result: 'You picked up a few tips from the recordings.' },
      },
    ],
    lesson: 'Investing in yourself (skills, network) often has the highest return of any investment you will make.',
  },
  {
    id: 'career_mentor',
    category: 'career',
    title: 'A potential mentor',
    text: 'A senior leader at {employer} offers to meet with you monthly as a mentor.',
    conditions: { employed: true },
    once: true,
    choices: [
      {
        label: 'Gladly accept',
        auto: true,
        effect: { skill: 2, reputation: 6, performance: 4, stress: 1, result: 'Your mentor helped you see the bigger picture.' },
      },
      {
        label: 'Too busy right now',
        effect: { stress: -1, result: 'You passed on the offer.' },
      },
    ],
    lesson: 'Mentors accelerate careers. Ask good questions and you will get promoted faster.',
  },
  {
    id: 'career_overtime',
    category: 'career',
    title: 'Overtime available',
    text: 'A big deadline is looming and {employer} is offering paid overtime for the next month.',
    conditions: { employed: true },
    cooldown: 12,
    choices: [
      {
        label: 'Work the overtime',
        hint: '+extra pay, +stress',
        effect: { cashIncomeMonths: 0.3, stress: 8, performance: 4, result: 'Your paycheck got a nice bump.' },
      },
      {
        label: 'Keep normal hours',
        auto: true,
        effect: { result: 'You protected your evenings.' },
      },
    ],
    lesson: 'Extra income is great when it goes straight to savings or investments. Just watch your stress levels.',
  },
  {
    id: 'career_office_politics',
    category: 'career',
    title: 'Office politics',
    text: 'A coworker took credit for your work in a team meeting.',
    conditions: { employed: true },
    cooldown: 30,
    choices: [
      {
        label: 'Calmly set the record straight with your manager',
        auto: true,
        effect: {
          chance: {
            p: 0.7,
            success: { performance: 5, reputation: 2 },
            fail: { stress: 5, reputation: -2 },
            successText: 'Your manager appreciated the clear, professional update.',
            failText: 'It came across as petty. Ouch.',
          },
        },
      },
      {
        label: 'Let it go',
        effect: { stress: 4, performance: -2, result: 'You let it slide, but it still bugs you.' },
      },
      {
        label: 'Confront them publicly',
        effect: { stress: 6, reputation: -5, result: 'The confrontation made everyone uncomfortable.' },
      },
    ],
  },
  {
    id: 'career_burnout',
    category: 'career',
    title: 'Burnout warning',
    text: 'You are exhausted. You have been snapping at people and sleeping badly.',
    conditions: { minStress: 70 },
    cooldown: 12,
    weight: 1.5,
    choices: [
      {
        label: 'Take a week of vacation',
        auto: true,
        effect: { cash: -600, stress: -20, happiness: 8, result: 'A week away did wonders.' },
      },
      {
        label: 'Push through',
        effect: { stress: 6, health: -6, performance: -5, result: 'You pushed through, but it is taking a toll.' },
      },
      {
        label: 'See a therapist (sessions $150 each)',
        effect: { cash: -600, stress: -15, health: 4, happiness: 4, result: 'Talking it through helped more than you expected.' },
      },
    ],
    lesson: 'Wealth is supposed to reduce stress, not create it. A simple plan, automatic index investing, and rest keep you in the game for the long run.',
  },
  {
    id: 'career_training_budget',
    category: 'career',
    title: 'Training budget',
    text: '{employer} has unused training budget and offers to pay for an online course.',
    conditions: { employed: true },
    cooldown: 24,
    choices: [
      {
        label: 'Take the course (evenings for a month)',
        auto: true,
        effect: { skill: 2, stress: 3, result: 'Free education! Your skills improved.' },
      },
      {
        label: 'Skip it',
        effect: { result: 'You left the budget on the table.' },
      },
    ],
    lesson: 'Free employer benefits (training, 401(k) match, health insurance) are part of your pay. Use them.',
  },
  {
    id: 'career_award',
    category: 'career',
    title: 'Employee of the quarter',
    text: 'Your hard work got noticed. You are named employee of the quarter with a cash bonus.',
    conditions: { employed: true, minPerformance: 75 },
    cooldown: 24,
    choices: [
      {
        label: 'Invest the bonus in the S&P 500 fund',
        auto: true,
        effect: { cashIncomeMonths: 0.5, reputation: 4, happiness: 3, action: 'buySymbol', symbol: 'SPY', pct: 10, result: 'Bonus banked and part of your cash went to work in the index fund.' },
      },
      {
        label: 'Celebrate with a nice trip',
        effect: { cashIncomeMonths: 0.5, cash: -1500, reputation: 4, happiness: 8, stress: -6, result: 'You enjoyed a well-earned getaway.' },
      },
    ],
    lesson: 'Windfalls are a great chance to invest. Even investing half and enjoying half is a solid balance.',
  },
  {
    id: 'career_promotion_offer',
    category: 'career',
    title: 'Promotion on the table',
    text: 'Your manager says you are ready for the next level at {employer}. It comes with more pay and more responsibility.',
    conditions: { employed: true, minPerformance: 70 },
    major: true,
    cooldown: 18,
    weight: 1.2,
    choices: [
      {
        label: 'Accept the promotion',
        auto: true,
        effect: { action: 'promote', stress: 4, happiness: 5, result: 'Congratulations on your promotion!' },
      },
      {
        label: 'Not yet, I want balance',
        effect: { stress: -3, result: 'You chose to stay in your current role for now.' },
      },
    ],
    lesson: 'A raise is the start of a wealth plan: when your pay goes up, increase your automatic investing before your lifestyle catches up.',
  },
  {
    id: 'career_night_school',
    category: 'career',
    title: 'Night school',
    text: 'A local university offers an evening degree program. It would open doors to higher-paying careers.',
    conditions: { notFlag: 'degree', maxAge: 50 },
    cooldown: 36,
    choices: [
      {
        label: 'Enroll',
        hint: 'Takes time and money; unlocks new tracks',
        effect: { action: 'startDegree', stress: 8, setFlag: 'degree', result: 'You enrolled. Long nights ahead!' },
      },
      {
        label: 'Not right now',
        auto: true,
        effect: { result: 'Maybe another year.' },
      },
    ],
    lesson: 'Education can raise lifetime earnings a lot, but avoid borrowing more than the degree will realistically pay back.',
  },
  {
    id: 'career_side_gig',
    category: 'career',
    title: 'Freelance side gig',
    text: 'A friend needs help on a freelance project for a few weekends. They offer $2,000.',
    conditions: { minSkill: 30 },
    cooldown: 12,
    choices: [
      {
        label: 'Take it',
        auto: true,
        effect: { cash: 2000, stress: 6, skill: 2, result: 'Extra $2,000 earned.' },
      },
      {
        label: 'Pass, keep weekends free',
        effect: { happiness: 2, result: 'You enjoyed your weekends.' },
      },
    ],
    lesson: 'Side income that goes straight into investments can shave years off your path to financial independence.',
  },
  {
    id: 'career_bad_review',
    category: 'career',
    title: 'Tough performance review',
    text: 'Your annual review was harsher than expected. Your manager says you need to step it up.',
    conditions: { employed: true },
    cooldown: 24,
    weight: 0.7,
    choices: [
      {
        label: 'Ask for a clear improvement plan',
        auto: true,
        effect: { performance: 6, stress: 4, result: 'You agreed on concrete goals. You know what to fix.' },
      },
      {
        label: 'Get defensive',
        effect: { performance: -6, reputation: -3, stress: 5, result: 'The conversation went badly.' },
      },
    ],
    lesson: 'Feedback is free coaching. Getting better at work raises your income, which is the fuel for investing.',
  },
  {
    id: 'career_relocation',
    category: 'career',
    title: 'Relocation offer',
    text: '{employer} offers you a role in another city with a 12% raise. Moving would be a hassle.',
    conditions: { employed: true, minMonth: 24 },
    cooldown: 60,
    weight: 0.6,
    choices: [
      {
        label: 'Relocate',
        effect: { salaryPct: 12, cash: -3000, stress: 10, happiness: -3, reputation: 3, result: 'New city, bigger paycheck.' },
      },
      {
        label: 'Stay put',
        auto: true,
        effect: { result: 'You stayed close to friends and family.' },
      },
    ],
  },
  {
    id: 'career_certification_push',
    category: 'career',
    title: 'Certification bonus',
    text: 'HR announces that anyone who earns an industry certification this year gets a pay bump.',
    conditions: { employed: true },
    cooldown: 36,
    choices: [
      {
        label: 'Study hard on weekends',
        auto: true,
        effect: {
          stress: 6,
          chance: {
            p: 0.6,
            success: { skill: 4, salaryPct: 4 },
            fail: { skill: 2 },
            successText: 'You passed! Enjoy the raise.',
            failText: 'You did not pass this time, but you learned a lot.',
          },
        },
      },
      {
        label: 'Not this year',
        effect: { result: 'You skipped the program.' },
      },
    ],
    lesson: 'Certifications are often a cheap, fast way to qualify for promotions. Check the Career tab for options.',
  },
  {
    id: 'career_wfh',
    category: 'career',
    title: 'Remote work option',
    text: '{employer} now allows remote work a few days a week. You could save on commuting.',
    conditions: { employed: true },
    once: true,
    choices: [
      {
        label: 'Go hybrid',
        auto: true,
        effect: { stress: -5, happiness: 4, cash: 300, result: 'Less commuting, more sleep, a little more money.' },
      },
      {
        label: 'Stay in the office for visibility',
        effect: { reputation: 3, performance: 2, result: 'You kept your face time with leadership.' },
      },
    ],
  },
  {
    id: 'career_job_hunt_lead',
    category: 'career',
    title: 'A promising lead',
    text: 'A former colleague says their company is hiring and could refer you.',
    conditions: { employed: false },
    cooldown: 6,
    weight: 1.5,
    choices: [
      {
        label: 'Ask for the referral',
        auto: true,
        effect: {
          stress: 2,
          chance: {
            p: 0.6,
            success: { action: 'jobOffer', salaryPct: 0 },
            fail: { stress: 4 },
            successText: 'The referral worked. You have a new job!',
            failText: 'They went with another candidate. Keep going.',
          },
        },
      },
      {
        label: 'Wait for something better',
        effect: { stress: 3, result: 'You kept searching on your own.' },
      },
    ],
    lesson: 'Your network is a financial asset. Most good jobs are found through people you know.',
  },

  // ---------------------------------------------------------------------------
  // BUSINESS
  // ---------------------------------------------------------------------------
  {
    id: 'biz_viral_review',
    category: 'business',
    title: 'You went viral!',
    text: 'A popular local influencer raved about {business}. Customers are lining up.',
    conditions: { hasBusiness: true },
    cooldown: 24,
    choices: [
      {
        label: 'Ride the wave',
        auto: true,
        effect: { bizBoost: { mult: 1.35, months: 4 }, bizReputation: 6, stress: 3, result: 'Business is booming for the next few months.' },
      },
      {
        label: 'Run a promo to convert new fans ($2,000)',
        requiresCash: 2000,
        effect: { cash: -2000, bizBoost: { mult: 1.45, months: 6 }, bizReputation: 8, result: 'The promo turned visitors into regulars.' },
      },
    ],
    lesson: 'Good reviews compound like interest: happy customers bring more customers.',
  },
  {
    id: 'biz_bad_review',
    category: 'business',
    title: 'A scathing review',
    text: 'An angry customer posted a one-star review of {business} that is getting attention.',
    conditions: { hasBusiness: true },
    cooldown: 18,
    choices: [
      {
        label: 'Respond publicly and make it right',
        auto: true,
        effect: { bizCash: -300, bizReputation: 2, result: 'Your gracious reply won people over.' },
      },
      {
        label: 'Ignore it',
        effect: { bizReputation: -6, bizBoost: { mult: 0.9, months: 3 }, result: 'The review kept circulating.' },
      },
      {
        label: 'Argue back online',
        effect: { bizReputation: -10, stress: 5, bizBoost: { mult: 0.85, months: 3 }, result: 'The argument made things worse.' },
      },
    ],
    lesson: 'Reputation is a business asset. Protect it like you would protect your savings.',
  },
  {
    id: 'biz_supplier_hike',
    category: 'business',
    title: 'Supplier raises prices',
    text: 'Your main supplier is raising prices for {business} by 15%.',
    conditions: { hasBusiness: true },
    cooldown: 24,
    choices: [
      {
        label: 'Shop around for a new supplier',
        auto: true,
        effect: {
          stress: 4,
          chance: {
            p: 0.6,
            success: { bizCash: 1500 },
            fail: { bizCash: -1500, bizReputation: -2 },
            successText: 'You found a better deal and saved money.',
            failText: 'The new supplier was unreliable. It cost you.',
          },
        },
      },
      {
        label: 'Absorb the cost',
        effect: { bizCash: -2500, result: 'Margins took a hit this quarter.' },
      },
      {
        label: 'Raise your own prices',
        effect: { bizReputation: -3, result: 'Some customers grumbled but most stayed.' },
      },
    ],
  },
  {
    id: 'biz_employee_quits',
    category: 'business',
    title: 'Key employee quits',
    text: 'Your best employee at {business} got an offer elsewhere and is leaving unless you match it.',
    conditions: { hasBusiness: true },
    cooldown: 18,
    choices: [
      {
        label: 'Match the offer ($6,000/year more)',
        auto: true,
        effect: { bizCash: -3000, bizReputation: 2, result: 'They stayed, and the team noticed you value people.' },
      },
      {
        label: 'Let them go and hire fresh',
        effect: { bizReputation: -5, stress: 6, bizBoost: { mult: 0.9, months: 3 }, result: 'Training the replacement took time.' },
      },
    ],
    lesson: 'Great people are the core of a growing business. Underpaying them often costs more than it saves.',
  },
  {
    id: 'biz_lawsuit',
    category: 'business',
    title: 'Lawsuit threat',
    text: 'A customer claims they were injured at {business} and is threatening to sue.',
    conditions: { hasBusiness: true },
    major: true,
    cooldown: 48,
    weight: 0.5,
    choices: [
      {
        label: 'Settle quickly ($8,000)',
        auto: true,
        effect: { bizCash: -8000, stress: 4, result: 'The matter was settled quietly.' },
      },
      {
        label: 'Fight it in court',
        effect: { action: 'bizLawsuit', stress: 12, result: 'You lawyered up.' },
      },
    ],
    lesson: 'Business and umbrella insurance exist for moments like this. One lawsuit can wipe out years of profit.',
  },
  {
    id: 'biz_expansion',
    category: 'business',
    title: 'Prime location available',
    text: 'A great storefront opened up in a busy area. The landlord offers a discount if you sign fast.',
    conditions: { hasBusiness: true, minMonth: 6 },
    cooldown: 24,
    choices: [
      {
        label: 'Open a new location (discounted)',
        requiresCash: 10000,
        effect: { action: 'bizExpand', stress: 8, result: 'Your empire grows by one more location!' },
      },
      {
        label: 'Not yet',
        auto: true,
        effect: { result: 'You passed. Growing too fast can sink a business.' },
      },
    ],
    lesson: 'Expand when the existing locations are reliably profitable and you have cash set aside. Growth funded by debt is risky.',
  },
  {
    id: 'biz_buyout',
    category: 'business',
    title: 'Buyout offer',
    text: 'A larger company wants to buy {business}. Their offer is around what the business is worth.',
    conditions: { hasBusiness: true, minMonth: 24 },
    major: true,
    cooldown: 48,
    weight: 0.4,
    choices: [
      {
        label: 'Sell the business',
        effect: { action: 'sellBusiness', happiness: 5, result: 'You sold the business. Time to put that cash to work.' },
      },
      {
        label: 'Keep building',
        auto: true,
        effect: { result: 'You turned down the offer. You believe in what you are building.' },
      },
    ],
    lesson: 'Selling a business turns illiquid value into cash. Many owners then invest the proceeds in broad index funds for steady, low-stress growth.',
  },
  {
    id: 'biz_equipment_breaks',
    category: 'business',
    title: 'Equipment failure',
    text: 'A critical piece of equipment at {business} broke down.',
    conditions: { hasBusiness: true },
    cooldown: 12,
    choices: [
      {
        label: 'Replace it with new equipment',
        auto: true,
        effect: { bizCash: -4000, bizReputation: 1, result: 'Shiny new equipment, back in business.' },
      },
      {
        label: 'Patch it up cheaply',
        effect: {
          bizCash: -800,
          chance: {
            p: 0.5,
            success: {},
            fail: { bizCash: -3000, bizBoost: { mult: 0.85, months: 2 } },
            successText: 'The repair held up.',
            failText: 'It broke again during the busiest week. Expensive lesson.',
          },
        },
      },
    ],
    lesson: 'Keep a cash buffer in the business, just like your personal emergency fund.',
  },
  {
    id: 'biz_inspection',
    category: 'business',
    title: 'Surprise inspection',
    text: 'A regulator shows up unannounced at {business}.',
    conditions: { hasBusiness: true },
    cooldown: 24,
    choices: [
      {
        label: 'Welcome them in',
        auto: true,
        effect: {
          chance: {
            p: 0.75,
            success: { bizReputation: 3 },
            fail: { bizCash: -2000, bizReputation: -4, stress: 4 },
            successText: 'You passed with flying colors.',
            failText: 'A few violations meant a fine and some bad press.',
          },
        },
      },
      {
        label: 'Pay a consultant to prep for next time ($1,500)',
        requiresCash: 1500,
        effect: { cash: -1500, bizReputation: 4, result: 'Your processes are now airtight.' },
      },
    ],
  },
  {
    id: 'biz_seasonal_rush',
    category: 'business',
    title: 'Seasonal rush',
    text: 'The busy season is starting and demand at {business} is climbing.',
    conditions: { hasBusiness: true },
    cooldown: 12,
    choices: [
      {
        label: 'Hire temporary help',
        auto: true,
        effect: { bizCash: -2000, bizBoost: { mult: 1.25, months: 2 }, result: 'Extra hands helped you capture the rush.' },
      },
      {
        label: 'Make do with current staff',
        effect: { stress: 6, bizBoost: { mult: 1.08, months: 2 }, bizReputation: -2, result: 'You got through it, barely.' },
      },
    ],
  },
  {
    id: 'biz_competitor',
    category: 'business',
    title: 'Competitor opens nearby',
    text: 'A well-funded competitor just opened down the street from {business}.',
    conditions: { hasBusiness: true },
    cooldown: 30,
    choices: [
      {
        label: 'Double down on quality',
        auto: true,
        effect: { bizCash: -3000, bizReputation: 5, bizBoost: { mult: 0.95, months: 3 }, result: 'Loyal customers stayed for the quality.' },
      },
      {
        label: 'Start a price war',
        effect: { bizBoost: { mult: 0.85, months: 6 }, stress: 6, result: 'Margins shrank for everyone.' },
      },
      {
        label: 'Do nothing',
        effect: { bizBoost: { mult: 0.85, months: 4 }, result: 'You lost some customers to the new shop.' },
      },
    ],
    lesson: 'Competition is constant in business. A strong brand is a moat.',
  },
  {
    id: 'biz_partnership',
    category: 'business',
    title: 'Partnership offer',
    text: 'A complementary local business proposes a cross-promotion partnership with {business}.',
    conditions: { hasBusiness: true },
    cooldown: 30,
    choices: [
      {
        label: 'Partner up',
        auto: true,
        effect: {
          chance: {
            p: 0.65,
            success: { bizBoost: { mult: 1.2, months: 6 }, bizReputation: 3 },
            fail: { bizReputation: -2 },
            successText: 'The partnership brought in a steady stream of new customers.',
            failText: 'The partnership fizzled out.',
          },
        },
      },
      {
        label: 'Decline',
        effect: { result: 'You kept doing your own thing.' },
      },
    ],
  },
  {
    id: 'biz_hire_manager',
    category: 'business',
    title: 'Hire a manager?',
    text: 'You are stretched thin running {business}. An experienced manager is looking for work.',
    conditions: { hasBusiness: true, minMonth: 6 },
    cooldown: 36,
    choices: [
      {
        label: 'Hire them',
        auto: true,
        effect: { bizCash: -4000, stress: -10, bizReputation: 3, result: 'Delegating freed up your time and energy.' },
      },
      {
        label: 'Keep doing it yourself',
        effect: { stress: 5, result: 'You saved money but your evenings disappeared.' },
      },
    ],
    lesson: 'A business that depends entirely on you is a job. A business with good systems and people is an asset.',
  },
  {
    id: 'biz_tax_audit',
    category: 'business',
    title: 'Tax audit',
    text: 'The tax authority has selected {business} for an audit.',
    conditions: { hasBusiness: true },
    cooldown: 60,
    weight: 0.5,
    choices: [
      {
        label: 'Hire an accountant ($2,000)',
        auto: true,
        effect: { cash: -2000, stress: 2, result: 'Your accountant handled everything cleanly.' },
      },
      {
        label: 'Handle it yourself',
        effect: {
          stress: 10,
          chance: {
            p: 0.5,
            success: {},
            fail: { bizCash: -5000 },
            successText: 'Your records were in order. No penalty.',
            failText: 'You missed some deductions and paid penalties.',
          },
        },
      },
    ],
    lesson: 'Good bookkeeping is boring and priceless.',
  },
  {
    id: 'biz_big_contract',
    category: 'business',
    title: 'Big corporate order',
    text: 'A large company wants to place a big recurring order with {business}, but they want a 20% discount.',
    conditions: { hasBusiness: true },
    cooldown: 24,
    choices: [
      {
        label: 'Accept the deal',
        auto: true,
        effect: { bizBoost: { mult: 1.2, months: 6 }, stress: 4, result: 'Steady volume, thinner margins.' },
      },
      {
        label: 'Negotiate harder',
        effect: {
          chance: {
            p: 0.5,
            success: { bizBoost: { mult: 1.25, months: 6 } },
            fail: {},
            successText: 'They agreed to a 10% discount instead.',
            failText: 'They walked away.',
          },
        },
      },
      {
        label: 'Decline',
        effect: { result: 'You kept your pricing intact.' },
      },
    ],
  },
  {
    id: 'biz_tech_upgrade',
    category: 'business',
    title: 'Software upgrade',
    text: 'A new booking and payments system could make {business} run smoother.',
    conditions: { hasBusiness: true },
    cooldown: 36,
    choices: [
      {
        label: 'Upgrade ($3,000)',
        requiresCash: 3000,
        effect: { cash: -3000, bizReputation: 4, stress: -3, result: 'Fewer headaches, happier customers.' },
      },
      {
        label: 'Stick with the old system',
        auto: true,
        effect: { result: 'The old system still works... mostly.' },
      },
    ],
  },
  {
    id: 'biz_loan_offer',
    category: 'business',
    title: 'Easy business loan',
    text: 'A lender offers {business} a $25,000 line of credit at 18% interest, "no questions asked".',
    conditions: { hasBusiness: true },
    cooldown: 36,
    choices: [
      {
        label: 'Decline',
        auto: true,
        effect: { result: 'You passed on expensive debt.' },
      },
      {
        label: 'Take it for growth',
        effect: { bizCash: 25000, creditDebt: 25000, stress: 8, result: 'Cash in hand, but a big bill attached.' },
      },
    ],
    lesson: 'Borrowing at 18% means your business must earn more than 18% on that money just to break even. That is a high bar.',
  },
  {
    id: 'biz_staff_morale',
    category: 'business',
    title: 'Team morale',
    text: 'Your staff at {business} have been working hard. Morale is dipping.',
    conditions: { hasBusiness: true },
    cooldown: 18,
    choices: [
      {
        label: 'Throw a team appreciation day ($800)',
        auto: true,
        effect: { bizCash: -800, bizReputation: 3, stress: -2, result: 'The team felt appreciated.' },
      },
      {
        label: 'Give everyone a small bonus ($2,000)',
        effect: { bizCash: -2000, bizReputation: 5, result: 'Bonuses boosted loyalty and service quality.' },
      },
      {
        label: 'They are paid to work',
        effect: { bizReputation: -4, result: 'Service quality slipped.' },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // MARKET & INVESTING
  // ---------------------------------------------------------------------------
  {
    id: 'mkt_crash_panic',
    category: 'market',
    title: 'Market crash!',
    text: 'Stocks are plunging. The news is full of panic and your portfolio is deep in the red. Everyone is talking about selling.',
    conditions: { hasInvestments: true, regime: ['crash'] },
    major: true,
    weight: 3,
    cooldown: 12,
    choices: [
      {
        label: 'Sell everything before it gets worse',
        effect: { action: 'sellAllInvestments', stress: -5, happiness: -3, result: 'You sold everything. The pain stopped... for now.' },
      },
      {
        label: 'Hold and stick to the plan',
        auto: true,
        effect: { stress: 6, setFlag: 'held_crash', result: 'You held on. It is uncomfortable, but you did not lock in losses.' },
      },
      {
        label: 'Buy more of the S&P 500 fund with 30% of cash',
        effect: { action: 'buySymbol', symbol: 'SPY', pct: 30, stress: 8, setFlag: 'held_crash', result: 'You bought while others were fearful.' },
      },
    ],
    lesson: 'Every crash in history has felt like the end of the world. Investors who held broad index funds recovered; those who sold often missed the rebound.',
  },
  {
    id: 'mkt_bear_grind',
    category: 'market',
    title: 'The long bear market',
    text: 'Stocks have been falling for months. Your investment account keeps shrinking and the headlines are gloomy.',
    conditions: { hasInvestments: true, regime: ['bear'] },
    weight: 1.5,
    cooldown: 12,
    choices: [
      {
        label: 'Keep auto-investing as usual',
        auto: true,
        effect: { stress: 2, result: 'You kept buying steadily at lower prices.' },
      },
      {
        label: 'Pause investing until things look better',
        effect: { stress: -2, result: 'You paused. Remember, the best days often come when things look worst.' },
      },
      {
        label: 'Sell your individual stocks, keep funds',
        effect: { action: 'sellAllStocks', stress: -3, result: 'You sold your individual stocks.' },
      },
    ],
    lesson: 'Dollar-cost averaging through a bear market means you buy more shares at lower prices. That is how downturns become gifts for patient investors.',
  },
  {
    id: 'mkt_hot_tip',
    category: 'market',
    title: 'A hot stock tip',
    text: 'A coworker swears {company} ({ticker}) is about to explode higher. "Trust me, get in now."',
    conditions: { minCash: 1000 },
    needsTicker: 'any',
    cooldown: 12,
    choices: [
      {
        label: 'Ignore the tip',
        auto: true,
        effect: { result: 'You stuck with your plan.' },
      },
      {
        label: 'Buy {ticker} with 10% of cash',
        effect: { action: 'buySymbol', symbol: '$event', pct: 10, stress: 3, result: 'You bought some {ticker}. Time will tell.' },
      },
      {
        label: 'Go big: 40% of cash into {ticker}',
        effect: { action: 'buySymbol', symbol: '$event', pct: 40, stress: 8, result: 'You went all in on a tip. Fingers crossed.' },
      },
    ],
    lesson: 'Tips feel exciting, but nobody can reliably predict a single stock. If you do buy individual stocks, keep each position small.',
  },
  {
    id: 'mkt_earnings_miss',
    category: 'market',
    title: 'Earnings disappointment',
    text: '{company} ({ticker}), which you own, just reported results below expectations. Analysts are downgrading the stock.',
    conditions: { hasStocks: true },
    needsTicker: 'held',
    cooldown: 6,
    choices: [
      {
        label: 'Hold and review the fundamentals',
        auto: true,
        effect: { stress: 3, result: 'You held your position.' },
      },
      {
        label: 'Sell all of {ticker}',
        effect: { action: 'sellSymbol', symbol: '$event', pct: 100, stress: -2, result: 'You sold your {ticker} shares.' },
      },
      {
        label: 'Buy more {ticker} with 10% of cash',
        effect: { action: 'buySymbol', symbol: '$event', pct: 10, stress: 4, result: 'You added to your {ticker} position.' },
      },
    ],
    lesson: 'Individual stocks can swing hard on one report. That is called single-stock risk. An index fund spreads it across hundreds of companies.',
  },
  {
    id: 'mkt_meme_mania',
    category: 'market',
    title: 'Meme stock mania',
    text: 'Social media is buzzing: {ticker} is up a lot recently and people online say it is "going to the moon".',
    conditions: { regime: ['bull'], minCash: 500 },
    needsTicker: 'any',
    cooldown: 24,
    choices: [
      {
        label: 'Stay out of the hype',
        auto: true,
        effect: { result: 'You watched from the sidelines.' },
      },
      {
        label: 'Jump in with 20% of cash',
        effect: { action: 'buySymbol', symbol: '$event', pct: 20, stress: 8, happiness: 2, result: 'You joined the crowd buying {ticker}.' },
      },
    ],
    lesson: 'Buying because prices already went up is called chasing performance. It often means buying high.',
  },
  {
    id: 'mkt_friend_rich',
    category: 'market',
    title: 'Your friend got rich quick',
    text: 'An old friend made a fortune on a speculative digital token and keeps posting photos of their new car. They say you can still get in.',
    conditions: { minCash: 1000 },
    cooldown: 36,
    choices: [
      {
        label: 'Congratulate them and move on',
        auto: true,
        effect: { stress: 2, result: 'A little envy, but your plan is solid.' },
      },
      {
        label: 'Gamble $3,000',
        requiresCash: 3000,
        effect: {
          cash: -3000,
          stress: 8,
          chance: {
            p: 0.25,
            success: { cash: 9000, happiness: 5 },
            fail: { happiness: -4 },
            successText: 'Lucky! Your $3,000 turned into $9,000. Do not count on that twice.',
            failText: 'The token collapsed. Your $3,000 is gone.',
          },
        },
      },
    ],
    lesson: 'You only hear about the winners. Speculation is gambling; steady index investing is how most people actually build wealth.',
  },
  {
    id: 'mkt_influencer_course',
    category: 'market',
    title: 'Trading guru course',
    text: 'An online "trading guru" is selling a $2,500 course promising 10% monthly returns.',
    conditions: {},
    cooldown: 48,
    choices: [
      {
        label: 'Skip it',
        auto: true,
        effect: { result: 'Good call. 10% a month would turn $1,000 into $3 million in 7 years. That is not how markets work.' },
      },
      {
        label: 'Buy the course',
        requiresCash: 2500,
        effect: { cash: -2500, stress: 4, happiness: -3, result: 'The course was mostly upsells and vague charts.' },
      },
    ],
    lesson: 'Anyone promising guaranteed high returns is selling something. The S&P 500 has historically averaged around 10% per YEAR, with big ups and downs.',
  },
  {
    id: 'mkt_all_time_high',
    category: 'market',
    title: 'Markets at all-time highs',
    text: 'The S&P 500 just hit a record high. You have cash to invest but wonder if you should wait for a dip.',
    conditions: { regime: ['bull'], minCash: 5000 },
    cooldown: 24,
    choices: [
      {
        label: 'Invest 25% of cash in the S&P 500 fund now',
        auto: true,
        effect: { action: 'buySymbol', symbol: 'SPY', pct: 25, result: 'You put your money to work.' },
      },
      {
        label: 'Wait for a pullback',
        effect: { stress: 2, result: 'You kept your cash on the sidelines.' },
      },
    ],
    lesson: 'Markets hit all-time highs often, because they tend to rise over time. Time in the market usually beats timing the market.',
  },
  {
    id: 'mkt_dividend_raise',
    category: 'market',
    title: 'Dividend increase',
    text: '{company} ({ticker}) announced it is raising its dividend again.',
    conditions: { hasStocks: true },
    needsTicker: 'held',
    cooldown: 12,
    choices: [
      {
        label: 'Nice! Keep reinvesting',
        auto: true,
        effect: { happiness: 2, result: 'Dividends are a quiet way your money works for you.' },
      },
      {
        label: 'Buy more {ticker} with 5% of cash',
        effect: { action: 'buySymbol', symbol: '$event', pct: 5, result: 'You added a little more {ticker}.' },
      },
    ],
    lesson: 'Reinvested dividends have historically made up a big chunk of the stock market’s total return.',
  },
  {
    id: 'mkt_stock_split',
    category: 'market',
    title: 'Stock split announced',
    text: '{company} ({ticker}) announced a stock split. A friend says this makes it "cheaper" and a great buy.',
    conditions: {},
    needsTicker: 'any',
    cooldown: 36,
    choices: [
      {
        label: 'Understand it changes nothing',
        auto: true,
        effect: { skill: 1, result: 'Right: a split is like cutting a pizza into more slices. Same pizza.' },
      },
      {
        label: 'Buy {ticker} with 10% of cash',
        effect: { action: 'buySymbol', symbol: '$event', pct: 10, result: 'You bought some {ticker}.' },
      },
    ],
    lesson: 'A stock split changes the number of shares, not the value of the company. Focus on fundamentals, not share price.',
  },
  {
    id: 'mkt_fee_lesson',
    category: 'market',
    title: 'The fee pitch',
    text: 'A friendly advisor offers to manage your money in actively managed funds for 1.5% per year, plus fund fees.',
    conditions: { hasInvestments: true },
    cooldown: 60,
    choices: [
      {
        label: 'Stick with low-cost index funds',
        auto: true,
        effect: { result: 'You kept your costs low. Over decades, that difference adds up to a fortune.' },
      },
      {
        label: 'Sign up',
        effect: { cash: -1500, stress: -2, result: 'You paid the first year of fees. Most active funds fail to beat the index over long periods.' },
      },
    ],
    lesson: 'A 1.5% annual fee can eat a third of your wealth over 40 years. Index funds often charge 0.03% to 0.10%.',
  },
  {
    id: 'mkt_401k_match',
    category: 'market',
    title: 'Free money reminder',
    text: 'HR reminds everyone that {employer} matches 401(k) contributions. Are you taking the full match?',
    conditions: { employed: true },
    cooldown: 24,
    choices: [
      {
        label: 'Got it, I will check my 401(k) setting',
        auto: true,
        effect: { skill: 1, result: 'Check the Budget tab to set your 401(k) contribution.' },
      },
      {
        label: 'Ignore it',
        effect: { result: 'You ignored the email.' },
      },
    ],
    lesson: 'An employer match is an instant 50-100% return on your money. Contribute at least enough to get the full match.',
  },
  {
    id: 'mkt_concentration',
    category: 'market',
    title: 'Too many eggs in one basket?',
    text: 'You notice {company} ({ticker}) has become a big part of your portfolio.',
    conditions: { hasStocks: true },
    needsTicker: 'held',
    cooldown: 24,
    choices: [
      {
        label: 'Trim half and buy the S&P 500 fund',
        effect: { action: 'sellSymbol', symbol: '$event', pct: 50, result: 'You trimmed {ticker}. Remember to reinvest the proceeds in something diversified.' },
      },
      {
        label: 'Leave it as is',
        auto: true,
        effect: { stress: 2, result: 'You let your position ride.' },
      },
    ],
    lesson: 'Diversification is the only free lunch in investing. A common rule of thumb is to keep any single stock to a small slice of your portfolio.',
  },
  {
    id: 'mkt_recovery',
    category: 'market',
    title: 'Markets bouncing back',
    text: 'After a rough stretch, stocks are rallying hard. People who sold are kicking themselves.',
    conditions: { regime: ['recovery'] },
    cooldown: 24,
    choices: [
      {
        label: 'Stay the course',
        auto: true,
        effect: { stress: -3, happiness: 2, result: 'Staying invested meant you caught the rebound.' },
      },
      {
        label: 'Invest 20% of cash in the S&P 500 fund',
        effect: { action: 'buySymbol', symbol: 'SPY', pct: 20, result: 'You added to the index fund.' },
      },
    ],
    lesson: 'Some of the best days in the market come right after the worst ones. Missing them can cut your long-run returns dramatically.',
  },
  {
    id: 'mkt_short_term_trading',
    category: 'market',
    title: 'Day trading app',
    text: 'A flashy new app offers free trades and confetti every time you buy. A friend says they day-trade on lunch breaks.',
    conditions: { hasInvestments: true },
    cooldown: 48,
    choices: [
      {
        label: 'Pass, I am a long-term investor',
        auto: true,
        effect: { stress: -1, result: 'Boring is beautiful.' },
      },
      {
        label: 'Try a little day trading',
        effect: {
          stress: 10,
          performance: -3,
          chance: {
            p: 0.3,
            success: { cash: 800 },
            fail: { cash: -1500 },
            successText: 'You made $800. It felt amazing and very stressful.',
            failText: 'You lost $1,500 and a lot of lunch breaks.',
          },
        },
      },
    ],
    lesson: 'Studies consistently find that most day traders lose money. Frequent trading adds stress, taxes, and mistakes.',
  },
  {
    id: 'mkt_sector_hype',
    category: 'market',
    title: 'The next big thing',
    text: 'Everyone is talking about {company} ({ticker}) and its industry. Valuations are sky-high.',
    conditions: { regime: ['bull', 'normal'] },
    needsTicker: 'any',
    cooldown: 24,
    choices: [
      {
        label: 'Check the P/E and fundamentals first',
        auto: true,
        effect: { skill: 1, result: 'Open the Market tab to see {ticker}’s fundamentals before deciding anything.' },
      },
      {
        label: 'Buy {ticker} with 15% of cash',
        effect: { action: 'buySymbol', symbol: '$event', pct: 15, stress: 4, result: 'You bought into the hype.' },
      },
    ],
    lesson: 'A great company is not always a great investment if you pay too much. The P/E ratio tells you how much you pay for each dollar of profit.',
  },
  {
    id: 'mkt_rebalance_reminder',
    category: 'market',
    title: 'Annual check-up',
    text: 'It has been a while since you looked at your overall investment mix.',
    conditions: { hasInvestments: true, minMonth: 24 },
    cooldown: 24,
    choices: [
      {
        label: 'Review it, but keep it simple',
        auto: true,
        effect: { stress: -2, skill: 1, result: 'A quick annual check-up keeps things on track.' },
      },
      {
        label: 'Spend all weekend tweaking it',
        effect: { stress: 4, happiness: -2, result: 'You moved things around a lot. Was it worth it?' },
      },
    ],
    lesson: 'A simple portfolio you check once a year beats a complicated one you obsess over daily.',
  },

  // ---------------------------------------------------------------------------
  // MONEY & BUDGET
  // ---------------------------------------------------------------------------
  {
    id: 'money_car_repair',
    category: 'money',
    title: 'Car trouble',
    text: 'Your car is making a horrible noise. The mechanic quotes $1,800 for the repair.',
    conditions: { hasCar: true },
    cooldown: 12,
    choices: [
      {
        label: 'Pay for the repair',
        auto: true,
        effect: { cash: -1800, result: 'Car fixed. Glad you had some savings.' },
      },
      {
        label: 'Put it on a credit card',
        effect: { creditDebt: 1800, stress: 4, result: 'The repair is on your card, accruing interest.' },
      },
      {
        label: 'Drive it anyway',
        effect: {
          chance: {
            p: 0.4,
            success: {},
            fail: { action: 'carBreakdown', cash: -3500, stress: 8 },
            successText: 'Somehow, it kept running.',
            failText: 'The engine died on the highway. The repair is now much bigger.',
          },
        },
      },
    ],
    lesson: 'Car repairs are not emergencies, they are predictable. A cash buffer turns a crisis into an inconvenience.',
  },
  {
    id: 'money_phone_broke',
    category: 'money',
    title: 'Cracked phone',
    text: 'You dropped your phone and the screen shattered.',
    conditions: {},
    cooldown: 24,
    choices: [
      {
        label: 'Repair the screen ($200)',
        auto: true,
        effect: { cash: -200, result: 'Good as new, mostly.' },
      },
      {
        label: 'Buy the latest model ($1,200)',
        effect: { cash: -1200, happiness: 3, result: 'Shiny new phone. Your wallet is lighter.' },
      },
    ],
    lesson: 'Small upgrades add up. $1,000 invested at 25 could be worth over $30,000 at 65 at historical market returns.',
  },
  {
    id: 'money_scam',
    category: 'money',
    title: 'Suspicious message',
    text: 'You get a text claiming to be from your bank asking you to "verify your account" with a link.',
    conditions: {},
    cooldown: 36,
    choices: [
      {
        label: 'Delete it and call your bank directly',
        auto: true,
        effect: { result: 'It was a scam. Well spotted.' },
      },
      {
        label: 'Click the link',
        effect: { cash: -1500, stress: 10, result: 'Scammers drained $1,500 before you noticed.' },
      },
    ],
    lesson: 'Banks never ask for passwords by text. When in doubt, contact them using the number on your card.',
  },
  {
    id: 'money_tax_refund',
    category: 'money',
    title: 'Tax refund!',
    text: 'You got a tax refund of $1,200.',
    conditions: {},
    cooldown: 12,
    choices: [
      {
        label: 'Save and invest it',
        auto: true,
        effect: { cash: 1200, result: 'Your refund is now working for your future.' },
      },
      {
        label: 'Treat yourself',
        effect: { happiness: 5, result: 'You enjoyed a fun shopping trip.' },
      },
    ],
    lesson: 'Windfalls are perfect for building your emergency fund or investing, since you were not counting on them.',
  },
  {
    id: 'money_friend_loan',
    category: 'money',
    title: 'A friend needs money',
    text: 'A close friend asks to borrow $2,000 to cover rent. They promise to pay you back.',
    conditions: { minCash: 500 },
    cooldown: 36,
    choices: [
      {
        label: 'Lend it',
        requiresCash: 2000,
        effect: {
          cash: -2000,
          chance: {
            p: 0.6,
            success: { cash: 2000, happiness: 3 },
            fail: { happiness: -4 },
            successText: 'Your friend paid you back. Friendship intact.',
            failText: 'Your friend never paid you back. Awkward.',
          },
        },
      },
      {
        label: 'Give $300 as a gift, no strings',
        auto: true,
        effect: { cash: -300, happiness: 3, result: 'Your friend was grateful.' },
      },
      {
        label: 'Say no',
        effect: { happiness: -2, result: 'It was uncomfortable, but you kept your boundaries.' },
      },
    ],
    lesson: 'Only lend what you can afford to never see again.',
  },
  {
    id: 'money_wedding_invite',
    category: 'money',
    title: 'Destination wedding',
    text: 'A friend invited you to their destination wedding. Flights, hotel, and gift add up to about $2,500.',
    conditions: { maxAge: 50 },
    cooldown: 24,
    choices: [
      {
        label: 'Go and celebrate',
        requiresCash: 2500,
        effect: { cash: -2500, happiness: 8, stress: -4, result: 'Unforgettable memories.' },
      },
      {
        label: 'Send a nice gift ($150)',
        auto: true,
        effect: { cash: -150, happiness: -1, result: 'You sent your best wishes.' },
      },
    ],
    lesson: 'Spending on experiences you truly value is fine. The goal is intentional spending, not zero spending.',
  },
  {
    id: 'money_subscriptions',
    category: 'money',
    title: 'Subscription creep',
    text: 'You review your bank statement and find $85 a month in subscriptions you barely use.',
    conditions: {},
    cooldown: 36,
    choices: [
      {
        label: 'Cancel the ones you do not use',
        auto: true,
        effect: { cash: 500, result: 'You freed up money every month. Small leaks sink big ships.' },
      },
      {
        label: 'Keep them all',
        effect: { cash: -200, result: 'They keep quietly billing you.' },
      },
    ],
    lesson: 'Cutting recurring costs is the easiest raise you will ever give yourself.',
  },
  {
    id: 'money_credit_offer',
    category: 'money',
    title: 'Store credit card',
    text: 'At checkout, the cashier offers 20% off today if you open a store credit card (29% APR).',
    conditions: {},
    cooldown: 36,
    choices: [
      {
        label: 'No thanks',
        auto: true,
        effect: { result: 'You skipped the high-interest card.' },
      },
      {
        label: 'Open it and spend $1,000',
        effect: { creditDebt: 800, happiness: 2, result: 'You saved $200 today and took on $800 of high-interest debt.' },
      },
    ],
    lesson: 'Credit card interest of 20-30% is a guaranteed loss. Paying it off beats almost any investment.',
  },
  {
    id: 'money_credit_debt_warning',
    category: 'money',
    title: 'Credit card interest bites',
    text: 'Your credit card statement shows a big chunk of your payment went to interest.',
    conditions: { hasCreditDebt: true },
    cooldown: 12,
    weight: 1.3,
    choices: [
      {
        label: 'Make paying it off the top priority',
        auto: true,
        effect: { stress: 2, skill: 1, result: 'Use the Budget tab to add an extra debt payment.' },
      },
      {
        label: 'Ignore it for now',
        effect: { stress: 3, result: 'The balance keeps growing.' },
      },
    ],
    lesson: 'Paying off a 22% credit card is like earning a guaranteed 22% return. No stock does that reliably.',
  },
  {
    id: 'money_side_hustle_sale',
    category: 'money',
    title: 'Declutter sale',
    text: 'Your closet and garage are overflowing. You could sell stuff online.',
    conditions: {},
    cooldown: 48,
    choices: [
      {
        label: 'Sell it all',
        auto: true,
        effect: { cash: 700, happiness: 2, stress: 1, result: 'You made $700 and gained space.' },
      },
      {
        label: 'Maybe later',
        effect: { result: 'The clutter remains.' },
      },
    ],
  },
  {
    id: 'money_lifestyle_creep',
    category: 'money',
    title: 'Keeping up with friends',
    text: 'Your friends all leased fancy cars and keep inviting you to expensive dinners.',
    conditions: { minMonth: 12 },
    cooldown: 36,
    choices: [
      {
        label: 'Suggest cheaper hangouts',
        auto: true,
        effect: { happiness: 1, result: 'Turns out game nights are just as fun.' },
      },
      {
        label: 'Keep up with them',
        effect: { cash: -2000, happiness: 3, stress: 3, result: 'Fun, but expensive.' },
      },
    ],
    lesson: 'Lifestyle creep quietly steals your raises. Keep your savings rate rising as your income rises.',
  },
  {
    id: 'money_found_money',
    category: 'money',
    title: 'Unclaimed money',
    text: 'You discover an old account in your name with $400 in unclaimed funds.',
    conditions: {},
    once: true,
    choices: [
      {
        label: 'Claim it',
        auto: true,
        effect: { cash: 400, happiness: 2, result: 'Free money!' },
      },
      {
        label: 'Too much paperwork',
        effect: { result: 'You left it unclaimed.' },
      },
    ],
  },
  {
    id: 'money_home_repair',
    category: 'money',
    title: 'Roof leak',
    text: 'A storm damaged your roof and water is leaking in.',
    conditions: { ownsHome: true },
    cooldown: 36,
    choices: [
      {
        label: 'Fix it properly ($6,000)',
        auto: true,
        effect: { cash: -6000, stress: 4, result: 'Roof repaired. Homeownership has hidden costs.' },
      },
      {
        label: 'Patch it ($1,000)',
        effect: {
          cash: -1000,
          chance: {
            p: 0.5,
            success: {},
            fail: { cash: -9000, stress: 10 },
            successText: 'The patch held.',
            failText: 'The patch failed and water damage spread. Much bigger bill.',
          },
        },
      },
    ],
    lesson: 'Budget about 1% of your home’s value per year for maintenance. Renting can be smarter than buying in many situations.',
  },
  {
    id: 'money_appliance',
    category: 'money',
    title: 'Fridge died',
    text: 'Your refrigerator stopped working.',
    conditions: {},
    cooldown: 48,
    choices: [
      {
        label: 'Buy a reliable mid-range model ($1,000)',
        auto: true,
        effect: { cash: -1000, result: 'Groceries saved.' },
      },
      {
        label: 'Buy on store financing',
        effect: { creditDebt: 1300, result: 'No money down... plus interest.' },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // FAMILY & LIFE
  // ---------------------------------------------------------------------------
  {
    id: 'life_meet_someone',
    category: 'life',
    title: 'Someone special',
    text: 'You met someone wonderful through friends. You have been on a few dates.',
    conditions: { minAge: 21, married: false, notFlag: 'dating' },
    cooldown: 24,
    choices: [
      {
        label: 'Keep dating',
        auto: true,
        effect: { setFlag: 'dating', happiness: 8, cash: -300, result: 'Things are going well.' },
      },
      {
        label: 'Focus on yourself',
        effect: { result: 'You decided to stay single for now.' },
      },
    ],
  },
  {
    id: 'life_proposal',
    category: 'family',
    title: 'Getting serious',
    text: 'Your relationship is going great. It might be time to talk about marriage.',
    conditions: { minAge: 23, married: false, flag: 'dating' },
    major: true,
    once: true,
    choices: [
      {
        label: 'Propose with a modest ring ($2,000)',
        auto: true,
        effect: { action: 'marry', cash: -2000, happiness: 12, clearFlag: 'dating', result: 'You got married in a small, joyful ceremony!' },
      },
      {
        label: 'Big wedding ($30,000)',
        effect: { action: 'marry', cash: -30000, happiness: 14, stress: 8, clearFlag: 'dating', result: 'What a party! And what a bill.' },
      },
      {
        label: 'Not ready yet',
        effect: { happiness: -3, result: 'You agreed to wait.' },
      },
    ],
    lesson: 'The average wedding can cost as much as a year of investing. Talk openly about money with your partner; it is one of the biggest predictors of a happy marriage.',
  },
  {
    id: 'family_baby',
    category: 'family',
    title: 'Baby on the way?',
    text: '{spouse} and you are talking about starting a family.',
    conditions: { married: true, maxAge: 45 },
    major: true,
    cooldown: 30,
    weight: 0.8,
    choices: [
      {
        label: 'Have a baby',
        effect: { action: 'haveChild', happiness: 12, stress: 10, result: 'Welcome to the world, little one!' },
      },
      {
        label: 'Not right now',
        auto: true,
        effect: { result: 'You decided to wait.' },
      },
    ],
    lesson: 'Kids are wonderful and expensive. Childcare, food, and activities add up, so plan your budget ahead of time.',
  },
  {
    id: 'family_pet',
    category: 'family',
    title: 'Puppy eyes',
    text: 'A local shelter has an adorable dog that needs a home.',
    conditions: {},
    cooldown: 48,
    choices: [
      {
        label: 'Adopt',
        effect: { action: 'adoptPet', cash: -400, happiness: 8, stress: -4, result: 'You have a new best friend.' },
      },
      {
        label: 'Not right now',
        auto: true,
        effect: { result: 'Maybe someday.' },
      },
    ],
    lesson: 'Pets cost roughly $100-200 a month for food, vet care, and supplies. Worth it for many people, just budget for it.',
  },
  {
    id: 'family_vet_bill',
    category: 'family',
    title: 'Vet emergency',
    text: 'Your pet swallowed something it should not have. The vet needs to operate.',
    conditions: { hasPet: true },
    cooldown: 36,
    choices: [
      {
        label: 'Pay for surgery ($3,000)',
        auto: true,
        effect: { cash: -3000, stress: 6, result: 'Your furry friend recovered fully.' },
      },
      {
        label: 'Put it on a credit card',
        effect: { creditDebt: 3000, stress: 8, result: 'Your pet is fine; your card balance is not.' },
      },
    ],
  },
  {
    id: 'family_parents_help',
    category: 'family',
    title: 'Parents need help',
    text: 'Your parents are struggling with medical bills and ask if you can help.',
    conditions: { minAge: 30 },
    cooldown: 48,
    choices: [
      {
        label: 'Help with $5,000',
        requiresCash: 5000,
        effect: { cash: -5000, happiness: 4, result: 'Your parents were deeply grateful.' },
      },
      {
        label: 'Help with $1,000',
        auto: true,
        effect: { cash: -1000, happiness: 2, result: 'You helped as much as you could.' },
      },
      {
        label: 'Help them make a budget instead',
        effect: { stress: 3, result: 'You spent a weekend helping them organize their finances.' },
      },
    ],
    lesson: 'Building your own financial security first means you are able to help the people you love when they need it.',
  },
  {
    id: 'family_holidays',
    category: 'family',
    title: 'Holiday season',
    text: 'The holidays are here. Gifts, travel, and parties are calling.',
    conditions: {},
    cooldown: 11,
    choices: [
      {
        label: 'Set a holiday budget ($800)',
        auto: true,
        effect: { cash: -800, happiness: 5, result: 'Joyful holidays within budget.' },
      },
      {
        label: 'Go all out ($3,000)',
        effect: { cash: -3000, happiness: 7, result: 'Lavish holidays! January will be tight.' },
      },
      {
        label: 'Go all out on credit',
        effect: { creditDebt: 3000, happiness: 6, stress: 4, result: 'Fun now, interest later.' },
      },
    ],
  },
  {
    id: 'family_move',
    category: 'life',
    title: 'Time to move?',
    text: 'Your landlord is raising the rent and a friend mentions a cheaper place across town.',
    conditions: { ownsHome: false },
    cooldown: 36,
    choices: [
      {
        label: 'Move to the cheaper place',
        auto: true,
        effect: { cash: -1200, stress: 4, result: 'Moving was a hassle, but your monthly costs dropped.' },
      },
      {
        label: 'Stay and pay more',
        effect: { cash: -1500, result: 'You stayed put.' },
      },
    ],
  },
  {
    id: 'family_kid_activities',
    category: 'family',
    title: 'Kid’s activities',
    text: 'Your child wants to join a travel sports team. It costs $3,000 per season.',
    conditions: { hasKids: true },
    cooldown: 24,
    choices: [
      {
        label: 'Sign them up',
        requiresCash: 3000,
        effect: { cash: -3000, happiness: 6, result: 'Your child loves it.' },
      },
      {
        label: 'Choose the local rec league ($300)',
        auto: true,
        effect: { cash: -300, happiness: 4, result: 'Same fun, fraction of the cost.' },
      },
    ],
  },
  {
    id: 'family_college_fund',
    category: 'family',
    title: 'College savings',
    text: 'A friend mentions they started a college fund for their kids when they were born.',
    conditions: { hasKids: true },
    once: true,
    choices: [
      {
        label: 'Put $2,000 toward the kids’ future',
        requiresCash: 2000,
        effect: { cash: -2000, happiness: 4, result: 'You started saving for your kids’ education.' },
      },
      {
        label: 'Focus on retirement first',
        auto: true,
        effect: { result: 'Like on airplanes: secure your own oxygen mask first.' },
      },
    ],
    lesson: 'Your kids can borrow for college; you cannot borrow for retirement. Many planners suggest funding retirement first.',
  },
  {
    id: 'life_vacation',
    category: 'life',
    title: 'Vacation planning',
    text: 'You have not taken a real vacation in ages.',
    conditions: { minMonth: 12 },
    cooldown: 12,
    choices: [
      {
        label: 'Road trip ($800)',
        auto: true,
        effect: { cash: -800, stress: -10, happiness: 6, result: 'Fresh air and good memories.' },
      },
      {
        label: 'Luxury resort ($5,000)',
        requiresCash: 5000,
        effect: { cash: -5000, stress: -12, happiness: 9, result: 'Pure luxury.' },
      },
      {
        label: 'Staycation',
        effect: { stress: -5, happiness: 3, result: 'Rest at home was surprisingly nice.' },
      },
    ],
    lesson: 'Rest is part of a sustainable plan. The goal is wealth AND a good life.',
  },
  {
    id: 'life_inheritance',
    category: 'life',
    title: 'An inheritance',
    text: 'A distant relative passed away and left you some money.',
    conditions: { minAge: 30 },
    once: true,
    weight: 0.4,
    choices: [
      {
        label: 'Invest it in a broad index fund',
        auto: true,
        effect: { action: 'inheritance', result: 'You honored their memory by investing for the long term.' },
      },
      {
        label: 'Pay off debt and invest the rest',
        effect: { action: 'inheritance', stress: -4, result: 'You used it to clean up debt and invest.' },
      },
    ],
    lesson: 'With a windfall, a good order is: pay off high-interest debt, fill your emergency fund, then invest for the long term.',
  },
  {
    id: 'life_divorce_risk',
    category: 'family',
    title: 'Money fights',
    text: 'You and {spouse} keep arguing about spending.',
    conditions: { married: true },
    cooldown: 36,
    choices: [
      {
        label: 'Make a shared budget together',
        auto: true,
        effect: { happiness: 4, stress: -4, result: 'Talking it through brought you closer.' },
      },
      {
        label: 'Avoid the topic',
        effect: { happiness: -5, stress: 6, result: 'The tension lingers.' },
      },
    ],
    lesson: 'Couples who set shared goals and automate their savings argue less about money.',
  },

  // ---------------------------------------------------------------------------
  // HEALTH
  // ---------------------------------------------------------------------------
  {
    id: 'health_er_visit',
    category: 'health',
    title: 'Emergency room',
    text: 'You fell while hiking and broke your wrist. The ER bill is coming.',
    conditions: {},
    cooldown: 36,
    choices: [
      {
        label: 'Pay the bill',
        hint: 'Health insurance reduces this a lot',
        auto: true,
        effect: { cash: -6000, health: -6, stress: 6, result: 'Your wrist will heal. Your wallet felt it too.' },
      },
      {
        label: 'Put it on a payment plan (credit)',
        hint: 'High interest',
        effect: { creditDebt: 6000, health: -6, stress: 8, result: 'The bill is on a payment plan.' },
      },
    ],
    lesson: 'Health insurance is not optional. One accident without it can cost more than a year of savings.',
  },
  {
    id: 'health_checkup',
    category: 'health',
    title: 'Annual checkup',
    text: 'It is time for your annual checkup. You have been putting it off.',
    conditions: {},
    cooldown: 12,
    choices: [
      {
        label: 'Go to the checkup',
        auto: true,
        effect: { cash: -150, health: 4, stress: -1, result: 'All clear. Prevention is cheap.' },
      },
      {
        label: 'Skip it',
        effect: { health: -2, result: 'You skipped it again.' },
      },
    ],
    lesson: 'Preventive care is cheap; treating problems later is expensive. Most insurance covers checkups for free.',
  },
  {
    id: 'health_gym',
    category: 'health',
    title: 'Get in shape',
    text: 'You have been feeling sluggish. A gym nearby has a membership deal.',
    conditions: {},
    cooldown: 24,
    choices: [
      {
        label: 'Run outside for free',
        auto: true,
        effect: { health: 6, stress: -4, result: 'Free exercise, real results.' },
      },
      {
        label: 'Join the gym ($600/year)',
        effect: { cash: -600, health: 8, stress: -5, happiness: 2, result: 'You are feeling stronger.' },
      },
      {
        label: 'Maybe next year',
        effect: { health: -2, result: 'The couch wins this round.' },
      },
    ],
  },
  {
    id: 'health_surgery',
    category: 'health',
    title: 'Unexpected surgery',
    text: 'Your doctor says you need surgery and a few weeks of recovery.',
    conditions: { minAge: 30 },
    cooldown: 60,
    weight: 0.5,
    major: true,
    choices: [
      {
        label: 'Have the surgery',
        hint: 'Insurance makes a huge difference here',
        auto: true,
        effect: { cash: -20000, health: 10, stress: 10, performance: -4, result: 'The surgery went well and you are recovering.' },
      },
      {
        label: 'Delay it',
        effect: { health: -12, stress: 8, result: 'You delayed it. Your health may get worse.' },
      },
    ],
    lesson: 'Disability and health insurance protect your most valuable asset: your ability to earn an income.',
  },
  {
    id: 'health_dental',
    category: 'health',
    title: 'Toothache',
    text: 'Your tooth has been aching for weeks. The dentist says you need a crown.',
    conditions: {},
    cooldown: 36,
    choices: [
      {
        label: 'Get the crown ($1,500)',
        auto: true,
        effect: { cash: -1500, health: 3, result: 'Pain gone.' },
      },
      {
        label: 'Ignore it',
        effect: {
          health: -4,
          chance: {
            p: 0.5,
            success: {},
            fail: { cash: -3500, health: -4 },
            successText: 'The pain faded... for now.',
            failText: 'It turned into a root canal. Much more expensive.',
          },
        },
      },
    ],
  },
  {
    id: 'health_stress_sleep',
    category: 'health',
    title: 'Sleepless nights',
    text: 'You have been checking stock prices at 2 a.m. and cannot sleep.',
    conditions: { hasStocks: true, minStress: 55 },
    cooldown: 12,
    choices: [
      {
        label: 'Delete the trading app from your phone',
        auto: true,
        effect: { stress: -10, health: 3, result: 'You slept like a baby.' },
      },
      {
        label: 'Keep watching',
        effect: { stress: 5, health: -4, performance: -3, result: 'Another restless night.' },
      },
    ],
    lesson: 'If your investments keep you up at night, they may be too risky or too concentrated. Broad index funds are designed to be boring.',
  },
  // ---------------------------------------------------------------------------
  // SAFETY NET (forced by the engine when debt gets out of control)
  // ---------------------------------------------------------------------------
  {
    id: 'money_debt_crisis',
    category: 'money',
    title: 'Debt crisis',
    text: 'Your credit card is maxed out and the interest is growing faster than you can pay. A non-profit credit counsellor offers to help you make a plan.',
    conditions: { debtCrisis: true },
    major: true,
    cooldown: 12,
    weight: 0,
    choices: [
      {
        label: 'Join a debt management plan',
        hint: 'One fixed 8% loan, frugal budget, cheaper housing and car',
        auto: true,
        effect: { action: 'debtPlan', stress: 6, result: 'You signed up. Your card debt is now one fixed loan at 8%, and your budget has been trimmed to essentials.' },
      },
      {
        label: 'Declare bankruptcy',
        hint: 'Most card debt erased; savings above a small floor are lost; credit damaged',
        effect: { action: 'bankruptcy', stress: 15, happiness: -10, reputation: -5, result: 'A hard reset. Bankruptcy stays on your record for years, but you can rebuild.' },
      },
      {
        label: 'Keep going as you are',
        hint: 'Interest keeps compounding against you',
        effect: { stress: 8, result: 'You decided to push on. The guide strongly suggests cutting expenses now.' },
      },
    ],
    lesson: 'Credit card interest of 20-25% compounds against you just as investing compounds for you. Paying it off is a guaranteed return no investment can match. Spend less than you earn first; invest second.',
  },
];
