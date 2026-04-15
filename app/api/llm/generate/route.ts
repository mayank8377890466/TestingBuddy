import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { credentials, issues } = await req.json();

    if (!credentials || !credentials.llmKey) {
      return NextResponse.json({ error: 'LLM API Key missing in setup.' }, { status: 400 });
    }

    const issueList = issues.map((i: any) => `- [${i.key}] (${i.type}): ${i.summary}`).join('\n');

    const prompt = `You are an expert QA Architect with 15+ years of experience creating enterprise-grade test plans. Generate a comprehensive, production-ready Test Plan for the following Jira tickets:

${issueList}

You MUST follow the EXACT structure below. Each section must be thorough, detailed, and specifically tailored to the tickets provided. Do NOT produce generic filler content — every bullet must be relevant to the actual functionality described in the tickets.

---

# Test Plan

## 1. Objective
Write a clear, specific objective statement that:
- Defines the goal to ensure quality, functionality, and reliability of the features described
- Mentions tracking both leading and lagging indicators for the test effort's impact
- References the specific technologies/systems involved (infer from ticket context)
- States the quality standards to be achieved

## 2. Scope
Provide a numbered list covering ALL applicable testing types. For each type, write 2-3 specific bullet points explaining what will be tested based on the actual tickets:
1. **Functional Testing** — Verify correctness of all features/endpoints/UI flows per requirements
2. **Data Validation Testing** — Input validation, boundary values, response data accuracy
3. **Error Handling Testing** — Error codes, messages, sensitive info disclosure, graceful failures
4. **Performance Testing** — Response time under normal/peak loads, throughput, bottlenecks
5. **Security Testing** — SQL injection, XSS, HTTPS compliance, access controls
6. **Integration Testing** — Interactions between different components/services, data consistency
7. **Compatibility Testing** — Cross-platform, cross-browser, cross-device testing
8. **Documentation Review** — Clarity, completeness, accuracy of documentation
9. **Load Testing** — Behavior under high concurrent user loads
10. **Regression Testing** — Existing functionality intact after changes
11. **Edge Case Testing** — Extreme and boundary scenarios
12. **Concurrency Testing** — Simultaneous access and modification handling
13. **Ad Hoc Testing** — Exploratory testing for hidden defects
14. **Usability Testing** — User-friendliness and ease of use
15. **CI/CD Testing** — Validation within deployment pipeline
16. **Performance Monitoring** — Real-time tracking of application performance
17. **Backup and Recovery Testing** — Data backup and recovery procedures
18. **Internationalization Testing** — Behavior with different language/locale settings
19. **Rate Limiting Testing** — Adherence to rate-limiting rules
20. **Third-Party Integration Testing** — External service integrations

Note: The scope may evolve during testing based on feedback, changing requirements, or discoveries.

## 3. Inclusions
Detail specific test inclusions organized by operation type. For each category, list specific test scenarios derived from the tickets:

### Create Operations
- Test creation with valid input data
- Verify error responses for invalid/missing data
- Validate data stored correctly

### Read Operations
- Test retrieval by various criteria
- Verify correct data in responses
- Handle non-existent or invalid identifiers

### Update Operations
- Test updates with valid data
- Verify rejection of invalid updates
- Validate data modification in system

### Delete Operations
- Test deletion with valid identifiers
- Verify appropriate responses after deletion
- Validate removal from system

### Cross-Cutting Test Categories
- **Boundary Testing**: Minimum/maximum values, boundary conditions
- **Concurrency Testing**: Simultaneous operations, data consistency
- **Data Validation**: Invalid characters, data types, mandatory fields
- **Authentication & Authorization**: Authenticated vs unauthenticated, role-based access
- **Error Handling**: Invalid/malformed requests, error codes and messages
- **Security Testing**: SQL injection, XSS, data exposure
- **Performance Testing**: Response times under normal/peak loads, throughput
- **Integration Testing**: Interaction between components, data consistency
- **Regression Testing**: Post-fix/update verification
- **Load Testing**: High concurrent user loads
- **Compatibility Testing**: Cross-platform, cross-browser
- **CI/CD Testing**: Pipeline validation
- **Rate Limiting Testing**: Abuse prevention

## 4. Test Environments
Provide a table of test environments and list the supported platforms:

| Environment | URL |
|-------------|-----|
| QA | [Provide inferred QA URL or placeholder] |
| Pre-Production | [Provide inferred Pre-Prod URL or placeholder] |

**Supported Platforms:**
- Windows 10/11 – Chrome, Firefox, Edge
- macOS – Safari Browser
- Android Mobile OS – Chrome
- iPhone Mobile OS – Safari

List any hardware, software, network, or security requirements for the test environment.

## 5. Defect Reporting Procedure
Describe the complete defect process including:
- Criteria for identifying defects (deviation from requirements, UX issues, technical errors)
- Steps for reporting: designated template, reproduction steps, screenshots/logs
- Triage and prioritization process: severity and priority levels
- Tools: JIRA Bug Tracking Tool (or relevant tool)
- Roles and responsibilities for testers, developers, and test lead
- Communication channels and frequency for status updates
- Metrics: defects found, resolution time, fix success rate

**Defect POC Table:**

| Area | Point of Contact |
|------|-----------------|
| Frontend | [TBD] |
| Backend | [TBD] |
| DevOps | [TBD] |

## 6. Test Strategy
Outline a 3-step strategy:

**Step 1 — Test Design:**
- Create test scenarios and test cases for all features in scope
- Apply test design techniques:
  - Equivalence Class Partitioning
  - Boundary Value Analysis
  - Decision Table Testing
  - State Transition Testing
  - Use Case Testing
- Apply expertise-based techniques:
  - Error Guessing
  - Exploratory Testing
- Prioritize test cases by risk and business impact

**Step 2 — Test Execution Process:**
- Conduct Smoke Testing first to verify critical functionality
- Reject unstable builds; wait for stable builds
- Perform in-depth testing using created test cases on stable builds
- Multiple resources test on multiple supported environments simultaneously
- Report bugs in tracking tool and send daily status email
- Testing types: Smoke, Sanity, Regression, Retesting, Usability, Functionality & UI
- Repeat test cycles until quality targets are met

**Step 3 — Best Practices:**
- **Context Driven Testing** — Test as per the context of the application
- **Shift Left Testing** — Start testing from early development stages
- **Exploratory Testing** — Expert-driven exploration beyond scripted test cases
- **End to End Flow Testing** — Simulate real user workflows across multiple features

## 7. Test Schedule
Provide a table with estimated timeline:

| Task | Estimated Timeline |
|------|-------------------|
| Test Plan Creation | [Sprint X] |
| Test Case Design | [Sprint X] |
| Test Execution | [Sprint X-Y] |
| Summary Report Submission | [Sprint Y] |

State the overall sprint allocation (e.g., "2 Sprints to Test the Application").

## 8. Test Deliverables
List all deliverables:
- Test Plan Document
- Test Scenarios Document
- Test Cases Document
- Defect Reports
- Test Execution Reports
- Test Summary Reports
- Traceability Matrix

## 9. Entry and Exit Criteria
Define criteria for each phase:

### Requirement Analysis
**Entry Criteria:**
- Testing team receives Requirements Documents or project details
**Exit Criteria:**
- All requirements explored and understood by testing team
- All doubts and ambiguities are cleared

### Test Execution
**Entry Criteria:**
- Test Scenarios and Test Cases signed-off by stakeholders
- Application is ready for testing (stable build available)
**Exit Criteria:**
- Test Case Reports are completed
- Defect Reports are prepared and triaged

### Test Closure
**Entry Criteria:**
- Test Case Reports and Defect Reports are ready
**Exit Criteria:**
- Test Summary Reports are completed and delivered

## 10. Tools
List all tools to be used:
- JIRA — Bug Tracking and Project Management
- Mind Map Tool — Test scenario visualization
- Screenshot/Snipping Tool — Defect evidence capture
- Word/Excel Documents — Test documentation
- [Any other relevant tools based on the project context]

## 11. Risks and Mitigations
Provide a table of risks:

| Risk | Mitigation |
|------|-----------|
| Non-availability of a resource | Backup resource planning, cross-training |
| Test environment not available or unstable | Resources work on other tasks; escalate to DevOps |
| Insufficient time for testing | Ramp up resources dynamically based on needs |
| Requirements changes mid-sprint | Maintain flexible test cases, daily sync with product team |
| Critical defect blocking test execution | Escalate immediately, define workarounds |

## 12. Approvals
List documents requiring stakeholder/client approval before proceeding:
- Test Plan
- Test Scenarios
- Test Cases
- Reports (Execution & Summary)

State: "Testing will only continue to the next phase once these approvals are received."

---

CRITICAL INSTRUCTIONS:
- Output ONLY the final markdown document. No preamble, no explanations, no "here is your test plan" text.
- Every section must contain content specifically relevant to the provided Jira tickets.
- Use proper markdown formatting with headers, tables, bullet points, and bold text.
- Be thorough and professional — this is an enterprise-grade deliverable.`;
    let targetPrompt = prompt;

    // Prompt Triage: Optimize for local models if using Ollama
    if (credentials.llm === 'llama') {
      targetPrompt = `You are an expert QA Architect. Generate a concise, enterprise-grade Test Plan for these Jira tickets:
${issueList}

STRUCTURE:
# Test Plan
## 1. Objective
(2-3 clear goal statements)

## 2. Critical Test Scope
(Focus on Functional, Security, and Regression testing specific to the tickets)

## 3. Test Inclusions
(List scenarios for Create, Read, Update, Delete based on the tickets)

## 4. Test Environment 
(Table with QA and Pre-Prod environments)

## 5. Defect Reporting
(Define Priority P1-P4 and the triage process)

## 6. Test Strategy
(Smoke, Sanity, and Regression cycles)

## 7. Risks & Mitigations
(List at least 3 project-specific risks)

## 8. entry and Exit Criteria

INSTRUCTIONS:
- Return ONLY markdown.
- Be specific to the Jira tickets.
- Keep it thorough but concise for local execution.`;
    }

    const modelId = credentials.model || (credentials.llm === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o');
    
    // Unified Multi-Provider Logic
    if (credentials.llm !== 'llama') {
      let apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${credentials.llmKey}`,
        'Content-Type': 'application/json'
      };

      if (credentials.llm === 'openai') {
        apiUrl = 'https://api.openai.com/v1/chat/completions';
      } else if (credentials.llm === 'openrouter') {
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        headers['HTTP-Referer'] = 'https://testingbuddy.ai';
        headers['X-Title'] = 'TestingBuddy';
      }

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: targetPrompt }],
          temperature: 0.15,
          max_tokens: 2000
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let errorMessage = errText;
        
        try {
          const errJson = JSON.parse(errText);
          const providerErr = errJson.error || errJson;
          
          if (providerErr.code === 'rate_limit_exceeded') {
            const waitTime = providerErr.message.match(/try again in ([\d.]+)s/i)?.[1] || 'a few';
            errorMessage = `Rate limit reached for ${modelId}. Please try again in ${waitTime} seconds, or switch to a free OpenRouter model in Settings.`;
          } else {
            errorMessage = providerErr.message || errText;
          }
        } catch (e) {
          // Fallback to raw text if not JSON
        }

        return NextResponse.json({ 
          status: 'error', 
          error: `${credentials.llm.toUpperCase()} Error: ${errorMessage}` 
        }, { status: 400 });
      }

      const data = await resp.json();
      return NextResponse.json({ 
        status: 'success', 
        test_plan_markdown: data.choices?.[0]?.message?.content || 'No content generated.' 
      });

    } else {
      // Dynamic Ollama Implementation
      try {
        const baseUrl = credentials.llmKey.endsWith('/') ? credentials.llmKey.slice(0, -1) : credentials.llmKey;
        const resp = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId, 
            prompt: targetPrompt,
            stream: false
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          return NextResponse.json({ 
            status: 'error', 
            error: `Ollama Error: HTTP ${resp.status} at ${baseUrl} - ${errText}` 
          }, { status: 400 });
        }

        const data = await resp.json();
        return NextResponse.json({ status: 'success', test_plan_markdown: data.response });
      } catch (err: any) {
        return NextResponse.json({ 
          status: 'error', 
          error: `Failed to reach Ollama at ${credentials.llmKey}: ${err.message}` 
        }, { status: 500 });
      }
    }

  } catch (error: any) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
