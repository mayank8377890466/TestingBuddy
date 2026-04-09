/**
 * B.L.A.S.T. Framework Phase 2: Link (Connectivity)
 * Minimal script to verify Jira external service is responding correctly.
 */

export async function verifyJiraConnection(url, email, token) {
  try {
    const authString = Buffer.from(`${email}:${token}`).toString('base64');
    
    console.log(`[Link Phase] Testing Jira Connection to: ${url}`);
    
    // Test endpoint to get current user info
    const response = await fetch(`${url}/rest/api/3/myself`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Accept": "application/json"
      }
    });

    if (response.ok) {
      console.log(`[Link Phase] Success: Jira Connection Verified.`);
      return { success: true, status: response.status };
    } else {
      console.log(`[Link Phase] Failed: HTTP ${response.status}`);
      return { success: false, status: response.status, error: await response.text() };
    }
  } catch (error) {
    console.error(`[Link Phase] Error connecting to Jira:`, error);
    return { success: false, error: error.message };
  }
}

// Simulated run if executed directly (requires valid .env or passed args to actually succeed)
if (process.argv[1] === new URL(import.meta.url).pathname || process.argv[1].endsWith('fetchJira.mjs')) {
    console.log("[Link Phase] Handshake module ready. Awaiting on-the-fly credentials from UI.");
}
