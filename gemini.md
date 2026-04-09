# Project Constitution: B.L.A.S.T Framework

## Data Schemas
```json
{
  "InputSchema": {
    "provider": "Jira | ADO | Xray",
    "credentials": {"url": "...", "email": "...", "token": "..."},
    "query": {"project_key": "...", "sprint": "..."},
    "llm_config": {
      "provider": "GROQ | Llama",
      "api_key": "...",
      "additional_context": "..."
    }
  },
  "OutputSchema": {
    "test_plan_markdown": "...",
    "status": "success | error"
  }
}
```

## Behavioral Rules
1. Identity: System Pilot
2. Prioritize reliability over speed. Never guess at business logic.
3. The "Data-First" Rule: Schema must be defined here before coding.
4. Output payload shapes must be confirmed before proceeding.
5. `gemini.md` is law. Planning files are memory.

## Architectural Invariants
1. 3-Layer Architecture:
   - Layer 1 (`architecture/`): Technical SOPs
   - Layer 2 (Navigation): Routing reasoning / Next.js API Routes
   - Layer 3 (`tools/`): Deterministic JavaScript/TypeScript modules
2. Ephemeral Intermediate Files (`.tmp/`)
3. Secrets managed via `.env`

## Maintenance Log
- **[2026-03-30]**: Finished base agent UI architecture. Migrated Layer 3 tools to JavaScript for seamless Vercel deployment capability. Connections mocked and verified successfully in Phase 2 Link tests.
