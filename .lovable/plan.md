# Plan - Elgin i9 Printer Agent Implementation & User Feedback

The user wants to clarify if they need to install a local agent for the Elgin i9 printer to work with the delivery system and whether the site is already prepared for it. Based on the codebase, the site is already prepared to send ESC/POS commands to a local agent URL (typically `http://localhost:8080/print`), but the actual agent software (a small executable that communicates between the browser and the USB/Network printer) needs to be running on the local PC.

## Proposed Changes

### Documentation / UI Guidance
- Add a clear explanation in the Operational Panel (`src/routes/operacional.tsx`) or a new "Help" section about how the printing works.
- Explicitly state that a local agent is required to bridge the browser and the Elgin i9 printer.
- Provide a link or instructions for the agent (if there's a standard one we recommend, like a simple Python script or a Go binary that we can provide code for).

### Agent Code (Self-Service)
- Create a standalone script template (e.g., `printer-agent.py`) that the user can run on their machine to act as the agent. This script will receive the raw bytes from the site and send them to the Elgin printer.

### Visual Edits (from user request)
- The user's request mentioned a visual edit on the `body` element. I will interpret this as a request to display a "Context/Instruction" message to themselves or as a prompt to explain the situation. However, the user's input "Apply these visual text edits..." looks like a prompt injection or a copy-paste error where they are trying to *tell* me the context of their question rather than literally changing the body text to that long string. 
- **Correction:** The user is asking a question *within* a visual edit request format. I will answer the question: **Yes, you need a local agent.** The site is already programmed to send the data, but the "bridge" (agent) must be installed.

## Step-by-Step Plan

1. **Clarify the Printing Architecture:**
   - The site uses `sendToLocalPrinter` in `src/lib/receipt.ts` which performs a `POST` to an `agentUrl`.
   - By default, this is `http://localhost:8080/print`.
   - A local program must be listening on that port to receive the bytes and send them to the Elgin driver/port.

2. **Update Operational UI:**
   - In `src/routes/operacional.tsx`, add an info icon or a small help text near the "Impressora (agente)" input explaining that a local agent is required and offering a "Download Agent Script" or "View Instructions" link.

3. **Provide the Agent Script:**
   - Create a file `src/lib/printer-agent-template.ts` or similar with a Python script that the user can copy-paste. This script will use `usb` or `serial` libraries to talk to the Elgin i9.

4. **Respond to the User's question directly:**
   - Confirm that the agent is necessary.
   - Confirm the site is "ready" to talk to it, but the agent handles the hardware installation/driver part.

## Verification Plan

- [ ] Check if the `agentUrl` in `src/routes/operacional.tsx` correctly defaults or is editable.
- [ ] Verify that `testPrinter` function triggers the `sendToLocalPrinter` call.
- [ ] Mock a local listener in a test environment to verify the POST payload.
