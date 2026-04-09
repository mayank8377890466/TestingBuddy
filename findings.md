# Discoveries and Constraints

## Research Data
- Target product: Test Planner Agent
- Required Integrations:
  - Test Management: Jira, ADO (Azure DevOps), Xray (on the fly connection)
  - LLM Options: GROQ API, Llama API (on the fly connection)
- Required UI Components:
  - Settings Option
  - Test Connection Option
  - Dashboard Option
- Source of truth for UI: Provided screenshots in `ui_screenshots/`
- Output requirement: Test plans based on `Test Plan - Template.docx`
- Deployment: Vercel (Requires Next.js / JavaScript ecosystem)

## Constraints & Rules
- Must follow B.L.A.S.T. Framework explicitly.
- Deterministic logic preferred over probabilistic LLM outputs.
- No scripts in `tools/` until Discovery is complete and schema approved.
- Use JavaScript instead of Python for Layer 3 tools to ensure smooth Vercal deployment.
