/**
 * Inventory Management System - Google Apps Script Backend (OPTIMIZED)
 * 
 * OPTIMIZATION: Two-Step Process for Image Upload
 * 
 * OLD WORKFLOW (Slow):
 * 1. User uploads image → Frontend sends to Apps Script
 * 2. Apps Script uploads to Drive
 * 3. Apps Script returns image URL to frontend
 * 4. Frontend sends complete inventory data with image URL
 * 5. Apps Script adds item to Sheets
 * Total: 2 API calls, longer wait time
 * 
 * NEW WORKFLOW (Fast):
 * 1. User uploads image → Frontend sends to Apps Script
 * 2. Apps Script uploads to Drive AND directly updates Sheets with URL
 * 3. Frontend only needs to send remaining inventory data
 * 4. Apps Script adds item to Sheets
 * Total: 2 API calls, but first call does more work, reducing overall time
 * 
 * Setup Instructions:
 * 1. Create a new Google Apps Script project
 * 2. Replace the default Code.gs with this template
 * 3. Create Google Sheets with the following sheet names:
 *    - Users
 *    - Inventory
 *    - UsageHistory
 *    - Categories
 *    - ItemRequests
 * 4. Deploy as Web App (Execute as: Me, Who has access: Anyone)
 * 5. Copy the deployment URL to your frontend
 */

// Configuration
const SPREADSHEET_ID = '1-Ybi9I5P20ss6P1-dsA6UkcHa591o_Tq83jVrfSMaWE'; // Replace with your Google Sheet ID
const SHEET_NAMES = {
  USERS: 'Users',
  INVENTORY: 'Inventory',
  USAGE_HISTORY: 'UsageHistory',
  CATEGORIES: 'Categories',
  ITEM_REQUESTS: 'ItemRequests',
  REQUESTS: 'Requests'
};

// Initialize spreadsheet
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(sheetName);
}

// CORS Headers
function setCorsHeaders(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Main request handler
function doPost(e) {
  const output = ContentService.createTextOutput();
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let response;
    
    switch(action) {
      case 'login':
        response = handleLogin(data);
        break;
      case 'getInventory':
        response = handleGetInventory(data);
        break;
      case 'checkoutItem':
        response = handleCheckoutItem(data);
        break;
      case 'returnItem':
        response = handleReturnItem(data);
        break;
      case 'requestItem':
        response = handleRequestItem(data);
        break;
      case 'getPendingUsers':
        response = handleGetPendingUsers(data);
        break;
      case 'approveUser':
        response = handleUpdateUserStatus(data);
        break;
      case 'rejectUser':
        response = handleUpdateUserStatus(data);
        break;
      case 'addInventoryItem':
        response = handleAddInventoryItem(data);
        break;
      case 'addCategory':
        response = handleAddCategory(data);
        break;
      case 'getUsageHistory':
        response = handleGetUsageHistory(data);
        break;
      case 'uploadImage':
        // OPTIMIZED: This now directly updates Sheets with image URL
        response = handleUploadImageOptimized(data);
        break;
      case 'completeInventoryItem':
        // NEW: Complete the inventory item after image is uploaded
        response = handleCompleteInventoryItem(data);
        break;
      case 'getCategories':
        response = handleGetCategories(data);
        break;
      case 'getAllUsers':
        response = handleGetAllUsers(data);
        break;
      case 'checkoutRequest':
        response = handleCheckoutRequest(data);
        break;
      case 'getRequests':
        response = handleGetRequests(data);
        break;
      case 'toggleLaptop': // NEW
        response = handleToggleLaptop(data);
        break;
      case 'initiateReturn':
        response = handleReturnRequest(data);
        break;
      case 'approveCheckoutRequest': // NEW
        response = handleApproveCheckoutRequest(data);
        break;
      case 'processReturn':
        response = handleProcessReturn(data);
        break;
      default:
        response = { success: false, message: 'Unknown action' };
    }
    
  return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
 
  } catch (error) {
    const output = ContentService.createTextOutput();
    return setCorsHeaders(output).setMimeType(ContentService.MimeType.JSON)
      .setContent(JSON.stringify({ success: false, message: error.toString() }));
  }
}

