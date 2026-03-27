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
 *    - Fab Academy
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
  HOME : 'Home',
  FAB_ACADEMY: 'Fab Academy',
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

function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
}

function ensureHeaderColumn(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  let index = headers.indexOf(headerName);
  if (index === -1) {
    index = headers.length;
    sheet.getRange(1, index + 1).setValue(headerName);
  }
  return index;
}

function findRowIndexByValue(values, keyColIndex, keyValue) {
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][keyColIndex] || '').trim() === String(keyValue).trim()) {
      return i + 1;
    }
  }
  return -1;
}

function computeUserSyncHash(userData) {
  return computeMd5Hash(JSON.stringify({
    email: String(userData.email || ''),
    name: String(userData.name || ''),
    role: String(userData.role || 'USER'),
    status: String(userData.status || 'PENDING'),
    createdDate: String(userData.createdDate || ''),
    laptopStatus: String(userData.laptopStatus || 'Offline'),
    sessionStart: String(userData.sessionStart || ''),
    sessionEnd: String(userData.sessionEnd || ''),
    totalTime: Number(userData.totalTime) || 0,
    rfid: String(userData.rfid || ''),
    myPageLink: String(userData.myPageLink || ''),
    tags: Array.isArray(userData.tags) ? userData.tags : [],
    note: String(userData.note || ''),
  }));
}

function computeRequestSyncHash(requestData) {
  return computeMd5Hash(JSON.stringify({
    date: String(requestData.date || ''),
    userEmail: String(requestData.userEmail || ''),
    userName: String(requestData.userName || ''),
    itemId: String(requestData.itemId || ''),
    itemName: String(requestData.itemName || ''),
    quantity: Number(requestData.quantity) || 0,
    status: String(requestData.status || 'PENDING'),
    actionBy: String(requestData.actionBy || ''),
    returnStatus: String(requestData.returnStatus || ''),
    returnTarget: String(requestData.returnTarget || ''),
    returnReceiver: String(requestData.returnReceiver || ''),
    returnRemarks: String(requestData.returnRemarks || ''),
  }));
}

function computeFabAcademySyncHash(entryData) {
  return computeMd5Hash(JSON.stringify({
    entryId: String(entryData.entryId || ''),
    studentName: String(entryData.studentName || ''),
    imageUrl: String(entryData.imageUrl || ''),
    fabYear: String(entryData.fabYear || ''),
    videoUrl: String(entryData.videoUrl || ''),
    documentationUrl: String(entryData.documentationUrl || ''),
    remarks: String(entryData.remarks || ''),
  }));
}

