import { BondData, ScreenRequest, ScreenResult } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_BONDS_API_BASE ?? 'http://localhost:8000';

export interface ScreenBondsResponse {
  bonds: BondData[];
  summary: ScreenResult['summary'];
  raw: ScreenResult;
}

export const screenBonds = async (payload: ScreenRequest): Promise<ScreenBondsResponse> => {
  const resp = await fetch(`${API_BASE}/bonds/screen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
  });

  let json: any = null;
  try {
    json = await resp.json();
  } catch {
    // ignore parse error, will handle below
  }

  if (!resp.ok) {
    const message =
      (json && typeof json === 'object' && typeof json.message === 'string')
        ? json.message
        : '选股接口调用失败';
    throw new Error(message);
  }

  const data = json as ScreenResult;

  const bonds: BondData[] = data.result.map((item) => {
    const bondId = String(item.bond_id);
    const price = typeof item.price === 'number' ? item.price : 0;
    const premium = typeof item.premium_rt === 'number' ? item.premium_rt : 0;
    const bondValue = typeof item.bond_value === 'number' ? item.bond_value : undefined;
    const ytmRt = typeof item.ytm_rt === 'number' ? item.ytm_rt : undefined;
    const stockLastPx = typeof item.stock_last_px === 'number' ? item.stock_last_px : Number.NaN;
    const yearLeft = typeof item.year_left === 'number' ? item.year_left : 0;
    const turnover = typeof item.turnover_rt === 'number' ? item.turnover_rt : undefined;
    const currIssAmt = typeof item.curr_iss_amt === 'number' ? item.curr_iss_amt : undefined;
    const rating = (item.rating_cd ?? '') as string;

    return {
      id: bondId,
      code: bondId,
      name: item.bond_nm,
      price,
      priceChange: typeof item.increase_rt === 'number' ? item.increase_rt : 0,
      premiumRate: premium,
      stockPrice: stockLastPx,
      stockChange: 0,
      listDate: undefined,
      bondValue,
      pureBondPremiumRate:
        typeof bondValue === 'number' && bondValue > 0
          ? (price / bondValue - 1) * 100
          : undefined,
      redeemStatus: (item.redeem_status ?? undefined) as string | undefined,
      redeemIcon: (item.redeem_icon ?? undefined) as string | undefined,
      satisfyRedeem: (item['满足强赎'] ?? undefined) as string | number | undefined,
      rating,
      forceRedeemPrice: undefined,
      maturityDate: undefined,
      remainingYear: yearLeft,
      currIssAmt,
      volume: 0,
      turnoverRate: turnover,
      ytmRt,
      sYtm: undefined,
      sPrem: undefined,
      sAmt: undefined,
      sPureOr: undefined,
      totalScore: typeof item.total_score === 'number' ? item.total_score : undefined,
      doubleLow: price + premium,
    };
  });

  return {
    bonds,
    summary: data.summary,
    raw: data,
  };
};
