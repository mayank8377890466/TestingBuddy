# UI Wizard State SOP

## Goal
Provide a robust 4-step wizard matching the screenshots seamlessly.

## Steps
1. **Setup**: Capture Jira URL, Email, Token, and LLM Token. Validate before proceeding.
2. **Fetch Issues**: Input Project Key & Sprint. Call `tools/fetchJira.mjs`. Render count.
3. **Review**: Show list of issues fetched. Text area for extra instructions. Call `tools/generatePlan.mjs`.
4. **Test Plan**: Render the generated Markdown test plan. Offer download or copy to clipboard.

## State Management
- React `useReducer` or context for maintaining global state across the 4 steps without URL routing for a smoother SPA feel.
