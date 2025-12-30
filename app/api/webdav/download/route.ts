import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cfg = body?.cfg as {
      endpoint: string;
      path: string;
      username?: string;
      password?: string;
    } | undefined;

    if (!cfg || !cfg.endpoint || !cfg.path) {
      return NextResponse.json(
        { success: false, message: '缺少 WebDAV 配置' },
        { status: 400 },
      );
    }

    const url = cfg.endpoint.replace(/\/$/, '') + cfg.path;
    const headers: Record<string, string> = {
      Accept: 'application/json, */*',
    };
    if (cfg.username) {
      const auth = Buffer.from(`${cfg.username}:${cfg.password ?? ''}`).toString('base64');
      headers.Authorization = `Basic ${auth}`;
    }

    const resp = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!resp.ok) {
      return NextResponse.json(
        { success: false, message: `下载失败: ${resp.status} ${resp.statusText}` },
        { status: 502 },
      );
    }

    const text = await resp.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, message: '下载的数据不是有效的 JSON。' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || '下载异常' },
      { status: 500 },
    );
  }
}
