import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { testCases, testSuiteName, projectName, testlinkCredentials } = await req.json();

    if (!testlinkCredentials || !testlinkCredentials.url || !testlinkCredentials.devKey) {
      return NextResponse.json({ error: 'Missing TestLink credentials for upload' }, { status: 400 });
    }

    if (!projectName) {
      return NextResponse.json({ error: 'TestLink Project Name is required for upload' }, { status: 400 });
    }

    if (!testCases || testCases.length === 0) {
      return NextResponse.json({ error: 'No test cases provided to upload' }, { status: 400 });
    }

    let rpcUrl = testlinkCredentials.url;
    if (!rpcUrl.endsWith('xmlrpc.php')) {
        const cleanBasis = rpcUrl.endsWith('/') ? rpcUrl.slice(0, -1) : rpcUrl;
        rpcUrl = `${cleanBasis}/lib/api/xmlrpc/v1/xmlrpc.php`;
    }

    // Helper to send XML-RPC request
    const sendRpc = async (method: string, structData: Record<string, any>) => {
      let members = '';
      for (const [k, v] of Object.entries(structData)) {
         let typeStr = `<string>${escapeXml(String(v))}</string>`;
         if (typeof v === 'number') typeStr = `<int>${v}</int>`;
         if (Array.isArray(v)) {
            // Very naive array of struct serialization for steps
            const elements = v.map(item => {
               let innerMembers = '';
               for (const [ik, iv] of Object.entries(item)) {
                 let iTypeStr = `<string>${escapeXml(String(iv))}</string>`;
                 if (typeof iv === 'number') iTypeStr = `<int>${iv}</int>`;
                 innerMembers += `<member><name>${ik}</name><value>${iTypeStr}</value></member>`;
               }
               return `<value><struct>${innerMembers}</struct></value>`;
            }).join('');
            typeStr = `<array><data>${elements}</data></array>`;
         }
         members += `<member><name>${k}</name><value>${typeStr}</value></member>`;
      }
      
      const payload = `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
    <param><value><struct>${members}</struct></value></param>
  </params>
</methodCall>`;

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: payload
      });

      if (!response.ok) throw new Error(`TestLink server returned ${response.status}`);
      const text = await response.text();
      return text;
    };

    const extractStringValueSafely = (xml: string, keyToFind: string) => {
        // Naive extraction of <name>id</name><value><string>5</string></value>
        const match = xml.match(new RegExp(`<name>${keyToFind}</name>\\s*<value>\\s*<(string|int)>(.*?)<\\/\\1>`));
        if (match && match[2]) return parseInt(match[2], 10);
        return null;
    };
    
    // 1. Get Project ID
    const projRes = await sendRpc('tl.getTestProjectByName', { 
        devKey: testlinkCredentials.devKey, 
        testprojectname: projectName 
    });
    const projectId = extractStringValueSafely(projRes, 'id');
    
    if (!projectId) {
       return NextResponse.json({ error: `Could not find Test Project by name: ${projectName}` }, { status: 400 });
    }

    // 2. Create Test Suite
    const suiteRes = await sendRpc('tl.createTestSuite', {
        devKey: testlinkCredentials.devKey,
        testprojectid: projectId,
        testsuitename: testSuiteName || 'Generated Output',
        details: 'Auto-generated suite by TestingBuddy AI'
    });
    // TestLink createTestSuite returns [{ id: 'xx', ... }] or { status: false, message: ...}
    // We try to extract id or just grab the first ID found inside an array response
    let suiteId = extractStringValueSafely(suiteRes, 'id');
    if (!suiteId) {
        const fallbackMatch = suiteRes.match(/<value><string>(\d+)<\/string><\/value>/);
        if (fallbackMatch) suiteId = parseInt(fallbackMatch[1], 10);
        
        if (!suiteId) {
            // It might already exist, so fetch existing suites
            const fetchSuitesRes = await sendRpc('tl.getFirstLevelTestSuitesForTestProject', {
               devKey: testlinkCredentials.devKey,
               testprojectid: projectId
            });
            const targetSuiteName = testSuiteName || 'Generated Output';
            const structMatches = fetchSuitesRes.match(/<struct>[\s\S]*?<\/struct>/g);
            if (structMatches) {
               for (const struct of structMatches) {
                  if (struct.includes(`<value><string>${targetSuiteName}</string></value>`)) {
                      suiteId = extractStringValueSafely(struct, 'id');
                      break;
                  }
               }
            }
        }

        if (!suiteId) {
           return NextResponse.json({ error: `Failed to create/resolve Test Suite: ${testSuiteName || 'Generated Output'}` }, { status: 400 });
        }
    }

    // 3. Create Test Cases
    let createdCount = 0;
    for (const tc of testCases) {
       const stepsArr = (tc.steps || []).map((s: any) => ({
          step_number: s.step_number || 1,
          actions: s.actions || '',
          expected_results: s.expected_results || '',
          execution_type: tc.execution_type || 1
       }));

       const tcRes = await sendRpc('tl.createTestCase', {
           devKey: testlinkCredentials.devKey,
           testcasename: tc.name.substring(0, 100),
           testsuiteid: suiteId,
           testprojectid: projectId,
           authorlogin: 'admin', // Or any string, can be ignored mostly
           summary: tc.summary || '',
           steps: stepsArr,
           preconditions: tc.preconditions || '',
           importance: tc.importance || 2,
           executiontype: tc.execution_type || 1
       });

       if (tcRes.includes('status') && !tcRes.includes('<value><boolean>0</boolean></value>')) {
          createdCount++;
       } else if (tcRes.includes('"status":true') || tcRes.includes('id')) {
          createdCount++;
       }
    }

    return NextResponse.json({ 
        success: true, 
        count: createdCount,
        message: "Test Cases uploaded successfully to TestLink via XML-RPC."
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function escapeXml(str: string) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
