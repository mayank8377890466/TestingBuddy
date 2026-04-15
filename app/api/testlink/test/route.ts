import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url, devKey } = await req.json();

    if (!url || !devKey) {
      return NextResponse.json({ success: false, error: 'TestLink URL and Developer Key are required.' }, { status: 400 });
    }

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
       cleanUrl = `http://${cleanUrl}`;
    }
    cleanUrl = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;
    const xmlRpcEndpoint = `${cleanUrl}/lib/api/xmlrpc/v1/xmlrpc.php`;

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>tl.checkDevKey</methodName>
  <params>
    <param><value><struct>
      <member><name>devKey</name><value><string>${escapeXml(devKey)}</string></value></member>
    </struct></value></param>
  </params>
</methodCall>`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(xmlRpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xmlBody,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `TestLink server returned HTTP ${response.status}. Verify your TestLink URL is correct.` 
      }, { status: 400 });
    }

    const responseText = await response.text();

    // Check for logical error codes (e.g. invalid key)
    if (responseText.includes('<name>code</name>') && responseText.includes('<name>message</name>')) {
       const msgMatch = responseText.match(/<name>message<\/name>\s*<value>\s*<string>(.*?)<\/string>/);
       const errorMessage = msgMatch ? msgMatch[1] : 'TestLink API Error';
       return NextResponse.json({ success: false, error: errorMessage }, { status: 401 });
    }

    // Check for explicitly valid boolean true result
    if (responseText.includes('<boolean>1</boolean>') || responseText.includes('<value>true</value>')) {
      return NextResponse.json({ success: true, message: 'TestLink connection verified successfully.' });
    }

    // If it reaches here, it didn't explicitly return true, so it's likely a failure
    return NextResponse.json({ 
      success: false, 
      error: 'Connection failed: API did not return a successful validation. Please check your Developer Key.' 
    }, { status: 401 });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: `Connection failed: ${error.message}. Ensure the TestLink server is reachable.` 
    }, { status: 500 });
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
