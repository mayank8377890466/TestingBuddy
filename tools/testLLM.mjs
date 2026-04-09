/**
 * B.L.A.S.T. Framework Phase 2: Link (Connectivity)
 * Minimal script to verify LLM (GROQ/Llama) external service is responding correctly.
 */

export async function verifyGroqConnection(apiKey) {
  try {
    console.log(`[Link Phase] Testing GROQ API Connection...`);
    
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log(`[Link Phase] Success: GROQ API Connection Verified.`);
      return { success: true, status: response.status };
    } else {
      console.log(`[Link Phase] Failed: HTTP ${response.status}`);
      return { success: false, status: response.status, error: await response.text() };
    }
  } catch (error) {
    console.error(`[Link Phase] Error connecting to GROQ:`, error);
    return { success: false, error: error.message };
  }
}

// Simulated run if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname || process.argv[1].endsWith('testLLM.mjs')) {
    console.log("[Link Phase] Handshake module ready. Awaiting on-the-fly GROQ API Key from UI.");
}