function ensureFabAcademyHeaders(sheet) {
  const expectedHeaders = [
    'Entry ID',
    'Student Name',
    'Image URL',
    'Fab Academy Year',
    'Project Video URL',
    'Documentation URL',
    'Remarks',
    'Sync Hash',
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return expectedHeaders;
  }

  expectedHeaders.forEach((header) => ensureHeaderColumn(sheet, header));
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
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
        response = handleUpdateUserStatus(data.userId, 'APPROVED');
        break;
      case 'rejectUser':
        response = handleUpdateUserStatus(data.userId, 'REJECTED');
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
        // OPTIMIZED: This just uploads and returns the URL
        response = handleUploadImageOptimized(data);
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
      case 'getFabAcademyContent':
        response = handleGetFabAcademyContent(data);
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
      case 'syncUsersToConvex':
        response = handleSyncUsersToConvex(data);
        break;
      case 'syncRequestsToConvex':
        response = handleSyncRequestsToConvex(data);
        break;
      case 'deleteHomeContent':
        response = handleDeleteHomeContent(data);
        break;
      case 'checkSyncStatus':
        response = handleCheckSyncStatus(data);
        break;
      case 'upsertUserRow':
        response = handleUpsertUserRow(data);
        break;
      case 'deleteUserRow':
        response = handleDeleteUserRow(data);
        break;
      case 'upsertRequestRow':
        response = handleUpsertRequestRow(data);
        break;
      case 'deleteRequestRow':
        response = handleDeleteRequestRow(data);
        break;
      case 'upsertInventoryRow':
        response = handleUpsertInventoryRow(data);
        break;
      case 'deleteInventoryRow':
        response = handleDeleteInventoryRowRow(data);
        break;
      case 'upsertHomeRow':
        response = handleUpsertHomeRow(data);
        break;
      case 'deleteHomeRow':
        response = handleDeleteHomeRow(data);
        break;
      case 'upsertFabAcademyRow':
        response = handleUpsertFabAcademyRow(data);
        break;
      case 'deleteFabAcademyRow':
        response = handleDeleteFabAcademyRow(data);
        break;
      case 'upsertSettingsRow':
        response = handleUpsertSettingsRow(data);
        break;
      case 'deleteSettingsRow':
        response = handleDeleteSettingsRow(data);
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
  
  // Check if user exists (search from bottom to get latest entry)
  for (let i = values.length - 1; i >= 1; i--) {
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
          sessionStart: values[i][6] || '',
          sessionEnd: values[i][7] || '',
          totalTime: values[i][8] || 0,
          rfid: values[i][9] || '',
          myPageLink: values[i][10] || '',
          note: values[i][11] || '',
          tags: values[i].slice(12).filter(t => t !== '')
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

// handleApproveUser and handleRejectUser were duplicate fake functions.
// They have been removed in favor of handleUpdateUserStatus.

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
  const values = sheet.getDataRange().getValues();
  for (let j = 1; j < values.length; j++) {
    // Add a safety check: String(values[j][1] || "") 
    // This converts null or numbers to strings so .toLowerCase() doesn't crash
    const existingName = String(values[j][1] || "").toLowerCase();
    
    if (existingName === name.toLowerCase()) {
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
    new Date().toISOString(),
    name // log name for LOW-5
  ]);
  
  return { success: true, itemId: itemId };
}

// function handleCheckoutItem has been replaced by handleCheckoutRequest + handleApproveCheckoutRequest workflow

// handleReturnItem has been removed in favor of handleReturnRequest + handleProcessReturn

// ===== CATEGORY MANAGEMENT =====

function handleAddCategory(data) {
  const { categoryName } = data;
  const sheet = getSheet(SHEET_NAMES.CATEGORIES);
  const values = sheet.getDataRange().getValues();
  
  const exists = values.slice(1).some(r => String(r[0]).toLowerCase() === categoryName.toLowerCase());
  if (exists) return { success: false, message: 'Category already exists' };
  
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
    if (!folderId) {
      return { success: false, message: 'Missing Google Drive folderId' };
    }
    
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
    const directLink = "https://drive.google.com/uc?export=view&id=" + fileId;
    
    console.log("✅ Image uploaded successfully");
    console.log("📸 Image URL: " + directLink);
    
    // Step 3: Return immediately with image URL
    // We NO LONGER create a [PENDING] row in Sheets.
    // The frontend will send the complete data with this URL in the next request.
    const tempItemId = Utilities.getUuid();
    return {
      success: true,
      itemId: tempItemId,
      fileId: fileId,
      imageUrl: directLink,
      message: 'Image uploaded successfully. Complete the inventory item details.'
    };
    
  } catch (error) {
    console.error("❌ Image upload error: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

// handleCompleteInventoryItem was removed (frontend will just call addInventoryItem)

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
  const sheet = getSheet(SHEET_NAMES.USERS); // Fixed MED-6 loop bug
  if (!sheet) return { success: false, message: 'Users sheet not found' };
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  let noteColIndex = headers.indexOf('Note');
  if (noteColIndex === -1) noteColIndex = headers.indexOf('Admin Note');
  const hashColIndex = headers.indexOf('Sync Hash');
  
  // Skip the header row (index 0)
  // Skip the header row (index 0)
  const users = values.slice(1).map(row => {
    const tagsStart = Math.max(noteColIndex + 1, 12);
    const tags = row.slice(tagsStart, hashColIndex === -1 ? undefined : hashColIndex).filter(t => t !== '');
    
    return {
      email: row[0],
      name: row[1],
      role: row[2] || 'USER',
      status: row[3] || 'PENDING',
      createdDate: row[4],
      laptopStatus: row[5] || 'Offline', // Col F: Status
      sessionStart: row[6] || '',
      sessionEnd: row[7] || '',
      totalTime: row[8] || 0,            // Col I: Total Time (mins)
      rfid: row[9] || '',
      myPageLink: row[10] || '',
      tags: tags,                        // New: User Tags
      note: noteColIndex !== -1 ? (row[noteColIndex] || '') : '',
    };
  });

  return { success: true, users: users };
}

// 2. Update a user's status (Approve or Reject)
function handleUpdateUserStatus(userId, newStatus) {
  const sheet = getSheet(SHEET_NAMES.USERS);
  if (!sheet) return { success: false, message: 'Users sheet not found' };
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
    // Column D is index 3 (1-indexed for getRange, so 4)
    sheet.getRange(rowIndex, 4).setValue(newStatus);
    try {
      const headers = data[0] || [];
      let noteColIndex = headers.indexOf('Note');
      if (noteColIndex === -1) noteColIndex = headers.indexOf('Admin Note');
      if (noteColIndex === -1) noteColIndex = 11;
      const rowData = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
      syncSingleUser(userId, rowData, noteColIndex);
    } catch (e) { console.error(e); }
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
      returnRequestStatus: values[i][8], // Col I: RETURN_PENDING / APPROVED (Frontend expects this key)
      returnStatus: values[i][8],  // Col I (kept for backward compatibility)
      returnTarget: values[i][9] || '',  // Col J: Return Request target
      returnReceiver: values[i][10] || '', // Col K: receiver
      returnRemarks: values[i][11] || ''   // Col L: remarks
    });
  }
  
  return { success: true, requests: requests };
}

