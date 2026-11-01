// =============================================================================
// STOCK DATA: approximate, simulated, not live
// =============================================================================
//
// These are real companies and tickers with APPROXIMATE starting fundamentals,
// rounded and simplified for teaching. They are NOT live data and NOT
// investment research. Once a game starts, every price, earnings report and
// dividend is SIMULATED by the game engine (src/engine/market.ts) from these
// starting values. What happens in the game says nothing about what will
// happen to the real companies.
//
// How the engine uses these fields:
//   - shares outstanding = marketCapB / price
//   - EPS (trailing)     = revenueB * netMargin% / shares
//   - P/E                = marketCapB / (revenueB * netMargin / 100)
//   So keep marketCapB, revenueB and netMargin consistent if you edit them.
//
// To ADD a stock: copy one entry, change every field, and pick a SectorId from
// src/types.ts. Tickers must be unique (also not clash with src/data/etfs.ts).
// To REMOVE a stock: delete its entry. Saved games that held it will sell it at
// its last price when loaded.
//
// Field guide:
//   price          starting share price, USD
//   marketCapB     market value of the whole company, billions USD
//   revenueB       trailing 12-month revenue (sales), billions USD
//   revenueGrowth  year-over-year revenue growth, %
//   netMargin      net profit / revenue, % (negative = losing money)
//   dividendYield  annual dividend / price, %
//   debtToEquity   total debt / shareholder equity. Companies with negative
//                  equity (big buybacks) are shown as 9.9 = "very high leverage".
//   beta           how strongly the stock moves with the market (1 = same)
//   idioVol        annual company-specific volatility, % (15 calm ... 55 wild)
// =============================================================================

import type { StockDef } from '../types';

export const STOCK_DATA_AS_OF =
  'Approximate starting figures, roughly mid-2025, rounded for teaching. Simulated after the game starts; not live data.';

