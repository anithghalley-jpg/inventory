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
  REQUESTS: 'Requests',
  MACHINES: ['LaserCutter', 'LaserCutter2', '3DPrinter1']
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
      case 'getMachineLogs':
        response = handleGetMachineLogs(data);
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
      case 'forceToggleLaptop':
        response = handleForceToggleLaptop(data);
        break;
      case 'updateUserNote':
        response = handleUpdateUserNote(data);
        break;
      case 'getHomeContent':
        response = handleGetHomeContent(data);
        break;
      case 'manageHomeContent':
        response = handleManageHomeContent(data);
        break;
      case 'getSettings':
        response = handleGetSettings(data);
        break;
      case 'manageAdminSettings':
        response = handleManageAdminSettings(data);
        break;
      case 'updateInventoryItem':
        response = handleUpdateInventoryItem(data);
        break;
      case 'deleteInventoryItem':
        response = handleDeleteInventoryItem(data);
        break;
      case 'updateUser':
        response = handleUpdateUser(data);
        break;
      case 'syncUsersToFirebase':
        response = handleSyncUsersToFirebase(data);
        break;
      case 'syncRequestsToFirebase':
        response = handleSyncRequestsToFirebase(data);
        break;
      case 'deleteHomeContent':
        response = handleDeleteHomeContent(data);
        break;
      case 'checkSyncStatus':
        response = handleCheckSyncStatus(data);
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
          totalTime: values[i][8] || 0,
          tags: values[i].slice(10).filter(t => t !== '') // New: User Tags
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
  // Skip the header row (index 0)
  const users = values.slice(1).map(row => {
    // Collect tags from Column K (Index 10) onwards
    const tags = row.slice(10).filter(t => t !== '');
    
    return {
      email: row[0],
      name: row[1],
      role: row[2] || 'USER',
      status: row[3] || 'PENDING',
      createdDate: row[4],
      laptopStatus: row[5] || 'Offline', // Col F: Status
      // sessionStart: row[6],           // Col G: Start
      // sessionEnd: row[7],             // Col H: End
      totalTime: row[8] || 0,            // Col I: Total Time (mins)
      tags: tags                         // New: User Tags
    };
  });

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



// ===== MACHINE LOGS FEATURE =====

function handleGetMachineLogs(data) {
    const machines = SHEET_NAMES.MACHINES;
    const result = [];

    // Pre-fetch Users for RFID Lookup
    // Users Sheet: Col A = ID/Email?, Col B = Name?, ... Col J = RFID?
    // User Prompt: "Users sheets under column J (rfid)... name is taken from that same row under col B"
    const usersSheet = getSheet(SHEET_NAMES.USERS);
    const usersData = usersSheet.getDataRange().getValues();
    const rfidMap = {}; // RFID -> Name

    // Skip header (row 0)
    for (let i = 1; i < usersData.length; i++) {
        const rfid = String(usersData[i][9] || '').trim(); // Col J is index 9
        const name = usersData[i][1]; // Col B is index 1
        if (rfid) {
            rfidMap[rfid] = name;
        }
    }

    machines.forEach(machineName => {
        const sheet = getSheet(machineName);
        if (!sheet) return;

        const range = sheet.getDataRange();
        const values = range.getValues();
        // Headers: RFID(A), Name(B), Command(C), Machine(D), Start(E), Stop(F), Duration(G)
        // Indices: 0,       1,       2,          3,          4,        5,       6

        // We need to look for empty names and update them if RFID matches
        // But we should be careful about writing back to sheet too often. 
        // Let's collect updates.

        const logs = [];
        let isOnline = false;
        let currentUser = '';

        // Iterate rows (skip header)
        for (let i = 1; i < values.length; i++) {
            const row = values[i];
            let rfid = String(row[0] || '').trim();
            let name = row[1];
            const command = String(row[2] || '').toUpperCase(); // Col C
            const machineId = row[3]; // Col D
            const start = row[4];
            const stop = row[5];
            const duration = row[6]; // Col G

            // 1. UPDATE NAME IF MISSING
            if (!name && rfid && rfidMap[rfid]) {
                name = rfidMap[rfid];
                // Update the cell in the sheet directly
                // i + 1 is row number (1-based)
                sheet.getRange(i + 1, 2).setValue(name); // Col B is 2
            }

            logs.push({
                rfid,
                name: name || 'Unknown',
                command,
                machineId,
                start,
                stop,
                duration
            });
        }

        // Determine Status from LAST row
        if (logs.length > 0) {
            const lastLog = logs[logs.length - 1];
            // "last entry of col D is ON or GET" -> User likely meant Col C (Command)
            // "command column C is ON or GET... OFF or PASS"
            const status = lastLog.command;
            if (status === 'ON' || status === 'GET') {
                isOnline = true;
                currentUser = lastLog.name;
            }
        }

        result.push({
            id: machineName,
            name: formatMachineName(machineName), // e.g. "Laser Cutter"
            logs: logs.reverse(), // Newest first
            isOnline,
            currentUser
        });
    });

    return {
        success: true,
        data: result
    };
}

