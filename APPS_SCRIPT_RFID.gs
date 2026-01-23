/**
 * Inventory Management System - Google Apps Script Backend (RFID INTEGRATION)
 * 
 * Includes all original features + ESP32 RFID capabilities.
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
  RFID_USER: 'rfid_user' // NEW
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
      // --- EXISTING ACTIONS ---
      case 'login': response = handleLogin(data); break;
      case 'getInventory': response = handleGetInventory(data); break;
      case 'checkoutItem': response = handleCheckoutItem(data); break; // Legacy/Unused
      case 'returnItem': response = handleReturnItem(data); break;
      case 'requestItem': response = handleRequestItem(data); break;
      case 'getPendingUsers': response = handleGetPendingUsers(data); break;
      case 'approveUser': response = handleUpdateUserStatus(data); break;
      case 'rejectUser': response = handleUpdateUserStatus(data); break;
      case 'addInventoryItem': response = handleAddInventoryItem(data); break;
      case 'addCategory': response = handleAddCategory(data); break;
      case 'getUsageHistory': response = handleGetUsageHistory(data); break;
      case 'uploadImage': response = handleUploadImageOptimized(data); break;
      case 'completeInventoryItem': response = handleCompleteInventoryItem(data); break;
      case 'getCategories': response = handleGetCategories(data); break;
      case 'getAllUsers': response = handleGetAllUsers(data); break;
      case 'checkoutRequest': response = handleCheckoutRequest(data); break;
      case 'getRequests': response = handleGetRequests(data); break;
      case 'toggleLaptop': response = handleToggleLaptop(data); break;
      case 'initiateReturn': response = handleReturnRequest(data); break;
      case 'approveCheckoutRequest': response = handleApproveCheckoutRequest(data); break;
      case 'processReturn': response = handleProcessReturn(data); break;
      
      // --- NEW RFID ACTIONS ---
      case 'updateESPStatus': response = handleUpdateESPStatus(data); break;
      case 'rfidScan': response = handleRFIDScan(data); break;

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

// ==========================================
// NEW RFID FUNCTIONS
// ==========================================

/**
 * Updates the connectivity status of the ESP32.
 * Expects: { action: 'updateESPStatus', status: 'Online' | 'Offline' }
 */
function handleUpdateESPStatus(data) {
  const { status } = data;
  const sheet = getSheet(SHEET_NAMES.RFID_USER);
  
  if (!sheet) return { success: false, message: 'Sheet rfid_user not found' };
  
  // Update Cell A1 with the status
  sheet.getRange("A1").setValue(status);
  
  return { success: true, message: `ESP32 status updated to ${status}` };
}

/**
 * Logs an RFID scan.
 * Expects: { action: 'rfidScan', uid: '...' }
 */
function handleRFIDScan(data) {
  const { uid } = data;
  const sheet = getSheet(SHEET_NAMES.RFID_USER);
  
  if (!sheet) return { success: false, message: 'Sheet rfid_user not found' };
  
  // Format: Date, UID, Name (Empty for manual entry)
  sheet.appendRow([
    new Date().toISOString(),
    uid,
    '' // Placeholder for Name (Manual Entry)
  ]);
  
  return { success: true, message: 'RFID scan logged' };
}

// ==========================================
// EXISTING LOGIC (COPIED FROM TEMPLATE)
// ==========================================

function handleLogin(data) {
  const { email, name } = data;
  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === email) {
      return {
        success: true,
        user: {
          id: values[i][0], email: values[i][0], name: values[i][1],
          role: values[i][2], status: values[i][3], createdDate: values[i][4],
          laptopStatus: values[i][5] || 'Offline', totalTime: values[i][8] || 0
        }
      };
    }
  }
  const newRow = [email, name, 'USER', 'PENDING', new Date().toISOString()];
  sheet.appendRow(newRow);
  return { success: true, user: { id: email, email: email, name: name, role: 'USER', status: 'PENDING', createdDate: new Date().toISOString() } };
}

function handleGetPendingUsers(data) {
  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  const pendingUsers = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i][3] === 'PENDING') {
      pendingUsers.push({
        id: values[i][0], email: values[i][0], name: values[i][1],
        role: values[i][2], status: values[i][3], createdDate: values[i][4]
      });
    }
  }
  return { success: true, users: pendingUsers };
}