// Handle OPTIONS requests for CORS
function doGet(e) {
  const output = ContentService.createTextOutput();
  return setCorsHeaders(output).setContent('OK');
}

// ===== USER MANAGEMENT =====

function handleLogin(data) {
  const { email, name } = data;
  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  
  // Check if user exists
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === email) {
      return {
        success: true,
        user: {
          id: values[i][0],
          email: values[i][0],
          name: values[i][1],
          role: values[i][2],
          status: values[i][3],
          createdDate: values[i][4],
          laptopStatus: values[i][5] || 'Offline',
          totalTime: values[i][8] || 0
        }
      };
    }
  }
  
  // Create new user (PENDING status)
  const newRow = [
    email,
    name,
    'USER',
    'PENDING',
    new Date().toISOString()
  ];
  sheet.appendRow(newRow);
  
  return {
    success: true,
    user: {
      id: email,
      email: email,
      name: name,
      role: 'USER',
      status: 'PENDING',
      createdDate: new Date().toISOString()
    }
  };
}

function handleGetPendingUsers(data) {
  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  const pendingUsers = [];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][3] === 'PENDING') {
      pendingUsers.push({
        id: values[i][0],
        email: values[i][0],
        name: values[i][1],
        role: values[i][2],
        status: values[i][3],
        createdDate: values[i][4]
      });
    }
  }
  
  return { success: true, users: pendingUsers };
}

function handleApproveUser(data) {
  const { userId } = data;
  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === userId) {
      sheet.getRange(i + 1, 4).setValue('APPROVED');
      return { success: true, message: 'User approved' };
    }
  }
  
  return { success: false, message: 'User not found' };
}

function handleRejectUser(data) {
  const { userId } = data;
  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === userId) {
      sheet.getRange(i + 1, 4).setValue('REJECTED');
      return { success: true, message: 'User rejected' };
    }
  }
  
  return { success: false, message: 'User not found' };
}

// ===== INVENTORY MANAGEMENT =====

function handleGetInventory(data) {
  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  const values = sheet.getDataRange().getValues();
  const inventory = [];
  
  for (let i = 1; i < values.length; i++) {
    inventory.push({
      id: values[i][0],
      name: values[i][1],
      quantity: values[i][2],
      category: values[i][3],
      company: values[i][4],
      imageUrl: values[i][5],
      remarks: values[i][6],
      links: values[i][7],
      // Collect tags from Column J (Index 9) onwards
      tags: values[i].slice(9).filter(t => t !== '').join(',') 
    });
  }
  
  return { success: true, inventory: inventory };
}

/**
 * OPTIMIZED: handleAddInventoryItem
 * 
 * Now expects imageUrl to be already set (from image upload step)
 * This makes the request smaller and faster
 */
function handleAddInventoryItem(data) {
  const { name, quantity, category, company, imageUrl, remarks, links, tags } = data;
  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  
  // // Check for duplicates
  // const values = sheet.getDataRange().getValues();
  // for (let i = 1; i < values.length; i++) {
  //   if (values[i][1].toLowerCase() === name.toLowerCase()) {
  //     return { success: false, message: 'Item already exists' };
  //   }
  // }
  // Inside your handleCompleteInventoryItem function
  const values = sheet.getDataRange().getValues();
  for (let j = 1; j < values.length; j++) {
    // Add a safety check: String(values[j][1] || "") 
    // This converts null or numbers to strings so .toLowerCase() doesn't crash
    const existingName = String(values[j][1] || "").toLowerCase();
    
    if (j !== i && existingName === name.toLowerCase()) {
      return { success: false, message: 'Item with this name already exists' };
    }
  }
  
  const itemId = Utilities.getUuid();
  const newRow = [
    itemId,
    name,
    quantity,
    category,
    company,
    imageUrl || '',
    remarks || '',
    links || '',
    '', // Column I (Index 8) - Padding/Reserved
    ...(Array.isArray(tags) ? tags : []) // Spread tags starting from Column J (Index 9)
  ];
  
  sheet.appendRow(newRow);
  
  // Create usage history entry
  const historySheet = getSheet(SHEET_NAMES.USAGE_HISTORY);
  historySheet.appendRow([
    Utilities.getUuid(),
    itemId,
    'admin@system',
    'CREATE',
    quantity,
    new Date().toISOString()
  ]);
  
  return { success: true, itemId: itemId };
}