function formatMachineName(str) {
    // Simple formatter: "LaserCutter" -> "Laser Cutter"
    return str.replace(/([A-Z])/g, ' $1').trim();
}

// ===== MACHINE LOGIC PROCESSOR =====

/**
 * Triggers on any change to the spreadsheet.
 * Manually set this up as an Installable Trigger:
 * - Function: onMachineSheetChange
 * - Event Source: From spreadsheet
 * - Event Type: On change
 */
function onMachineSheetChange(e) {
  // Check if it's a machine sheet
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  
  if (SHEET_NAMES.MACHINES.includes(sheetName)) {
    console.log(`Processing machine logs for: ${sheetName}`);
    
    // Build RFID Map once
    const usersSheet = getSheet(SHEET_NAMES.USERS);
    const usersData = usersSheet.getDataRange().getValues();
    const rfidMap = {};
    // Skip header
    for (let i = 1; i < usersData.length; i++) {
        const rfid = String(usersData[i][9] || '').trim(); // Col J is index 9
        const name = usersData[i][1]; // Col B is index 1
        if (rfid) rfidMap[rfid] = name;
    }
    
    processMachineLogs(sheet, rfidMap);
  }
}

// Helper to calculate duration in minutes (Decimal precision)
function calculateDurationMinutes(startTime, stopTime) {
  if (!startTime || !stopTime) return 0;
  const start = new Date(startTime);
  const stop = new Date(stopTime);
  // Ensure valid dates
  if (isNaN(start.getTime()) || isNaN(stop.getTime())) return 0;
  
  const diffMs = stop.getTime() - start.getTime();
  // Return with 3 decimal places e.g. 3.382
  // We use Number() to convert "3.382" string back to number
  return Number((diffMs / 60000).toFixed(3));
}

