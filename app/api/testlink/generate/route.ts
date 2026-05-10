import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { jiraCredentials, issueKeys, llmConfig, testSuiteName, additionalContext, prdContent, targetCount, existingCaseNames, testCases: inputTestCases, onlyXml } = await req.json();
    
    // If we only need XML, skip LLM generation
    if (onlyXml && inputTestCases) {
      const xml = generateTestLinkXML(inputTestCases, testSuiteName || 'Generated Test Cases');
      return NextResponse.json({ xml });
    }

    const batchSize = targetCount || 5;

    if (!llmConfig || !llmConfig.llmKey) {
      return NextResponse.json({ error: 'LLM API Key is required for test case generation.' }, { status: 400 });
    }

    // Step 1: Fetch issue details from Jira (if Jira credentials provided)
    let issueDetails: any[] = [];

    if (jiraCredentials && jiraCredentials.url && jiraCredentials.token && issueKeys && issueKeys.length > 0) {
      const cleanUrl = jiraCredentials.url.endsWith('/') ? jiraCredentials.url.slice(0, -1) : jiraCredentials.url;
      const authString = Buffer.from(`${jiraCredentials.email}:${jiraCredentials.token}`).toString('base64');

      // Fetch each issue's details
      for (const key of issueKeys.slice(0, 20)) { // max 20 issues
        try {
          const resp = await fetch(`${cleanUrl}/rest/api/3/issue/${key.trim()}?fields=summary,description,issuetype,priority,acceptance_criteria`, {
            headers: {
              'Authorization': `Basic ${authString}`,
              'Accept': 'application/json'
            }
          });
          if (resp.ok) {
            const data = await resp.json();
            issueDetails.push({
              key: data.key,
              summary: data.fields?.summary || 'No Summary',
              description: extractText(data.fields?.description) || 'No Description',
              type: data.fields?.issuetype?.name || 'Unknown',
              priority: data.fields?.priority?.name || 'Medium',
            });
          }
        } catch {
          // Skip issues that fail to fetch
        }
      }
    }

    // If no issues fetched from Jira, use the issueKeys as manual input
    if (issueDetails.length === 0 && issueKeys) {
      issueDetails = issueKeys.map((key: string) => ({
        key: key.trim(),
        summary: key.trim(),
        description: key.trim(),
        type: 'Requirement',
        priority: 'Medium',
      }));
    }

    const isLocalModel = (llmConfig.llm !== 'groq' && llmConfig.llm !== 'openai' && llmConfig.llm !== 'openrouter');

    // Limit existing names and normalize them to show scenarios clearly
    const safeExistingNames = (existingCaseNames || []).slice(-30);
    const existingScenarios = safeExistingNames.map((n: string) => n.replace(/^TC_\d+:\s*/i, '').trim());

    // Calculate next TC number for continuity
    let nextTcNumber = 1;
    if (safeExistingNames.length > 0) {
      const numbers = safeExistingNames.map((n: string) => {
        const match = n.match(/TC_(\d+)/i);
        return match ? parseInt(match[1]) : 0;
      });
      nextTcNumber = Math.max(...numbers, 0) + 1;
    }

    // Truncate PRD aggressively for local models
    const maxChars = isLocalModel ? 3000 : 35000;
    const safePrdContent = prdContent ? prdContent.substring(0, maxChars) : '';

    let sourceContent = issueDetails.map((i: any) =>
      `- [${i.key}] (${i.type}, Priority: ${i.priority}): ${i.summary}\n  Description: ${i.description}`
    ).join('\n');
    
    if (safePrdContent) sourceContent += `\n[PRD DOCUMENT]:\n${safePrdContent}`;
    if (additionalContext) sourceContent += `\n[SPECIAL DIRECTIVES / ADDITIONAL INFO]:\n${additionalContext}`;

    let prompt = `You are an expert QA Automation Architect. Generate EXACTLY ${batchSize} NEW, HIGH-VARIETY test cases. 
   
### CRITICAL: NO SEMANTIC DUPLICATES & VARIETY RULES
1. START NUMBERING FROM: TC_${nextTcNumber}
2. TOTAL NEW CASES TO GENERATE: ${batchSize}
3. DO NOT REPEAT THE CONCEPT: Do not generate a case if the logic is already covered by these existing scenarios:
${existingScenarios.length > 0 ? existingScenarios.map(s => `- ${s}`).join('\n') : '- None'}

4. FUNCTIONAL DIVERSITY IS MANDATORY:
   - Each of the ${batchSize} cases MUST test a fundamentally DIFFERENT functional requirement or failure mode.
   - For example: If you already have a "Wrong Password" case, do not add "Incorrect Password Length" in the same batch unless it tests a specific boundary rule.
   - NO FILLER: Do not create cases that differ only in wording (e.g., "Check Login" vs "Verify Login").

5. STEP QUALITY:
   - Steps must be actionable (e.g., "Enter 'Admin' in username field").
   - Expected results must be specific (e.g., "Error message 'Invalid Credentials' is displayed").

### REQUIREMENTS SOURCE:
${sourceContent || 'No specific requirements provided.'}

### MANDATORY RULES:
1. QUANTITY: Generate EXACTLY ${batchSize} new, unique test cases.
2. FORMAT: Return ONLY the JSON array. No markdown code fences, no preamble, no conversation.
3. STRUCTURE:
[
  {
    "name": "TC_${nextTcNumber}: [Action] [Object] [Outcome]",
    "summary": "Detailed validation description",
    "preconditions": "Requirements",
    "importance": 2,
    "execution_type": 1,
    "steps": [
      { "step_number": 1, "actions": "Action", "expected_results": "Outcome" }
    ]
  }
]
4. ATTRIBUTES: importance (1=L, 2=M, 3=H), execution_type (1=Manual, 2=Auto).
5. NAMES: DO NOT use the word 'Title' as the test case name. Names MUST be descriptive and unique.
6. CONTENT: Base every test case on the provided PRD and Context.

### JSON OUTPUT:
`;

    let testCases: any[] = [];

    if (llmConfig.llm === 'groq') {
      let modelId = llmConfig.model || 'llama-3.3-70b-versatile';
      // Auto-fix for common missing suffix error
      if (modelId === 'llama-3.3-70b') modelId = 'llama-3.3-70b-versatile';

      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmConfig.llmKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.15,
          max_tokens: 8000
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return NextResponse.json({ error: `GROQ Error: HTTP ${resp.status} - ${errText}` }, { status: 400 });
      }

      const data = await resp.json();
      testCases = parseJsonFromLLM(data.choices[0].message.content);

    } else if (llmConfig.llm === 'openai') {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmConfig.llmKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: llmConfig.model || 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        })
      });
      if (!resp.ok) throw new Error(`OpenAI Error: ${await resp.text()}`);
      const data = await resp.json();
      testCases = parseJsonFromLLM(data.choices[0].message.content);

    } else if (llmConfig.llm === 'openrouter') {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmConfig.llmKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://testing-buddy.vercel.app',
          'X-Title': 'TestingBuddy'
        },
        body: JSON.stringify({
          model: llmConfig.model || 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        })
      });
      if (!resp.ok) throw new Error(`OpenRouter Error: ${await resp.text()}`);
      const data = await resp.json();
      testCases = parseJsonFromLLM(data.choices[0].message.content);

    } else if (llmConfig.llm === 'lmstudio') {
      let baseUrl = (llmConfig.llmKey || 'http://localhost:1234/v1').trim();
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: llmConfig.model || 'local-model',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        })
      });
      if (!resp.ok) throw new Error(`LM Studio Error: ${await resp.text()}`);
      const data = await resp.json();
      testCases = parseJsonFromLLM(data.choices[0].message.content);

    } else {
      // Ollama: use the URL from settings (llmKey) and the model from settings
      let ollamaBase = (llmConfig.llmKey || 'http://127.0.0.1:11434').trim();
      if (ollamaBase.endsWith('/')) ollamaBase = ollamaBase.slice(0, -1);
      ollamaBase = ollamaBase.replace('localhost', '127.0.0.1');
      const ollamaModel = llmConfig.model || 'qwen2.5:0.5b';

      const resp = await fetch(`${ollamaBase}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: prompt,
          stream: false
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return NextResponse.json({ error: `Ollama Error: HTTP ${resp.status} - ${errText}` }, { status: 400 });
      }

      const data = await resp.json();
      testCases = parseJsonFromLLM(data.response);
    }

    if (!testCases || testCases.length === 0) {
      return NextResponse.json({ error: 'Failed to parse test cases from LLM response.' }, { status: 400 });
    }

    // Step 3: Generate TestLink-compatible XML
    const xml = generateTestLinkXML(testCases, testSuiteName || 'Generated Test Cases');

    return NextResponse.json({
      status: 'success',
      testCases,
      xml,
      count: testCases.length
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseJsonFromLLM(raw: string): any[] {
  try {
    let cleaned = raw.trim();

    // Remove code fences
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();

    // If the LLM output is just a raw list of objects without [ ], wrap it
    if (cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      cleaned = '[' + cleaned + ']';
    }

    // Find the JSON array boundaries
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
    }

    // Try to repair common trailing comma issues and unclosed braces
    cleaned = repairJson(cleaned);

    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    console.error("JSON Parse Error:", err, "Raw Output:", raw);
    return [];
  }
}

function repairJson(s: string): string {
  let cleaned = s.trim();
  // Ensure starts with [ and ends with ]
  if (!cleaned.startsWith('[')) cleaned = '[' + cleaned;
  if (!cleaned.endsWith(']')) {
    // If it ends with } or }, just close it
    if (cleaned.endsWith('}')) cleaned += ']';
    else if (cleaned.endsWith('},')) cleaned = cleaned.slice(0, -1) + ']';
    else cleaned += '}]';
  }
  
  // Basic balance check
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    for (let i = 0; i < openBraces - closeBraces; i++) cleaned += '}';
    if (!cleaned.endsWith(']')) cleaned += ']';
  }
  
  return cleaned;
}

function escapeXmlCdata(str: string): string {
  if (!str) return '';
  // CDATA cannot contain ]]>, so we split it
  return str.replace(/]]>/g, ']]]><![CDATA[>');
}

function generateTestLinkXML(testCases: any[], suiteName: string): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuite name="${escapeXmlAttr(suiteName || 'Default Suite')}">\n`;
  xml += `  <details><![CDATA[Auto-generated test cases from Jira tickets using TestingBuddy AI]]></details>\n`;

  for (const tc of testCases) {
    const tcName = tc.name || `Generated Test Case ${Math.floor(Math.random() * 9000) + 1000}`;
    xml += `  <testcase name="${escapeXmlAttr(tcName)}">\n`;
    xml += `    <summary><![CDATA[${escapeXmlCdata(tc.summary || '')}]]></summary>\n`;
    xml += `    <preconditions><![CDATA[${escapeXmlCdata(tc.preconditions || 'None')}]]></preconditions>\n`;
    xml += `    <execution_type><![CDATA[${tc.execution_type || 1}]]></execution_type>\n`;
    xml += `    <importance><![CDATA[${tc.importance || 2}]]></importance>\n`;

    if (tc.steps && tc.steps.length > 0) {
      xml += `    <steps>\n`;
      for (const step of tc.steps) {
        xml += `      <step>\n`;
        xml += `        <step_number><![CDATA[${step.step_number}]]></step_number>\n`;
        xml += `        <actions><![CDATA[${escapeXmlCdata(step.actions || '')}]]></actions>\n`;
        xml += `        <expectedresults><![CDATA[${escapeXmlCdata(step.expected_results || '')}]]></expectedresults>\n`;
        xml += `        <execution_type><![CDATA[${tc.execution_type || 1}]]></execution_type>\n`;
        xml += `      </step>\n`;
      }
      xml += `    </steps>\n`;
    }

    xml += `  </testcase>\n`;
  }

  xml += `</testsuite>\n`;
  return xml;
}

function escapeXmlAttr(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Extract plain text from Jira's Atlassian Document Format (ADF)
function extractText(description: any): string {
  if (!description) return '';
  if (typeof description === 'string') return description;
  
  // ADF format
  if (description.content && Array.isArray(description.content)) {
    return description.content
      .map((block: any) => {
        if (block.content && Array.isArray(block.content)) {
          return block.content.map((inline: any) => inline.text || '').join('');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  
  return JSON.stringify(description).substring(0, 500);
}
