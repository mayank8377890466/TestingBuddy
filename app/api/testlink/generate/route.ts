import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      jiraCredentials, 
      issueKeys, 
      llmConfig, 
      testSuiteName, 
      additionalContext, 
      prdContent, 
      targetCount, 
      existingCaseNames, 
      onlyXml, 
      testCases: inputTestCases 
    } = body;

    // Mode 1: Only generate XML from existing test cases
    if (onlyXml && inputTestCases) {
      const xml = generateTestLinkXML(inputTestCases, testSuiteName || 'Generated Test Cases');
      return NextResponse.json({ xml });
    }

    if (!llmConfig || !llmConfig.llmKey) {
      return NextResponse.json({ error: 'LLM API Key is required for test case generation.' }, { status: 400 });
    }

    // Step 1: Fetch issue details from Jira (if Jira credentials provided)
    let issueDetails: any[] = [];
    if (jiraCredentials && jiraCredentials.url && jiraCredentials.token && issueKeys && issueKeys.length > 0) {
      const cleanUrl = jiraCredentials.url.endsWith('/') ? jiraCredentials.url.slice(0, -1) : jiraCredentials.url;
      const authString = Buffer.from(`${jiraCredentials.email}:${jiraCredentials.token}`).toString('base64');

      for (const key of issueKeys.slice(0, 20)) {
        try {
          const resp = await fetch(`${cleanUrl}/rest/api/3/issue/${key.trim()}?fields=summary,description,issuetype,priority`, {
            headers: { 'Authorization': `Basic ${authString}`, 'Accept': 'application/json' }
          });
          if (resp.ok) {
            const data = await resp.json();
            issueDetails.push({
              key: data.key,
              summary: data.fields?.summary || 'No Summary',
              description: extractText(data.fields?.description) || 'No Description'
            });
          }
        } catch {}
      }
    }

    // Step 2: Generate test cases via LLM
    const issueContext = (issueDetails || []).map(i => `- [${i.key}] ${i.summary}\n  Description: ${i.description}`).join('\n');
    const batchSize = Math.min(Number(targetCount || 15), 30);
    
    // BUILD DYNAMIC PROMPT BASED ON INPUT COMBINATIONS
    let sourceContent = '';
    if (issueContext) sourceContent += `\n[JIRA TICKETS]:\n${issueContext}`;
    if (prdContent) sourceContent += `\n[PRD DOCUMENT]:\n${prdContent}`;
    if (additionalContext) sourceContent += `\n[SPECIAL DIRECTIVES / ADDITIONAL INFO]:\n${additionalContext}`;

    let prompt = `You are an expert QA Automation Architect. Generate a BATCH of ${batchSize} high-quality, professional test cases.
    
### REQUIREMENTS SOURCE:
${sourceContent || 'No specific requirements provided. Please generate generic high-quality test cases for standard software patterns based ONLY on the Special Directives provided below.'}

### SPECIAL DIRECTIVES:
${additionalContext || 'Follow standard QA best practices (Positive, Negative, Boundary, Edge cases).'}

${existingCaseNames && existingCaseNames.length > 0 ? `### EXISTING CASES (DO NOT DUPLICATE):\n${existingCaseNames.join(', ')}` : ''}

