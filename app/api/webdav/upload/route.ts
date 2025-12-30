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
    const payload = body?.payload;

    if (!cfg || !cfg.endpoint || !cfg.path) {
      return NextResponse.json(
        { success: false, message: '缺少 WebDAV 配置' },
        { status: 400 },
      );
    }

    const url = cfg.endpoint.replace(/\/$/, '') + cfg.path;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cfg.username) {
      const auth = Buffer.from(`${cfg.username}:${cfg.password ?? ''}`).toString('base64');
      headers.Authorization = `Basic ${auth}`;
    }

    const resp = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload ?? {}),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { success: false, message: `上传失败: ${resp.status} ${resp.statusText}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || '上传异常' },
      { status: 500 },
    );
  }
}
