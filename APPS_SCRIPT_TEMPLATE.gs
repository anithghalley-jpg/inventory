/**
 * Inventory Management System - Google Apps Script Backend Template
 * 
 * This template provides the backend logic for the inventory management application.
 * Deploy this as a Web App in Google Apps Script.
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
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Replace with your Google Sheet ID
const SHEET_NAMES = {
  USERS: 'Users',
  INVENTORY: 'Inventory',
  USAGE_HISTORY: 'UsageHistory',
  CATEGORIES: 'Categories',
  ITEM_REQUESTS: 'ItemRequests'
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
        response = handleApproveUser(data);
        break;
      case 'rejectUser':
        response = handleRejectUser(data);
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
      default:
        response = { success: false, message: 'Unknown action' };
    }
    
    return setCorsHeaders(output).setMimeType(ContentService.MimeType.JSON)
      .setContent(JSON.stringify(response));
      
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
          createdDate: values[i][4]
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
      links: values[i][7]
    });
  }
  
  return { success: true, inventory: inventory };
}

function handleAddInventoryItem(data) {
  const { name, quantity, category, company, imageUrl, remarks, links } = data;
  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  
  // Check for duplicates
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][1].toLowerCase() === name.toLowerCase()) {
      return { success: false, message: 'Item already exists' };
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
    links || ''
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

function handleCheckoutItem(data) {
  const { itemId, userEmail, quantity } = data;
  const inventorySheet = getSheet(SHEET_NAMES.INVENTORY);
  const historySheet = getSheet(SHEET_NAMES.USAGE_HISTORY);
  const values = inventorySheet.getDataRange().getValues();
  
  // Find item and update quantity
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === itemId) {
      const currentQty = values[i][2];
      if (currentQty < quantity) {
        return { success: false, message: 'Insufficient quantity' };
      }
      
      // Update inventory
      inventorySheet.getRange(i + 1, 3).setValue(currentQty - quantity);
      
      // Record usage
      historySheet.appendRow([
        Utilities.getUuid(),
        itemId,
        userEmail,
        'CHECKOUT',
        quantity,
        new Date().toISOString()
      ]);
      
      return { success: true, message: 'Item checked out' };
    }
  }
  
  return { success: false, message: 'Item not found' };
}

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
  
  // Check for duplicates
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0].toLowerCase() === categoryName.toLowerCase()) {
      return { success: false, message: 'Category already exists' };
    }
  }
  
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

// ===== IMAGE UPLOAD TO GOOGLE DRIVE =====

function handleUploadImage(data) {
  try {
    const { fileName, mimeType, content } = data;
    const folder = DriveApp.getFoldersByName('InventoryImages').next();
    
    const blob = Utilities.newBlob(
      Utilities.base64Decode(content),
      mimeType,
      fileName
    );
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    
    const imageUrl = file.getUrl();
    
    return { success: true, imageUrl: imageUrl };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}
