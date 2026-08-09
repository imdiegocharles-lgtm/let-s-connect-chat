# Plan: Site Information Control & Home Navigation Fix

The objective is to allow dynamic editing of store closure messages via the Admin Panel and ensure the 'Home' button correctly scrolls back to the top of the page.

## User Requirements
- Make the store closed message (e.g., 'We are closed right now / Lunch...') editable from the Admin Panel.
- Fix the 'Home' button to scroll to the top of the page when clicked.

## Proposed Changes

### 1. Store Closed Message (Admin Panel)
- **Frontend (`src/components/menu/MenuBrowser.tsx`)**:
  - Update the closure notice to prioritize `aviso.home_horario_texto` when the store is closed and manual mode is off, providing a unified source of truth for working hours.
  - Ensure `aviso.titulo_fechado` is used consistently as the primary headline when closed.
- **Admin Panel (`src/routes/admin.index.tsx`)**:
  - Clarify the labeling in the `AvisoFechadoPanel` component to show that the closure notice can pull from the main working hours card text.

### 2. Navigation Fix
- **Navigation Component (`src/components/layout/BottomNav.tsx`)**:
  - Modify the `goHome` function to call `window.scrollTo({ top: 0, behavior: 'smooth' })` when the user is already on the home route, ensuring the page scrolls back to the top.

## Verification Plan
1. **Admin Control**:
   - Navigate to `/admin` -> "Configurações".
   - Edit "Texto do cartão de horários (página inicial)".
   - Verify the message updates in the menu closure banner when a shift is not active.
2. **Scrolling**:
   - Navigate to the home page.
   - Scroll down to the middle of the page.
   - Click the "Início" (Home) button in the bottom navigation.
   - Verify the page scrolls smoothly to the top.