export const STOCKS: StockDef[] = [
  // ---------------------------------------------------------------- Technology
  { ticker: 'AAPL', name: 'Apple', sector: 'tech', price: 210, marketCapB: 3150, revenueB: 400, revenueGrowth: 5, netMargin: 24.3, dividendYield: 0.5, debtToEquity: 1.5, beta: 1.2, idioVol: 22, blurb: 'Makes the iPhone, Mac and iPad, and earns growing fees from apps and services.' },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'tech', price: 480, marketCapB: 3570, revenueB: 270, revenueGrowth: 15, netMargin: 36, dividendYield: 0.7, debtToEquity: 0.3, beta: 1.05, idioVol: 20, blurb: 'Windows, Office and the Azure cloud: software that most businesses run on.' },
  { ticker: 'ORCL', name: 'Oracle', sector: 'tech', price: 210, marketCapB: 590, revenueB: 57, revenueGrowth: 8, netMargin: 21.7, dividendYield: 0.9, debtToEquity: 4.5, beta: 1.1, idioVol: 30, blurb: 'Database software and a fast-growing cloud business, funded with a lot of debt.' },
  { ticker: 'CRM', name: 'Salesforce', sector: 'tech', price: 270, marketCapB: 260, revenueB: 38, revenueGrowth: 8, netMargin: 16.4, dividendYield: 0.6, debtToEquity: 0.2, beta: 1.2, idioVol: 28, blurb: 'Cloud software that sales and support teams use to manage customers.' },
  { ticker: 'ADBE', name: 'Adobe', sector: 'tech', price: 390, marketCapB: 166, revenueB: 22.6, revenueGrowth: 10, netMargin: 30.6, dividendYield: 0, debtToEquity: 0.5, beta: 1.2, idioVol: 27, blurb: 'Photoshop, Acrobat and other creative tools sold as subscriptions.' },
  { ticker: 'CSCO', name: 'Cisco Systems', sector: 'tech', price: 66, marketCapB: 262, revenueB: 56, revenueGrowth: 5, netMargin: 17.5, dividendYield: 2.5, debtToEquity: 0.6, beta: 0.9, idioVol: 20, blurb: 'Networking gear and security software that connect offices and data centres.' },
  { ticker: 'IBM', name: 'IBM', sector: 'tech', price: 280, marketCapB: 260, revenueB: 63, revenueGrowth: 2, netMargin: 9.5, dividendYield: 2.4, debtToEquity: 2.4, beta: 0.8, idioVol: 22, blurb: 'A century-old tech company now focused on hybrid cloud, AI and consulting.' },
  { ticker: 'INTU', name: 'Intuit', sector: 'tech', price: 750, marketCapB: 210, revenueB: 18.2, revenueGrowth: 15, netMargin: 20, dividendYield: 0.6, debtToEquity: 0.3, beta: 1.2, idioVol: 25, blurb: 'TurboTax, QuickBooks and Credit Karma: money software for people and small firms.' },
  { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'tech', price: 140, marketCapB: 330, revenueB: 3.4, revenueGrowth: 39, netMargin: 18, dividendYield: 0, debtToEquity: 0.05, beta: 2.0, idioVol: 55, blurb: 'Data-analysis and AI software for governments and companies, priced for huge growth.' },
  { ticker: 'SHOP', name: 'Shopify', sector: 'tech', price: 110, marketCapB: 143, revenueB: 9.4, revenueGrowth: 26, netMargin: 12, dividendYield: 0, debtToEquity: 0.1, beta: 1.9, idioVol: 45, blurb: 'Software that lets millions of merchants run their own online stores.' },

  // ------------------------------------------------------------ Semiconductors
  { ticker: 'NVDA', name: 'Nvidia', sector: 'semis', price: 160, marketCapB: 3900, revenueB: 148, revenueGrowth: 70, netMargin: 52, dividendYield: 0.03, debtToEquity: 0.1, beta: 1.8, idioVol: 40, blurb: 'Designs the graphics and AI chips that power data centres and gaming PCs.' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'semis', price: 140, marketCapB: 227, revenueB: 27.8, revenueGrowth: 30, netMargin: 9.5, dividendYield: 0, debtToEquity: 0.05, beta: 1.9, idioVol: 45, blurb: 'Processors and AI chips for PCs, game consoles and data centres.' },
  { ticker: 'AVGO', name: 'Broadcom', sector: 'semis', price: 270, marketCapB: 1270, revenueB: 57, revenueGrowth: 25, netMargin: 25, dividendYield: 0.9, debtToEquity: 1.0, beta: 1.2, idioVol: 35, blurb: 'Networking and custom AI chips plus enterprise software, built through acquisitions.' },
  { ticker: 'INTC', name: 'Intel', sector: 'semis', price: 22, marketCapB: 96, revenueB: 53, revenueGrowth: -3, netMargin: -38, dividendYield: 0, debtToEquity: 0.5, beta: 1.1, idioVol: 40, blurb: 'The classic PC chipmaker, losing money while it rebuilds its factories.' },
  { ticker: 'QCOM', name: 'Qualcomm', sector: 'semis', price: 155, marketCapB: 170, revenueB: 42, revenueGrowth: 12, netMargin: 26, dividendYield: 2.3, debtToEquity: 0.6, beta: 1.3, idioVol: 30, blurb: 'Chips and patents inside most of the world\'s smartphones.' },
  { ticker: 'MU', name: 'Micron Technology', sector: 'semis', price: 120, marketCapB: 135, revenueB: 33, revenueGrowth: 50, netMargin: 18, dividendYield: 0.4, debtToEquity: 0.3, beta: 1.4, idioVol: 42, blurb: 'Memory chips: a boom-and-bust business that swings with supply and demand.' },
  { ticker: 'TXN', name: 'Texas Instruments', sector: 'semis', price: 200, marketCapB: 182, revenueB: 16.3, revenueGrowth: -1, netMargin: 29, dividendYield: 2.7, debtToEquity: 0.8, beta: 1.0, idioVol: 24, blurb: 'Simple, durable chips used in cars, factories and appliances.' },

  // ---------------------------------------------------------- Communication
  { ticker: 'GOOGL', name: 'Alphabet (Google)', sector: 'comm', price: 175, marketCapB: 2150, revenueB: 370, revenueGrowth: 12, netMargin: 30, dividendYield: 0.5, debtToEquity: 0.1, beta: 1.05, idioVol: 25, blurb: 'Google Search, YouTube, Android and Google Cloud, mostly paid for by ads.' },
  { ticker: 'META', name: 'Meta Platforms', sector: 'comm', price: 700, marketCapB: 1760, revenueB: 170, revenueGrowth: 18, netMargin: 39, dividendYield: 0.3, debtToEquity: 0.25, beta: 1.25, idioVol: 30, blurb: 'Facebook, Instagram and WhatsApp, earning money from targeted ads.' },
  { ticker: 'NFLX', name: 'Netflix', sector: 'comm', price: 1250, marketCapB: 535, revenueB: 41, revenueGrowth: 15, netMargin: 25, dividendYield: 0, debtToEquity: 0.7, beta: 1.25, idioVol: 30, blurb: 'The largest paid streaming service, with hundreds of millions of subscribers.' },
  { ticker: 'DIS', name: 'Walt Disney', sector: 'comm', price: 120, marketCapB: 216, revenueB: 93, revenueGrowth: 4, netMargin: 10, dividendYield: 0.8, debtToEquity: 0.4, beta: 1.1, idioVol: 22, blurb: 'Movies, theme parks, ESPN and Disney+ streaming.' },
  { ticker: 'T', name: 'AT&T', sector: 'comm', price: 28, marketCapB: 200, revenueB: 123, revenueGrowth: 1, netMargin: 9, dividendYield: 4.0, debtToEquity: 1.2, beta: 0.6, idioVol: 18, blurb: 'Mobile phone and fibre internet service across the US.' },
  { ticker: 'VZ', name: 'Verizon', sector: 'comm', price: 43, marketCapB: 181, revenueB: 135, revenueGrowth: 1, netMargin: 13, dividendYield: 6.3, debtToEquity: 1.7, beta: 0.4, idioVol: 17, blurb: 'A large wireless carrier known for a high, steady dividend.' },
  { ticker: 'CMCSA', name: 'Comcast', sector: 'comm', price: 35, marketCapB: 132, revenueB: 124, revenueGrowth: 1, netMargin: 13, dividendYield: 3.7, debtToEquity: 1.0, beta: 0.95, idioVol: 22, blurb: 'Cable internet, NBC television and Universal theme parks.' },

  // ------------------------------------------------- Consumer discretionary
  { ticker: 'AMZN', name: 'Amazon', sector: 'discretionary', price: 220, marketCapB: 2330, revenueB: 650, revenueGrowth: 10, netMargin: 10.1, dividendYield: 0, debtToEquity: 0.4, beta: 1.3, idioVol: 25, blurb: 'Online shopping plus AWS, the world\'s biggest cloud-computing business.' },
  { ticker: 'TSLA', name: 'Tesla', sector: 'discretionary', price: 320, marketCapB: 1030, revenueB: 95, revenueGrowth: -3, netMargin: 6.5, dividendYield: 0, debtToEquity: 0.15, beta: 2.0, idioVol: 55, blurb: 'Electric cars and batteries; the share price bakes in big hopes for robotaxis.' },
  { ticker: 'HD', name: 'Home Depot', sector: 'discretionary', price: 360, marketCapB: 360, revenueB: 160, revenueGrowth: 6, netMargin: 9, dividendYield: 2.5, debtToEquity: 6.0, beta: 1.0, idioVol: 20, blurb: 'The largest home-improvement store chain, selling to DIYers and contractors.' },
  { ticker: 'LOW', name: 'Lowe\'s', sector: 'discretionary', price: 225, marketCapB: 126, revenueB: 83.7, revenueGrowth: -2, netMargin: 8.3, dividendYield: 2.1, debtToEquity: 9.9, beta: 1.05, idioVol: 20, blurb: 'Home-improvement stores, the number-two rival to Home Depot.' },
  { ticker: 'MCD', name: 'McDonald\'s', sector: 'discretionary', price: 295, marketCapB: 211, revenueB: 25.9, revenueGrowth: 1, netMargin: 32, dividendYield: 2.4, debtToEquity: 9.9, beta: 0.55, idioVol: 15, blurb: 'Fast food giant that mostly collects rent and fees from franchise owners.' },
  { ticker: 'SBUX', name: 'Starbucks', sector: 'discretionary', price: 92, marketCapB: 105, revenueB: 36.7, revenueGrowth: 0, netMargin: 8.5, dividendYield: 2.6, debtToEquity: 9.9, beta: 1.0, idioVol: 27, blurb: 'Coffee shops worldwide, in the middle of a turnaround plan.' },
  { ticker: 'CMG', name: 'Chipotle Mexican Grill', sector: 'discretionary', price: 50, marketCapB: 67, revenueB: 11.3, revenueGrowth: 11, netMargin: 13.5, dividendYield: 0, debtToEquity: 1.4, beta: 1.1, idioVol: 30, blurb: 'Fast-casual burrito restaurants, opening hundreds of new locations a year.' },
  { ticker: 'NKE', name: 'Nike', sector: 'discretionary', price: 70, marketCapB: 103, revenueB: 46.3, revenueGrowth: -10, netMargin: 7, dividendYield: 2.3, debtToEquity: 0.9, beta: 1.1, idioVol: 30, blurb: 'The world\'s biggest sportswear brand, currently shrinking and restructuring.' },
  { ticker: 'F', name: 'Ford Motor', sector: 'discretionary', price: 11.5, marketCapB: 46, revenueB: 183, revenueGrowth: 0, netMargin: 3, dividendYield: 5.2, debtToEquity: 3.5, beta: 1.5, idioVol: 32, blurb: 'Trucks and cars on thin profit margins; earnings swing with the economy.' },
  { ticker: 'GM', name: 'General Motors', sector: 'discretionary', price: 50, marketCapB: 48, revenueB: 188, revenueGrowth: 5, netMargin: 3.4, dividendYield: 1.0, debtToEquity: 1.8, beta: 1.4, idioVol: 30, blurb: 'Chevrolet, GMC and Cadillac: big sales, small margins, cheap valuation.' },
  { ticker: 'ABNB', name: 'Airbnb', sector: 'discretionary', price: 135, marketCapB: 84, revenueB: 11.5, revenueGrowth: 10, netMargin: 23, dividendYield: 0, debtToEquity: 0.25, beta: 1.2, idioVol: 35, blurb: 'An online marketplace for short-term home rentals and experiences.' },

  // -------------------------------------------------------- Consumer staples
  { ticker: 'WMT', name: 'Walmart', sector: 'staples', price: 97, marketCapB: 777, revenueB: 690, revenueGrowth: 4, netMargin: 2.85, dividendYield: 1.0, debtToEquity: 0.6, beta: 0.6, idioVol: 17, blurb: 'The world\'s largest retailer: everyday low prices on enormous volume.' },
  { ticker: 'COST', name: 'Costco', sector: 'staples', price: 1000, marketCapB: 444, revenueB: 270, revenueGrowth: 7, netMargin: 2.9, dividendYield: 0.5, debtToEquity: 0.3, beta: 0.8, idioVol: 18, blurb: 'Membership warehouse stores; most of the profit comes from membership fees.' },
  { ticker: 'KO', name: 'Coca-Cola', sector: 'staples', price: 70, marketCapB: 302, revenueB: 47, revenueGrowth: 2, netMargin: 25, dividendYield: 2.9, debtToEquity: 1.6, beta: 0.5, idioVol: 14, blurb: 'Soft drinks sold in 200 countries; a classic steady dividend payer.' },
  { ticker: 'PEP', name: 'PepsiCo', sector: 'staples', price: 135, marketCapB: 185, revenueB: 91.5, revenueGrowth: 0, netMargin: 9, dividendYield: 4.2, debtToEquity: 2.5, beta: 0.5, idioVol: 16, blurb: 'Pepsi drinks plus snacks like Lay\'s and Doritos.' },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'staples', price: 160, marketCapB: 375, revenueB: 84, revenueGrowth: 1, netMargin: 19, dividendYield: 2.6, debtToEquity: 0.7, beta: 0.45, idioVol: 14, blurb: 'Tide, Pampers, Gillette: household products people buy in any economy.' },
  { ticker: 'MO', name: 'Altria', sector: 'staples', price: 59, marketCapB: 100, revenueB: 20.4, revenueGrowth: -1, netMargin: 50, dividendYield: 6.9, debtToEquity: 9.9, beta: 0.6, idioVol: 18, blurb: 'Marlboro cigarettes in the US: shrinking volumes, very high dividend.' },
  { ticker: 'TGT', name: 'Target', sector: 'staples', price: 100, marketCapB: 45.5, revenueB: 106, revenueGrowth: -1, netMargin: 3.9, dividendYield: 4.5, debtToEquity: 1.2, beta: 1.0, idioVol: 30, blurb: 'Discount department stores going through a rough patch.' },

  // -------------------------------------------------------------- Health care
  { ticker: 'LLY', name: 'Eli Lilly', sector: 'health', price: 780, marketCapB: 700, revenueB: 49, revenueGrowth: 32, netMargin: 23, dividendYield: 0.8, debtToEquity: 2.0, beta: 0.45, idioVol: 30, blurb: 'Drugmaker growing fast on diabetes and weight-loss medicines.' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'health', price: 155, marketCapB: 373, revenueB: 90, revenueGrowth: 4, netMargin: 24, dividendYield: 3.3, debtToEquity: 0.5, beta: 0.45, idioVol: 15, blurb: 'Prescription drugs and medical devices; decades of dividend increases.' },
  { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'health', price: 310, marketCapB: 281, revenueB: 410, revenueGrowth: 10, netMargin: 5, dividendYield: 2.8, debtToEquity: 0.75, beta: 0.5, idioVol: 30, blurb: 'The largest US health insurer, hit by rising medical costs.' },
  { ticker: 'PFE', name: 'Pfizer', sector: 'health', price: 24, marketCapB: 137, revenueB: 63, revenueGrowth: 4, netMargin: 13, dividendYield: 7.0, debtToEquity: 0.7, beta: 0.55, idioVol: 22, blurb: 'A big drugmaker whose pandemic sales faded; pays a large dividend.' },
  { ticker: 'MRK', name: 'Merck & Co.', sector: 'health', price: 80, marketCapB: 200, revenueB: 64, revenueGrowth: 2, netMargin: 28, dividendYield: 4.0, debtToEquity: 0.8, beta: 0.4, idioVol: 20, blurb: 'Drugmaker best known for the cancer drug Keytruda.' },
  { ticker: 'ABBV', name: 'AbbVie', sector: 'health', price: 185, marketCapB: 327, revenueB: 57, revenueGrowth: 7, netMargin: 7.5, dividendYield: 3.5, debtToEquity: 9.9, beta: 0.5, idioVol: 18, blurb: 'Immunology drugs and Botox; reported profit is cut by acquisition costs.' },
  { ticker: 'TMO', name: 'Thermo Fisher Scientific', sector: 'health', price: 410, marketCapB: 155, revenueB: 43, revenueGrowth: 1, netMargin: 15, dividendYield: 0.4, debtToEquity: 0.6, beta: 0.8, idioVol: 22, blurb: 'Lab equipment and supplies that scientists and drugmakers depend on.' },

  // --------------------------------------------------------------- Financials
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', sector: 'financials', price: 485, marketCapB: 1050, revenueB: 370, revenueGrowth: 2, netMargin: 22, dividendYield: 0, debtToEquity: 0.25, beta: 0.85, idioVol: 14, blurb: 'Warren Buffett\'s conglomerate: insurance, railroads, utilities and a stock portfolio.' },
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'financials', price: 285, marketCapB: 790, revenueB: 170, revenueGrowth: 5, netMargin: 34, dividendYield: 2.0, debtToEquity: 1.3, beta: 1.1, idioVol: 18, blurb: 'The largest US bank: consumer banking, credit cards and Wall Street deals.' },
  { ticker: 'BAC', name: 'Bank of America', sector: 'financials', price: 47, marketCapB: 355, revenueB: 102, revenueGrowth: 4, netMargin: 27, dividendYield: 2.3, debtToEquity: 1.1, beta: 1.3, idioVol: 20, blurb: 'A huge consumer bank whose profits rise and fall with interest rates.' },
  { ticker: 'WFC', name: 'Wells Fargo', sector: 'financials', price: 80, marketCapB: 260, revenueB: 82, revenueGrowth: 1, netMargin: 24, dividendYield: 2.2, debtToEquity: 1.2, beta: 1.15, idioVol: 20, blurb: 'A big US retail bank recovering from past scandals.' },
  { ticker: 'GS', name: 'Goldman Sachs', sector: 'financials', price: 700, marketCapB: 215, revenueB: 54, revenueGrowth: 10, netMargin: 27, dividendYield: 1.7, debtToEquity: 2.5, beta: 1.35, idioVol: 22, blurb: 'Investment bank: trading, deal-making and wealth management.' },
  { ticker: 'V', name: 'Visa', sector: 'financials', price: 350, marketCapB: 680, revenueB: 38, revenueGrowth: 10, netMargin: 52, dividendYield: 0.7, debtToEquity: 0.55, beta: 0.95, idioVol: 17, blurb: 'Runs the card network and takes a small fee on trillions of payments.' },
  { ticker: 'MA', name: 'Mastercard', sector: 'financials', price: 560, marketCapB: 515, revenueB: 30, revenueGrowth: 12, netMargin: 45, dividendYield: 0.55, debtToEquity: 2.4, beta: 1.05, idioVol: 18, blurb: 'The number-two card network, with very high profit margins.' },
  { ticker: 'PYPL', name: 'PayPal', sector: 'financials', price: 72, marketCapB: 70, revenueB: 32, revenueGrowth: 4, netMargin: 13, dividendYield: 0, debtToEquity: 0.6, beta: 1.4, idioVol: 30, blurb: 'Online payments and Venmo, facing tough competition.' },

  // ------------------------------------------------------------------- Energy
  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'energy', price: 110, marketCapB: 475, revenueB: 335, revenueGrowth: -2, netMargin: 10, dividendYield: 3.6, debtToEquity: 0.15, beta: 0.5, idioVol: 20, blurb: 'The largest US oil and gas company; profits follow the oil price.' },
  { ticker: 'CVX', name: 'Chevron', sector: 'energy', price: 145, marketCapB: 255, revenueB: 190, revenueGrowth: -3, netMargin: 7.5, dividendYield: 4.7, debtToEquity: 0.2, beta: 0.6, idioVol: 20, blurb: 'Global oil and gas producer and refiner with a big dividend.' },
  { ticker: 'COP', name: 'ConocoPhillips', sector: 'energy', price: 90, marketCapB: 113, revenueB: 58, revenueGrowth: 4, netMargin: 16, dividendYield: 3.5, debtToEquity: 0.36, beta: 0.8, idioVol: 24, blurb: 'Pumps oil and gas without refineries, so it is very sensitive to energy prices.' },
  { ticker: 'SLB', name: 'SLB (Schlumberger)', sector: 'energy', price: 35, marketCapB: 48, revenueB: 36, revenueGrowth: 2, netMargin: 12, dividendYield: 3.2, debtToEquity: 0.55, beta: 1.0, idioVol: 28, blurb: 'Provides drilling technology and services to oil companies worldwide.' },

  // -------------------------------------------------------------- Industrials
  { ticker: 'GE', name: 'GE Aerospace', sector: 'industrials', price: 250, marketCapB: 265, revenueB: 40, revenueGrowth: 10, netMargin: 18, dividendYield: 0.6, debtToEquity: 1.0, beta: 1.2, idioVol: 25, blurb: 'Builds and services jet engines for most of the world\'s airliners.' },
  { ticker: 'CAT', name: 'Caterpillar', sector: 'industrials', price: 380, marketCapB: 180, revenueB: 63, revenueGrowth: -3, netMargin: 16.5, dividendYield: 1.5, debtToEquity: 2.0, beta: 1.1, idioVol: 22, blurb: 'Bulldozers, excavators and mining trucks; a bellwether for global building.' },
  { ticker: 'DE', name: 'Deere & Company', sector: 'industrials', price: 510, marketCapB: 138, revenueB: 46, revenueGrowth: -15, netMargin: 13.5, dividendYield: 1.3, debtToEquity: 2.5, beta: 1.0, idioVol: 22, blurb: 'John Deere tractors and farm equipment; sales follow farmers\' incomes.' },
  { ticker: 'BA', name: 'Boeing', sector: 'industrials', price: 210, marketCapB: 158, revenueB: 70, revenueGrowth: -5, netMargin: -15, dividendYield: 0, debtToEquity: 9.9, beta: 1.4, idioVol: 35, blurb: 'Airliner and defence maker losing money after years of production problems.' },
  { ticker: 'UPS', name: 'United Parcel Service', sector: 'industrials', price: 100, marketCapB: 85, revenueB: 90.9, revenueGrowth: 0, netMargin: 6.3, dividendYield: 6.5, debtToEquity: 1.6, beta: 1.0, idioVol: 22, blurb: 'Package delivery worldwide; volumes rise and fall with the economy.' },
  { ticker: 'LMT', name: 'Lockheed Martin', sector: 'industrials', price: 470, marketCapB: 110, revenueB: 72, revenueGrowth: 4, netMargin: 7.5, dividendYield: 2.8, debtToEquity: 3.5, beta: 0.4, idioVol: 18, blurb: 'The largest defence contractor, maker of the F-35 fighter jet.' },
  { ticker: 'RTX', name: 'RTX (Raytheon)', sector: 'industrials', price: 145, marketCapB: 194, revenueB: 83, revenueGrowth: 8, netMargin: 6, dividendYield: 1.8, debtToEquity: 0.65, beta: 0.6, idioVol: 18, blurb: 'Jet engines (Pratt & Whitney), aircraft parts and missile systems.' },
  { ticker: 'UBER', name: 'Uber Technologies', sector: 'industrials', price: 90, marketCapB: 188, revenueB: 45, revenueGrowth: 18, netMargin: 20, dividendYield: 0, debtToEquity: 0.5, beta: 1.4, idioVol: 35, blurb: 'Ride-hailing and food delivery app, recently turned solidly profitable.' },

  // ---------------------------------------------------------------- Utilities
  { ticker: 'NEE', name: 'NextEra Energy', sector: 'utilities', price: 72, marketCapB: 148, revenueB: 25, revenueGrowth: 5, netMargin: 24, dividendYield: 3.1, debtToEquity: 1.6, beta: 0.6, idioVol: 22, blurb: 'Florida\'s big electric utility and the largest builder of wind and solar.' },
  { ticker: 'DUK', name: 'Duke Energy', sector: 'utilities', price: 117, marketCapB: 91, revenueB: 31, revenueGrowth: 5, netMargin: 14.5, dividendYield: 3.6, debtToEquity: 1.7, beta: 0.45, idioVol: 15, blurb: 'Regulated electricity and gas for millions of customers in the Southeast.' },
  { ticker: 'SO', name: 'Southern Company', sector: 'utilities', price: 92, marketCapB: 101, revenueB: 28, revenueGrowth: 7, netMargin: 15, dividendYield: 3.2, debtToEquity: 1.9, beta: 0.45, idioVol: 15, blurb: 'Regulated power company in Georgia, Alabama and Mississippi.' },
  { ticker: 'D', name: 'Dominion Energy', sector: 'utilities', price: 56, marketCapB: 48, revenueB: 15, revenueGrowth: 6, netMargin: 15, dividendYield: 4.8, debtToEquity: 1.6, beta: 0.6, idioVol: 18, blurb: 'Virginia utility powering a booming cluster of data centres.' },

  // -------------------------------------------------------------- Real estate
  { ticker: 'PLD', name: 'Prologis', sector: 'realestate', price: 108, marketCapB: 100, revenueB: 8.6, revenueGrowth: 6, netMargin: 40, dividendYield: 3.7, debtToEquity: 0.6, beta: 1.1, idioVol: 22, blurb: 'Owns warehouses that online retailers and shippers rent (a REIT).' },
  { ticker: 'O', name: 'Realty Income', sector: 'realestate', price: 57, marketCapB: 51, revenueB: 5.4, revenueGrowth: 20, netMargin: 17, dividendYield: 5.6, debtToEquity: 0.7, beta: 0.8, idioVol: 18, blurb: 'Owns thousands of stores leased long-term and pays a monthly dividend (a REIT).' },
  { ticker: 'AMT', name: 'American Tower', sector: 'realestate', price: 215, marketCapB: 101, revenueB: 10.2, revenueGrowth: 0, netMargin: 22, dividendYield: 3.1, debtToEquity: 4.0, beta: 0.85, idioVol: 22, blurb: 'Owns cell towers and rents space on them to phone carriers (a REIT).' },
  { ticker: 'SPG', name: 'Simon Property Group', sector: 'realestate', price: 160, marketCapB: 52, revenueB: 6.0, revenueGrowth: 4, netMargin: 38, dividendYield: 5.2, debtToEquity: 7.0, beta: 1.4, idioVol: 25, blurb: 'The largest owner of US shopping malls and outlet centres (a REIT).' },

  // ---------------------------------------------------------------- Materials
  { ticker: 'LIN', name: 'Linde', sector: 'materials', price: 465, marketCapB: 220, revenueB: 33, revenueGrowth: 1, netMargin: 20, dividendYield: 1.3, debtToEquity: 0.55, beta: 0.85, idioVol: 16, blurb: 'Industrial gases (oxygen, hydrogen, nitrogen) sold on long contracts.' },
  { ticker: 'SHW', name: 'Sherwin-Williams', sector: 'materials', price: 340, marketCapB: 85, revenueB: 23, revenueGrowth: 0, netMargin: 11.5, dividendYield: 0.9, debtToEquity: 2.4, beta: 1.05, idioVol: 20, blurb: 'The biggest paint company, with thousands of its own paint stores.' },
  { ticker: 'FCX', name: 'Freeport-McMoRan', sector: 'materials', price: 42, marketCapB: 60, revenueB: 25.5, revenueGrowth: 4, netMargin: 7.5, dividendYield: 1.4, debtToEquity: 0.55, beta: 1.6, idioVol: 32, blurb: 'One of the largest copper miners; its fortunes follow the copper price.' },
  { ticker: 'NEM', name: 'Newmont', sector: 'materials', price: 58, marketCapB: 64, revenueB: 19.7, revenueGrowth: 40, netMargin: 25, dividendYield: 1.7, debtToEquity: 0.3, beta: 0.5, idioVol: 32, blurb: 'The world\'s largest gold miner; profits jump when gold prices rise.' },
  { ticker: 'DOW', name: 'Dow Inc.', sector: 'materials', price: 28, marketCapB: 20, revenueB: 42, revenueGrowth: -4, netMargin: -0.8, dividendYield: 5.0, debtToEquity: 1.0, beta: 1.1, idioVol: 30, blurb: 'Commodity chemicals and plastics, currently squeezed by weak demand.' },
];
