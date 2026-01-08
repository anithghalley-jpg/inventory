# ⚠️ ACTION REQUIRED: Update Google Apps Script & Sheet

To enable the "Return Status" and "Active Loans" features:

1.  **UPDATE APPS SCRIPT**:
    *   Copy the *new* code from `APPS_SCRIPT_TEMPLATE.gs`.
    *   Paste it into your Google Apps Script project.
    *   **Save** and **Deploy** as a **New Version**.

2.  **UPDATE GOOGLE SHEET**:
    *   Go to your `Requests` sheet tab.
    *   **Add a new Header** in **Column I** (column 9) named: `Return Status`.
    *   *(Alternatively, you can delete the 'Requests' tab and run `initialSetup` again, but this will delete existing history)*.

## How to Manage Returns
1.  Open your Google Sheet `Requests` tab.
2.  Find the row for the item request.
3.  In the **Return Status** column (Column I), type `YES`.
4.  This will remove the item from the user's dashboard and the admin panel's active loan list.