function processMachineLogs(sheet, rfidMap) {
    const range = sheet.getDataRange();
    const values = range.getValues();
    const now = new Date();
    const nowIso = now.toISOString(); // Unified ISO format

    const updates = []; // Array of {row, col, value}
    
    // Track ACTIVE session to calculate duration
    // We assume single-user active at a time per machine logic (Event Stream)
    // ON/GET -> Sets Active Session
    // OFF/PASS -> Closes Active Session (regardless of who scanned OFF/PASS)
    
    let activeSession = null; // { name, startTime, rowIndex }

    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const rfid = String(row[0] || '').trim();
        let name = row[1];
        const command = String(row[2] || '').trim().toUpperCase();
        let status = row[3]; // Col D
        let start = row[4];  // Col E
        let stop = row[5];   // Col F
        let duration = row[6]; // Col G
        
        // Track whether we modified the current row 'i'
        // Note: Start Row updates (Col G) might target previous 'i'
        let rowUpdated = false;

        // 1. RESOLVE RFID (Update Name)
        if (!name && rfid && rfidMap[rfid]) {
            name = rfidMap[rfid];
            // Col B (Index 1) -> Sheet Col 2
            updates.push({ r: i + 1, c: 2, val: name });
            rowUpdated = true;
        }

        // 2. INTERPRET COMMAND & UPDATE STATE
        
        let newStatus = status;
        let isStartCommand = (command === 'ON' || command === 'GET');
        let isStopCommand = (command === 'OFF' || command === 'PASS');
        
        if (isStartCommand) newStatus = 'ON';
        else if (isStopCommand) newStatus = 'OFF';
        
        if (newStatus !== status) {
             updates.push({ r: i + 1, c: 4, val: newStatus });
             status = newStatus;
             rowUpdated = true;
        }

        // 3. HANDLE TIMES & DURATIONS
        
        if (isStartCommand) {
            // Start Session
            if (!start) {
                // FORCE ISO 8601
                start = nowIso;
                updates.push({ r: i + 1, c: 5, val: start });
                rowUpdated = true;
            }
            
            // Set Active Session (Last Write Wins for Start Time)
            // Store rowIndex (i + 1) so we can write duration back to THIS row later
            activeSession = { 
                name: name || 'Unknown', 
                startTime: new Date(start),
                rowIndex: i + 1
            };
        }
        else if (isStopCommand) {
            // End Session
            if (!stop) {
                // FORCE ISO 8601
                stop = nowIso;
                updates.push({ r: i + 1, c: 6, val: stop });
                rowUpdated = true;
            }
            
            // Calculate Duration using ACTIVE SESSION
            // This handles "User A ON" -> "User B PASS" scenario
            if (activeSession) {
                 const startTime = activeSession.startTime;
                 const stopTime = new Date(stop);
                 const diffMins = calculateDurationMinutes(startTime, stopTime);

                 // CHECK: Does Start Row already have duration?
                 // We need to look at values[] for the start row.
                 const startRowIndex = activeSession.rowIndex - 1;
                 const existingDuration = values[startRowIndex][6]; // Col G is index 6
                 
                 // Update if empty, 0, or significantly different (re-calc)
                 // We compare with tolerance for floating point, though typically exact replace is fine
                 if (!existingDuration || existingDuration === 0 || existingDuration === '0') {
                     
                     console.log(`Updating duration for row ${activeSession.rowIndex}: ${diffMins} mins`);
                     
                     // Update the START ROW with the duration
                     updates.push({ r: activeSession.rowIndex, c: 7, val: diffMins });
                     
                     // Also update our local values copy so we don't re-process if logic overlaps
                     if (startRowIndex < values.length) {
                         values[startRowIndex][6] = diffMins;
                     }
                 }
                 
                // End active session
                activeSession = null;
            }
        }
    }

    // APPLY UPDATES
    if (updates.length > 0) {
        updates.forEach(u => {
            // Update local array to return fresh data
            values[u.r - 1][u.c - 1] = u.val;
            // Write to sheet
            sheet.getRange(u.r, u.c).setValue(u.val);
        });
        console.log(`Updated ${updates.length} cells in ${sheet.getName()}`);
    }

    return values;
}

// Updated handleGetMachineLogs to use processor
function handleGetMachineLogs(data) {
    const machines = SHEET_NAMES.MACHINES;
    const result = [];

    const usersSheet = getSheet(SHEET_NAMES.USERS);
    const usersData = usersSheet.getDataRange().getValues();
    const rfidMap = {};

    for (let i = 1; i < usersData.length; i++) {
        const rfid = String(usersData[i][9] || '').trim();
        const name = usersData[i][1];
        if (rfid) rfidMap[rfid] = name;
    }

    machines.forEach(machineName => {
        const sheet = getSheet(machineName);
        if (!sheet) return;

        // PROCESS LOGIC HERE - ENSURE FRESH DATA
        const values = processMachineLogs(sheet, rfidMap);

        const logs = [];
        let isOnline = false;
        let currentUser = '';

        // Skip header
        for (let i = 1; i < values.length; i++) {
            const row = values[i];
            const rfid = row[0];
            const name = row[1];
            const command = row[2];
            const status = row[3];
            const start = row[4];
            const stop = row[5];
            const duration = row[6];

            logs.push({
                rfid,
                name: name || 'Unknown',
                command,
                status,
                machineId: machineName,
                start,
                stop,
                duration
            });
        }
        
        // Determine Machine Current Status
        if (logs.length > 0) {
             const lastLog = logs[logs.length - 1];
             if (lastLog.status === 'ON') {
                 isOnline = true;
                 currentUser = lastLog.name;
             }
        }

        result.push({
            id: machineName,
            name: formatMachineName(machineName),
            logs: logs.reverse(),
            isOnline,
            currentUser
        });
    });

    return { success: true, data: result };
}
// ===== PRD 2.0 & 2.1 NEW FEATURES =====

/**
 * Handle Force Turn Off (Admin/Team)
 * Turns off a user's laptop session from the dashboard.
 */
