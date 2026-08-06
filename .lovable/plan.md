# Plan - Allow menu browsing when closed

The user wants to allow customers to view the menu even when the store is closed according to the programmed schedule. When closed, customers can see items but cannot place orders.

## Proposed Changes

### 1. Store Hours Logic
- Modify `getStoreStatus` in `src/lib/store-hours.ts` to differentiate between "store open for orders" and "store closed".
- The logic already has `canOrder`, which is good. I need to make sure the UI respects this but doesn't block the menu visibility.

### 2. Menu Browser UI
- Update `src/components/menu/MenuBrowser.tsx`:
    - Currently, it filters categories based on the current service window (`svcWindow`). If `svcWindow` is "closed", it shows a "closed" banner and likely doesn't show items because `grouped` becomes empty.
    - Change filtering logic to show all items (or items from a default service window) when closed, but keep the "closed" banner.
    - Disable the "Add to Cart" buttons when the store is closed.

### 3. Cart/Checkout UI
- Update `src/components/menu/CartSheet.tsx`:
    - Ensure the "Continue" button is disabled if `store.canOrder` is false.
    - Already has `deliveryBlocked` logic, but I should ensure it explicitly handles the general "store closed" state for order submission.

### 4. Home Page
- Update `src/routes/index.tsx`:
    - Ensure the "Fazer Pedido" buttons scroll to the menu even when closed (instead of potentially being hidden or leading to a closed state).

## Detailed Implementation Steps

### `src/lib/store-hours.ts`
- Ensure `getStoreStatus` provides enough context. It currently returns `openService` (null if closed).

### `src/components/menu/MenuBrowser.tsx`
- Change `grouped` items filtering:
    - If `svcWindow === "closed"`, show all items that are `available_lunch` OR `available_dinner`.
    - Pass a `disabled` prop to the "Add" button if `svcWindow === "closed"`.

### `src/routes/index.tsx`
- Ensure the header and hero buttons for "Fazer Pedido" are always functional as they just scroll to the `#cardapio` section.

## Verification Plan

### Manual Verification
1. Change local time/mock state to a "closed" period.
2. Verify the "Estamos fechados" banner appears.
3. Verify categories and items ARE visible below the banner.
4. Verify "Add" (+) buttons are disabled or show a message that ordering is unavailable.
5. Verify the cart cannot be submitted.