function toIsoString(val) {
  if (val instanceof Date) return val.toISOString();
  return String(val || '');
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
    if (toIsoString(values[i][0]) === String(requestId)) {
      
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
    if (toIsoString(values[i][0]) === String(date)) {
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
    if (toIsoString(reqValues[i][0]) === String(date)) {
      const row = i + 1;
      
      // Requirement: "whoever approves the name will be recorded in col K with a remarks"
      
      // Col I (Index 8): Return Status (Approved/Closed) -> 'RETURN_APPROVED'
      reqSheet.getRange(row, 9).setValue('RETURN_APPROVED');
      
      // Col K (Index 10): Receiver Name
      reqSheet.getRange(row, 11).setValue(receiverName || '');
      // Col L (Index 11): Remarks
      reqSheet.getRange(row, 12).setValue(remarks || '');
      
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
  const headers = values[0];
  
  let statusCol = -1, startCol = -1, endCol = -1, totalCol = -1;
  for (let c = 0; c < headers.length; c++) {
    const h = String(headers[c] || '').toLowerCase();
    if (h.includes('laptop status') || h === 'laptops') statusCol = c;
    if (h.includes('session start') || h === 'screenstart') startCol = c;
    if (h.includes('session end') || h === 'screenend') endCol = c;
    if (h.includes('total time') || h === 'screentime') totalCol = c;
  }
  
  if (statusCol === -1) statusCol = 5; // Default Col F
  if (startCol === -1) startCol = 6;   // Default Col G
  if (endCol === -1) endCol = 7;       // Default Col H
  if (totalCol === -1) totalCol = 8;   // Default Col I

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === email) {
      const rowIndex = i + 1;
      const now = new Date();
      
      sheet.getRange(rowIndex, statusCol + 1).setValue(status);
      
      if (status === 'Online') {
        sheet.getRange(rowIndex, startCol + 1).setValue(now.toISOString());
        return { success: true, status: 'Online', message: 'Session started' };
      } 
      else {
        sheet.getRange(rowIndex, endCol + 1).setValue(now.toISOString());
        
        const startTimeStr = values[i][startCol];
        let addedMinutes = 0;
        
        if (startTimeStr) {
           const startTime = new Date(startTimeStr);
           const diffMs = now - startTime;
           addedMinutes = Math.floor(diffMs / 60000); 
        }
        
        const currentTotal = Number(values[i][totalCol]) || 0;
        const newTotal = currentTotal + addedMinutes;
        
        sheet.getRange(rowIndex, totalCol + 1).setValue(newTotal);
        
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
const CONVEX_CONFIG = {
  // Read from Script Properties
  url: ''
};

function getConvexUrl() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('CONVEX_SITE_URL');
  if (!url) {
    throw new Error('Missing CONVEX_SITE_URL in Script Properties. Please add your Convex HTTP Actions URL.');
  }
  return url;
}

function postToConvex(path, payload) {
  const url = getConvexUrl();
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url + path, options);
  if (response.getResponseCode() !== 200) {
    throw new Error('Convex sync failed: ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

/**
 * Syncs the entire "Inventory" sheet to Convex.
 * Run this manually or set up a time-based trigger (e.g., every hour).
 */
function syncInventoryToConvex() {
  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  const values = sheet.getDataRange().getValues();
  
  // Skip header
  const data = values.slice(1);
  const items = [];
  
  data.forEach(row => {
    const itemId = String(row[0] || '').trim();
    if (itemId) {
      const tags = row.slice(9).map(t => String(t)).filter(t => t !== '');
      items.push({
        itemId: itemId,
        name: String(row[1] || ''),
        quantity: typeof row[2] === 'number' ? row[2] : Number(row[2]) || 0,
        category: String(row[3] || ''),
        company: String(row[4] || ''),
        imageUrl: String(row[5] || ''),
        remarks: String(row[6] || ''),
        links: String(row[7] || ''),
        tags: tags
      });
    }
  });
  
  if (items.length > 0) {
    postToConvex('/syncTable', { table: 'inventory', data: items });
  }
  
  console.log('Synced ' + items.length + ' items to Convex.');
}

/**
 * OPTIONAL: Trigger-based sync
 * Can be attached to onEdit, but be careful with quotas.
 */
/**
 * UNIVERSAL ON-EDIT TRIGGER
 * Synchronizes single row edits from ANY sheet instantly to Convex
 */
function onUniversalEdit(e) {
  if (!e || !e.source) return;
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  
  // 1. Identify which table to sync
  let tableName = '';
  let keyField = '';
  if (sheetName === SHEET_NAMES.INVENTORY) { tableName = 'inventory'; keyField = 'itemId'; }
  else if (sheetName === SHEET_NAMES.USERS) { tableName = 'users'; keyField = 'email'; }
  else if (sheetName === SHEET_NAMES.REQUESTS) { tableName = 'requests'; keyField = 'date'; }
  else if (sheetName === SHEET_NAMES.HOME) { tableName = 'home'; keyField = 'docId'; }
  else if (sheetName === SHEET_NAMES.FAB_ACADEMY) { tableName = 'fabAcademy'; keyField = 'entryId'; }
  
  if (!tableName) return;
  
  const row = e.range.getRow();
  if (row <= 1) return; // Ignore headers
  
  // 2. Fetch headers and row data
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // 3. Map keys
  const getConvexKeyMap = (tName) => {
    const maps = {
      'inventory': {
        'Item ID': 'itemId', 'Name': 'name', 'Quantity': 'quantity', 'Category': 'category',
        'Company': 'company', 'Image URL': 'imageUrl', 'Remarks': 'remarks', 'Links': 'links', 'Tags': 'tags'
      },
      'users': {
        'Email': 'email', 'Name': 'name', 'Role': 'role', 'Status': 'status', 
        'Created Date': 'createdDate', 'laptops': 'laptopStatus', 'Laptop Status': 'laptopStatus',
        'screenStart': 'sessionStart', 'screenEnd': 'sessionEnd',
        'Screentime': 'totalTime', 'Total Time (min)': 'totalTime',
        'rfid': 'rfid', 'My Page Link': 'myPageLink',
        'Tags': 'tags', 'Note': 'note', 'Admin Note': 'note'
      },
      'requests': {
        'Date': 'date', 'User Email': 'userEmail', 'User Name': 'userName', 
        'Item ID': 'itemId', 'Item Name': 'itemName', 'Quantity': 'quantity',
        'Status': 'status', 'Action By': 'actionBy', 'Return Status': 'returnStatus',
        'Return Request': 'returnTarget', 'Return Target': 'returnTarget',
        'Received by': 'returnReceiver', 'Return Receiver': 'returnReceiver',
        'Remarks': 'returnRemarks'
      },
      'home': {
        'Doc ID': 'docId', 'Title': 'title', 'Description': 'description',
        'Type': 'type', 'Content': 'content', 'Order': 'order', 
        'Visibility': 'visibility', 'Target Audience': 'targetAudience'
      },
      'fabAcademy': {
        'Entry ID': 'entryId',
        'Student Name': 'studentName',
        'Image URL': 'imageUrl',
        'Fab Academy Year': 'fabYear',
        'Project Video URL': 'videoUrl',
        'Documentation URL': 'documentationUrl',
        'Remarks': 'remarks'
      }
    };
    return maps[tName] || {};
  };
  
  const map = getConvexKeyMap(tableName);
  let item = {};
  let keyValue = '';
  
  headers.forEach((header, index) => {
    const key = map[header];
    if (!key) return; // Skip columns not mapped to Convex
    
    let val = values[index];
    if (val === '') {
       if (key === 'quantity' || key === 'totalTime' || key === 'order') val = 0;
       else if (key === 'visibility') val = false;
       else val = '';
    }
    
    // Type casting
    if (key === 'tags') {
       item[key] = values.slice(index).map(t => String(t)).filter(t => t !== '');
    } else if (key === 'quantity' || key === 'totalTime' || key === 'order') {
       item[key] = Number(val) || 0;
    } else if (key === 'visibility') {
       item[key] = (String(val).toLowerCase() === 'true' || val === true);
    } else {
       if (key !== 'tags') item[key] = String(val);
    }
    
    if (key === keyField) keyValue = item[key];
  });
  
  if (!keyValue) return; // Cannot sync an item without a primary key
  
  // 4. Push to Convex
  try {
    postToConvex('/syncRow', { table: tableName, key: keyField, keyValue: keyValue, data: item });
    console.log(`Universally synced ${tableName} row: ${keyValue}`);
  } catch (err) {
    console.error(`Universally sync failed for ${tableName}: ${err}`);
  }
}



// ===== MACHINE LOGS FEATURE =====

// (Legacy handleGetMachineLogs block removed, keeping the processor-based one below)

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
    if (h.includes('laptop status') || h === 'laptops') laptopStatusCol = c;
    if (h.includes('session start') || h === 'screenstart') sessionStartCol = c;
    if (h.includes('session end') || h === 'screenend') sessionEndCol = c;
    if (h.includes('total time') || h === 'screentime') totalTimeCol = c;
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
      // Re-use Convex sync helper
      const noteColIndex = headers.indexOf('Note') !== -1 ? headers.indexOf('Note') : (headers.indexOf('Admin Note') !== -1 ? headers.indexOf('Admin Note') : 11);
      try { syncSingleUser(userEmail, rowData, noteColIndex); } catch (e) { console.error(e); }

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
      try { syncSingleUser(userEmail, rowData, noteColIndex); } catch(e) { console.error(e); }

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
    const doc = { adminSettingsTitle: 'admin', allowTeamInventory: !!allowTeamInventoryEdit };
    try { postToConvex('/syncRow', { table: 'settings', key: 'adminSettingsTitle', keyValue: 'admin', data: doc }); }
    catch (e) {}
    return { success: true, warning: 'Saved to Convex only. Create "Settings" sheet to persist.' };
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
  
  try { postToConvex('/syncRow', { table: 'settings', key: 'adminSettingsTitle', keyValue: 'admin', data: { adminSettingsTitle: 'admin', allowTeamInventory: !!allowTeamInventoryEdit } }); } catch(e) {}
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
  
  try { 
    const docId = String(newRow[0]);
    postToConvex('/syncRow', { table: 'home', key: 'docId', keyValue: docId, data: {
      docId: docId,
      type: String(newRow[1] || ''),
      title: String(newRow[2] || ''),
      description: String(newRow[3] || ''),
      content: String(newRow[4] || ''),
      order: 1,
      visibility: true,
      targetAudience: 'public'
    } });
  } catch(e) { console.error('Single-doc sync failed:', e); }
  
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

function handleGetFabAcademyContent(data) {
  const sheet = getSheet(SHEET_NAMES.FAB_ACADEMY);
  if (!sheet) return { success: true, items: [] };
  ensureFabAcademyHeaders(sheet);

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: true, items: [] };

  const items = values.slice(1).map((row) => ({
    entryId: String(row[0] || ''),
    studentName: String(row[1] || ''),
    imageUrl: String(row[2] || ''),
    fabYear: String(row[3] || ''),
    videoUrl: String(row[4] || ''),
    documentationUrl: String(row[5] || ''),
    remarks: String(row[6] || ''),
  })).filter((item) => item.entryId);

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
      try { syncSingleInventoryItem(itemId, rowData); } catch (e) { console.error('Convex sync error: ' + e); }

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

      // Delete from Convex
      try {
        postToConvex('/deleteRow', { table: 'inventory', key: 'itemId', keyValue: String(itemId) });
      } catch (e) { console.error('Convex delete error: ' + e); }

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
      } catch (e) { console.error('Convex sync error: ' + e); }

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
function handleSyncUsersToConvex(data) {
  try { getConvexUrl(); } catch (credErr) {
    return { success: false, message: 'Convex credentials error: ' + credErr.toString() };
  }

  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  let hashColIndex = headers.indexOf('Sync Hash');
  let noteColIndex = headers.indexOf('Note');
  if (noteColIndex === -1) noteColIndex = headers.indexOf('Admin Note');
  if (noteColIndex === -1) noteColIndex = 11;

  if (hashColIndex === -1) {
    hashColIndex = headers.length;
    sheet.getRange(1, hashColIndex + 1).setValue('Sync Hash');
  }

  let synced = 0, skipped = 0, errors = 0;
  const startTime = Date.now();
  const MAX_RUNTIME_MS = 270000;

  for (let i = 1; i < values.length; i++) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      return { success: true, partial: true, message: `Timeout safety stop. Synced ${synced}, skipped ${skipped}, errors ${errors}.` };
    }

    const row = values[i];
    const email = String(row[0] || '').trim();
    if (!email) continue;

    const tagsStart = Math.max(noteColIndex + 1, 12);
    const tags = row.slice(tagsStart, hashColIndex === -1 ? undefined : hashColIndex).map(t => String(t)).filter(t => t !== '');

    const userData = {
      email: email,
      name: String(row[1] || ''),
      role: String(row[2] || 'USER'),
      status: String(row[3] || 'PENDING'),
      createdDate: String(row[4] || ''),
      laptopStatus: String(row[5] || 'Offline'),
      sessionStart: String(row[6] || ''),
      sessionEnd: String(row[7] || ''),
      totalTime: Number(row[8]) || 0,
      rfid: String(row[9] || ''),
      myPageLink: String(row[10] || ''),
      tags: tags,
      note: noteColIndex !== -1 ? String(row[noteColIndex] || '') : '',
    };

    const currentHash = computeUserSyncHash(userData);
    const storedHash = String(row[hashColIndex] || '');

    if (currentHash === storedHash) { skipped++; continue; }

    try {
      postToConvex('/syncRow', { table: 'users', key: 'email', keyValue: String(email), data: userData });
      sheet.getRange(i + 1, hashColIndex + 1).setValue(currentHash);
      synced++;
    } catch (rowErr) { errors++; console.error(rowErr); }

    if (i % 3 === 0) Utilities.sleep(400);
  }

  return { success: true, message: `Synced ${synced} users (${skipped} unchanged, ${errors} errors).` };
}

/**
 * Bulk sync the entire Requests sheet to Firestore.
 * FIXED: Credential errors return early with a readable message.
 * OPTIMISED: MD5 hash-based change detection.
 */
function handleSyncRequestsToConvex(data) {
  try { getConvexUrl(); } catch (credErr) {
    return { success: false, message: 'Convex credentials error: ' + credErr.toString() };
  }

  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  if (!sheet) return { success: false, message: 'Requests sheet not found.' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  let hashColIndex = headers ? headers.indexOf('Sync Hash') : -1;

  if (hashColIndex === -1 && headers) {
    hashColIndex = headers.length;
    sheet.getRange(1, hashColIndex + 1).setValue('Sync Hash');
  }

  let synced = 0, skipped = 0, errors = 0;
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
      userEmail: String(row[1] || ''),
      userName: String(row[2] || ''),
      itemId: String(row[3] || ''),
      itemName: String(row[4] || ''),
      quantity: Number(row[5]) || 0,
      status: String(row[6] || 'PENDING'),
      actionBy: String(row[7] || ''),
      returnStatus: String(row[8] || ''),
      returnTarget: String(row[9] || ''),
      returnReceiver: String(row[10] || ''),
      returnRemarks: String(row[11] || '')
    };

    const currentHash = computeRequestSyncHash(reqData);
    const storedHash = String(row[hashColIndex] || '');

    if (currentHash === storedHash) { skipped++; continue; }

    try {
      postToConvex('/syncRow', { table: 'requests', key: 'date', keyValue: requestId, data: reqData });
      sheet.getRange(i + 1, hashColIndex + 1).setValue(currentHash);
      synced++;
    } catch (rowErr) { errors++; console.error(rowErr); }

    if (i % 3 === 0) Utilities.sleep(400);
  }

  return { success: true, message: `Synced ${synced} requests (${skipped} unchanged, ${errors} errors).` };
}

/**
 * Syncs the entire "Home" sheet to Firestore 'home' collection.
 * Required for displaying guest-facing pages.
 */
function syncHomeToConvex(fullSync = false) {
  const sheet = getSheet(SHEET_NAMES.HOME);
  if (!sheet) return { success: false, message: 'Home sheet not found' };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: true, message: 'Home sheet empty' };

  // Skip header
  const data = values.slice(1);
  let synced = 0, errors = 0;

  data.forEach((row, i) => {
    const id = String(row[0]).trim();
    if (!id) return;

    try {
      const homeDoc = {
        docId: id,
        type: String(row[1] || ''),
        title: String(row[2] || ''),
        description: String(row[3] || ''),
        content: String(row[4] || ''),
        order: 1,
        visibility: true,
        targetAudience: 'public'
      };
      
      postToConvex('/syncRow', { table: 'home', key: 'docId', keyValue: id, data: homeDoc });
      synced++;
    } catch (e) {
      console.error('Error syncing home ID ' + id, e);
      errors++;
    }

    // Rate limiting
    if (i > 0 && i % 3 === 0) Utilities.sleep(400);
  });

  return { success: true, message: `Synced ${synced} home blocks (${errors} errors).` };
}

function syncFabAcademyToConvex(fullSync = false) {
  const sheet = getSheet(SHEET_NAMES.FAB_ACADEMY);
  if (!sheet) return { success: false, message: 'Fab Academy sheet not found' };

  const headers = ensureFabAcademyHeaders(sheet);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: true, message: 'Fab Academy sheet empty' };

  let hashColIndex = headers.indexOf('Sync Hash');
  if (hashColIndex === -1) {
    hashColIndex = ensureHeaderColumn(sheet, 'Sync Hash');
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  values.slice(1).forEach((row, index) => {
    const entryId = String(row[0] || '').trim();
    if (!entryId) return;

    const entryData = {
      entryId: entryId,
      studentName: String(row[1] || ''),
      imageUrl: String(row[2] || ''),
      fabYear: String(row[3] || ''),
      videoUrl: String(row[4] || ''),
      documentationUrl: String(row[5] || ''),
      remarks: String(row[6] || ''),
    };

    const currentHash = computeFabAcademySyncHash(entryData);
    const storedHash = String(row[hashColIndex] || '');

    if (!fullSync && currentHash === storedHash) {
      skipped++;
      return;
    }

    try {
      postToConvex('/syncRow', { table: 'fabAcademy', key: 'entryId', keyValue: entryId, data: entryData });
      sheet.getRange(index + 2, hashColIndex + 1).setValue(currentHash);
      synced++;
    } catch (e) {
      errors++;
      console.error('Error syncing Fab Academy entry ' + entryId, e);
    }

    if (index > 0 && index % 3 === 0) Utilities.sleep(400);
  });

  return { success: true, message: `Synced ${synced} Fab Academy entries (${skipped} unchanged, ${errors} errors).` };
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
        postToConvex('/deleteRow', { table: 'home', key: 'docId', keyValue: String(id) });
      } catch (e) { console.error('Convex delete error: ' + e); }
      return { success: true };
    }
  }
  return { success: false, message: 'Content block not found' };
}