function handleUpdateUserStatus(data) {
    const { userId, newStatus } = data; // Note: Original code handled approval/rejection separately but reused logic. Consolidating for brevity if needed or keeping explicit.
    // The switch case routed 'approveUser' and 'rejectUser' to handleUpdateUserStatus.
    // We need to infer status if not passed explicitly, or check how original routed it.
    // Original template had explicit functions `handleApproveUser` / `handleRejectUser` but switch called `handleUpdateUserStatus`.
    // Actually, looking at template: 
    // case 'approveUser': response = handleUpdateUserStatus(data); 
    // But `handleUpdateUserStatus` near bottom took (userId, newStatus).
    // The simpler implementation is to check the *action* or just pass 'newStatus' in data.
    // Let's assume the frontend sends `extra` or we infer.
    // For safety, I will replicate the robust version.
    
    // NOTE: The template provided had a mix. I will use the robust separate logic or flexible logic.
    // Let's us the one defined at the bottom of template:
    // function handleUpdateUserStatus(userId, newStatus)
    
    // But the switch case passes `data` object.
    // I need to extract properly.
    
    const statusToSet = data.action === 'approveUser' ? 'APPROVED' : 'REJECTED';
    // data.userId might be in data object.
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Users");
    const rows = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.userId) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex !== -1) {
        sheet.getRange(rowIndex, 4).setValue(statusToSet); // Col D is Status
        return { success: true, message: `User ${statusToSet}` };
    }
    return { success: false, message: 'User not found' };
}

function handleGetInventory(data) {
  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  const values = sheet.getDataRange().getValues();
  const inventory = [];
  for (let i = 1; i < values.length; i++) {
    inventory.push({
      id: values[i][0], name: values[i][1], quantity: values[i][2],
      category: values[i][3], company: values[i][4], imageUrl: values[i][5],
      remarks: values[i][6], links: values[i][7],
      tags: values[i].slice(9).filter(t => t !== '').join(',')
    });
  }
  return { success: true, inventory: inventory };
}

function handleAddInventoryItem(data) {
  const { name, quantity, category, company, imageUrl, remarks, links, tags } = data;
  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  const values = sheet.getDataRange().getValues();
  for (let j = 1; j < values.length; j++) {
    const existingName = String(values[j][1] || "").toLowerCase();
    if (existingName === name.toLowerCase()) {
      return { success: false, message: 'Item with this name already exists' };
    }
  }
  const itemId = Utilities.getUuid();
  const newRow = [
    itemId, name, quantity, category, company, imageUrl || '',
    remarks || '', links || '', '', ...(Array.isArray(tags) ? tags : [])
  ];
  sheet.appendRow(newRow);
  const historySheet = getSheet(SHEET_NAMES.USAGE_HISTORY);
  historySheet.appendRow([Utilities.getUuid(), itemId, 'admin@system', 'CREATE', quantity, new Date().toISOString()]);
  return { success: true, itemId: itemId };
}

function handleReturnItem(data) {
  const { itemId, userEmail, quantity } = data;
  const inventorySheet = getSheet(SHEET_NAMES.INVENTORY);
  const historySheet = getSheet(SHEET_NAMES.USAGE_HISTORY);
  const values = inventorySheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === itemId) {
      const currentQty = values[i][2];
      inventorySheet.getRange(i + 1, 3).setValue(currentQty + quantity);
      historySheet.appendRow([Utilities.getUuid(), itemId, userEmail, 'RETURN', quantity, new Date().toISOString()]);
      return { success: true, message: 'Item returned' };
    }
  }
  return { success: false, message: 'Item not found' };
}

function handleAddCategory(data) {
  const { categoryName } = data;
  const sheet = getSheet(SHEET_NAMES.CATEGORIES);
  sheet.appendRow([categoryName]);
  return { success: true, message: 'Category added' };
}

function handleRequestItem(data) {
  const { userEmail, itemName, remarks } = data;
  const sheet = getSheet(SHEET_NAMES.ITEM_REQUESTS);
  sheet.appendRow([Utilities.getUuid(), userEmail, itemName, remarks || '', new Date().toISOString()]);
  return { success: true, message: 'Item request submitted' };
}

function handleGetUsageHistory(data) {
  const sheet = getSheet(SHEET_NAMES.USAGE_HISTORY);
  const values = sheet.getDataRange().getValues();
  const history = [];
  for (let i = 1; i < values.length; i++) {
    history.push({
      id: values[i][0], itemId: values[i][1], userEmail: values[i][2],
      action: values[i][3], quantity: values[i][4], timestamp: values[i][5]
    });
  }
  return { success: true, history: history };
}