function handleForceToggleLaptop(data) {
  const { userEmail, adminName } = data;
  if (!userEmail) return { success: false, message: 'Missing user email' };

  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const hashColIndex = headers.indexOf('Sync Hash');
  
  // Find columns
  let laptopStatusCol = 0, sessionStartCol = 0, sessionEndCol = 0, totalTimeCol = 0;
  for (let c = 0; c < headers.length; c++) {
    const h = String(headers[c] || '').toLowerCase();
    if (h.includes('laptop status')) laptopStatusCol = c;
    if (h.includes('session start')) sessionStartCol = c;
    if (h.includes('session end')) sessionEndCol = c;
    if (h.includes('total time')) totalTimeCol = c;
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === userEmail) {
      const currentStatus = values[i][laptopStatusCol];
      if (currentStatus !== 'Online') {
        return { success: false, message: 'User is not online' };
      }

      const now = new Date();
      sheet.getRange(i + 1, laptopStatusCol + 1).setValue('Offline');
      sheet.getRange(i + 1, sessionEndCol + 1).setValue(now.toISOString());
      
      const startTimeStr = values[i][sessionStartCol];
      let newTotal = Number(values[i][totalTimeCol]) || 0;
      
      if (startTimeStr) {
        const startTime = new Date(startTimeStr);
        const diffMs = now.getTime() - startTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins > 0) newTotal += diffMins;
      }
      
      sheet.getRange(i + 1, totalTimeCol + 1).setValue(newTotal);

      // Trigger user sync (Assuming onSpreadsheetEdit or a local sync call handles Firestore)
      // We will manually sync the user back to Firestore to ensure UI updates immediately
      const rowData = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const tags = rowData.slice(hashColIndex !== -1 ? hashColIndex + 1 : 13).filter(t => t !== '');
      const userData = {
        email: userEmail,
        name: rowData[1],
        role: rowData[2] || 'USER',
        status: rowData[3] || 'PENDING',
        createdDate: rowData[4],
        laptopStatus: 'Offline',
        totalTime: newTotal,
        myPageLink: rowData[10] || '',
        note: rowData[11] || '',
        tags: tags,
        lastUpdated: new Date().toISOString()
      };
      
      const firestore = getFirestore();
      try { firestore.updateDocument('users/' + userEmail, userData); } 
      catch (e) { firestore.createDocument('users/' + userEmail, userData); }

      return { success: true, message: `Forced turn off by ${adminName}` };
    }
  }
  return { success: false, message: 'User not found' };
}

/**
 * Handle Admin Note Update
 * Appends or overwrites the "Admin Note" on a user profile.
 */
function handleUpdateUserNote(data) {
  const { userEmail, note } = data;
  if (!userEmail) return { success: false, message: 'Missing user email' };

  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  let noteColIndex = headers.indexOf('Note');
  if (noteColIndex === -1 && headers.indexOf('Admin Note') !== -1) {
      noteColIndex = headers.indexOf('Admin Note');
  } else if (noteColIndex === -1) {
      noteColIndex = 11; // Default
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === userEmail) {
      sheet.getRange(i + 1, noteColIndex + 1).setValue(note);
      
      // Sync back to firestore
      const rowData = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const hashColIndex = headers.indexOf('Sync Hash');
      const tags = rowData.slice(hashColIndex !== -1 ? hashColIndex + 1 : 13).filter(t => t !== '');
      const userData = {
        email: userEmail,
        name: rowData[1],
        role: rowData[2],
        status: rowData[3],
        createdDate: rowData[4],
        laptopStatus: rowData[5],
        totalTime: rowData[8] || 0,
        myPageLink: rowData[10] || '',
        note: note, // NEW NOTE!
        tags: tags,
        lastUpdated: new Date().toISOString()
      };
      
      const firestore = getFirestore();
      try { firestore.updateDocument('users/' + userEmail, userData); } 
      catch (e) { firestore.createDocument('users/' + userEmail, userData); }

      return { success: true };
    }
  }
  return { success: false, message: 'User not found' };
}

/**
 * Manage Global System Settings (e.g. Allow Team Inventory Edit)
 */
