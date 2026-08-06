# Plan - Elgin i9 Printer UI Guidance

The user confirmed they want the help text in the operational panel explaining how the local agent for the Elgin i9 printer works.

## Proposed Changes

### 1. Update Imports
- Add `Info` icon from `lucide-react` to `src/routes/operacional.tsx`.
- Add `Popover`, `PopoverTrigger`, and `PopoverContent` from `@/components/ui/popover`.

### 2. Add Help UI to Operational Panel
- In `src/routes/operacional.tsx`, add a `Popover` next to the printer configuration to explain the requirement of a local agent.
- The text will clarify that:
  - The site is ready to send commands.
  - A local "bridge" (agent) must be running on the PC where the printer is connected.
  - The default address is usually `http://localhost:8080/print`.

## Step-by-Step Plan

1. **Modify `src/routes/operacional.tsx`:**
   - Add imports for `Info` and `Popover` components.
   - Insert the `Popover` with detailed instructions next to the "Impressora (agente)" label or input.

## Verification Plan

- [ ] Check if the `Info` icon appears in the operational panel header.
- [ ] Verify that clicking/hovering on the icon shows the explanation about the printer agent.
- [ ] Confirm the wording matches the user's intent: clarifying that the site is ready but needs the local agent bridge.
