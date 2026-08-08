
# Plan: Checkout and Order Confirmation Updates

Implement configurable confirmation messages, estimated time, and a separate address number field in the checkout process.

## User Review Required

> [!IMPORTANT]
> The order number will be hidden from the customer's confirmation screen as requested, but it will still be generated and visible in the Admin and Operacional panels for tracking.

- Do you have a preferred default message for order confirmation? (Currently set to: "Seu pedido foi recebido com sucesso!")
- Should the "Complemento" field remain optional? (Assuming yes, as only "Número" was requested to be mandatory).

## Proposed Changes

### Database (Supabase)
- Add `order_confirmation_message` and `order_estimated_time` to `public.avisos_loja`.
- Add `customer_street` and `customer_number` to `public.orders`.
- Update `orders` to migrate existing `customer_address` into `customer_street`.

### Backend (Server Functions)
#### `src/lib/orders.functions.ts`
- Update Zod schema to include `street` and `number`.
- Update `createGuestOrder` to insert `customer_street` and `customer_number` instead of a combined `customer_address`.

### Frontend
#### `src/lib/store-hours.ts`
- Update `AvisoLoja` type and `fetchAvisoLoja` to include new configuration fields.

#### `src/routes/admin.index.tsx`
- Add UI to `SettingsPanel` for editing "Mensagem de confirmação" and "Tempo estimado".

#### `src/components/menu/CartSheet.tsx`
- Split the address input into two fields: "Endereço" and "Número" (mandatory).
- Update the submission logic to send the separated fields to the server function.
- Update the "done" step to:
    - Display the configured confirmation message and estimated time from the database.
    - Remove the display of the order number.

#### `src/routes/operacional.tsx`
- Fix type errors in the test printer mock order by adding the new address fields.
- Ensure the operational view displays the street and number clearly.

## Verification Plan

### Automated Tests
- Run `vitest` (if available) to check if the Zod schema validation correctly requires the `number` field.
- Check build output for any TypeScript regressions.

### Manual Verification
- **Test 1: Admin Configuration**
    - Go to `/admin` -> Configurações.
    - Change the confirmation message and estimated time.
    - Save and verify they persist.
- **Test 2: Checkout Validation**
    - Try to checkout without filling the "Número" field.
    - Verify the system blocks it and shows an error.
- **Test 3: Order Confirmation**
    - Complete a successful order.
    - Verify the screen shows the custom message and time.
    - Confirm the order number is NOT displayed to the customer.
- **Test 4: Operational View**
    - Go to `/operacional`.
    - Verify the new order shows both street and number correctly.
    - Verify the order number is still visible to the operator.
