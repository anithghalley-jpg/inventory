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
      case 'getRequests': // NEW
        response = handleGetRequests(data);
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

/**
 * OPTIMIZED: handleAddInventoryItem
 * 
 * Now expects imageUrl to be already set (from image upload step)
 * This makes the request smaller and faster
 */
function handleAddInventoryItem(data) {
  const { name, quantity, category, company, imageUrl, remarks, links } = data;
  const sheet = getSheet(SHEET_NAMES.INVENTORY);
  
  // // Check for duplicates
  // const values = sheet.getDataRange().getValues();
  // for (let i = 1; i < values.length; i++) {
  //   if (values[i][1].toLowerCase() === name.toLowerCase()) {
  //     return { success: false, message: 'Item already exists' };
  //   }
  // }
  // Inside your handleCompleteInventoryItem function
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
      ''            // Links
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
    const { itemId, name, quantity, category, company, remarks, links } = data;
    const inventorySheet = getSheet(SHEET_NAMES.INVENTORY);
    const values = inventorySheet.getDataRange().getValues();
    
    // 1. Get a list of all IDs from Column A
    const ids = values.map(r => r[0]);
    
    // 2. Find where our itemId is
    const rowIndex = ids.indexOf(itemId);
    
    // 3. If found (index is not -1)
    if (rowIndex !== -1) {
       // Note: Spreadsheet rows start at 1, so we add 1 to the index
       const range = inventorySheet.getRange(rowIndex + 1, 1, 1, 8);
       
       range.setValues([[
          itemId,
          name,
          quantity,
          category,
          company,
          values[rowIndex][5], // The image URL already in the sheet
          remarks || '',
          links || ''
        ]]);

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
  const categories = values.slice(1).map(row => row); 
  return { success: true, categories: categories };
}

// 1. Fetch all users from the Sheet
function handleGetAllUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  const values = sheet.getDataRange().getValues();
  
  // Skip the header row (index 0)
  const users = values.slice(1).map(row => ({
    email: row[0],           // Column B: Email
    name: row[1],            // Column C: Name
    role: row[2] || 'USER',  // Column D: Role
    status: row[3] || 'PENDING', // Column E: Status
    createdDate: row[4]      // Column F: CreatedDate
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
      actionBy: values[i][7],      // Admin Name
      returnStatus: values[i][8]   // YES / NO (or empty)
    });
  }
  
  return { success: true, requests: requests };
}




