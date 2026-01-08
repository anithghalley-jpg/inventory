# ⚠️ ACTION REQUIRED: Update Google Apps Script & Sheet

## 1. Update Apps Script
1.  Copy the **new** code from `APPS_SCRIPT_TEMPLATE.gs`.
2.  Paste it into your Google Apps Script project.
3.  **Save** and **Deploy** as a **New Version**.

## 2. Update 'Users' Sheet Headers
You need to add 4 new columns to the **Users** sheet for the laptop tracking to work.

1.  Open the **Users** tab in your Google Sheet.
2.  Add the following headers in the first row:
    *   **Column F**: `Laptop Status`
    *   **Column G**: `Session Start`
    *   **Column H**: `Session End`
    *   **Column I**: `Total Time (mins)`

## 3. Update 'Requests' Sheet Headers (If not done already)
    *   **Column I**: `Return Status`

Once these columns are added, the toggle feature and leaderboard will function correctly.