function handleManageAdminSettings(data) {
  const { allowTeamInventoryEdit } = data;
  // If no "Settings" sheet, save directly to Firestore under 'settings/admin'
  let sheet = null;
  try { sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings'); } catch(e){}
  
  if (!sheet) {
    const firestore = getFirestore();
    const doc = { allowTeamInventoryEdit: !!allowTeamInventoryEdit };
    try { firestore.updateDocument('settings/admin', doc); }
    catch (e) { firestore.createDocument('settings/admin', doc); }
    return { success: true, warning: 'Saved to Firestore only. Create "Settings" sheet to persist.' };
  }
  
  const values = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === 'allowTeamInventoryEdit') {
      sheet.getRange(i + 1, 2).setValue(String(allowTeamInventoryEdit));
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow(['allowTeamInventoryEdit', String(allowTeamInventoryEdit)]);
  }
  
  try { syncSettingsToFirebase(); } catch(e) {}
  return { success: true };
}

function handleGetSettings(data) {
  let sheet = null;
  try { sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings'); } catch(e){}
  const defaults = { allowTeamInventoryEdit: false };
  if (!sheet) return { success: true, settings: defaults };
  
  const values = sheet.getDataRange().getValues();
  let allow = false;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === 'allowTeamInventoryEdit') {
      allow = String(values[i][1]).toLowerCase() === 'true';
    }
  }
  return { success: true, settings: { allowTeamInventoryEdit: allow } };
}

/**
 * Handle Managing Home Page Content
 * Inserts content into the "Home" sheet and syncs it.
 */
function handleManageHomeContent(data) {
  const { id, type, heading, description, contentUrl } = data;
  const sheet = getSheet(SHEET_NAMES.HOME);
  if (!sheet) return { success: false, message: "Home sheet not found." };
  
  // Format based on what syncHomeToFirebase expects: [id, type, heading, description, contentUrl]
  const newRow = [id || Utilities.getUuid(), type, heading, description, contentUrl];
  
  // Update or append
  const values = sheet.getDataRange().getValues();
  let found = false;
  if (id) {
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === id) {
        sheet.getRange(i + 1, 1, 1, 5).setValues([newRow]);
        found = true;
        break;
      }
    }
  }
  if (!found) sheet.appendRow(newRow);
  
  try { syncHomeToFirebase(); } catch(e) { console.error(e); }
  return { success: true };
}


function handleGetHomeContent(data) {
  const sheet = getSheet(SHEET_NAMES.HOME);
  if (!sheet) return { success: true, items: [] };
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: true, items: [] };
  
  const items = values.slice(1).map(row => ({
    id: String(row[0]),
    type: String(row[1] || ''),
    heading: String(row[2] || ''),
    description: String(row[3] || ''),
    contentUrl: String(row[4] || '')
  }));
  return { success: true, items };
}

// ===== NEW: ADMIN EDIT & SYNC HANDLERS =====

/**
 * Update an existing Inventory item in Google Sheets and sync to Firestore.
 * Lookup key: itemId (Column A of Inventory sheet)
 */
function handleUpdateInventoryItem(data) {
  const { itemId, name, quantity, category, company, remarks, links, tags } = data;
  if (!itemId) return { success: false, message: 'Missing itemId' };

  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(itemId).trim()) {
      const tagsArray = Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : []);

      // Build new row data, keeping imageUrl (col 5) unchanged
      const rowData = [
        itemId,
        name || values[i][1],
        quantity !== undefined ? Number(quantity) : values[i][2],
        category || values[i][3],
        company || values[i][4],
        values[i][5], // Keep existing imageUrl
        remarks !== undefined ? remarks : (values[i][6] || ''),
        links !== undefined ? links : (values[i][7] || ''),
        '', // Column I reserved
        ...tagsArray
      ];

      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);

      // Sync to Firebase
      try { syncSingleInventoryItem(itemId, rowData); } catch (e) { console.error('Firebase sync error: ' + e); }

      return { success: true, message: 'Item updated successfully' };
    }
  }
  return { success: false, message: 'Item not found' };
}

/**
 * Delete an inventory item from Google Sheets and Firestore.
 * Lookup key: itemId (Column A of Inventory sheet)
 */