function handleUploadImageOptimized(data) {
  try {
    const { fileName, mimeType, content, folderId } = data;
    const folder = DriveApp.getFolderById(folderId);
    const blob = Utilities.newBlob(Utilities.base64Decode(content), mimeType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    const fileId = file.getId();
    const directLink = "https://drive.google.com/thumbnail?id=" + fileId;
    
    const inventorySheet = getSheet(SHEET_NAMES.INVENTORY);
    const itemId = Utilities.getUuid();
    const tempRow = [itemId, '[PENDING]', 0, '[PENDING]', '[PENDING]', directLink, '', '', ''];
    inventorySheet.appendRow(tempRow);
    
    return { success: true, itemId: itemId, imageUrl: directLink, message: 'Image uploaded successfully.' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function handleCompleteInventoryItem(data) {
  try {
    const { itemId, name, quantity, category, company, remarks, links, tags } = data;
    const inventorySheet = getSheet(SHEET_NAMES.INVENTORY);
    const values = inventorySheet.getDataRange().getValues();
    const ids = values.map(r => r[0]);
    const rowIndex = ids.indexOf(itemId);
    
    if (rowIndex !== -1) {
       const rowData = [
          itemId, name, quantity, category, company, values[rowIndex][5],
          remarks || '', links || '', '', ...(Array.isArray(tags) ? tags : [])
       ];
       inventorySheet.getRange(rowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
       return { success: true, message: 'Updated successfully!' };
    }
    return { success: false, message: 'Item ID not found' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function handleGetCategories(data) {
  const sheet = getSheet(SHEET_NAMES.CATEGORIES);
  const values = sheet.getDataRange().getValues();
  const categories = values.slice(1).map(row => row[0]); 
  return { success: true, categories: categories };
}

function handleGetAllUsers(data) {
  const sheet = getSheet(SHEET_NAMES.USERS);
  const values = sheet.getDataRange().getValues();
  const users = values.slice(1).map(row => ({
    email: row[0], name: row[1], role: row[2] || 'USER',
    status: row[3] || 'PENDING', createdDate: row[4],
    laptopStatus: row[5] || 'Offline', totalTime: row[8] || 0
  }));
  return { success: true, users: users };
}

function handleCheckoutRequest(data) {
  const { userEmail, userName, itemId, itemName, quantity } = data;
  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  sheet.appendRow([new Date().toISOString(), userEmail, userName, itemId, itemName, quantity, 'PENDING', '']);
  return { success: true, message: 'Request submitted successfully' };
}

function handleGetRequests(data) {
  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  const values = sheet.getDataRange().getValues();
  const requests = [];
  for (let i = 1; i < values.length; i++) {
    requests.push({
      date: values[i][0], userEmail: values[i][1], userName: values[i][2],
      itemId: values[i][3], itemName: values[i][4], quantity: values[i][5],
      status: values[i][6], actionBy: values[i][7], returnStatus: values[i][8],
      returnTarget: values[i][9] || '', returnReceiver: values[i][10] || '',
      returnRemarks: values[i][10] || ''
    });
  }
  return { success: true, requests: requests };
}

function handleApproveCheckoutRequest(data) {
  const { requestId, approverName } = data;
  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  const values = sheet.getDataRange().getValues();
  const inventorySheet = getSheet(SHEET_NAMES.INVENTORY);
  const invValues = inventorySheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(requestId)) {
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
      
      inventorySheet.getRange(invRowIndex, 3).setValue(currentStock - quantity);
      sheet.getRange(i + 1, 7).setValue('APPROVED');
      sheet.getRange(i + 1, 8).setValue(approverName);
      return { success: true, message: 'Request approved & inventory deducted' };
    }
  }
  return { success: false, message: 'Request not found' };
}

function handleReturnRequest(data) {
  const { date, returnTarget } = data; 
  const sheet = getSheet(SHEET_NAMES.REQUESTS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(date)) {
      sheet.getRange(i + 1, 9).setValue('RETURN_PENDING');
      sheet.getRange(i + 1, 10).setValue(returnTarget);
      return { success: true, message: 'Return request submitted' };
    }
  }
  return { success: false, message: 'Request not found' };
}

function handleProcessReturn(data) {
  const { date, receiverName, remarks, quantity, itemId, userEmail } = data;
  const reqSheet = getSheet(SHEET_NAMES.REQUESTS);
  const reqValues = reqSheet.getDataRange().getValues();
  const invSheet = getSheet(SHEET_NAMES.INVENTORY);
  const invValues = invSheet.getDataRange().getValues();
  const histSheet = getSheet(SHEET_NAMES.USAGE_HISTORY);
  
  let reqFound = false;
  for (let i = 1; i < reqValues.length; i++) {
    if (String(reqValues[i][0]) === String(date)) {
      const row = i + 1;
      reqSheet.getRange(row, 9).setValue('RETURN_APPROVED');
      const entry = `${receiverName}${remarks ? ': ' + remarks : ''}`;
      reqSheet.getRange(row, 11).setValue(entry);
      reqFound = true;
      break;
    }
  }
  if (!reqFound) return { success: false, message: 'Request not found' };
  
  let itemFound = false;
  for (let i = 1; i < invValues.length; i++) {
    if (String(invValues[i][0]) === String(itemId)) {
      const currentQty = Number(invValues[i][2]);
      invSheet.getRange(i + 1, 3).setValue(currentQty + Number(quantity));
      itemFound = true;
      break;
    }
  }
  
  histSheet.appendRow([
    Utilities.getUuid(), itemId, userEmail, 'RETURN_RECEIVED',
  histSheet.appendRow([
    Utilities.getUuid(), itemId, userEmail, 'RETURN_RECEIVED',
    quantity, new Date().toISOString(), `Received by ${receiverName}: ${remarks || ''}`
  ]);
  
  return { success: true, message: 'Return processed' };
}

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