// ===== GENERIC CONVEX -> SHEETS ROW SYNC =====

function handleUpsertUserRow(data) {
  const { email } = data;
  if (!email) return { success: false, message: 'Missing email' };

  const sheet = getSheet(SHEET_NAMES.USERS);
  if (!sheet) return { success: false, message: 'Users sheet not found' };

  let values = sheet.getDataRange().getValues();
  let noteColIndex = values[0].indexOf('Note');
  if (noteColIndex === -1) noteColIndex = values[0].indexOf('Admin Note');
  if (noteColIndex === -1) {
    noteColIndex = ensureHeaderColumn(sheet, 'Admin Note');
    values = sheet.getDataRange().getValues();
  }

  let hashColIndex = values[0].indexOf('Sync Hash');
  if (hashColIndex === -1) {
    hashColIndex = ensureHeaderColumn(sheet, 'Sync Hash');
    values = sheet.getDataRange().getValues();
  }

  const tags = Array.isArray(data.tags) ? data.tags : [];
  const tagsStartIndex = Math.max(noteColIndex + 1, 12);
  if (hashColIndex < tagsStartIndex + tags.length) {
    sheet.insertColumnsBefore(hashColIndex + 1, tagsStartIndex + tags.length - hashColIndex);
    values = sheet.getDataRange().getValues();
    hashColIndex = values[0].indexOf('Sync Hash');
  }

  let rowIndex = findRowIndexByValue(values, 0, email);
  if (rowIndex === -1) {
    rowIndex = sheet.getLastRow() + 1;
  }

  const existingRow = rowIndex <= values.length ? values[rowIndex - 1].slice() : [];
  const rowLength = Math.max(sheet.getLastColumn(), hashColIndex + 1);
  const row = new Array(rowLength).fill('');
  for (let i = 0; i < rowLength; i++) {
    row[i] = existingRow[i] || '';
  }

  row[0] = String(email);
  row[1] = String(data.name || '');
  row[2] = String(data.role || 'USER');
  row[3] = String(data.status || 'PENDING');
  row[4] = String(data.createdDate || '');
  row[5] = String(data.laptopStatus || 'Offline');
  row[6] = String(data.sessionStart || '');
  row[7] = String(data.sessionEnd || '');
  row[8] = Number(data.totalTime) || 0;
  row[9] = String(data.rfid || '');
  row[10] = String(data.myPageLink || '');
  row[noteColIndex] = String(data.note || '');

  for (let i = tagsStartIndex; i < hashColIndex; i++) {
    row[i] = '';
  }
  tags.forEach((tag, index) => {
    row[tagsStartIndex + index] = String(tag);
  });
  row[hashColIndex] = computeUserSyncHash({
    ...data,
    tags,
  });

  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return { success: true };
}