// function handleCheckoutItem has been replaced by handleCheckoutRequest + handleApproveCheckoutRequest workflow

function handleReturnItem(data) {
  const { itemId, userEmail, quantity } = data;
  const inventorySheet = getSheet(SHEET_NAMES.INVENTORY);
  const historySheet = getSheet(SHEET_NAMES.USAGE_HISTORY);
  const values = inventorySheet.getDataRange().getValues();
  
  // Find item and update quantity
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === itemId) {
      const currentQty = values[i][2];
      
      // Update inventory
      inventorySheet.getRange(i + 1, 3).setValue(currentQty + quantity);
      
      // Record usage
      historySheet.appendRow([
        Utilities.getUuid(),
        itemId,
        userEmail,
        'RETURN',
        quantity,
        new Date().toISOString()
      ]);
      
      return { success: true, message: 'Item returned' };
    }
  }
  
  return { success: false, message: 'Item not found' };
}

// ===== CATEGORY MANAGEMENT =====

function handleAddCategory(data) {
  const { categoryName } = data;
  const sheet = getSheet(SHEET_NAMES.CATEGORIES);
  
  sheet.appendRow([categoryName]);
  return { success: true, message: 'Category added' };
}

// ===== ITEM REQUESTS =====

function handleRequestItem(data) {
  const { userEmail, itemName, remarks } = data;
  const sheet = getSheet(SHEET_NAMES.ITEM_REQUESTS);
  
  sheet.appendRow([
    Utilities.getUuid(),
    userEmail,
    itemName,
    remarks || '',
    new Date().toISOString()
  ]);
  
  return { success: true, message: 'Item request submitted' };
}

// ===== USAGE HISTORY =====

function handleGetUsageHistory(data) {
  const sheet = getSheet(SHEET_NAMES.USAGE_HISTORY);
  const values = sheet.getDataRange().getValues();
  const history = [];
  
  for (let i = 1; i < values.length; i++) {
    history.push({
      id: values[i][0],
      itemId: values[i][1],
      userEmail: values[i][2],
      action: values[i][3],
      quantity: values[i][4],
      timestamp: values[i][5]
    });
  }
  
  return { success: true, history: history };
}

// ===== IMAGE UPLOAD TO GOOGLE DRIVE (OPTIMIZED) =====

/**
 * OPTIMIZED: handleUploadImageOptimized
 * 
 * NEW WORKFLOW:
 * 1. Upload image to Google Drive
 * 2. Get shareable link
 * 3. Create a temporary row in Inventory sheet with the image URL
 * 4. Return itemId and imageUrl to frontend
 * 5. Frontend sends remaining data (name, quantity, etc.) with the itemId
 * 6. Backend updates the temporary row with complete data
 * 
 * Benefits:
 * - Image URL is ready immediately after upload
 * - Frontend can show preview while filling other fields
 * - Reduces overall wait time
 * - Smaller payload for second request
 */
