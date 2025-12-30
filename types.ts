export interface BondData {
  id: string;
  code: string;
  name: string;
  price: number;
  priceChange: number; // Percentage
  premiumRate: number; // Percentage
  stockId?: string;
  stockName?: string;
  stockPrice: number;
  stockChange: number;
  listDate?: string;
  bondValue?: number;
  pureBondPremiumRate?: number;
  redeemStatus?: string;
  redeemIcon?: string;
  rating: string;
  forceRedeemPrice?: number;
  maturityDate?: string;
  remainingYear: number;
  currIssAmt?: number;
  volume: number; // in 10k
  turnoverRate?: number;
  ytmRt?: number;
  sYtm?: number;
  sPrem?: number;
  sAmt?: number;
  sPureOr?: number;
  totalScore?: number;
  doubleLow: number; // Price + Premium Rate * 100
}

export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD'
}

export interface AnalysisResult {
  bondId: string;
  content: string;
  loading: boolean;
}

export interface FilterConfig {
  maxPrice: number;
  maxPremium: number;
  minRating: string; // 'AAA', 'AA+', 'AA', 'A+'
}
