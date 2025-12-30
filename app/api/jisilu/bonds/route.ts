import { NextRequest, NextResponse } from 'next/server';
import { BondData } from '@/types';
import {
  decodeScoreConfigFromCookieValue,
  DEFAULT_SCORE_CONFIG,
  getScoreConfigCookieName,
  normalizeScoreConfig,
} from '@/lib/scoreConfig';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const parseCookieHeader = (cookieHeader: string) => {
  const map = new Map<string, string>();
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const name = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1);
    map.set(name, value);
  }
  return map;
};

const getSetCookies = (headers: Headers): string[] => {
  const anyHeaders = headers as any;
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie() as string[];
  }

  const raw = headers.get('set-cookie');
  if (!raw) return [];

  return raw.split(/,(?=[^;]+?=)/g);
};

const cookiesToMapFromSetCookie = (setCookies: string[]) => {
  const map = new Map<string, string>();
  for (const setCookie of setCookies) {
    const pair = setCookie.split(';', 1)[0]?.trim();
    if (!pair) continue;
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1);
    map.set(name, value);
  }
  return map;
};

const mergeCookieMaps = (...maps: Array<Map<string, string>>) => {
  const out = new Map<string, string>();
  for (const m of maps) {
    for (const [k, v] of m.entries()) {
      out.set(k, v);
    }
  }
  return out;
};

