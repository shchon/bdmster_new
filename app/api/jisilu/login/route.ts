import { NextRequest, NextResponse } from 'next/server';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const getSetCookies = (headers: Headers): string[] => {
  const anyHeaders = headers as any;
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie() as string[];
  }

  const raw = headers.get('set-cookie');
  if (!raw) return [];

  return raw.split(/,(?=[^;]+?=)/g);
};

const cookiesToMap = (setCookies: string[]) => {
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
    const { user_name, password } = await req.json();

    if (!user_name || !password) {
      return NextResponse.json(
        { success: false, message: '缺少用户名或密码' },
        { status: 400 }
      );
    }

    const preResp = await fetch('https://www.jisilu.cn/', {
      method: 'GET',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const preCookieMap = cookiesToMap(getSetCookies(preResp.headers));

    const loginUrl = 'https://www.jisilu.cn/webapi/account/login_process/';

    const params = new URLSearchParams({
      return_url: 'https://www.jisilu.cn/',
      user_name,
      password,
      aes: '1',
      auto_login: '1',
    });

    const resp = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://www.jisilu.cn',
        Referer: 'https://www.jisilu.cn/',
        Cookie: cookieMapToHeader(preCookieMap),
      },
      body: params.toString(),
    });

    let json: any = null;
    try {
      json = await resp.clone().json();
    } catch {
      // 登录成功时可能无 JSON，忽略解析错误
    }

    if (json && json.code === 413) {
      return NextResponse.json(
        { success: false, message: json.msg || '手机号/用户名或密码不一致' },
        { status: 401 }
      );
    }

    const loginCookieMap = cookiesToMap(getSetCookies(resp.headers));
    const mergedCookie = cookieMapToHeader(mergeCookieMaps(preCookieMap, loginCookieMap));

    if (!mergedCookie) {
      return NextResponse.json(
        { success: false, message: '登录可能成功，但未获得 Cookie' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '登录成功',
      cookie: mergedCookie,
    });
  } catch (err: any) {
    console.error('Jisilu login error', err);
    return NextResponse.json(
      { success: false, message: err?.message || '登录请求异常' },
      { status: 500 }
    );
  }
}