function handleDeleteInventoryItem(data) {
  const { itemId } = data;
  if (!itemId) return { success: false, message: 'Missing itemId' };

  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(itemId).trim()) {
      sheet.deleteRow(i + 1);

      // Delete from Firestore
      try {
        const firestore = getFirestore();
        firestore.deleteDocument('inventory/' + itemId);
      } catch (e) { console.error('Firebase delete error: ' + e); }

      return { success: true, message: 'Item deleted' };
    }
  }
  return { success: false, message: 'Item not found' };
}

/**
 * Update a user's name, role, and/or admin note.
 * Lookup key: email (Col A of Users sheet — email IS the natural identifier)
 */
function handleUpdateUser(data) {
  const { userEmail, name, role, note } = data;
  if (!userEmail) return { success: false, message: 'Missing userEmail' };

  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  let noteColIndex = headers.indexOf('Note');
  if (noteColIndex === -1) noteColIndex = headers.indexOf('Admin Note');
  if (noteColIndex === -1) noteColIndex = 11; // Default col L (0-indexed 11)

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(userEmail).trim()) {
      // Update Name (Col B = index 1)
      if (name !== undefined) sheet.getRange(i + 1, 2).setValue(name);
      // Update Role (Col C = index 2)
      if (role !== undefined) sheet.getRange(i + 1, 3).setValue(role.toUpperCase());
      // Update Note
      if (note !== undefined) sheet.getRange(i + 1, noteColIndex + 1).setValue(note);

      // Sync to Firestore
      try {
        const rowData = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn()).getValues()[0];
        syncSingleUser(userEmail, rowData, noteColIndex);
      } catch (e) { console.error('Firebase sync error: ' + e); }

      return { success: true, message: 'User updated successfully' };
    }
  }
  return { success: false, message: 'User not found' };
}

/**
 * Bulk sync the entire Users sheet to Firestore.
 * FIXED: getFirestore() is wrapped in its own try/catch so credential errors
 * return a readable message instead of crashing the whole request.
 * OPTIMISED: Skips rows whose MD5 hash hasn't changed since last sync.
 */
function handleSyncUsersToFirebase(data) {
  // 1. Validate Firebase credentials first — surface helpful error immediately
  let firestore;
  try {
    firestore = getFirestore();
  } catch (credErr) {
    return { success: false, message: 'Firebase credentials error: ' + credErr.toString() + '. Check Script Properties (client_email, private_key, project_id).' };
  }

  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  // Locate key columns
  let hashColIndex = headers.indexOf('Sync Hash');
  let noteColIndex = headers.indexOf('Note');
  if (noteColIndex === -1) noteColIndex = headers.indexOf('Admin Note');
  if (noteColIndex === -1) noteColIndex = 11;

  // If there is no Sync Hash column, create one at the end
  if (hashColIndex === -1) {
    hashColIndex = headers.length;
    sheet.getRange(1, hashColIndex + 1).setValue('Sync Hash');
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;
  const startTime = Date.now();
  const MAX_RUNTIME_MS = 270000; // 4.5 minutes — GAS limit is 6 min

  for (let i = 1; i < values.length; i++) {
    // Safety: stop if approaching GAS 6-min wall
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      return { success: true, partial: true, message: `Timeout safety stop. Synced ${synced}, skipped ${skipped}, errors ${errors}. Re-run to continue.` };
    }

    const row = values[i];
    const email = String(row[0] || '').trim();
    if (!email) continue;

    const tagsStart = hashColIndex > 0 ? hashColIndex + 1 : 13;
    const tags = row.slice(tagsStart).filter(t => t !== '' && t !== undefined);

    const userData = {
      email: email,
      name: row[1] || '',
      role: row[2] || 'USER',
      status: row[3] || 'PENDING',
      createdDate: row[4] ? String(row[4]) : '',
      laptopStatus: row[5] || 'Offline',
      totalTime: Number(row[8]) || 0,
      myPageLink: row[10] || '',
      note: row[noteColIndex] || '',
      tags: tags,
      lastUpdated: new Date().toISOString()
    };

    // MD5-based change detection — skip unchanged rows
    const rowPayload = JSON.stringify({ ...userData, lastUpdated: '' }); // exclude timestamp from hash
    const currentHash = computeMd5Hash(rowPayload);
    const storedHash = String(row[hashColIndex] || '');

    if (currentHash === storedHash) {
      skipped++;
      continue; // Row hasn't changed — no need to write to Firebase
    }

    try {
      try { firestore.updateDocument('users/' + email, userData); }
      catch (e) { firestore.createDocument('users/' + email, userData); }
      // Write new hash back to sheet so we skip it next run
      sheet.getRange(i + 1, hashColIndex + 1).setValue(currentHash);
      synced++;
    } catch (rowErr) {
      errors++;
      console.error('Failed to sync user ' + email + ': ' + rowErr);
    }

    // Rate limiting — stay well within Firebase quota
    if (i % 3 === 0) Utilities.sleep(400);
  }

  return { success: true, message: `Synced ${synced} users (${skipped} unchanged, ${errors} errors).` };
}