function handleDeleteUserRow(data) {
  const { email } = data;
  if (!email) return { success: false, message: 'Missing email' };
  const sheet = getSheet(SHEET_NAMES.USERS);
  if (!sheet) return { success: false, message: 'Users sheet not found' };
  const values = sheet.getDataRange().getValues();
  const rowIndex = findRowIndexByValue(values, 0, email);
  if (rowIndex === -1) return { success: true };
  sheet.deleteRow(rowIndex);
  return { success: true };
}

function handleUpsertRequestRow(data) {
  const { date } = data;
  if (!date) return { success: false, message: 'Missing request date' };

  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  if (!sheet) return { success: false, message: 'Requests sheet not found' };
  let values = sheet.getDataRange().getValues();
  let hashColIndex = values[0].indexOf('Sync Hash');
  if (hashColIndex === -1) {
    hashColIndex = ensureHeaderColumn(sheet, 'Sync Hash');
    values = sheet.getDataRange().getValues();
    hashColIndex = values[0].indexOf('Sync Hash');
  }

  let rowIndex = findRowIndexByValue(values, 0, date);
  if (rowIndex === -1) {
    rowIndex = sheet.getLastRow() + 1;
  }

  const rowLength = Math.max(sheet.getLastColumn(), hashColIndex + 1, 11);
  const row = new Array(rowLength).fill('');
  row[0] = String(date);
  row[1] = String(data.userEmail || '');
  row[2] = String(data.userName || '');
  row[3] = String(data.itemId || '');
  row[4] = String(data.itemName || '');
  row[5] = Number(data.quantity) || 0;
  row[6] = String(data.status || 'PENDING');
  row[7] = String(data.actionBy || '');
  row[8] = String(data.returnStatus || '');
  row[9] = String(data.returnTarget || '');
  row[10] = String(data.returnReceiver || '');
  row[11] = String(data.returnRemarks || '');
  row[hashColIndex] = computeRequestSyncHash(data);

  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return { success: true };
}

