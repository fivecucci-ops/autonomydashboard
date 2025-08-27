// sync.js - Google Sheets API setup

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const XLSX = require('xlsx');

/**
 * OAuth Instructions:
 * 1. Go to https://console.cloud.google.com/ and create a new project.
 * 2. Enable the Google Sheets API.
 * 3. Create OAuth 2.0 Client IDs (select 'Desktop app').
 * 4. Download the client_secret.json and rename it to credentials.json in the project root.
 * 5. Run a script or the server to generate the token.json by authorizing via the generated URL.
 * 6. Paste the authorization code back into the prompt.
 * Note: For security, never commit credentials.json or token.json.
 */

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(__dirname, 'token.json');

async function authorize() {
    let client;
    const content = await fs.readFile('credentials.json');
    const credentials = JSON.parse(content);
    client = new google.auth.OAuth2(
        credentials.installed.client_id,
        credentials.installed.client_secret,
        credentials.installed.redirect_uris[0]
    );

    try {
        const token = await fs.readFile(TOKEN_PATH);
        client.setCredentials(JSON.parse(token));
    } catch (err) {
        return getNewToken(client);
    }
    return client;
}

async function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    // In a real script, use readline to get the code from user
    // For now, this is a placeholder - user must manually authorize and save token
    throw new Error('Please authorize the app and save the token to token.json manually.');
}

async function readActiveTab(spreadsheetId) {
    const localFilePath = path.join(__dirname, 'Dashboard Clone.xlsx');
    
    try {
        // Check if file exists
        await fs.access(localFilePath);
        console.log('Local file found, reading from Dashboard Clone.xlsx');
        
        // Read the Excel file
        const workbook = XLSX.readFile(localFilePath);
        console.log('Available sheets:', workbook.SheetNames);
        
        // Get the Active sheet
        const worksheet = workbook.Sheets['Active'];
        if (!worksheet) {
            throw new Error('Active sheet not found in local file. Available sheets: ' + workbook.SheetNames.join(', '));
        }
        
        // Convert sheet to JSON
        const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: null});
        if (!rows || rows.length === 0) {
            console.log('No data found in Active sheet.');
            return [];
        }
        
        console.log(`Found ${rows.length} rows in Active sheet`);
        const headers = rows[0];
        console.log('Headers:', headers);
        
        // Convert rows to objects
        const data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] !== undefined ? row[i] : null;
            });
            return obj;
        });
        
        console.log(`Processed ${data.length} data rows`);
        return data;
        
    } catch (err) {
        console.error('Error reading local XLSX file:', err);
        if (err.code === 'ENOENT') {
            throw new Error('Dashboard Clone.xlsx file not found in project root. Please ensure the file exists.');
        }
        throw new Error(`Failed to read local XLSX file: ${err.message}`);
    }
}

async function readVendorsTab(spreadsheetId) {
    const localFilePath = path.join(__dirname, 'Dashboard Clone.xlsx');
    
    try {
        // Check if file exists
        await fs.access(localFilePath);
        
        // Read the Excel file
        const workbook = XLSX.readFile(localFilePath);
        
        // Get the Vendors sheet
        const worksheet = workbook.Sheets['Vendors'];
        if (!worksheet) {
            throw new Error('Vendors sheet not found in local file. Available sheets: ' + workbook.SheetNames.join(', '));
        }
        
        // Convert sheet to JSON
        const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: null});
        if (!rows || rows.length === 0) {
            console.log('No data found in Vendors sheet.');
            return [];
        }
        
        console.log(`Found ${rows.length} rows in Vendors sheet`);
        const headers = rows[0];
        
        // Convert rows to objects
        const data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] !== undefined ? row[i] : null;
            });
            return obj;
        });
        
        console.log(`Processed ${data.length} vendor records`);
        return data;
        
    } catch (err) {
        console.error('Error reading Vendors tab:', err);
        if (err.code === 'ENOENT') {
            throw new Error('Dashboard Clone.xlsx file not found in project root. Please ensure the file exists.');
        }
        throw new Error(`Failed to read Vendors tab: ${err.message}`);
    }
}

async function readChatTab(spreadsheetId, currentUser = null) {
    const localFilePath = path.join(__dirname, 'Dashboard Clone.xlsx');
    
    try {
        // Check if file exists
        await fs.access(localFilePath);
        
        // Read the Excel file
        const workbook = XLSX.readFile(localFilePath);
        
        // Get the Chat sheet
        const worksheet = workbook.Sheets['Chat'];
        if (!worksheet) {
            throw new Error('Chat sheet not found in local file. Available sheets: ' + workbook.SheetNames.join(', '));
        }
        
        // Convert sheet to JSON
        const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: null});
        if (!rows || rows.length === 0) {
            console.log('No data found in Chat sheet.');
            return [];
        }
        
        console.log(`Found ${rows.length} rows in Chat sheet`);
        const headers = rows[0];
        
        // Convert rows to objects
        let data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] !== undefined ? row[i] : null;
            });
            return obj;
        });
        
        // Filter messages based on current user if specified
        if (currentUser) {
            data = data.filter(message => {
                const participants = message.Participants || '';
                return participants.includes(`<${currentUser}>`);
            });
        }
        
        console.log(`Processed ${data.length} chat messages${currentUser ? ` for ${currentUser}` : ''}`);
        return data;
        
    } catch (err) {
        console.error('Error reading Chat tab:', err);
        if (err.code === 'ENOENT') {
            throw new Error('Dashboard Clone.xlsx file not found in project root. Please ensure the file exists.');
        }
        throw new Error(`Failed to read Chat tab: ${err.message}`);
    }
}

