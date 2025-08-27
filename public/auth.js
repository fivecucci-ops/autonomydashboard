// auth.js - Local mode only (no Google APIs)

let authMode = 'local'; // Always local mode

/**
 * Initialize authentication (local mode only)
 */
async function initializeGoogleAuth() {
    console.log('Initializing in local mode - no Google Auth needed');
    authMode = 'local';
    showLocalModeInterface();
}

/**
 * Show local mode interface
 */
function showLocalModeInterface() {
    console.log('Setting up local mode interface');
    
    // Hide auth container and show main app
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    
    if (authContainer) authContainer.style.display = 'none';
    if (mainApp) mainApp.style.display = 'flex';
    
    // Update UI elements
    const userInfo = document.getElementById('user-info');
    const sheetsInfo = document.getElementById('sheets-info');
    
    if (userInfo) userInfo.innerHTML = 'Local Mode';
    if (sheetsInfo) {
        sheetsInfo.innerHTML = `
            <span style="font-size: 12px; color: #666;">
                Local Mode - Using Dashboard Clone.xlsx
            </span>
        `;
    }
    
    // Set status
    if (typeof window.setStatus === 'function') {
        window.setStatus('Local Mode Active', 'success');
    } else {
        console.log('Local Mode Active');
    }
    
    // Initialize main app
    if (typeof window.initMainApp === 'function') {
        window.initMainApp();
    } else {
        console.log('Main app not ready, will initialize when loaded');
    }
}

/**
 * Read data from local server (no Google Sheets)
 */
async function readSheetData(spreadsheetId, range) {
    try {
        console.log('Fetching data from local server...');
        const response = await fetch(`/api/read-active?spreadsheetId=local`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Data received from server:', data);
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw new Error(`Failed to fetch local data: ${error.message}`);
    }
}

/**
 * Create calendar event (local storage mock)
 */
async function createCalendarEvent(patientData, eventType = 'follow-up') {
    const events = JSON.parse(localStorage.getItem('calendar-events') || '[]');
    const event = {
        id: Date.now().toString(),
        summary: `${eventType}: ${patientData['Patient Name']}`,
        description: `Patient: ${patientData['Patient Name']}\nAge: ${patientData['Age']}\nCity: ${patientData['City'] || patientData.city}`,
        start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created: new Date().toISOString()
    };
    events.push(event);
    localStorage.setItem('calendar-events', JSON.stringify(events));
    return event;
}

/**
 * Create task (local storage mock)
 */
async function createTaskForPatient(patientData, taskTitle, dueDate = null) {
    const tasks = JSON.parse(localStorage.getItem('google-tasks') || '[]');
    const task = {
        id: Date.now().toString(),
        title: taskTitle || `Follow up with ${patientData['Patient Name']}`,
        notes: `Patient: ${patientData['Patient Name']}\nAge: ${patientData['Age']}\nCity: ${patientData['City'] || patientData.city}`,
        due: (dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString(),
        created: new Date().toISOString()
    };
    tasks.push(task);
    localStorage.setItem('google-tasks', JSON.stringify(tasks));
    return task;
}

/**
 * Check if signed in (always true in local mode)
 */
function isSignedIn() {
    return true;
}

// Export functions for use in main app
window.GoogleAuth = {
    initialize: initializeGoogleAuth,
    readSheetData: readSheetData,
    createCalendarEvent: createCalendarEvent,
    createTaskForPatient: createTaskForPatient,
    isSignedIn: isSignedIn
}; 