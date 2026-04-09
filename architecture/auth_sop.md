# Authentication SOP

## Goal
Securely handle dynamic user-provided credentials for Test Management Tools (Jira, ADO, Xray).

## Mechanism
- Next.js acts as a proxy.
- Credentials provided in Step 1 (Setup) are held in the React Context or passing between server steps.
- For maximum security during the session, credentials should be either encrypted in an HTTP-only cookie OR simply held in memory on the client-side state machine and passed to the API routes `POST` body for direct forwarding to Jira/ADO.
- **Rule:** Never save user tokens to a physical file or database. They are strictly "on-the-fly".

## Error Handling
- Invalid tokens return 401 or 403. UI must surface "Unauthorized: Check your credentials".
