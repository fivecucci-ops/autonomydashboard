// sync.js - Google Sheets API setup

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');
require('dotenv').config();

/**
 * OAuth Instructions:
 * 1. Go to https://console.cloud.google.com/ and create a new project.
 * 2. Enable the Google Sheets API, Calendar API, and Tasks API.
 * 3. Create OAuth 2.0 Client IDs (select 'Desktop app').
 * 4. Download the client_secret.json and rename it to credentials.json in the project root.
 * 5. Run a script or the server to generate the token.json by authorizing via the generated URL.
 * 6. Paste the authorization code back into the prompt.
 * Note: For security, never commit credentials.json or token.json.
 */

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/tasks'
];
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
        await fs.access(localFilePath);
        console.log('Local file found, reading from Dashboard Clone.xlsx');
        const workbook = XLSX.readFile(localFilePath);
        const worksheet = workbook.Sheets['Active'];
        if (!worksheet) {
            throw new Error('Active sheet not found in local file');
        }
        const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: null});
        if (!rows || rows.length === 0) {
            console.log('No data found in local file.');
            return [];
        }
        const headers = rows[0];
        const data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] !== undefined ? row[i] : null;
            });
            // Parse Excel serial dates to JS Date as per schema
            const dateFields = ['Date', 'DOB', '1st request', '2nd request', 'CP Completed', 'Prescription Submit', 'Ingestion Date', 'Physician follow up form'];
            dateFields.forEach(key => {
                if (obj[key] && typeof obj[key] === 'number') {
                    const serial = obj[key];
                    obj[key] = new Date((serial - 25569) * 86400 * 1000);
                }
            });
            return obj;
        });
        return data;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('Local file not found, falling back to Google Sheets');
        } else {
            console.error('Error reading local file:', err);
        }
        // Fallback to Google Sheets - authorize here
        const auth = await authorize();
        const sheets = google.sheets({version: 'v4', auth});
        try {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'Active!A1:ZZ',
            });
            const rows = res.data.values;
            if (!rows || rows.length === 0) {
                console.log('No data found.');
                return [];
            }
            const headers = rows[0];
            const data = rows.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i] || null;
                });
                // Parse Excel serial dates to JS Date as per schema
                const dateFields = ['Date', 'DOB', '1st request', '2nd request', 'CP Completed', 'Prescription Submit', 'Ingestion Date', 'Physician follow up form'];
                dateFields.forEach(key => {
                    if (obj[key] && !isNaN(parseFloat(obj[key]))) {
                        const serial = parseFloat(obj[key]);
                        obj[key] = new Date((serial - 25569) * 86400 * 1000);
                    }
                });
                return obj;
            });
            return data;
        } catch (apiErr) {
            console.error('Error reading Active tab from Sheets:', apiErr);
            throw apiErr;
        }
    }
}

/**
 * Create calendar event from patient data
 */
async function createCalendarEvent(auth, patientData, eventType = 'follow-up') {
    const calendar = google.calendar({version: 'v3', auth});
    
    let eventDate = new Date();
    let summary = `${eventType}: ${patientData['Patient Name']}`;
            let description = `Patient: ${patientData['Patient Name']}\nAge: ${patientData['Age']}\nCity: ${patientData['City'] || patientData.city}\nCP Doctor: ${patientData['CP Doctor']}`;
    
    // Use ingestion date if available
    if (patientData['Ingestion Date'] && patientData['Ingestion Date'] instanceof Date) {
        eventDate = new Date(patientData['Ingestion Date']);
        eventDate.setDate(eventDate.getDate() + 7); // Follow up in a week
        summary = `Follow-up: ${patientData['Patient Name']}`;
    }
    
    const event = {
        summary: summary,
        description: description,
        start: {
            dateTime: eventDate.toISOString(),
            timeZone: 'America/Los_Angeles',
        },
        end: {
            dateTime: new Date(eventDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour
            timeZone: 'America/Los_Angeles',
        },
    };
    
    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });
        console.log('Event created:', response.data.htmlLink);
        return response.data;
    } catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
    }
}

/**
 * Create task from patient data
 */
async function createTask(auth, patientData, taskTitle, dueDate = null) {
    const tasks = google.tasks({version: 'v1', auth});
    
    const taskDue = dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 1 week from now
    
    const task = {
        title: taskTitle || `Follow up with ${patientData['Patient Name']}`,
        notes: `Patient: ${patientData['Patient Name']}\nAge: ${patientData['Age']}\nCity: ${patientData['City'] || patientData.city}\nCP Doctor: ${patientData['CP Doctor']}\nInvoice: $${patientData['invoice amount'] || 'N/A'}\nPaid: ${patientData['PAID'] || 'N/A'}`,
        due: taskDue.toISOString(),
    };
    
    try {
        const response = await tasks.tasks.insert({
            tasklist: '@default',
            resource: task,
        });
        console.log('Task created:', response.data.id);
        return response.data;
    } catch (error) {
        console.error('Error creating task:', error);
        throw error;
    }
}

/**
 * List upcoming calendar events
 */
async function listCalendarEvents(auth, maxResults = 10) {
    const calendar = google.calendar({version: 'v3', auth});
    
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: maxResults,
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        return response.data.items || [];
    } catch (error) {
        console.error('Error listing calendar events:', error);
        throw error;
    }
}

/**
 * List tasks
 */
async function listTasks(auth, maxResults = 10) {
    const tasks = google.tasks({version: 'v1', auth});
    
    try {
        const response = await tasks.tasks.list({
            tasklist: '@default',
            maxResults: maxResults,
        });
        
        return response.data.items || [];
    } catch (error) {
        console.error('Error listing tasks:', error);
        throw error;
    }
}

module.exports = { 
    authorize, 
    readActiveTab, 
    createCalendarEvent, 
    createTask, 
    listCalendarEvents, 
    listTasks 
}; 