function handleDeleteRequestRow(data) {
  const { date } = data;
  if (!date) return { success: false, message: 'Missing request date' };
  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  if (!sheet) return { success: false, message: 'Requests sheet not found' };
  const values = sheet.getDataRange().getValues();
  const rowIndex = findRowIndexByValue(values, 0, date);
  if (rowIndex === -1) return { success: true };
  sheet.deleteRow(rowIndex);
  return { success: true };
}

function handleUpsertInventoryRow(data) {
  const { itemId } = data;
  if (!itemId) return { success: false, message: 'Missing itemId' };

  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  if (!sheet) return { success: false, message: 'Inventory sheet not found' };
  const values = sheet.getDataRange().getValues();
  let rowIndex = findRowIndexByValue(values, 0, itemId);
  if (rowIndex === -1) {
    rowIndex = sheet.getLastRow() + 1;
  }

  const row = [
    String(itemId),
    String(data.name || ''),
    Number(data.quantity) || 0,
    String(data.category || ''),
    String(data.company || ''),
    String(data.imageUrl || ''),
    String(data.remarks || ''),
    String(data.links || ''),
    '',
    ...(Array.isArray(data.tags) ? data.tags : []).map((tag) => String(tag)),
  ];

  const clearLength = Math.max(sheet.getLastColumn(), row.length);
  sheet.getRange(rowIndex, 1, 1, clearLength).clearContent();
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return { success: true };
}

