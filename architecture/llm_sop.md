# LLM Integration SOP

## Goal
Generate consistent Test Plans matching the Template using GROQ or Llama APIs.

## Mechanism
- UI captures the requested LLM mode (GROQ vs Llama) along with the API key.
- The `generatePlan.js` tools inject the Jira Issues JSON + "Test Plan Template" constraints into the prompt.
- Model parameters: `temperature: 0.2` for deterministic, structured output.

## Prompt Strategy
1. Act as a senior SDET.
2. Given the User Story JSON, map the acceptance criteria to concrete test scenarios (Positive, Negative, Boundary).
3. Output strictly in Markdown matching the headings dictated by the template.

## Error Handling
- Rate limiting (HTTP 429): Retries via exponential backoff.
- Malformed outputs: Ensure prompt forbids preamble text.