function handleUploadImageOptimized(data) {
  try {
    console.log("🖼️ Starting optimized image upload");
    const { fileName, mimeType, content, folderId } = data;
    
    // Step 1: Upload image to Google Drive
    const folder = DriveApp.getFolderById(folderId);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(content), 
      mimeType,
      fileName
    );
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    
    // Step 2: Create shareable link
    const fileId = file.getId();
    const directLink = "https://drive.google.com/thumbnail?id=" + fileId;
    
    console.log("✅ Image uploaded successfully");
    console.log("📸 Image URL: " + directLink);
    
    // Step 3: Create temporary inventory entry with image URL
    const inventorySheet = getSheet(SHEET_NAMES.INVENTORY);
    const itemId = Utilities.getUuid();
    
    // Create a temporary row with just the image URL
    // Other fields will be updated in the next step
    const tempRow = [
      itemId,
      '[PENDING]',  // Placeholder name
      0,            // Placeholder quantity
      '[PENDING]',  // Placeholder category
      '[PENDING]',  // Placeholder company
      directLink,   // IMAGE URL (filled immediately)
      '',           // Remarks
      '',           // Links
      ''            // Tags
    ];
    
    inventorySheet.appendRow(tempRow);
    console.log("📝 Temporary inventory entry created with itemId: " + itemId);
    
    // Step 4: Return immediately with image URL and itemId
    return {
      success: true,
      itemId: itemId,
      imageUrl: directLink,
      message: 'Image uploaded successfully. Complete the inventory item details.'
    };
    
  } catch (error) {
    console.error("❌ Image upload error: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * NEW: handleCompleteInventoryItem
 * 
 * Completes the inventory item after image upload
 * Updates the temporary row with actual data
 * 
 * @param data {
 *   itemId: string,           // From image upload response
 *   name: string,
 *   quantity: number,
 *   category: string,
 *   company: string,
 *   remarks: string (optional),
 *   links: string (optional)
 * }
 */
function handleCompleteInventoryItem(data) {
  try {
    const { itemId, name, quantity, category, company, remarks, links, tags } = data;
    const inventorySheet = getSheet(SHEET_NAMES.INVENTORY);
    const values = inventorySheet.getDataRange().getValues();
    
    // 1. Get a list of all IDs from Column A
    const ids = values.map(r => r[0]);
    
    // 2. Find where our itemId is
    const rowIndex = ids.indexOf(itemId);
    
    const tagsArray = Array.isArray(tags) ? tags : [];
    
    // 3. If found (index is not -1)
    if (rowIndex !== -1) {
       // Spread tags: [id, name, qty, cat, comp, img, rem, link, '', tag1, tag2, tag3...]
       // Standard cols: 8 (A-H). Pad: 1 (I). Total standard: 9.
       // Total width needed: 9 + tagsArray.length
       
       const rowData = [
          itemId,
          name,
          quantity,
          category,
          company,
          values[rowIndex][5], // Keep image URL
          remarks || '',
          links || '',
          '', // Column I
          ...tagsArray
       ];

       const range = inventorySheet.getRange(rowIndex + 1, 1, 1, rowData.length);
       range.setValues([rowData]);

       return { success: true, message: 'Updated successfully!' };
    }
    
    return { success: false, message: 'Item ID not found' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Test function to verify Apps Script is working
 * Call this from browser console: fetch('YOUR_APPS_SCRIPT_URL', {
 *   method: 'POST',
 *   body: JSON.stringify({action: 'test'})
 * }).then(r => r.json()).then(console.log)
 */
function handleTest(data) {
  return {
    success: true,
    message: 'Apps Script is working correctly',
    timestamp: new Date().toISOString()
  };
}


function handleGetCategories(data) {
  const sheet = getSheet(SHEET_NAMES.CATEGORIES);
  const values = sheet.getDataRange().getValues();
  // Map the rows to a simple array, skipping the header row if it exists
  const categories = values.slice(1).map(row => row[0]); 
  return { success: true, categories: categories };
}

// 1. Fetch all users from the Sheet
function handleGetAllUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  const values = sheet.getDataRange().getValues();
  
  // Skip the header row (index 0)
  const users = values.slice(1).map(row => ({
    email: row[0],
    name: row[1],
    role: row[2] || 'USER',
    status: row[3] || 'PENDING',
    createdDate: row[4],
    laptopStatus: row[5] || 'Offline', // Col F: Status
    // sessionStart: row[6],           // Col G: Start
    // sessionEnd: row[7],             // Col H: End
    totalTime: row[8] || 0             // Col I: Total Time (mins)
  }));

  return { success: true, users: users };
}

// 2. Update a user's status (Approve or Reject)
function handleUpdateUserStatus(userId, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  const data = sheet.getDataRange().getValues();
  
  // Find the row where the ID matches
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === userId.toString()) {
      rowIndex = i + 1; // +1 because Sheets is 1-indexed
      break;
    }
  }

  if (rowIndex !== -1) {
    // Column E is index 5 (1-indexed for getRange)
    sheet.getRange(rowIndex, 5).setValue(newStatus);
    return { success: true, message: `User status updated to ${newStatus}` };
  } else {
    return { success: false, message: "User not found" };
  }
}

// Handle Checkout Request
function handleCheckoutRequest(data) {
  const { userEmail, userName, itemId, itemName, quantity } = data;
  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  
  sheet.appendRow([
    new Date().toISOString(),
    userEmail,
    userName,
    itemId,
    itemName,
    quantity,
    'PENDING',
    ''
  ]);
  
  return { success: true, message: 'Request submitted successfully' };
}

// NEW: Get all requests for Admin/Dashboard
function handleGetRequests(data) {
  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  const values = sheet.getDataRange().getValues();
  const requests = [];
  
  // Skip header row
  for (let i = 1; i < values.length; i++) {
    requests.push({
      date: values[i][0],
      userEmail: values[i][1],
      userName: values[i][2],
      itemId: values[i][3],
      itemName: values[i][4],
      quantity: values[i][5],
      status: values[i][6],        // PENDING / APPROVED / REJECTED
      actionBy: values[i][7],      // Col H: Admin Name who approved checkout
      returnStatus: values[i][8],  // Col I: RETURN_PENDING / APPROVED
      // New Columns for Return Workflow
      returnRequestStatus: values[i][8], // Using Col I for return status tracking as per request
      returnTarget: values[i][9] || '',  // Col J
      returnReceiver: values[i][10] || '', // Col K: Who received it + Remarks
      returnRemarks: values[i][10] || ''   // Col K shared
    });
  }
  
  return { success: true, requests: requests };
}

// 1. Approve Checkout Request (Admin/Team)
function handleApproveCheckoutRequest(data) {
  const { requestId, approverName } = data;
  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  const values = sheet.getDataRange().getValues();
  const inventorySheet = getSheet(SHEET_NAMES.INVENTORY);
  const invValues = inventorySheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    // Check Date/ID matches (Col A)
    if (String(values[i][0]) === String(requestId)) {
      
      // Check Inventory Stock first
      const itemId = values[i][3];
      const quantity = Number(values[i][5]);
      
      let invRowIndex = -1;
      let currentStock = 0;
      
      for(let j=1; j<invValues.length; j++) {
        if(String(invValues[j][0]) === String(itemId)) {
           invRowIndex = j + 1;
           currentStock = Number(invValues[j][2]);
           break;
        }
      }
      
      if (invRowIndex === -1) return { success: false, message: 'Item not found in inventory' };
      if (currentStock < quantity) return { success: false, message: 'Insufficient stock' };
      
      // Update Inventory
      inventorySheet.getRange(invRowIndex, 3).setValue(currentStock - quantity);
      
      // Update Request Sheet
      // Col G (7): Status -> APPROVED
      sheet.getRange(i + 1, 7).setValue('APPROVED');
      // Col H (8): Action By -> Approver Name
      sheet.getRange(i + 1, 8).setValue(approverName);
      
      return { success: true, message: 'Request approved & inventory deducted' };
    }
  }
  return { success: false, message: 'Request not found' };
}

// 2. User initiates a return request
function handleReturnRequest(data) {
  const { date, returnTarget } = data; // date is used as ID here
  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(date)) {
      // Col J (Index 9): Return Target (Set logic as per requirement)
      // User Requirement: "marking col I as pending"
      
      // Col I (9): Return Status -> RETURN_PENDING
      sheet.getRange(i + 1, 9).setValue('RETURN_PENDING');
      
      // Col J (10): (Optional: Target) - We might not need this col if not specified, but good to keep
      // Let's use Col J for Return Target as previously planned, or skip if strictly only I & K are mentioned.
      // Requirement: "sent to team... marking col I as pending... who approves name in col K"
      // So Col J might be free or used for Target. Let's use Col J for Target for routing.
      sheet.getRange(i + 1, 10).setValue(returnTarget);
      
      return { success: true, message: 'Return request submitted' };
    }
  }
  return { success: false, message: 'Request not found' };
}