const cookieMapToHeader = (m: Map<string, string>) => {
  return Array.from(m.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookie = body?.cookie;
    const scoreConfig = body?.scoreConfig;

    if (!cookie) {
      return NextResponse.json(
        { success: false, message: '缺少 Cookie，请先登录集思录' },
        { status: 400 }
      );
    }

    const configFromBody = scoreConfig ? normalizeScoreConfig(scoreConfig) : null;
    const configFromCookie = (() => {
      const raw = req.cookies.get(getScoreConfigCookieName())?.value;
      return decodeScoreConfigFromCookieValue(raw);
    })();
    const scoringConfig = configFromBody || configFromCookie || DEFAULT_SCORE_CONFIG;

    const timestamp = Date.now();
    const baseUrl = `https://www.jisilu.cn/data/cbnew/cb_list_new/?___jsl=LST___t=${timestamp}`;

    const baseCookieMap = parseCookieHeader(cookie);

    const preResp = await fetch('https://www.jisilu.cn/data/cbnew/', {
      method: 'GET',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Origin: 'https://www.jisilu.cn',
        Referer: 'https://www.jisilu.cn/',
        Cookie: cookieMapToHeader(baseCookieMap),
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
    });
    const preCookieMap = cookiesToMapFromSetCookie(getSetCookies(preResp.headers));
    const mergedCookieHeader = cookieMapToHeader(
      mergeCookieMaps(baseCookieMap, preCookieMap)
    );

    const fetchRedeemMap = async () => {
      const url = `https://www.jisilu.cn/webapi/cb/redeem/?___t=${Date.now()}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': UA,
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          Origin: 'https://www.jisilu.cn',
          Referer: 'https://www.jisilu.cn/data/cbnew/',
          Cookie: mergedCookieHeader,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
      });

      if (!resp.ok) {
        return new Map<string, { redeemStatus?: string; redeemIcon?: string }>();
      }

      const text = await resp.text();
      let data: any = text;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      let list: any[] = [];
      if (data?.rows) {
        list = data.rows;
      } else if (data?.data?.rows && Array.isArray(data.data.rows)) {
        list = data.data.rows;
      } else if (data?.data && Array.isArray(data.data)) {
        list = data.data;
      } else if (Array.isArray(data)) {
        list = data;
      }

      const map = new Map<string, { redeemStatus?: string; redeemIcon?: string }>();
      for (const row of list) {
        const item = row?.cell || row;
        const id = (item?.bond_id || item?.id || '').toString();
        if (!id) continue;
        const redeemStatus =
          item?.redeem_status !== undefined && item?.redeem_status !== null
            ? String(item.redeem_status)
            : item?.redeemStatus !== undefined && item?.redeemStatus !== null
              ? String(item.redeemStatus)
              : '';
        const redeemIcon =
          item?.redeem_icon !== undefined && item?.redeem_icon !== null
            ? String(item.redeem_icon)
            : item?.redeemIcon !== undefined && item?.redeemIcon !== null
              ? String(item.redeemIcon)
              : '';

        if (redeemStatus || redeemIcon) {
          map.set(id, { redeemStatus, redeemIcon });
        }
      }

      return map;
    };

    let redeemMap = new Map<string, { redeemStatus?: string; redeemIcon?: string }>();
    try {
      redeemMap = await fetchRedeemMap();
    } catch {
      redeemMap = new Map();
    }

    const fetchPage = async (page: number, rp: number) => {
      const url = `${baseUrl}&page=${page}&rp=${rp}`;
      const bodyParams = new URLSearchParams({
        page: String(page),
        rp: String(rp),
      });

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': UA,
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          Origin: 'https://www.jisilu.cn',
          Referer: 'https://www.jisilu.cn/data/cbnew/',
          Cookie: mergedCookieHeader,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        body: bodyParams.toString(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        return {
          ok: false as const,
          status: resp.status,
          statusText: resp.statusText,
          data: null as any,
        };
      }

      const data = await resp.json();
      return { ok: true as const, status: 200, statusText: 'OK', data };
    };

    const rp = 30;
    let page = 1;
    let total: number | null = null;
    let rawList: any[] = [];
    const seenIds = new Set<string>();

    while (page <= 200) {
      const r = await fetchPage(page, rp);
      if (!r.ok) {
        return NextResponse.json(
          {
            success: false,
            message: `网络错误: ${r.status} ${r.statusText}`,
          },
          { status: 502 }
        );
      }

      const data = r.data;
      let pageList: any[] = [];
      if (data?.rows) {
        pageList = data.rows;
      } else if (data?.data && Array.isArray(data.data)) {
        pageList = data.data;
      } else if (Array.isArray(data)) {
        pageList = data;
      } else {
        if (typeof data === 'string' && data.includes('登录')) {
          return NextResponse.json(
            { success: false, message: 'Cookie 无效或会话已过期，请重新登录' },
            { status: 401 }
          );
        }
        console.warn('Jisilu raw data', data);
        return NextResponse.json(
          { success: false, message: '集思录返回格式不符合预期' },
          { status: 500 }
        );
      }

      if (total === null && typeof data?.total === 'number') {
        total = data.total;
      }

      if (pageList.length === 0) {
        break;
      }

      const before = rawList.length;
      for (const row of pageList) {
        const item = row?.cell || row;
        const id = (item?.bond_id || item?.id || '').toString();
        if (!id) {
          rawList.push(row);
          continue;
        }
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        rawList.push(row);
      }
      const added = rawList.length - before;

      if (total !== null && rawList.length >= total) {
        break;
      }

      if (added === 0) {
        break;
      }

      page += 1;
    }

    const safeFloat = (val: string | number): number => {
      if (typeof val === 'number') return val;
      const parsed = parseFloat(val?.replace('%', ''));
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const scoreSeries = (values: Array<number | undefined>, largerBetter: boolean) => {
      const scored = new Array<number>(values.length).fill(0);
      const rows: Array<{ idx: number; v: number }> = [];

      for (let i = 0; i < values.length; i += 1) {
        const v = values[i];
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        rows.push({ idx: i, v });
      }

      const n = rows.length;
      if (n === 0) return scored;

      rows.sort((a, b) => a.v - b.v);

      let i = 0;
      while (i < n) {
        let j = i + 1;
        while (j < n && rows[j].v === rows[i].v) {
          j += 1;
        }

        const rankAvg = (i + 1 + j) / 2;
        const pct = rankAvg / n;
        const s = largerBetter ? pct : 1 - pct;

        for (let k = i; k < j; k += 1) {
          scored[rows[k].idx] = s;
        }

        i = j;
      }

      return scored;
    };

    const bonds: BondData[] = rawList.map((row: any) => {
      const item = row.cell || row;

      const volumeValue =
        item?.volume !== undefined && item?.volume !== null && item?.volume !== ''
          ? safeFloat(item.volume)
          : safeFloat(item.vol_in_2 || 0);

      const bondValue = safeFloat(item.bond_value);
      const price = safeFloat(item.price);
      const pureBondPremiumRate =
        bondValue > 0 ? ((price - bondValue) / bondValue) * 100 : 0;

      const redeem = redeemMap.get(String(item.bond_id || item.id || ''));

      return {
        id: item.bond_id,
        code: item.bond_id,
        name: item.bond_nm,
        price,
        priceChange: safeFloat(item.increase_rt),
        premiumRate: safeFloat(item.premium_rt),
        stockId: item.stock_id,
        stockName: item.stock_nm,
        stockPrice: safeFloat(item.sprice),
        stockChange: safeFloat(item.sincrease_rt),
        listDate: item.list_dt,
        bondValue,
        pureBondPremiumRate,
        redeemStatus: redeem?.redeemStatus,
        redeemIcon: redeem?.redeemIcon,
        rating: item.rating_cd,
        forceRedeemPrice: safeFloat(item.force_redeem_price),
        maturityDate: item.maturity_dt,
        remainingYear: safeFloat(item.year_left),
        currIssAmt: safeFloat(item.curr_iss_amt),
        volume: volumeValue,
        turnoverRate: safeFloat(item.turnover_rt),
        ytmRt: safeFloat(item.ytm_rt),
        doubleLow: safeFloat(item.dblow),
      };
    });

    const fYtm = scoringConfig.factors.ytmRt;
    const fPrem = scoringConfig.factors.premiumRate;
    const fAmt = scoringConfig.factors.currIssAmt;
    const fPureOr = scoringConfig.factors.pureBondPremiumRate;

    const sYtm = fYtm.enabled ? scoreSeries(bonds.map((b) => b.ytmRt), fYtm.largerBetter) : new Array(bonds.length).fill(0);
    const sPrem = fPrem.enabled ? scoreSeries(bonds.map((b) => b.premiumRate), fPrem.largerBetter) : new Array(bonds.length).fill(0);
    const sAmt = fAmt.enabled ? scoreSeries(bonds.map((b) => b.currIssAmt), fAmt.largerBetter) : new Array(bonds.length).fill(0);
    const sPureOr = fPureOr.enabled ? scoreSeries(bonds.map((b) => b.pureBondPremiumRate), fPureOr.largerBetter) : new Array(bonds.length).fill(0);

    for (let idx = 0; idx < bonds.length; idx += 1) {
      const b = bonds[idx];
      const vYtm = sYtm[idx] ?? 0;
      const vPrem = sPrem[idx] ?? 0;
      const vAmt = sAmt[idx] ?? 0;
      const vPureOr = sPureOr[idx] ?? 0;

      b.sYtm = vYtm;
      b.sPrem = vPrem;
      b.sAmt = vAmt;
      b.sPureOr = vPureOr;
      b.totalScore =
        vYtm * (fYtm.enabled ? fYtm.weight : 0) +
        vPrem * (fPrem.enabled ? fPrem.weight : 0) +
        vAmt * (fAmt.enabled ? fAmt.weight : 0) +
        vPureOr * (fPureOr.enabled ? fPureOr.weight : 0);
    }

    bonds.sort((a, b) => a.doubleLow - b.doubleLow);

    return NextResponse.json({ success: true, count: bonds.length, bonds });
  } catch (err: any) {
    console.error('Jisilu bonds error', err);
    return NextResponse.json(
      { success: false, message: err?.message || '获取可转债数据失败' },
      { status: 500 }
    );
  }
}