async function addChatMessage(messageData) {
    const localFilePath = path.join(__dirname, 'Dashboard Clone.xlsx');
    
    try {
        // Read existing file
        const workbook = XLSX.readFile(localFilePath);
        const worksheet = workbook.Sheets['Chat'];
        
        if (!worksheet) {
            throw new Error('Chat sheet not found');
        }
        
        // Convert to array of arrays
        const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: null});
        
        // Add new message (Chat headers: Timestamp, Type, Participants, Sender, Message, Status, Tags)
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const newRow = [
            timestamp,
            messageData.type || 'GM',
            messageData.participants || `<${messageData.sender || messageData.user}>`,
            messageData.sender || messageData.user || 'Unknown',
            messageData.message,
            'active',
            messageData.tags || ''
        ];
        
        rows.push(newRow);
        
        // Convert back to worksheet
        const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
        workbook.Sheets['Chat'] = newWorksheet;
        
        // Write back to file
        XLSX.writeFile(workbook, localFilePath);
        
        console.log('Chat message added successfully');
        return { success: true, timestamp };
        
    } catch (error) {
        console.error('Error adding chat message:', error);
        throw error;
    }
}

async function writeActiveTab(patientData) {
    const localFilePath = path.join(__dirname, 'Dashboard Clone.xlsx');
    
    try {
        // Read the existing Excel file
        const workbook = XLSX.readFile(localFilePath);
        const worksheet = workbook.Sheets['Active'];
        
        if (!worksheet) {
            throw new Error('Active sheet not found in local file');
        }
        
        // Get existing data
        const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: null});
        const headers = rows[0] || [];
        
        // Map patient intake data to Excel columns matching exact order
        // Headers: ti, Date, Patient Name, DOB, Age, Area, Phone Number, Email, 
        // 1st request, 2nd request, CP Doctor, CP Completed, RXNT Info, WR, Hospice, 
        // Prescription Submit, [empty], invoice amount, PAID, Check list, Ingestion Date, 
        // Ingestion Location, TTS (Minutes), TTD (Minutes), Consent Received, Medical Records,
        // Physician follow up form, EOLOA State, Death Certificate, All Records in DRC, 
        // [empty], Riverside EOLOA, Referred From
        
        const newRow = [
            '',                                                // ti
            new Date().toLocaleDateString('en-US'),           // Date
            patientData.patientName || '',                    // Patient Name
            patientData.dob || '',                            // DOB
            patientData.age || '',                            // Age
            patientData.city || '',                           // Area (now City)
            patientData.phone || '',                          // Phone Number
            patientData.email || '',                          // Email
            '',                                                // 1st request
            '',                                                // 2nd request
            patientData.cpDoctor || '',                       // CP Doctor
            '',                                                // CP Completed
            '',                                                // RXNT Info
            '',                                                // WR
            patientData.hospice || '',                        // Hospice
            '',                                                // Prescription Submit
            '',                                                // [empty column]
            patientData.invoiceAmount || '',                  // invoice amount
            patientData.paymentStatus === 'Paid' ? 'yes' : 'no', // PAID
            patientData.checklistStatus === 'Complete' ? 'complete' : '', // Check list
            patientData.intakeDate || '',                     // Ingestion Date
            '',                                                // Ingestion Location
            '',                                                // TTS (Minutes)
            '',                                                // TTD (Minutes)
            '',                                                // Consent Received
            '',                                                // Medical Records
            '',                                                // Physician follow up form
            '',                                                // EOLOA State
            '',                                                // Death Certificate
            '',                                                // All Records in DRC
            '',                                                // [empty column]
            '',                                                // Riverside EOLOA
            patientData.referringPhysician || ''              // Referred From
        ];
        
        // Add the new row to the data
        rows.push(newRow);
        
        // Create a new worksheet from the updated data
        const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
        
        // Update the workbook
        workbook.Sheets['Active'] = newWorksheet;
        
        // Write back to file
        XLSX.writeFile(workbook, localFilePath);
        
        console.log('Successfully added patient to Active tab:', patientData.patientName);
        return { success: true, message: 'Patient added to Excel file' };
        
    } catch (err) {
        console.error('Error writing to Excel file:', err);
        throw new Error(`Failed to write to Excel file: ${err.message}`);
    }
}

module.exports = { authorize, readActiveTab, readVendorsTab, readChatTab, addChatMessage, writeActiveTab }; 