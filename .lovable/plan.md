# Plan - Fix Report Date Logic and Add Calendar View

The user is experiencing issues with reports after midnight. Currently, the system uses `todayISO()` in many places, which shifts to the next day at 00:00, making it impossible to close or view the previous night's reports. Also, the user wants a calendar/date picker to view historical reports by their opening date.

## User Requirements
1. **Closing Reports After Midnight:** Allow closing/finalizing shifts and daily reports even after 00:00.
2. **Reference Date:** Use the shift's `opened_at` date as the reference, not the current system time.
3. **Calendar/Date Picker:** Add a calendar to the reports screen to select a specific date.
4. **Historical View:** Show separate shift reports (lunch/dinner) and a consolidated daily report for the selected date.

## Proposed Changes

### 1. Database & Logic (`src/lib/reports-service.ts`)
- Modify `getTodayShifts`, `getShiftReports`, and `createDailyReport` to ensure they handle the `report_date` consistently.
- Ensure `createShiftReport` always uses `opened_at.slice(0, 10)` for `report_date`.
- Update `createDailyReport` to accept an optional date (it already does, but ensure it's used correctly).

### 2. Operational Panel (`src/routes/operacional.tsx`)
- In `ReportsPanel`, change how `date` is determined. Instead of always using `todayISO()`, it should probably default to the date of the most recent shift or allow selection if needed (though the user specifically asked for the "Reports screen" which usually refers to the Admin one).
- However, for "closing" the daily report, we need to make sure `generateDaily` uses the date of the shifts it's consolidating.
- Fix the `bothClosed` logic to look at the shifts available for the "logical" day (which might be yesterday if we are just past midnight).

### 3. Admin Reports Viewer (`src/components/admin/ReportsViewer.tsx`)
- Replace the simple `Input type="date"` with a more robust calendar/date picker if desired, or just improve the current one.
- Ensure the `date` state correctly drives all queries.
- Add a "Consolidate Daily Report" button in the Admin view as well, if it's missing or if the user wants to be able to generate it from there if it wasn't done in the Operational panel. (The user mentioned "I can no longer close/finalize... in the admin reports section").

### 4. Shift & Daily Report Email Functions
- Verify that `sendDailyReportEmail` and `sendShiftReportEmail` use the provided date/ID correctly without relying on "current day" logic.

## Detailed Implementation Steps

1. **`src/lib/reports-service.ts`**:
    - Review `getTodayShifts`: It currently filters by `opened_at` between 00:00 and 23:59 of a specific date. This is correct for "Reference date is opening date".
    - Review `getShiftReports`: Filters by `report_date`. This is also correct.
    - Review `createDailyReport`: It uses `getShiftReports(date)`. If `date` is passed correctly, it works.

2. **`src/routes/operacional.tsx`**:
    - The `ReportsPanel` uses `const date = todayISO();`. This is the bug. If it's 00:30, `todayISO()` returns today, but the user wants to close "yesterday's" (the night shift started yesterday).
    - **Fix:** Change `date` logic. If there's an open shift or a very recent one, use its date. Or better, allow the operator to see "Today" and "Yesterday" in the operational reports panel to close the right one.

3. **`src/components/admin/ReportsViewer.tsx`**:
    - The user said: "After midnight (00:00), I can no longer close/finalize...".
    - Currently, `ReportsViewer` in Admin only shows finalized reports (Reimprimir/Reenviar). It doesn't have a "Gerar Relatório do Dia" button like the Operational panel.
    - **Action:** Add the "Gerar Relatório do Dia" button to `ReportsViewer` so admins can finalize a day even if the operator forgot or if it's past midnight.

4. **Refining "Logical Day"**:
    - A shift opened at `2023-10-27T22:00:00` belongs to `2023-10-27` even if it closes at `2023-10-28T01:00:00`.
    - I will ensure all `report_date` assignments follow this rule.

## Verification Plan
- **Manual Test (Simulated):** Check if a shift opened at 23:00 and closed at 01:00 appears under the opening day's reports.
- **UI Check:** Ensure the date picker in Admin allows selecting previous days and shows the "Consolidate" button if the day isn't consolidated yet.
- **Code Audit:** Ensure no `new Date()` calls are used to determine the `report_date` without considering the shift's `opened_at`.
