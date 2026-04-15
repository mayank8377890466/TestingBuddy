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
        // Find member with specified name - handles both structural and flat matches
        const memberRegex = new RegExp(`<member>\\s*<name>${keyToFind}<\\/name>\\s*<value>\\s*<(string|int)>(.*?)<\\/\\1>`, 'is');
        const match = xml.match(memberRegex);
        if (match && match[2]) return match[2].trim();
        
        // Secondary fallback for <struct><value><int>XXX</int></value></struct> patterns found in some TestLink versions
        const valueOnlyRegex = new RegExp(`<value>\\s*<(string|int)>(.*?)<\\/\\1>`, 'is');
        const valueMatch = xml.match(valueOnlyRegex);
        if (valueMatch && valueMatch[2]) return valueMatch[2].trim();

        return null;
    };

    const extractErrorMessage = (xml: string) => {
        const msgMatch = xml.match(/<name>message<\/name>\s*<value>\s*<string>(.*?)<\/string>/is);
        return msgMatch ? msgMatch[1] : null;
    };
    
    // 1. Get Project ID
    const projRes = await sendRpc('tl.getTestProjectByName', { 
        devKey: testlinkCredentials.devKey, 
        testprojectname: projectName 
    });
    
    const projectIdRaw = extractStringValueSafely(projRes, 'id');
    const projectId = projectIdRaw ? parseInt(projectIdRaw, 10) : NaN;
    
    if (isNaN(projectId) || projectId <= 0) {
       const apiError = extractErrorMessage(projRes);
       return NextResponse.json({ 
         error: apiError || `Could not find Test Project by name: "${projectName}". Please ensure the name matches exactly in TestLink.` 
       }, { status: 400 });
    }

    // 2. Create or Resolve Test Suite
    const suiteRes = await sendRpc('tl.createTestSuite', {
        devKey: testlinkCredentials.devKey,
        testprojectid: projectId,
        testsuitename: testSuiteName || 'Generated Output',
        details: 'Auto-generated suite by TestingBuddy AI'
    });
    
    let suiteIdRaw = extractStringValueSafely(suiteRes, 'id');
    let suiteId = suiteIdRaw ? parseInt(suiteIdRaw, 10) : NaN;
    
    // Fallback: If creation failed (likely exists), fetch it
    if (isNaN(suiteId) || suiteId <= 0) {
        const fetchSuitesRes = await sendRpc('tl.getFirstLevelTestSuitesForTestProject', {
           devKey: testlinkCredentials.devKey,
           testprojectid: projectId
        });
        
        const targetSuiteName = testSuiteName || 'Generated Output';
        // TestLink returns an array of structs for multiple suites
        const structMatches = fetchSuitesRes.match(/<struct>[\s\S]*?<\/struct>/gi);
        if (structMatches) {
           for (const structXml of structMatches) {
              const nameValue = extractStringValueSafely(structXml, 'name');
              if (nameValue && nameValue.toLowerCase() === targetSuiteName.toLowerCase()) {
                  const idValue = extractStringValueSafely(structXml, 'id');
                  if (idValue) {
                      suiteId = parseInt(idValue, 10);
                      break;
                  }
              }
           }
        }

        if (isNaN(suiteId) || suiteId <= 0) {
           const apiError = extractErrorMessage(suiteRes);
           return NextResponse.json({ 
             error: apiError || `Failed to resolve Test Suite: "${targetSuiteName}". Please create it manually in TestLink project ID ${projectId} first.` 
           }, { status: 400 });
        }
    }

    // Final Validation
    const finalSuiteId = suiteId;
    const finalProjectId = projectId;

    // 3. Create Test Cases
    let createdCount = 0;
    let errorSummary: string[] = [];
    
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
           testsuiteid: finalSuiteId,
           testprojectid: finalProjectId,
           authorlogin: 'admin', 
           summary: tc.summary || '',
           steps: stepsArr,
           preconditions: tc.preconditions || '',
           importance: tc.importance || 2,
           executiontype: tc.execution_type || 1
       });

       // TestLink returns:
       // Success: [{ id: "...", ... }]
       // Failure: [{ code: 504, message: "Duplicate name" }]
       const hasId = tcRes.includes('<name>id</name>') || tcRes.match(/<value><string>\d+<\/string><\/value>/);
       const isExplicitTrue = tcRes.includes('<boolean>1</boolean>') || tcRes.includes('"status":true');
       
       if (hasId || isExplicitTrue) {
          createdCount++;
       } else {
          // Extract specific error if it failed
          const apiError = extractErrorMessage(tcRes);
          if (apiError) {
             if (!errorSummary.includes(apiError)) errorSummary.push(apiError);
          }
       }
    }

    let finalMessage = `Successfully uploaded ${createdCount} of ${testCases.length} cases.`;
    if (errorSummary.length > 0) {
       finalMessage += ` Note: ${errorSummary.join('; ')}`;
    }

    return NextResponse.json({ 
        success: true, 
        count: createdCount,
        message: finalMessage
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function escapeXml(str: string) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
