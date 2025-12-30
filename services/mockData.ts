import { BondData, SignalType } from '../types';

// Helper to generate random realistic data
const generateMockBonds = (): BondData[] => {
  const names = [
    '浦发转债', '光大转债', '招路转债', '兴业转债', '中信转债', 
    '南银转债', '苏银转债', '成银转债', '杭银转债', '东财转3',
    '国微转债', '精测转债', '大族转债', '闻泰转债', '韦尔转债'
  ];

  return names.map((name, index) => {
    const price = 90 + Math.random() * 50; // 90 - 140
    const premiumRate = -10 + Math.random() * 60; // -10% to 50%
    const doubleLow = price + premiumRate;
    
    return {
      id: `bond-${index}`,
      code: (110000 + index).toString(),
      name,
      price: parseFloat(price.toFixed(2)),
      priceChange: parseFloat((-2 + Math.random() * 4).toFixed(2)),
      premiumRate: parseFloat(premiumRate.toFixed(2)),
      stockPrice: parseFloat((10 + Math.random() * 20).toFixed(2)),
      stockChange: parseFloat((-3 + Math.random() * 6).toFixed(2)),
      rating: Math.random() > 0.7 ? 'AAA' : (Math.random() > 0.4 ? 'AA+' : 'AA'),
      remainingYear: parseFloat((0.5 + Math.random() * 5.5).toFixed(2)),
      volume: parseFloat((100 + Math.random() * 5000).toFixed(2)),
      doubleLow: parseFloat(doubleLow.toFixed(2))
    };
  });
};

export const fetchMarketData = async (): Promise<BondData[]> => {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockBonds().sort((a, b) => a.doubleLow - b.doubleLow));
    }, 800);
  });
};

export const calculateSignal = (bond: BondData): SignalType => {
  // Simple Strategy Logic
  // Buy: Low price, reasonable premium, or very low double low
  if (bond.doubleLow < 115 && bond.price < 120 && bond.price > 80) {
    return SignalType.BUY;
  }
  
  // Sell: High price (near redemption), or very high premium with high price
  if (bond.price > 140 || (bond.price > 130 && bond.premiumRate > 40)) {
    return SignalType.SELL;
  }

  return SignalType.HOLD;
};