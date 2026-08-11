# Plan: Sequential Order Numbering and Deletion with Reason

Fixes a bug where order numbers reset mid-shift and implements order deletion tracking for audit purposes.

## Database Changes
1. Add columns to `public.orders`:
   - `deleted_at` (timestamp with time zone, nullable)
   - `deletion_reason` (text, nullable)
2. Update `public.set_daily_order_number()` function:
   - Scope the `MAX(order_number)` query to the current order's `shift_id` instead of the calendar date.
   - This ensures numbering stays continuous within a shift even if it crosses midnight.
3. Update `public.orders` RLS:
   - Ensure soft-deleted orders are excluded from general read policies unless specified.

## API Changes
1. Create `src/lib/orders-admin.functions.ts`:
   - `deleteOrder`: Takes `orderId` and `reason`. Sets `deleted_at` and `deletion_reason`. Requires `admin` or `operator` role.

## UI Changes (`src/routes/operacional.tsx`)
1. Update `orders` query to filter out `deleted_at IS NOT NULL`.
2. Add a "Excluir Pedido" button to each order card.
3. Implement a confirmation dialog for deletion with a mandatory text field for the reason.
4. Update state after deletion.

## Report Changes
1. `src/lib/reports-service.ts`:
   - Update `createShiftReport` and `aggregateShiftItems` to include soft-deleted orders in a new `deleted_orders` summary field.
2. `src/lib/report.ts`:
   - Update `buildShiftReportBytes` and `buildDailyReportBytes` to add the "Pedidos Excluídos" section at the end of the receipt.

## Verification Plan
1. Create orders in an open shift, verify numbering is sequential.
2. Wait for a time transition or simulate a long shift, verify numbering doesn't reset.
3. Delete an order, verify it disappears from the active list.
4. Close shift and view report, verify the deleted order appears in the exclusion section with the reason.
