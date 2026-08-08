# Plan - Fix Store Status Logic

The user reports that even with an open shift, the site shows as "closed" for customers. This likely stems from a mismatch in how `getStoreStatus` is being called or how it handles the `hasActiveShift` parameter.

## Proposed Changes

### Logic & Helpers
#### [src/lib/store-hours.ts](src/lib/store-hours.ts)
- Update `getStoreStatus` to handle the `hasActiveShift` parameter correctly. 
- Ensure `canOrder` is true if `hasActiveShift` is true, regardless of the `open` service window check, or at least ensure the check is robust.
- Actually, the user wants the shift to be the primary driver. If a shift is open, the store should be open.

### Components
#### [src/components/menu/MenuBrowser.tsx](src/components/menu/MenuBrowser.tsx)
- Check the `getStoreStatus` call. Currently it passes `!!activeShift` as the second argument.
- Verify that `activeShift` is correctly fetched and passed.

#### [src/routes/index.tsx](src/routes/index.tsx)
- Verify the `getStoreStatus` call here as well.

## Verification Plan

### Automated Tests
- Run a check using Playwright to see if the "Estamos fechados" banner appears when a shift is present in the database.
- Use `supabase--read_query` to verify if there is an active shift (`closed_at IS NULL`) in the `shifts` table.

### Manual Verification
- Check the preview URL and see if the store status correctly reflects the presence of an open shift.