// Admin/Team processes the return (Receive Item)
// 3. Admin/Team processes the return (Receive Item)
function handleProcessReturn(data) {
  const { date, receiverName, remarks, quantity, itemId, userEmail } = data;
  const reqSheet = getSheet(SHEET_NAMES.REQUESTS);
  const reqValues = reqSheet.getDataRange().getValues();
  const invSheet = getSheet(SHEET_NAMES.INVENTORY);
  const invValues = invSheet.getDataRange().getValues();
  const histSheet = getSheet(SHEET_NAMES.USAGE_HISTORY);
  
  // 1. Update Request Sheet
  let reqFound = false;
  for (let i = 1; i < reqValues.length; i++) {
    if (String(reqValues[i][0]) === String(date)) {
      const row = i + 1;
      
      // Requirement: "whoever approves the name will be recorded in col K with a remarks"
      
      // Col I (Index 8): Return Status (Approved/Closed) -> 'RETURN_APPROVED'
      reqSheet.getRange(row, 9).setValue('RETURN_APPROVED');
      
      // Col K (Index 10): Approver Name + Remarks
      const entry = `${receiverName}${remarks ? ': ' + remarks : ''}`;
      reqSheet.getRange(row, 11).setValue(entry);
      
      reqFound = true;
      break;
    }
  }
  
  if (!reqFound) return { success: false, message: 'Request not found' };
  
  // 2. Update Inventory (Increase Stock)
  let itemFound = false;
  for (let i = 1; i < invValues.length; i++) {
    if (String(invValues[i][0]) === String(itemId)) {
      const currentQty = Number(invValues[i][2]);
      invSheet.getRange(i + 1, 3).setValue(currentQty + Number(quantity));
      itemFound = true;
      break;
    }
  }
  
  // 3. Log Usage History
  histSheet.appendRow([
    Utilities.getUuid(),
    itemId,
    userEmail,
    'RETURN_RECEIVED',
    quantity,
    new Date().toISOString(),
    `Received by ${receiverName}: ${remarks || ''}`
  ]);
  
  return { success: true, message: 'Return processed successfully' };
}