/**
 * Bulk sync the entire Requests sheet to Firestore.
 * FIXED: Credential errors return early with a readable message.
 * OPTIMISED: MD5 hash-based change detection.
 */
function handleSyncRequestsToFirebase(data) {
  let firestore;
  try {
    firestore = getFirestore();
  } catch (credErr) {
    return { success: false, message: 'Firebase credentials error: ' + credErr.toString() + '. Check Script Properties.' };
  }

  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  if (!sheet) return { success: false, message: 'Requests sheet not found. Check SHEET_NAMES.REQUESTS.' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  let hashColIndex = headers ? headers.indexOf('Sync Hash') : -1;

  if (hashColIndex === -1 && headers) {
    hashColIndex = headers.length;
    sheet.getRange(1, hashColIndex + 1).setValue('Sync Hash');
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 1; i < values.length; i++) {
    if (Date.now() - startTime > 270000) {
      return { success: true, partial: true, message: `Timeout stop. Synced ${synced}, skipped ${skipped}, errors ${errors}.` };
    }

    const row = values[i];
    const requestId = String(row[0] || '').trim();
    if (!requestId) continue;

    const reqData = {
      date: requestId,
      userEmail: row[1] || '',
      userName: row[2] || '',
      itemId: row[3] || '',
      itemName: row[4] || '',
      quantity: Number(row[5]) || 0,
      status: row[6] || 'PENDING',
      actionBy: row[7] || '',
      returnRequestStatus: row[8] || '',
      returnTarget: row[9] || '',
      returnReceiver: row[10] || '',
      lastUpdated: new Date().toISOString()
    };

    const docId = requestId.replace(/[:/]/g, '_');
    const rowPayload = JSON.stringify({ ...reqData, lastUpdated: '' });
    const currentHash = computeMd5Hash(rowPayload);
    const storedHash = String(row[hashColIndex] || '');

    if (currentHash === storedHash) {
      skipped++;
      continue;
    }

    try {
      try { firestore.updateDocument('requests/' + docId, reqData); }
      catch (e) { firestore.createDocument('requests/' + docId, reqData); }
      sheet.getRange(i + 1, hashColIndex + 1).setValue(currentHash);
      synced++;
    } catch (rowErr) {
      errors++;
      console.error('Failed to sync request ' + requestId + ': ' + rowErr);
    }

    if (i % 3 === 0) Utilities.sleep(400);
  }

  return { success: true, message: `Synced ${synced} requests (${skipped} unchanged, ${errors} errors).` };
}

/**
 * Delete a home content block from the Home sheet and Firestore.
 */
function handleDeleteHomeContent(data) {
  const { id } = data;
  if (!id) return { success: false, message: 'Missing id' };

  const sheet = getSheet(SHEET_NAMES.HOME);
  if (!sheet) return { success: false, message: 'Home sheet not found' };
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      try {
        const firestore = getFirestore();
        firestore.deleteDocument('home/' + id);
      } catch (e) { console.error('Firebase delete error: ' + e); }
      return { success: true };
    }
  }
  return { success: false, message: 'Content block not found' };
}

// ===== FIREBASE PER-DOC SYNC HELPERS =====

/**
 * Sync a single inventory item to Firestore.
 * @param {string} itemId
 * @param {Array} rowData - Array representing the sheet row values
 */
function syncSingleInventoryItem(itemId, rowData) {
  const firestore = getFirestore();
  const tags = rowData.slice(9).filter(t => t !== '');
  const item = {
    name: rowData[1],
    quantity: typeof rowData[2] === 'number' ? rowData[2] : Number(rowData[2]) || 0,
    category: rowData[3],
    company: rowData[4],
    imageUrl: rowData[5],
    remarks: rowData[6] || '',
    links: rowData[7] || '',
    tags: tags,
    lastUpdated: new Date().toISOString()
  };
  try { firestore.updateDocument('inventory/' + itemId, item); }
  catch (e) { firestore.createDocument('inventory/' + itemId, item); }
}

