import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, email, token, projectKey, sprint } = body;

    // Validate inputs
    if (!url || !token || !projectKey) {
      return NextResponse.json({ error: 'Missing required connection or project fields' }, { status: 400 });
    }

    // Prepare Atlassian Basic Auth string
    const authString = Buffer.from(`${email}:${token}`).toString('base64');
    
    // Construct JQL
    let jql = '';
    const keyInput = projectKey.trim();

    // Check if user provided issue keys (e.g., PROJ-101 or comma-separated)
    if (keyInput.includes('-')) {
      const keys = keyInput.split(',').map((k: string) => `"${k.trim()}"`).join(', ');
      jql = `issueKey IN (${keys})`;
    } else {
      jql = `project = "${keyInput}"`;
      if (sprint) {
        jql += ` AND sprint = "${sprint}"`;
      }
    }
    
    // Strip trailing slash from URL if present
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;

    // Fetch from Jira Cloud API v3 Search endpoint
    const response = await fetch(`${cleanUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,issuetype`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Jira API Error: HTTP ${response.status} - ${err}` }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Invalid Response. The server returned an HTML page instead of API data. Please ensure you are using your actual workspace domain (e.g., https://yourworkspace.atlassian.net) instead of home.atlassian.com." }, { status: 400 });
    }

    const data = await response.json();
    
    // Parse the nested Jira JSON into a flat array of essential issue details
    const issues = (data.issues || []).map((issue: any) => ({
      key: issue.key,
      summary: issue.fields?.summary || 'No Summary',
      type: issue.fields?.issuetype?.name || 'Unknown'
    }));

    return NextResponse.json({ issues, total: data.total });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
