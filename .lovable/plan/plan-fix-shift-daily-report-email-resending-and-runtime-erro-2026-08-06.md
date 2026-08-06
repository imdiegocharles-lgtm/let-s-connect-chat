# Plan: Fix Shift/Daily Report Email Resending and Runtime Error

The user is experiencing two issues when trying to resend reports via email:
1.  **Runtime Error**: "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node." This usually happens in React when the DOM is manipulated outside of React (e.g., by a browser extension, translation tool, or manual DOM injection) or during complex state updates with `Suspense` or `Mutation` that cause race conditions in the renderer.
2.  **Email Delivery**: Sometimes it says "Sent" but the email doesn't arrive.

## Proposed Changes

### 1. Fix 'insertBefore' Runtime Error
The error "insertBefore... is not a child of this node" in TanStack Start/React often occurs when a `mutation` triggers a UI change (like a toast or a loader) while another part of the tree is unmounting or re-rendering. 
-   I will check `src/components/admin/ReportsViewer.tsx` to ensure the list items have stable keys and that the pending state transitions are handled cleanly.
-   The error might be related to the `Loader2` icon being conditionally rendered inside the button. I'll simplify the rendering logic to be more resilient.

### 2. Improve Email Reliability and Logging
-   The `sendShiftReportEmail` and `sendDailyReportEmail` functions use `maybeSingle()` which might return `null` if the data isn't exactly as expected.
-   I will add more robust error handling and logging to the server functions to verify if the template rendering or the email API call is actually succeeding when it returns "success".
-   I will ensure the `idempotencyKey` is unique per attempt to avoid accidental suppression by the email gateway if the user clicks multiple times.

### 3. Verify Admin Dashboard Hydration
-   Since the user mentioned "Não foi possível carregar a página", I will check if `ssr: false` is correctly applied to the admin routes to prevent hydration mismatches that could lead to DOM parent/child errors.

## Implementation Steps

1.  **src/components/admin/ReportsViewer.tsx**:
    -   Stabilize keys in `.map()` loops.
    -   Wrap the "Reenviar e-mail" button content in a way that avoids layout thrashing during `isPending` state.
2.  **src/lib/shift-report-email.functions.ts** & **src/lib/daily-report-email.functions.ts**:
    -   Add `console.log` for debugging the email sending process in production logs.
    -   Ensure `idempotencyKey` includes a timestamp or attempt count.
3.  **src/routes/admin.tsx** (or equivalent):
    -   Ensure `ssr: false` is set for the main admin route if it isn't already.

## Verification
-   Test the resend button in the preview.
-   Check console logs for any hydration or DOM warnings.
