import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { provider, url, email, token } = await req.json();

    if (!url || !token) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
    }

    if (provider === 'jira') {
      const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const authString = Buffer.from(`${email}:${token}`).toString('base64');

      const response = await fetch(`${cleanUrl}/rest/api/3/myself`, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: `Jira HTTP ${response.status}` }, { status: 401 });
      }
    }

    if (provider === 'ado') {
      // Azure DevOps simulated check (Basic Auth with PAT)
      return NextResponse.json({ success: true, note: 'ADO Simulated' });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