function handleDeleteInventoryRowRow(data) {
  const { itemId } = data;
  if (!itemId) return { success: false, message: 'Missing itemId' };
  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  if (!sheet) return { success: false, message: 'Inventory sheet not found' };
  const values = sheet.getDataRange().getValues();
  const rowIndex = findRowIndexByValue(values, 0, itemId);
  if (rowIndex === -1) return { success: true };
  sheet.deleteRow(rowIndex);
  return { success: true };
}

function handleUpsertHomeRow(data) {
  const { docId } = data;
  if (!docId) return { success: false, message: 'Missing docId' };
  const sheet = getSheet(SHEET_NAMES.HOME);
  if (!sheet) return { success: false, message: 'Home sheet not found' };
  const values = sheet.getDataRange().getValues();
  let rowIndex = findRowIndexByValue(values, 0, docId);
  if (rowIndex === -1) {
    rowIndex = sheet.getLastRow() + 1;
  }

  const row = [
    String(docId),
    String(data.type || ''),
    String(data.title || ''),
    String(data.description || ''),
    String(data.content || ''),
  ];
  sheet.getRange(rowIndex, 1, 1, 5).setValues([row]);
  return { success: true };
}

function handleDeleteHomeRow(data) {
  const { docId } = data;
  if (!docId) return { success: false, message: 'Missing docId' };
  const sheet = getSheet(SHEET_NAMES.HOME);
  if (!sheet) return { success: false, message: 'Home sheet not found' };
  const values = sheet.getDataRange().getValues();
  const rowIndex = findRowIndexByValue(values, 0, docId);
  if (rowIndex === -1) return { success: true };
  sheet.deleteRow(rowIndex);
  return { success: true };
}

function handleUpsertFabAcademyRow(data) {
  const { entryId } = data;
  if (!entryId) return { success: false, message: 'Missing entryId' };

  const sheet = getOrCreateSheet(SHEET_NAMES.FAB_ACADEMY);
  let headers = ensureFabAcademyHeaders(sheet);
  let values = sheet.getDataRange().getValues();
  let hashColIndex = headers.indexOf('Sync Hash');
  if (hashColIndex === -1) {
    hashColIndex = ensureHeaderColumn(sheet, 'Sync Hash');
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    values = sheet.getDataRange().getValues();
    hashColIndex = headers.indexOf('Sync Hash');
  }

  let rowIndex = findRowIndexByValue(values, 0, entryId);
  if (rowIndex === -1) {
    rowIndex = sheet.getLastRow() + 1;
  }

  const rowLength = Math.max(sheet.getLastColumn(), hashColIndex + 1, 8);
  const row = new Array(rowLength).fill('');
  row[0] = String(entryId);
  row[1] = String(data.studentName || '');
  row[2] = String(data.imageUrl || '');
  row[3] = String(data.fabYear || '');
  row[4] = String(data.videoUrl || '');
  row[5] = String(data.documentationUrl || '');
  row[6] = String(data.remarks || '');
  row[hashColIndex] = computeFabAcademySyncHash(data);

  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return { success: true };
}

function handleDeleteFabAcademyRow(data) {
  const { entryId } = data;
  if (!entryId) return { success: false, message: 'Missing entryId' };

  const sheet = getSheet(SHEET_NAMES.FAB_ACADEMY);
  if (!sheet) return { success: false, message: 'Fab Academy sheet not found' };
  const values = sheet.getDataRange().getValues();
  const rowIndex = findRowIndexByValue(values, 0, entryId);
  if (rowIndex === -1) return { success: true };
  sheet.deleteRow(rowIndex);
  return { success: true };
}

function handleUpsertSettingsRow(data) {
  const sheet = getOrCreateSheet('Settings');
  const values = sheet.getDataRange().getValues();
  let rowIndex = findRowIndexByValue(values, 0, 'allowTeamInventoryEdit');
  if (rowIndex === -1) {
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
    } else if (sheet.getLastRow() === 1 && sheet.getLastColumn() < 2) {
      sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
    }
    rowIndex = sheet.getLastRow() + 1;
  }

  sheet.getRange(rowIndex, 1, 1, 2).setValues([[
    'allowTeamInventoryEdit',
    String(!!data.allowTeamInventory),
  ]]);
  return { success: true };
}

function handleDeleteSettingsRow(data) {
  const sheet = getSheet('Settings');
  if (!sheet) return { success: true };
  const values = sheet.getDataRange().getValues();
  const rowIndex = findRowIndexByValue(values, 0, 'allowTeamInventoryEdit');
  if (rowIndex === -1) return { success: true };
  sheet.deleteRow(rowIndex);
  return { success: true };
}

// ===== FIREBASE PER-DOC SYNC HELPERS =====

/**
 * Sync a single inventory item to Firestore.
 * @param {string} itemId
 * @param {Array} rowData - Array representing the sheet row values
 */
