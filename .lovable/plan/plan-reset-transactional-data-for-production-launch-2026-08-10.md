# Plan: Reset Transactional Data for Production Launch

The user wants to clear all test data (orders, reports, shifts) before officially launching the delivery service today.

## Proposed Changes

### Database Cleanup (via `supabase--migration`)
- Create a migration to delete all rows from transactional tables.
- Target tables:
  - `order_items` (depends on `orders`)
  - `orders`
  - `shift_reports` (depends on `shifts`)
  - `shift_motoboys` (depends on `shifts` and `motoboys`)
  - `shifts`
  - `daily_reports`
  - `reservations`
  - `reviews`
- **Important**: We will NOT touch configuration tables (`menu_items`, `menu_categories`, `neighborhoods`, `system_settings`, `avisos_loja`, `horarios_funcionamento`, `motoboys`, `user_roles`, `profiles`, `kitchen_permissions`, `public_settings`, `configuracoes_entrega`, `acompanhamentos`) as these contain the setup necessary for the store to function.

### Admin UI Enhancement
- Add a "Reset Data" or "Clear Database" utility button in the Admin panel (under a "Danger Zone" or "Settings" section) to allow the user to perform this action themselves if needed in the future, or just perform a one-time reset now as requested.
- *Decision*: Since the user specifically said "quero zerar" (I want to zero/reset), I will perform the reset now via migration and optionally add a button in the admin if it seems useful for their workflow, but a direct reset is the priority.

## Verification Plan
1. Run a query before and after to confirm row counts are zero for the targeted tables.
2. Verify that `menu_items` and other config data remain intact.
3. Check the Admin Dashboard to ensure it reflects zero stats correctly.
