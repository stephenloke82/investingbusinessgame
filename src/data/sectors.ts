import type { SectorDef } from '../types';

// Sector behaviour used by the market simulation.
// beta: how strongly the sector follows the overall market.
// vol: annual volatility of sector-specific news (on top of the market).
// basePE: "fair" P/E for a company in this sector growing at the long-run rate.
// cyclicality: how much revenue swings with the economy.
export const SECTORS: SectorDef[] = [
  { id: 'tech', name: 'Technology', beta: 1.15, vol: 11, basePE: 24, cyclicality: 0.8 },
  { id: 'semis', name: 'Semiconductors', beta: 1.45, vol: 18, basePE: 22, cyclicality: 1.4 },
  { id: 'comm', name: 'Communication & Media', beta: 1.05, vol: 11, basePE: 20, cyclicality: 0.7 },
  { id: 'discretionary', name: 'Consumer Discretionary', beta: 1.15, vol: 10, basePE: 20, cyclicality: 1.1 },
  { id: 'staples', name: 'Consumer Staples', beta: 0.6, vol: 7, basePE: 20, cyclicality: 0.2 },
  { id: 'health', name: 'Health Care', beta: 0.75, vol: 9, basePE: 19, cyclicality: 0.2 },
  { id: 'financials', name: 'Financials', beta: 1.1, vol: 10, basePE: 13, cyclicality: 1.0 },
  { id: 'energy', name: 'Energy', beta: 0.95, vol: 20, basePE: 12, cyclicality: 1.3 },
  { id: 'industrials', name: 'Industrials', beta: 1.05, vol: 9, basePE: 18, cyclicality: 1.0 },
  { id: 'utilities', name: 'Utilities', beta: 0.5, vol: 9, basePE: 17, cyclicality: 0.1 },
  { id: 'realestate', name: 'Real Estate', beta: 0.9, vol: 12, basePE: 30, cyclicality: 0.6 },
  { id: 'materials', name: 'Materials & Mining', beta: 1.0, vol: 15, basePE: 15, cyclicality: 1.2 },
];

export const SECTOR_BY_ID = Object.fromEntries(SECTORS.map((s) => [s.id, s])) as Record<SectorDef['id'], SectorDef>;
