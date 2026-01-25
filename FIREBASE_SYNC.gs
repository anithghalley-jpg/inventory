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

  // Sanitize key to handle newline characters correctly
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
