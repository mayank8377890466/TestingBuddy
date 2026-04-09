import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { jiraCredentials, issueKeys, llmConfig, testSuiteName, additionalContext, prdContent } = await req.json();

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

    // Step 2: Generate test cases via LLM
    const issueContext = issueDetails.map(i =>
      `- [${i.key}] (${i.type}, Priority: ${i.priority}): ${i.summary}\n  Description: ${i.description}`
    ).join('\n');

    let prompt = `You are an expert QA Engineer. Generate detailed, structured test cases for the following Jira tickets that can be imported into TestLink.

Requirements:
${issueContext}
`;

    if (prdContent) {
      prompt += `\nPRD DOCUMENT CONTEXT:\n${prdContent}\n`;
    }

    if (additionalContext) {
      prompt += `\nADDITIONAL INSTRUCTIONS:\n${additionalContext}\n`;
    }

    prompt += `
Test Suite Name: "${testSuiteName || 'Generated Test Cases'}"

Generate test cases in the following STRICT JSON format. Return ONLY the JSON array, no other text, no markdown code fences:

[
  {
    "name": "TC_001: Descriptive test case name",
    "summary": "Brief description of what this test case validates",
    "preconditions": "Any preconditions that must be met before executing this test",
    "importance": 2,
    "execution_type": 1,
    "steps": [
      {
        "step_number": 1,
        "actions": "Detailed action to perform",
        "expected_results": "Expected outcome of this action"
      }
    ]
  }
]

RULES:
- importance: 1=Low, 2=Medium, 3=High
- execution_type: 1=Manual, 2=Automated
- Generate 3-8 test cases per Jira ticket covering:
  - Positive/happy path scenarios
  - Negative/error scenarios
  - Boundary value scenarios
  - Edge cases
- Each test case should have 3-7 detailed steps
- Test case names should follow TC_XXX naming convention
- Be specific and actionable — no vague steps
- Derive ALL test cases directly from the provided requirements${prdContent || additionalContext ? ' and external context' : ''}
- Return ONLY valid JSON array, nothing else`;

    let testCases: any[] = [];

    if (llmConfig.llm === 'groq') {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmConfig.llmKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
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
      const rawContent = data.choices[0].message.content;

      // Parse JSON from LLM response (strip possible markdown fences)
      testCases = parseJsonFromLLM(rawContent);
    } else {
      const resp = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: prompt,
          stream: false
        })
      });

      if (!resp.ok) {
        return NextResponse.json({ error: `Ollama Error: HTTP ${resp.status}` }, { status: 400 });
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
    // Strip markdown code fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    // Find the JSON array
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
    }

    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

function escapeXmlCdata(str: string): string {
  // CDATA cannot contain ]]>, so we split it
  return str.replace(/]]>/g, ']]]]><![CDATA[>');
}

function generateTestLinkXML(testCases: any[], suiteName: string): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuite name="${escapeXmlAttr(suiteName)}">\n`;
  xml += `  <details><![CDATA[Auto-generated test cases from Jira tickets using TestingBuddy AI]]></details>\n`;

  for (const tc of testCases) {
    xml += `  <testcase name="${escapeXmlAttr(tc.name)}">\n`;
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