/**
 * Handle Laptop Toggle
 * 
 * Logic:
 * - On 'Online': Set Status=Online, StartTime=Now
 * - On 'Offline': Set Status=Offline, EndTime=Now, Calculate Duration, Add to Total
 */
function handleToggleLaptop(data) {
  const { email, status } = data; // status is 'Online' or 'Offline'
  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === email) {
      const rowIndex = i + 1;
      const now = new Date();
      
      // Update Status (Col F / Index 6)
      sheet.getRange(rowIndex, 6).setValue(status);
      
      if (status === 'Online') {
        // Set Start Time (Col G / Index 7)
        sheet.getRange(rowIndex, 7).setValue(now.toISOString());
        return { success: true, status: 'Online', message: 'Session started' };
      } 
      else {
        // Set End Time (Col H / Index 8)
        sheet.getRange(rowIndex, 8).setValue(now.toISOString());
        
        // Calculate Duration
        const startTimeStr = values[i][6]; // Col G
        let addedMinutes = 0;
        
        if (startTimeStr) {
           const startTime = new Date(startTimeStr);
           const diffMs = now - startTime;
           // Convert to minutes (round down to 2 decimals)
           addedMinutes = Math.floor(diffMs / 60000); 
        }
        
        // Update Total Time (Col I / Index 9)
        const currentTotal = Number(values[i][8]) || 0;
        const newTotal = currentTotal + addedMinutes;
        
        sheet.getRange(rowIndex, 9).setValue(newTotal);
        
        return { success: true, status: 'Offline', totalTime: newTotal, message: 'Session ended' };
      }
    }
  }
  return { success: false, message: 'User not found' };
}