/**
 * Sync a single user to Firestore.
 * @param {string} email
 * @param {Array} rowData - Array representing the sheet row values
 * @param {number} noteColIndex
 */
function syncSingleUser(email, rowData, noteColIndex) {
  const firestore = getFirestore();
  const tagsStart = noteColIndex + 1;
  const tags = rowData.slice(tagsStart > 13 ? tagsStart : 13).filter(t => t !== '');
  const userData = {
    email: email,
    name: rowData[1] || '',
    role: rowData[2] || 'USER',
    status: rowData[3] || 'PENDING',
    createdDate: rowData[4] || '',
    laptopStatus: rowData[5] || 'Offline',
    totalTime: Number(rowData[8]) || 0,
    myPageLink: rowData[10] || '',
    note: rowData[noteColIndex] || '',
    tags: tags,
    lastUpdated: new Date().toISOString()
  };
  try { firestore.updateDocument('users/' + email, userData); }
  catch (e) { firestore.createDocument('users/' + email, userData); }
}

// ===== MD5 HASH HELPER =====

/**
 * Computes a short hex hash of a string.
 * Uses GAS built-in Utilities.computeDigest — no external library needed.
 */
function computeMd5Hash(str) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, str, Utilities.Charset.UTF_8);
  return raw.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

// ===== SYNC STATUS CHECK =====

/**
 * Compares Google Sheets rows vs Firebase document count to determine
 * if a sync is needed. Returns counts and an estimate of unsynced rows.
 * 
 * Strategy: Count rows in Sheets that have an EMPTY 'Sync Hash' column
 *           — those have never been synced (or changed since last sync).
 *           We also try to read Firebase collection size, but skip if
 *           Firebase credentials are unavailable (graceful degradation).
 */
function handleCheckSyncStatus(data) {
  const result = {
    success: true,
    users: { sheetRows: 0, unsyncedRows: 0, canCheck: true },
    requests: { sheetRows: 0, unsyncedRows: 0, canCheck: true },
    firebaseAvailable: false
  };

  // Check Firebase connectivity
  try {
    getFirestore(); // Just test credentials — don't read anything
    result.firebaseAvailable = true;
  } catch (e) {
    result.firebaseAvailable = false;
    result.credentialError = e.toString();
  }

  // ---- Users ----
  try {
    const usersSheet = getSheet(SHEET_NAMES.USERS);
    const usersValues = usersSheet.getDataRange().getValues();
    const usersHeaders = usersValues[0] || [];
    const hashCol = usersHeaders.indexOf('Sync Hash');
    const dataRows = usersValues.slice(1).filter(r => String(r[0] || '').trim() !== '');
    result.users.sheetRows = dataRows.length;

    if (hashCol !== -1) {
      // Count rows where hash is empty (never synced or changed)
      result.users.unsyncedRows = dataRows.filter(r => !String(r[hashCol] || '').trim()).length;
    } else {
      // No hash column at all — every row is unsynced
      result.users.unsyncedRows = dataRows.length;
    }
  } catch (e) {
    result.users.canCheck = false;
    result.users.error = e.toString();
  }

  // ---- Requests ----
  try {
    const reqSheet = getSheet(SHEET_NAMES.REQUESTS);
    if (!reqSheet) {
      result.requests.canCheck = false;
    } else {
      const reqValues = reqSheet.getDataRange().getValues();
      const reqHeaders = reqValues[0] || [];
      const reqHashCol = reqHeaders.indexOf('Sync Hash');
      const reqDataRows = reqValues.slice(1).filter(r => String(r[0] || '').trim() !== '');
      result.requests.sheetRows = reqDataRows.length;

      if (reqHashCol !== -1) {
        result.requests.unsyncedRows = reqDataRows.filter(r => !String(r[reqHashCol] || '').trim()).length;
      } else {
        result.requests.unsyncedRows = reqDataRows.length;
      }
    }
  } catch (e) {
    result.requests.canCheck = false;
    result.requests.error = e.toString();
  }

  return result;
}