### MANDATORY RULES:
1. QUANTITY: Generate EXACTLY ${batchSize} new, unique test cases.
2. FORMAT: Return ONLY the JSON array. No markdown code fences, no preamble, no conversation.
3. STRUCTURE:
[
  {
    "name": "TC_XXX: Descriptive name",
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
5. LANGUAGE: Ensure test cases are professional and thorough.

### JSON OUTPUT ONLY:`;

    let testCases: any[] = [];
    const modelId = llmConfig.model || (llmConfig.llm === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o');
    
    const apiKey = (llmConfig.llmKey || '').trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'LLM API Key is required for test case generation.' }, { status: 400 });
    }

    let apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    let headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    if (llmConfig.llm === 'openai') {
      apiUrl = 'https://api.openai.com/v1/chat/completions';
    } else if (llmConfig.llm === 'openrouter') {
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      headers['HTTP-Referer'] = 'https://testingbuddy.ai'; // Required by OpenRouter
      headers['X-Title'] = 'TestingBuddy';
    }

    if (llmConfig.llm !== 'llama') {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2, // Slightly higher for more creative synthesis
          max_tokens: 2000
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        const rawContent = data.choices?.[0]?.message?.content || '';
        const parsed = parseJsonFromLLM(rawContent);
        
        if (parsed.length === 0 && rawContent.length > 10) {
           // If parsing failed but we got content, it might be a text response or malformed JSON
           return NextResponse.json({ 
             error: `AI Response Error: The AI returned text instead of a valid test case list. \n\nAI Response Snippet: "${rawContent.substring(0, 150)}..."` 
           }, { status: 400 });
        }
        testCases = parsed;
      } else {
        const errText = await resp.text();
        let errorMessage = errText;
        
        try {
          const errJson = JSON.parse(errText);
          const providerErr = errJson.error || errJson;
          
          if (providerErr.code === 'rate_limit_exceeded') {
            const waitTime = providerErr.message.match(/try again in ([\d.]+)s/i)?.[1] || 'a few';
            errorMessage = `Rate limit reached for ${modelId}. Please try again in ${waitTime} seconds, or switch to a different model in Settings.`;
          } else if (resp.status === 401 && llmConfig.llm === 'openrouter') {
             errorMessage = "OpenRouter Authentication failed. Please check if your API Key is correct and has sufficient credits.";
          } else {
            errorMessage = providerErr.message || errText;
          }
        } catch (e) {}

        return NextResponse.json({ 
          error: `${llmConfig.llm.toUpperCase()} Error: ${errorMessage}` 
        }, { status: resp.status || 500 });
      }
    } else {
      // Dynamic Ollama Implementation
      try {
        const baseUrl = llmConfig.llmKey.endsWith('/') ? llmConfig.llmKey.slice(0, -1) : llmConfig.llmKey;
        const resp = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId, 
            prompt: prompt,
            stream: false
          })
        });

        if (resp.ok) {
          const data = await resp.json();
          testCases = parseJsonFromLLM(data.response);
        } else {
          const errText = await resp.text();
          return NextResponse.json({ 
            error: `Ollama Error: HTTP ${resp.status} at ${baseUrl} - ${errText}` 
          }, { status: 400 });
        }
      } catch (err: any) {
        return NextResponse.json({ 
          error: `Failed to reach Ollama at ${llmConfig.llmKey}: ${err.message}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      status: 'success',
      testCases,
      count: testCases.length
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseJsonFromLLM(raw: string): any[] {
  try {
    let cleaned = raw.trim();
    
    // 1. Basic Cleaning
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    // 2. Find the array bounds
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    
    if (start !== -1) {
      if (end !== -1 && end > start) {
        // Complete or mostly complete array
        cleaned = cleaned.substring(start, end + 1);
      } else {
        // Truncated array (no closing ])
        cleaned = cleaned.substring(start);
      }
    }

    // 3. Repair common LLM issues (trailing commas, unclosed brackets)
    cleaned = repairJson(cleaned);
    
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Final JSON Parse failed:', err);
    return [];
  }
}

/**
 * Attempts to repair common JSON malformations from LLMs,
 * specifically trailing commas and truncated arrays/objects.
 */
function repairJson(json: string): string {
  let s = json.trim();
  
  // Remove trailing commas in arrays/objects: [1,2,] -> [1,2]
  s = s.replace(/,\s*([\]}])/g, '$1');
  
  // If it doesn't end with ] or }, it's likely truncated
  if (!s.endsWith(']') && !s.endsWith('}')) {
    // Brute force closure: add missing brackets until it (hopefully) parses
    // We'll try to find the last valid object boundary
    const lastObjectEnd = s.lastIndexOf('}');
    if (lastObjectEnd !== -1) {
      s = s.substring(0, lastObjectEnd + 1) + ']';
    } else {
      // Very broken, just try to append closures
      s += '}]'; 
    }
  }

  // Ensure it starts with [ and ends with ]
  if (!s.startsWith('[')) s = '[' + s;
  if (!s.endsWith(']')) s = s + ']';

  // Final sanity check for trailing commas again after repairs
  s = s.replace(/,\s*([\]}])/g, '$1');
  
  return s;
}

function generateTestLinkXML(testCases: any[], suiteName: string): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuite name="${escapeXml(suiteName)}">\n`;
  xml += `  <details><![CDATA[Auto-generated test cases using TestingBuddy AI]]></details>\n`;

  for (const tc of testCases) {
    xml += `  <testcase name="${escapeXml(tc.name)}">\n`;
    xml += `    <summary><![CDATA[${escapeXml(tc.summary || '')}]]></summary>\n`;
    xml += `    <preconditions><![CDATA[${escapeXml(tc.preconditions || 'None')}]]></preconditions>\n`;
    xml += `    <execution_type><![CDATA[1]]></execution_type>\n`;
    xml += `    <importance><![CDATA[${tc.importance || 2}]]></importance>\n`;

    if (tc.steps && tc.steps.length > 0) {
      xml += `    <steps>\n`;
      for (const step of tc.steps) {
        xml += `      <step>\n`;
        xml += `        <step_number><![CDATA[${step.step_number}]]></step_number>\n`;
        xml += `        <actions><![CDATA[${escapeXml(step.actions || '')}]]></actions>\n`;
        xml += `        <expectedresults><![CDATA[${escapeXml(step.expected_results || '')}]]></expectedresults>\n`;
        xml += `        <execution_type><![CDATA[1]]></execution_type>\n`;
        xml += `      </step>\n`;
      }
      xml += `    </steps>\n`;
    }
    xml += `  </testcase>\n`;
  }

  xml += `</testsuite>\n`;
  return xml;
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/]]>/g, ']]]]><![CDATA[>');
}

function extractText(description: any): string {
  if (!description) return '';
  if (typeof description === 'string') return description;
  if (description.content && Array.isArray(description.content)) {
    return description.content.map((block: any) => {
      if (block.content && Array.isArray(block.content)) {
        return block.content.map((inline: any) => inline.text || '').join('');
      }
      return '';
    }).filter(Boolean).join('\n');
  }
  return JSON.stringify(description).substring(0, 500);
}