/**
 * Firebase Integration for Inventory Management
 * 
 * SETUP INSTRUCTIONS:
 * 1. In your Apps Script project, go to "Libraries" and add this Script ID:
 *    1VUSl4b1r1eoNcRWotZM3e87ygkxvXltOgyDZhixqncz9lQ3MjfT1iKFw
 *    (FirestoreApp) - Select the latest version.
 * 
 * 2. In Firebase Console > Project Settings > Service accounts:
 *    - Generate a new private key
 *    - Open the JSON file
 * 
 * 3. In Apps Script > Project Settings > Script Properties:
 *    - Add 'client_email': The client_email from the JSON
 *    - Add 'private_key': The private_key from the JSON
 *    - Add 'project_id': The project_id from the JSON
 */

// Configuration
const FIREBASE_CONFIG = {
  // These will be read from Script Properties for security
  email: '', 
  key: '',
  projectId: ''
};

function getFirestore() {
  const props = PropertiesService.getScriptProperties();
  const email = props.getProperty('client_email');
  const key = props.getProperty('private_key');
  const projectId = props.getProperty('project_id');
  
  if (!email || !key || !projectId) {
    throw new Error('Missing Firebase credentials. Check Script Properties.');
  }
  // FIX: Sanitize key to handle newline characters correctly (This is the important part!)
  const sanitizedKey = key.replace(/\\n/g, '\n');
  return FirestoreApp.getFirestore(email, sanitizedKey, projectId);
}

/**
 * Syncs the entire "Inventory" sheet to Firestore.
 * Run this manually or set up a time-based trigger (e.g., every hour).
 */
function syncInventoryToFirebase() {
  const firestore = getFirestore();
  const sheet = getSheet(SHEET_NAMES.INVENTORY); // Uses helper from APPS_SCRIPT_TEMPLATE.gs
  const values = sheet.getDataRange().getValues();
  
  // Skip header
  const data = values.slice(1);
  const batchData = {};
  
  data.forEach(row => {
    const itemId = row[0];
    if (itemId) {
      // Extract tags (Column J onwards)
      const tags = row.slice(9).filter(t => t !== '');
      
      const item = {
        name: row[1],
        quantity: typeof row[2] === 'number' ? row[2] : 0,
        category: row[3],
        company: row[4],
        imageUrl: row[5],
        remarks: row[6],
        links: row[7],
        tags: tags,
        lastUpdated: new Date().toISOString()
      };
      
      // Update specific document
      // Use helper to add to batch if library supports it, or individual updates
      // FirestoreApp doesn't support massive batches easily, but let's try updateDocument
      try {
        firestore.updateDocument('inventory/' + itemId, item);
      } catch (e) {
        // If document doesn't exist, create it
        firestore.createDocument('inventory/' + itemId, item);
      }
    }
  });
  
  console.log('Synced ' + data.length + ' items to Firebase.');
}

/**
 * OPTIONAL: Trigger-based sync
 * Can be attached to onEdit, but be careful with quotas.
 */
function onInventoryEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAMES.INVENTORY) return;
  
  // Only sync the specific row that changed
  const range = e.range;
  const row = range.getRow();
  
  if (row <= 1) return; // Header
  
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const itemId = values[0];
  
  if (itemId) {
    const firestore = getFirestore();
    const tags = values.slice(9).filter(t => t !== '');
    
    const item = {
        name: values[1],
        quantity: typeof values[2] === 'number' ? values[2] : 0,
        category: values[3],
        company: values[4],
        imageUrl: values[5],
        remarks: values[6],
        links: values[7],
        tags: tags,
        lastUpdated: new Date().toISOString()
    };
    
    // Update single document
    try {
      firestore.updateDocument('inventory/' + itemId, item);
      console.log('Updated item ' + itemId);
    } catch (e) {
      console.error('Error updating item ' + itemId + ': ' + e.toString());
    }
  }
}