function syncSingleInventoryItem(itemId, rowData) {
  const tags = rowData.slice(9).map(t => String(t)).filter(t => t !== '');
  const item = {
    itemId: String(itemId),
    name: String(rowData[1] || ''),
    quantity: typeof rowData[2] === 'number' ? rowData[2] : Number(rowData[2]) || 0,
    category: String(rowData[3] || ''),
    company: String(rowData[4] || ''),
    imageUrl: String(rowData[5] || ''),
    remarks: String(rowData[6] || ''),
    links: String(rowData[7] || ''),
    tags: tags
  };
  postToConvex('/syncRow', { table: 'inventory', key: 'itemId', keyValue: String(itemId), data: item });
}

/**
 * Sync a single user to Firestore.
 * @param {string} email
 * @param {Array} rowData - Array representing the sheet row values
 * @param {number} noteColIndex
 */
function syncSingleUser(email, rowData, noteColIndex) {
  const tagsStart = noteColIndex + 1;
  const tags = rowData
    .slice(tagsStart > 12 ? tagsStart : 12)
    .map(t => String(t))
    .filter(t => t !== '' && !/^[a-f0-9]{32}$/i.test(t));
  const userData = {
    email: String(email),
    name: String(rowData[1] || ''),
    role: String(rowData[2] || 'USER'),
    status: String(rowData[3] || 'PENDING'),
    createdDate: String(rowData[4] || ''),
    laptopStatus: String(rowData[5] || 'Offline'),
    sessionStart: String(rowData[6] || ''),
    sessionEnd: String(rowData[7] || ''),
    totalTime: Number(rowData[8]) || 0,
    rfid: String(rowData[9] || ''),
    myPageLink: String(rowData[10] || ''),
    tags: tags,
    note: noteColIndex !== -1 ? String(rowData[noteColIndex] || '') : '',
  };
  postToConvex('/syncRow', { table: 'users', key: 'email', keyValue: String(email), data: userData });
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
    convexAvailable: false
  };

  // Check Convex connectivity
  try {
    getConvexUrl();
    result.convexAvailable = true;
  } catch (e) {
    result.convexAvailable = false;
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


// ============================================================
// FIREBASE SYNC RESTORATION
// Run installTriggers() ONCE from the Apps Script editor to
// recreate all triggers that were deleted.
// ============================================================

/**
 * Sync all Users from the Users sheet to Firestore.
 * Run manually or via a time-based trigger.
 */
function syncUsersToConvex() {
  const sheet = getSheet(SHEET_NAMES.USERS);
  if (!sheet) { console.error('Users sheet not found'); return; }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) { console.log('No users to sync'); return; }

  const noteColIndex = values[0].indexOf('Note') !== -1 ? values[0].indexOf('Note') : 11;

  let synced = 0, errors = 0;
  values.slice(1).forEach((row, i) => {
    const email = String(row[0] || '').trim();
    if (!email) return;

    try {
      syncSingleUser(email, row, noteColIndex);
      synced++;
    } catch (e) { errors++; }
    if (i > 0 && i % 5 === 0) Utilities.sleep(300);
  });
  console.log('Synced ' + synced + ' users to Convex (' + errors + ' errors).');
}

/**
 * Sync all active Requests (checkouts) from the Requests sheet to Firestore.
 * Run manually or via a time-based trigger.
 */
function syncRequestsToConvex() {
  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  if (!sheet) { console.error('Requests sheet not found'); return; }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) { console.log('No requests to sync'); return; }

  let synced = 0, errors = 0;

  values.slice(1).forEach((row, i) => {
    const docId = String(row[0] || '').trim();
    if (!docId) return;

    const reqData = {
      date: String(docId),
      userEmail: String(row[1] || ''),
      userName: String(row[2] || ''),
      itemId: String(row[3] || ''),
      itemName: String(row[4] || ''),
      quantity: Number(row[5]) || 0,
      status: String(row[6] || 'PENDING'),
      actionBy: String(row[7] || ''),
      returnStatus: String(row[8] || ''),
      returnTarget: String(row[9] || ''),
      returnReceiver: String(row[10] || '')
    };

    try {
      postToConvex('/syncRow', { table: 'requests', key: 'date', keyValue: String(docId), data: reqData });
      synced++;
    } catch (e) { errors++; }
    if (i > 0 && i % 5 === 0) Utilities.sleep(300);
  });
  
  console.log('Synced ' + synced + ' requests to Convex (' + errors + ' errors).');
}

/**
 * INSTALL ALL TRIGGERS
 * ▶ Run this function ONCE from the Apps Script editor (Run → Run function → installTriggers)
 * This recreates all triggers that were deleted.
 *
 * Triggers created:
 *   1. syncInventoryToFirebase  — every 30 minutes (time-based)
 *   2. syncUsersToFirebase      — every 30 minutes (time-based)
 *   3. syncRequestsToFirebase   — every 30 minutes (time-based)
 *   4. syncHomeToFirebase       — every 1 hour (time-based)
 *   5. syncFabAcademyToConvex   — every 1 hour (time-based)
 *   6. onUniversalEdit          — on spreadsheet edit (onEdit)
 */
function installTriggers() {
  // Delete ALL existing triggers first to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  ScriptApp.newTrigger('syncInventoryToConvex').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('syncUsersToConvex').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('syncRequestsToConvex').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('syncHomeToConvex').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('syncFabAcademyToConvex').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('onUniversalEdit').forSpreadsheet(ss).onEdit().create();

  console.log('✅ All 6 triggers installed successfully!');
  console.log('Running initial full sync now...');

  syncInventoryToConvex();
  syncUsersToConvex();
  syncHomeToConvex(true);
  syncFabAcademyToConvex(true);

  console.log('✅ Initial sync complete! Convex is now up to date.');
}
