// app.js - Enhanced client-side functionality

let currentData = {};
let currentTab = 'dashboard';
let isLoading = false;
let dataCache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Set status message (make available globally)
 */
function setStatus(message, type = 'success') {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
        status.className = type;
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (status.textContent === message) {
                    status.textContent = '';
                    status.className = '';
                }
            }, 3000);
        }
    } else {
        console.log(`Status (${type}): ${message}`);
    }
}

/**
 * Show error message with better UX
 */
function showError(message, duration = 5000) {
    setStatus(message, 'error');
    
    // Create a more prominent error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4757;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        ">
            <strong>Error:</strong> ${message}
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, duration);
}

// Make setStatus available globally immediately
window.setStatus = setStatus;

/**
 * Force refresh all task status colors
 */
function refreshAllTaskStatuses() {
    console.log('Refreshing all task status colors...');
    
    // Get all patient timeline cards
    const patientCards = document.querySelectorAll('.patient-timeline-card');
    
    patientCards.forEach(card => {
        const patientId = card.id;
        const tasks = window.taskCompletionData[patientId];
        
        if (tasks) {
            tasks.forEach((task, taskIndex) => {
                // Recalculate status for each task
                let completedSubtasks = 0;
                let totalSubtasks = 0;
                
                if (task.id === 'invoice') {
                    // Special logic for Quickbooks Invoice
                    const sentInvoice = task.subtasks.find(s => s.name === 'Sent Invoice')?.complete || false;
                    const paymentReceived = task.subtasks.find(s => s.name === 'Payment Received');
                    const paidViaQuickbooks = paymentReceived?.subSubtasks?.find(s => s.name === 'Paid via Quickbooks')?.complete || false;
                    const paidViaCheck = paymentReceived?.subSubtasks?.find(s => s.name === 'Paid via Check')?.complete || false;
                    
                    totalSubtasks = task.subtasks.length;
                    
                    if (sentInvoice && (paidViaQuickbooks || paidViaCheck)) {
                        completedSubtasks = totalSubtasks;
                    } else if (sentInvoice) {
                        completedSubtasks = 1;
                    } else {
                        completedSubtasks = 0;
                    }
                } else {
                    // Standard logic for other tasks
                    task.subtasks.forEach(subtask => {
                        totalSubtasks++;
                        
                        if (subtask.subSubtasks && subtask.subSubtasks.length > 0) {
                            let allSubSubtasksComplete = true;
                            subtask.subSubtasks.forEach(subSubtask => {
                                if (!subSubtask.complete) {
                                    allSubSubtasksComplete = false;
                                }
                            });
                            if (allSubSubtasksComplete) {
                                completedSubtasks++;
                            }
                        } else {
                            if (subtask.complete) completedSubtasks++;
                        }
                    });
                }
                
                // Update visual status
                const taskItem = document.querySelector(`#${patientId} .task-item[data-task-index="${taskIndex}"]`);
                if (taskItem) {
                    const taskNumber = taskItem.querySelector('.task-number');
                    const taskStatus = taskItem.querySelector('.task-status');
                    
                    // Remove old classes
                    taskItem.classList.remove('not-started', 'partial', 'complete');
                    taskNumber.classList.remove('not-started', 'partial', 'complete');
                    
                    // Determine new status
                    let statusClass, statusText;
                    if (completedSubtasks === 0) {
                        statusClass = 'not-started';
                        statusText = 'Not Started';
                    } else if (completedSubtasks === totalSubtasks) {
                        statusClass = 'complete';
                        statusText = 'Complete';
                    } else {
                        statusClass = 'partial';
                        statusText = 'Partially Complete';
                    }
                    
                    // Apply new classes
                    taskItem.classList.add(statusClass);
                    taskNumber.classList.add(statusClass);
                    taskStatus.textContent = statusText;
                    
                    console.log(`Refreshed task ${taskIndex} status: ${statusClass} (${completedSubtasks}/${totalSubtasks})`);
                }
            });
        }
    });
    
    console.log('Task status refresh complete');
}

/**
 * Cache management functions
 */
function getCachedData(key) {
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    dataCache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

function clearCache() {
    dataCache.clear();
}

/**
 * Initialize the main application (called after authentication)
 */
function initMainApp() {
    console.log('Initializing main app');
    
    // Show loading state
    showLoadingState();
    
    // Load all persisted data first
    loadPersistedData();
    
    setupEventListeners();
    loadPinnedPatient();
    
    // Load dashboard by default
    setTimeout(() => {
        switchTab('dashboard', document.querySelector('[data-tab="dashboard"]'));
        hideLoadingState();
    }, 100);
    
    setStatus('Local Mode Active - Ready', 'success');
}

/**
 * Show loading state
 */
function showLoadingState() {
    const content = document.getElementById('content');
    if (content) {
        content.innerHTML = '<div class="loading">Loading dashboard...</div>';
    }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    // Loading state will be replaced by actual content
}


/**
 * Migrate task completion data from old index-based IDs to new unique IDs
 */
function migrateTaskCompletionData() {
    try {
        const activePatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
        let needsUpdate = false;
        
        activePatients.forEach((patient, index) => {
            const oldPatientId = `patient-${index}`;
            const newPatientId = patient.id;
            
            if (window.taskCompletionData && window.taskCompletionData[oldPatientId] && newPatientId) {
                if (!window.taskCompletionData[newPatientId]) {
                    // Copy task data from old ID to new ID
                    window.taskCompletionData[newPatientId] = window.taskCompletionData[oldPatientId];
                    // Remove old ID data
                    delete window.taskCompletionData[oldPatientId];
                    needsUpdate = true;
                    console.log(`Migrated task data for ${patient['Patient Name'] || 'Unknown'} from ${oldPatientId} to ${newPatientId}`);
                }
            }
        });
        
        if (needsUpdate) {
            localStorage.setItem('taskCompletionData', JSON.stringify(window.taskCompletionData));
            console.log('Task completion data migration completed');
        }
    } catch (error) {
        console.error('Error migrating task completion data:', error);
    }
}

/**
 * Load all persisted data from localStorage
 */
function loadPersistedData() {
    try {
        // Load task completion data
        const savedTaskData = localStorage.getItem('taskCompletionData');
        if (savedTaskData) {
            window.taskCompletionData = JSON.parse(savedTaskData);
            console.log('Loaded task completion data:', Object.keys(window.taskCompletionData).length, 'patients');
        } else {
            window.taskCompletionData = {};
        }
        
        // Migrate any old task completion data
        migrateTaskCompletionData();
        
        // Load workflow data
        const savedWorkflowData = localStorage.getItem('workflowData');
        if (savedWorkflowData) {
            window.workflowData = JSON.parse(savedWorkflowData);
            console.log('Loaded workflow data');
        }
        
        // Load form data for all tabs
        loadAllFormData();
        
        console.log('All persisted data loaded successfully');
        
    } catch (error) {
        console.error('Error loading persisted data:', error);
        // Initialize empty objects if loading fails
        window.taskCompletionData = {};
        window.workflowData = {};
    }
}

/**
 * Load form data for all tabs
 */
function loadAllFormData() {
    // Load patient intake form data
    loadPatientIntakeFormData();
    
    // Load any other form data that might exist
    loadGenericFormData();
}

/**
 * Load patient intake form data
 */
function loadPatientIntakeFormData() {
    const savedFormData = localStorage.getItem('patientIntakeFormData');
    if (savedFormData) {
        try {
            const formData = JSON.parse(savedFormData);
            // Apply saved data to form fields when the form is loaded
            window.savedPatientIntakeData = formData;
        } catch (error) {
            console.error('Error loading patient intake form data:', error);
        }
    }
}

/**
 * Load generic form data for other tabs
 */
function loadGenericFormData() {
    // Load any other form data that might be saved
    const savedFormData = localStorage.getItem('genericFormData');
    if (savedFormData) {
        try {
            window.genericFormData = JSON.parse(savedFormData);
        } catch (error) {
            console.error('Error loading generic form data:', error);
        }
    }
}

/**
 * Setup auto-save listeners for all form elements
 */
function setupAutoSaveListeners() {
    // Use event delegation to catch all form interactions
    document.addEventListener('change', (e) => {
        if (e.target.matches('input, select, textarea')) {
            autoSaveFormData(e.target);
        }
    });
    
    document.addEventListener('input', (e) => {
        if (e.target.matches('input[type="text"], input[type="email"], input[type="tel"], textarea')) {
            // Debounce text inputs to avoid too many saves
            clearTimeout(e.target.autoSaveTimeout);
            e.target.autoSaveTimeout = setTimeout(() => {
                autoSaveFormData(e.target);
            }, 1000);
        }
    });
}

/**
 * Auto-save form data for a specific element
 */
function autoSaveFormData(element) {
    try {
        const currentTab = getCurrentTabName();
        if (!currentTab) return;
        
        // Get the form or container element
        const form = element.closest('form') || element.closest('.tab-content') || element.closest('#content');
        if (!form) return;
        
        // Collect all form data in this container
        const formData = collectFormData(form);
        
        // Save to localStorage with tab-specific key
        const storageKey = `formData_${currentTab}`;
        localStorage.setItem(storageKey, JSON.stringify(formData));
        
        console.log(`Auto-saved form data for ${currentTab}`);
        
    } catch (error) {
        console.error('Error auto-saving form data:', error);
    }
}

/**
 * Save current form data before tab switch
 */
function saveCurrentFormData() {
    try {
        const currentTab = getCurrentTabName();
        if (!currentTab) return;
        
        const content = document.getElementById('content');
        if (!content) return;
        
        const formData = collectFormData(content);
        const storageKey = `formData_${currentTab}`;
        localStorage.setItem(storageKey, JSON.stringify(formData));
        
    } catch (error) {
        console.error('Error saving current form data:', error);
    }
}

/**
 * Get current tab name
 */
function getCurrentTabName() {
    const activeTab = document.querySelector('#sidebar li.active');
    return activeTab ? activeTab.dataset.tab : null;
}

/**
 * Collect all form data from a container
 */
function collectFormData(container) {
    const formData = {};
    
    // Get all form elements
    const inputs = container.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        const name = input.name || input.id || input.className;
        if (!name) return;
        
        if (input.type === 'checkbox' || input.type === 'radio') {
            formData[name] = input.checked;
        } else {
            formData[name] = input.value;
        }
    });
    
    return formData;
}

/**
 * Restore form data for a specific tab
 */
function restoreFormData(tabName) {
    try {
        const storageKey = `formData_${tabName}`;
        const savedData = localStorage.getItem(storageKey);
        
        if (!savedData) return;
        
        const formData = JSON.parse(savedData);
        const content = document.getElementById('content');
        if (!content) return;
        
        // Apply saved data to form elements
        Object.keys(formData).forEach(key => {
            const element = content.querySelector(`[name="${key}"], #${key}, .${key}`);
            if (element) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = formData[key];
                } else {
                    element.value = formData[key];
                }
            }
        });
        
        console.log(`Restored form data for ${tabName}`);
        
    } catch (error) {
        console.error('Error restoring form data:', error);
    }
}

/**
 * Setup event listeners for UI interactions
 */
function setupEventListeners() {
    // Tab switching - fix the event handling
    const tabs = document.querySelectorAll('#sidebar li');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            if (tabName) {
                // Save current form data before switching tabs
                saveCurrentFormData();
                switchTab(tabName, tab);
            }
        });
    });
    
    // Add global auto-save listeners
    setupAutoSaveListeners();

    // Search functionality
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        let searchTimeout;
        searchBar.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(e.target.value);
            }, 300); // Debounce search
        });
    }
}

/**
 * Switch to Active Data tab from dashboard
 */
function switchToActiveData() {
    const activeDataTab = document.querySelector('[data-tab="active-data"]');
    if (activeDataTab) {
        switchTab('active-data', activeDataTab);
    }
}


/**
 * Switch to Archived Patients tab from dashboard
 */
function switchToArchived() {
    const archivedTab = document.querySelector('[data-tab="archived"]');
    if (archivedTab) {
        switchTab('archived', archivedTab);
    }
}

/**
 * Auto-archive patient when they reach 100% completion
 */
function autoArchivePatient(patientId) {
    try {
        const patients = JSON.parse(localStorage.getItem('activePatients') || '[]');
        const archivedPatients = JSON.parse(localStorage.getItem('archivedPatients') || '[]');
        
        // Find the patient in active patients
        const patientIndex = patients.findIndex(p => p.id === patientId);
        if (patientIndex === -1) return; // Patient not found in active list
        
        const patient = patients[patientIndex];
        const archivedDate = new Date().toLocaleDateString();
        
        // Add archive metadata
        patient.archivedDate = archivedDate;
        patient.archivedBy = 'Auto-Archive (100% Complete)';
        patient.archivedReason = 'All tasks completed';
        
        // Move to archived
        archivedPatients.push(patient);
        patients.splice(patientIndex, 1);
        
        // Save both arrays
        localStorage.setItem('activePatients', JSON.stringify(patients));
        localStorage.setItem('archivedPatients', JSON.stringify(archivedPatients));
        
        // Show success message
        setStatus(`Patient ${patient.name} has been automatically archived (100% complete)`, 'success');
        
        // Refresh the current view if we're on timelines or active-data
        if (currentTab === 'timelines') {
            loadPatientTimelines();
        } else if (currentTab === 'active-data') {
            loadActivePatients();
        }
        
        console.log(`Auto-archived patient ${patient.name} (${patientId})`);
        
    } catch (error) {
        console.error('Error auto-archiving patient:', error);
        setStatus('Error auto-archiving patient', 'error');
    }
}

/**
 * Switch between tabs
 */
function switchTab(tabName, tabElement) {
    console.log('Switching to tab:', tabName);
    
    // Update active tab styling
    document.querySelectorAll('#sidebar li').forEach(t => t.classList.remove('active'));
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    currentTab = tabName;
    
    // Show the main content area
    const content = document.getElementById('content');
    if (content) {
        content.style.display = 'block';
    }
    
    // Load content based on tab
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'patient-intake':
            loadPatientIntake();
            break;
        case 'active-data':
            loadActivePatients();
            break;
        case 'active-todo':
            loadActiveTodo();
            break;
        case 'todos':
            loadTodos();
            break;
        case 'calendar':
            loadCalendar();
            break;
        case 'outstanding':
            showPlaceholder('Outstanding Cases', 'This will show pending/outstanding items');
            break;
        case 'outreach':
            showPlaceholder('Past Patient Outreach', 'This will show outreach to past patients\' contacts');
            break;
        case 'docs':
            showPlaceholder('Consulting Docs', 'This will show the consulting doctors directory');
            break;
        case 'calllog':
            showPlaceholder('Call Log', 'This will show interaction logs');
            break;
        case 'vendors':
            loadVendors();
            break;
        case 'chat':
            loadChat('Alyssa'); // Load chat from Alyssa's perspective
            break;
        case 'alyssa-notes':
            loadUserTasks('Alyssa');
            break;
        case 'moore-notes':
            loadUserTasks('Dr. Moore');
            break;
        case 'christa-notes':
            loadUserTasks('Christa');
            break;
        case 'amber-notes':
            loadUserTasks('Amber');
            break;
        case 'notes':
            loadAllNotes();
            break;
        case 'timelines':
            loadPatientTimelines();
            break;
        case 'archived':
            loadArchivedPatients();
            break;
        default:
            console.log('Unknown tab:', tabName);
            showPlaceholder('Unknown Tab', 'Content not implemented yet');
    }
    
    // Restore form data for this tab after content is loaded
    setTimeout(() => {
        restoreFormData(tabName);
    }, 100);
}

/**
 * Generate HTML table for patient data with improved columns
 */
function generatePatientTable(data) {
    if (!data || data.length === 0) {
        return '<p>No data available.</p>';
    }
    
    // Use the important columns that we know exist in the data
    const importantColumns = ['Patient Name', 'Age', 'City', 'Phone Number', 'Email', 'CP Doctor', 'Hospice', 'PAID', 'Check list'];
    
    let html = '<table class="data-table"><thead><tr>';
    importantColumns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '<th>Actions</th></tr></thead><tbody>';
    
    data.forEach((patient, index) => {
        html += '<tr>';
        importantColumns.forEach(col => {
            let value = patient[col] || '-';
            // Add some basic formatting
            if (col === 'Patient Name' && value !== '-') {
                // Make patient name clickable
                value = `<a href="#" onclick="showPatientDetail(${index}); return false;" class="patient-name-link">${value}</a>`;
            } else if (col === 'PAID' && value === 'yes') {
                value = '✅ Yes';
            } else if (col === 'PAID' && value === 'no') {
                value = '❌ No';
            } else if (col === 'Check list' && value === 'complete') {
                value = '✅ Complete';
            } else if (col === 'Phone Number' && value !== '-') {
                value = `<a href="tel:${value}" class="contact-link">📞 ${value}</a>`;
            } else if (col === 'Email' && value !== '-') {
                value = `<a href="mailto:${value}" class="contact-link">✉️ ${value}</a>`;
            }
            html += `<td>${value}</td>`;
        });
        
        // Add actions column
        html += `
            <td>
                <div class="patient-actions">
                    <button class="patient-action-btn pin" onclick="pinPatient(${index})" title="Pin patient">📌</button>
                    <button class="patient-action-btn task" onclick="createTaskForPatient(${index})" title="Create task">📝</button>
                    <button class="patient-action-btn calendar" onclick="createEventForPatient(${index})" title="Create calendar event">📅</button>
                </div>
            </td>
        `;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
}

/**
 * Generate modern card layout for Active Data that shows only populated fields
 * and duplicates patient name in header and details.
 */
function generateActivePatientCards(data) {
    if (!data || data.length === 0) {
        return '<p>No data available.</p>';
    }

    const preferredFieldOrder = [
        'Patient Name', 'DOB', 'Age', 'City', 'Phone Number', 'Email',
        'CP Doctor', 'Hospice', 'PAID', 'invoice amount', 'Check list',
        'Ingestion Date', 'Ingestion Location', 'Consent Received',
        'Medical Records', 'Physician follow up form', 'EOLOA State',
        'Death Certificate', 'Referred From'
    ];

    const formatValue = (label, value) => {
        if (!value || value === '-' || value === '0') return '';
        if (label === 'Phone Number') {
            return `<a class="contact-link" href="tel:${value}">📞 ${value}</a>`;
        }
        if (label === 'Email') {
            return `<a class="contact-link" href="mailto:${value}">✉️ ${value}</a>`;
        }
        if (label === 'PAID') {
            const v = String(value).toLowerCase();
            if (v === 'yes') return '✅ Yes';
            if (v === 'no') return '❌ No';
        }
        if (label === 'City') {
            return value;
        }
        return value;
    };

    const buildFieldsHtml = (patient) => {
        const city = patient['City'] || patient.city || patient['Area'];
        const withComputed = { ...patient, 'City': city };

        let html = '';
        preferredFieldOrder.forEach((label) => {
            if (label === 'Patient Name') return; // name handled separately but duplicated later
            const raw = withComputed[label];
            const value = formatValue(label, raw);
            if (value) {
                html += `
                    <div class="active-field">
                        <div class="active-field-label">${label}</div>
                        <div class="active-field-value">${value}</div>
                    </div>
                `;
            }
        });
        return html || '<div class="active-field"><div class="active-field-value">No additional info</div></div>';
    };

    let html = '<div class="active-cards-grid">';
    data.forEach((patient, index) => {
        const name = patient['Patient Name'] || patient.patientName || 'Unknown';
        const city = patient['City'] || patient.city || patient['Area'] || '';
        const age = patient['Age'] || '';

        html += `
            <div class="active-card">
                <div class="active-card-header">
                    <div class="active-card-title">
                        <a href="#" onclick="showPatientDetail(${index}); return false;" class="patient-name-link">${name}</a>
                    </div>
                    <div class="active-card-meta">${age ? `${age} yrs` : ''}${age && city ? ' · ' : ''}${city || ''}</div>
                    <div class="active-card-actions">
                        <button class="patient-action-btn pin" onclick="pinPatient(${index})" title="Pin patient">📌</button>
                        <button class="patient-action-btn task" onclick="createTaskForPatient(${index})" title="Create task">📝</button>
                        <button class="patient-action-btn calendar" onclick="createEventForPatient(${index})" title="Create calendar event">📅</button>
                    </div>
                </div>
                <div class="active-card-body">
                    <div class="active-field">
                        <div class="active-field-label">Patient Name</div>
                        <div class="active-field-value">${name}</div>
                    </div>
                    ${buildFieldsHtml(patient)}
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

/**
 * Generate progress indicator based on patient data
 */
function generateProgressIndicator(patient) {
    let progress = 0;
    let total = 8;
    
    // Check various completion indicators
    if (patient['CP Completed'] && patient['CP Completed'].toLowerCase() === 'complete') progress++;
    if (patient['RXNT Info'] && patient['RXNT Info'].toLowerCase() === 'complete') progress++;
    if (patient['WR'] && patient['WR'].toLowerCase() === 'yes') progress++;
    if (patient['Prescription Submit']) progress++;
    if (patient['PAID'] && patient['PAID'].toLowerCase() === 'yes') progress++;
    if (patient['Check list'] && patient['Check list'].toLowerCase() === 'complete') progress++;
    if (patient['Consent Received'] && patient['Consent Received'].toLowerCase() === 'yes') progress++;
    if (patient['Medical Records'] && patient['Medical Records'].toLowerCase() === 'yes') progress++;
    
    const percentage = Math.round((progress / total) * 100);
    
    return `
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="progress-text">${progress}/${total}</span>
    `;
}

/**
 * Get status class for styling
 */
function getStatusClass(status) {
    if (!status) return 'status-unknown';
    const statusLower = status.toLowerCase();
    if (statusLower === 'complete') return 'status-complete';
    if (statusLower === 'pending') return 'status-pending';
    if (statusLower.includes('progress')) return 'status-progress';
    return 'status-default';
}

// View toggles for Active Data
function switchToTableView() {
    // Get patients from localStorage (same source as loadActivePatients)
    const localPatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="active-header">
            <h1>Active Patients (${localPatients.length})</h1>
            <div class="active-view-toggle">
                <button class="btn-primary" onclick="switchToTableView()">Table</button>
                <button class="btn-secondary" onclick="switchToCardView()">Cards</button>
                <button class="btn-secondary" onclick="switchToSectionView()">Sections</button>
            </div>
        </div>
        ${localPatients.length > 0 ? generatePatientTable(localPatients) : '<p>No active patients. Add a patient using the Patient Intake form.</p>'}
    `;
}

function switchToCardView() {
    // Get patients from localStorage (same source as loadActivePatients)
    const localPatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="active-header">
            <h1>Active Patients (${localPatients.length})</h1>
            <div class="active-view-toggle">
                <button class="btn-secondary" onclick="switchToTableView()">Table</button>
                <button class="btn-primary" onclick="switchToCardView()">Cards</button>
                <button class="btn-secondary" onclick="switchToSectionView()">Sections</button>
            </div>
        </div>
        ${localPatients.length > 0 ? generateActivePatientCards(localPatients) : '<p>No active patients. Add a patient using the Patient Intake form.</p>'}
    `;
}

/**
 * Load dashboard with summary cards using data
 */
async function loadDashboard() {
    showLoading();
    
    try {
        // Fetch data from server (same as simple-app.html)
        const response = await fetch('/api/read-active?spreadsheetId=local');
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error('No data received from server');
        }
        
        // Merge with localStorage data to include newly added patients
        let localPatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
        const patientNames = new Set(data.map(p => p['Patient Name'] || p.patientName));
        localPatients.forEach(patient => {
            const name = patient['Patient Name'] || patient.patientName;
            if (!patientNames.has(name)) {
                data.push(patient);
            }
        });
        
        // Store data globally
        currentData.active = data;
        
        // Calculate metrics (same as simple-app.html)
        const avgAge = calculateAverageAge(data);
        const paidCount = countPaidInvoices(data);
        const completedCount = countCompletedCases(data);
        
        // Get 5 most recently added patients
        const recentPatients = getRecentPatients(data, 5);
        
        // Create dashboard content
        const content = document.getElementById('content');
        content.innerHTML = `
            <h1>Dashboard Overview</h1>
            <div class="dashboard-cards">
                <div class="card clickable-card" onclick="switchToActiveData()">
                    <h3>Active Patients</h3>
                    <div class="number">${data.length}</div>
                    <p>Currently active cases</p>
                    <div class="card-hint">Click to view →</div>
                </div>
                <div class="card">
                    <h3>Average Age</h3>
                    <div class="number">${avgAge}</div>
                    <p>Years old</p>
                </div>
                <div class="card">
                    <h3>Paid Invoices</h3>
                    <div class="number">${paidCount}</div>
                    <p>Out of ${data.length} total</p>
                </div>
                <div class="card clickable-card" onclick="switchToArchived()">
                    <h3>Archived Patients</h3>
                    <div class="number">${completedCount}</div>
                    <p>Completed cases</p>
                    <div class="card-hint">Click to view →</div>
                </div>
            </div>
            
            <h2>Most Recently Added Patients</h2>
            <div class="recent-patients-section">
                <div class="section-header">
                    <span>Showing ${recentPatients.length} of ${data.length} patients</span>
                    <button class="view-all-btn" onclick="switchToActiveData()">View All Active Patients →</button>
                </div>
                ${generateRecentPatientCards(recentPatients)}
            </div>
        `;
        
        setStatus('Dashboard loaded successfully', 'success');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError(`Failed to load dashboard: ${error.message}`);
    }
}

/**
 * Load active patients data
 */
async function loadActivePatients() {
    showLoading();
    
    try {
        // First, try to get data from localStorage (includes newly added patients)
        let localPatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
        
        // Ensure all local patients have unique IDs
        let needsUpdate = false;
        localPatients.forEach((patient, index) => {
            if (!patient.id) {
                patient.id = 'PAT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                needsUpdate = true;
            }
            
            // Migrate task completion data from old index-based IDs to new unique IDs
            const oldPatientId = `patient-${index}`;
            const newPatientId = patient.id;
            
            if (window.taskCompletionData && window.taskCompletionData[oldPatientId] && !window.taskCompletionData[newPatientId]) {
                // Copy task data from old ID to new ID
                window.taskCompletionData[newPatientId] = window.taskCompletionData[oldPatientId];
                // Remove old ID data
                delete window.taskCompletionData[oldPatientId];
                needsUpdate = true;
            }
        });
        
        // Save updated patients and task data back to localStorage if changes were made
        if (needsUpdate) {
            localStorage.setItem('activePatients', JSON.stringify(localPatients));
            localStorage.setItem('taskCompletionData', JSON.stringify(window.taskCompletionData));
        }
        
        // Also try to fetch data from server
        try {
        const response = await fetch('/api/read-active?spreadsheetId=local');
        
            if (response.ok) {
                const serverData = await response.json();
                
                // Merge server data with local data, avoiding duplicates
                if (serverData && serverData.length > 0) {
                    const patientNames = new Set(localPatients.map(p => p['Patient Name'] || p.patientName));
                    serverData.forEach(patient => {
                        const name = patient['Patient Name'] || patient.patientName;
                        if (!patientNames.has(name)) {
                            // Ensure server data patients have unique IDs
                            if (!patient.id) {
                                patient.id = 'PAT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                            }
                            localPatients.push(patient);
                        }
                    });
                }
            }
        } catch (serverError) {
            console.log('Server fetch failed, using local data only:', serverError);
        }
        
        // Sort patients alphabetically by first name
        localPatients.sort((a, b) => {
            const nameA = (a['Patient Name'] || a.patientName || '').split(' ')[0].toLowerCase();
            const nameB = (b['Patient Name'] || b.patientName || '').split(' ')[0].toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        // Store data globally
        currentData.active = localPatients;
        
        // Create patient sections
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="active-header">
                <h1>Active Patients (${localPatients.length})</h1>
                <div class="active-view-toggle">
                    <button class="btn-secondary" onclick="switchToTableView()">Table</button>
                    <button class="btn-primary" onclick="switchToCardView()">Cards</button>
                    <button class="btn-secondary" onclick="switchToSectionView()">Sections</button>
                </div>
            </div>
            ${localPatients.length > 0 ? generateActivePatientSections(localPatients) : '<p>No active patients. Add a patient using the Patient Intake form.</p>'}
        `;
        
        setStatus('Active patients loaded successfully', 'success');
        
    } catch (error) {
        console.error('Error loading active patients:', error);
        
        // Fall back to just localStorage data
        const localPatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
        
        // Sort patients alphabetically by first name
        localPatients.sort((a, b) => {
            const nameA = (a['Patient Name'] || a.patientName || '').split(' ')[0].toLowerCase();
            const nameB = (b['Patient Name'] || b.patientName || '').split(' ')[0].toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        currentData.active = localPatients;
        
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="active-header">
                <h1>Active Patients (${localPatients.length})</h1>
                <div class="active-view-toggle">
                    <button class="btn-secondary" onclick="switchToTableView()">Table</button>
                    <button class="btn-primary" onclick="switchToCardView()">Cards</button>
                </div>
            </div>
            ${localPatients.length > 0 ? generateActivePatientCards(localPatients) : '<p>No active patients. Add a patient using the Patient Intake form.</p>'}
        `;
    }
}

/**
 * Perform search across data
 */
async function performSearch(query) {
    if (!query.trim()) {
        // If search is empty, reload current tab
        switchTab(currentTab, document.querySelector(`[data-tab="${currentTab}"]`));
        return;
    }
    
    showLoading();
    
    try {
        // Search in active patients data
        const data = await GoogleAuth.readSheetData('local', 'Active!A1:ZZ');
        
        // Simple search across patient names and other fields
        const results = data.filter(patient => 
            Object.values(patient).some(value => 
                value && value.toString().toLowerCase().includes(query.toLowerCase())
            )
        );
        
        const content = document.getElementById('content');
        content.innerHTML = `
            <h1>Search Results for "${query}" (${results.length})</h1>
            ${results.length > 0 ? generatePatientTable(results) : '<p>No results found.</p>'}
        `;
        
    } catch (error) {
        console.error('Error performing search:', error);
        showError('Search failed. Check your connection.');
    }
}

/**
 * Pin a patient to the footer with enhanced information
 */
function pinPatient(patientIndex) {
    const patient = currentData.active[patientIndex];
    if (!patient) return;
    
    // Store pinned patient
    localStorage.setItem('pinnedPatient', JSON.stringify(patient));
    
    // Update footer with comprehensive info
    document.getElementById('pinned-name').textContent = patient['Patient Name'] || 'Unknown';
    document.getElementById('pinned-dob').textContent = patient['DOB'] ? formatDate(patient['DOB']) : '-';
    document.getElementById('pinned-age').textContent = patient['Age'] || '-';
    document.getElementById('pinned-phone').textContent = patient['Phone Number'] || '-';
    document.getElementById('pinned-email').textContent = patient['Email'] || '-';
            document.getElementById('pinned-address').textContent = patient['City'] || patient.city || '-';
    document.getElementById('pinned-diagnosis').textContent = patient['CP Doctor'] || '-';
    document.getElementById('pinned-hospice').textContent = patient['Hospice'] || '-';
    document.getElementById('pinned-social-worker').textContent = patient['CP Completed'] || '-';
    document.getElementById('pinned-doula').textContent = patient['RXNT Info'] || '-';
    document.getElementById('pinned-caretaker').textContent = patient['Check list'] || '-';
    
    // Show footer
    document.getElementById('pinned-footer').style.display = 'block';
    
    setStatus(`${patient['Patient Name']} pinned with full details`, 'success');
}

/**
 * Create task for patient
 */
function createTaskForPatient(patientIndex) {
    const patient = currentData.active[patientIndex];
    if (!patient) return;
    
    const taskTitle = prompt(`Create task for ${patient['Patient Name']}:`, `Follow up with ${patient['Patient Name']}`);
    if (taskTitle) {
        GoogleAuth.createTaskForPatient(patient, taskTitle)
            .then(() => {
                setStatus(`Task created for ${patient['Patient Name']}`, 'success');
            })
            .catch(err => {
                console.error('Error creating task:', err);
                setStatus('Error creating task', 'error');
            });
    }
}

/**
 * Create calendar event for patient
 */
function createEventForPatient(patientIndex) {
    const patient = currentData.active[patientIndex];
    if (!patient) return;
    
    GoogleAuth.createCalendarEvent(patient, 'follow-up')
        .then(() => {
            setStatus(`Event created for ${patient['Patient Name']}`, 'success');
        })
        .catch(err => {
            console.error('Error creating event:', err);
            setStatus('Error creating event', 'error');
        });
}

/**
 * Load Active Todo workflow tracking
 */
function loadActiveTodo() {
    showLoading();
    
    try {
        const viewMode = localStorage.getItem('todoViewMode') || 'task';
        const toggleHtml = `
            <div class="view-toggle">
                <button onclick="switchTodoView('task')" ${viewMode === 'task' ? 'class="active"' : ''}>Task View</button>
                <button onclick="switchTodoView('patient')" ${viewMode === 'patient' ? 'class="active"' : ''}>Patient View</button>
            </div>
        `;
        
        const content = document.getElementById('content');
        let html = '<h1>Active Patients - Todo Workflow</h1>' + toggleHtml + '<div class="todo-workflow">';
        
        if (viewMode === 'task') {
            html += generateTaskView();
        } else {
            html += generatePatientView();
        }
        
        html += '</div>';
        content.innerHTML = html;
        setStatus('Todo workflow loaded', 'success');
    } catch (error) {
        console.error('Error loading todo:', error);
        showError(`Failed to load todo: ${error.message}`);
    }
}

function switchTodoView(mode) {
    localStorage.setItem('todoViewMode', mode);
    loadActiveTodo();
}

function generateTaskView() {
    // Existing task-based view logic
    return `
        <div class="workflow-section">
            <h3>📋 Workflow Tracking</h3>
            <p>Track completion of tasks for each patient with sign-off initials</p>
            <div class="workflow-grid">
                <div class="workflow-card">
                    <h4>📤 Send Out Written Requests</h4>
                    <div class="workflow-items" id="written-requests">
                        <div class="workflow-item">
                            <span class="patient-name">Adam Jones</span>
                            <div class="workflow-status">
                                <input type="checkbox" id="wr-adam" onchange="updateWorkflowStatus('written-requests', 'adam', this.checked)">
                                <label for="wr-adam">Complete</label>
                                <input type="text" placeholder="Initials" class="initials-input" maxlength="3">
                            </div>
                        </div>
                        <!-- Add more patients dynamically if needed -->
                    </div>
                </div>
                <!-- Add other workflow cards similarly -->
            </div>
        </div>
    `;
}

function generatePatientView() {
    // New patient-based view: Cards per patient with their tasks
    let html = '<div class="patient-workflow-grid">';
    // Assuming currentData.active has patients
    (currentData.active || []).forEach(patient => {
        const name = patient['Patient Name'] || 'Unknown';
        html += `
            <div class="patient-card">
                <h4>${name}</h4>
                <ul class="patient-tasks">
                    <li>Send Written Request <input type="checkbox"> <input type="text" placeholder="Initials" maxlength="3"></li>
                    <li>Visit 1 <input type="checkbox"> <input type="text" placeholder="Initials" maxlength="3"></li>
                    <!-- Add all steps -->
                </ul>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

/**
 * Update workflow status
 */
function updateWorkflowStatus(workflowType, patientKey, completed) {
    const workflowData = JSON.parse(localStorage.getItem('workflowData') || '{}');
    
    if (!workflowData[workflowType]) {
        workflowData[workflowType] = {};
    }
    
    if (!workflowData[workflowType][patientKey]) {
        workflowData[workflowType][patientKey] = {};
    }
    
    workflowData[workflowType][patientKey].completed = completed;
    workflowData[workflowType][patientKey].timestamp = new Date().toISOString();
    
    localStorage.setItem('workflowData', JSON.stringify(workflowData));
    
    setStatus(`${workflowType} updated for ${patientKey}`, 'success');
}

/**
 * Save workflow data
 */
function saveWorkflowData() {
    // Collect all form data
    const workflowData = {};
    
    // Get all workflow items
    document.querySelectorAll('.workflow-item').forEach(item => {
        const patientName = item.querySelector('.patient-name').textContent;
        const checkbox = item.querySelector('input[type="checkbox"]');
        const initialsInput = item.querySelector('.initials-input');
        const dateInput = item.querySelector('.date-input');
        
        const workflowType = item.closest('.workflow-card').querySelector('h4').textContent;
        
        if (!workflowData[workflowType]) {
            workflowData[workflowType] = {};
        }
        
        workflowData[workflowType][patientName] = {
            completed: checkbox.checked,
            initials: initialsInput.value,
            date: dateInput ? dateInput.value : null,
            timestamp: new Date().toISOString()
        };
    });
    
    localStorage.setItem('workflowData', JSON.stringify(workflowData));
    setStatus('Workflow data saved', 'success');
}

/**
 * Load workflow data
 */
function loadWorkflowData() {
    const workflowData = JSON.parse(localStorage.getItem('workflowData') || '{}');
    
    // Apply saved data to form elements
    document.querySelectorAll('.workflow-item').forEach(item => {
        const patientName = item.querySelector('.patient-name').textContent;
        const checkbox = item.querySelector('input[type="checkbox"]');
        const initialsInput = item.querySelector('.initials-input');
        const dateInput = item.querySelector('.date-input');
        
        const workflowType = item.closest('.workflow-card').querySelector('h4').textContent;
        
        if (workflowData[workflowType] && workflowData[workflowType][patientName]) {
            const data = workflowData[workflowType][patientName];
            checkbox.checked = data.completed || false;
            initialsInput.value = data.initials || '';
            if (dateInput && data.date) {
                dateInput.value = data.date;
            }
        }
    });
}

/**
 * Export workflow data to sheet format
 */
function exportWorkflowData() {
    const workflowData = JSON.parse(localStorage.getItem('workflowData') || '{}');
    
    // Convert to CSV-like format for easy copying to sheets
    let csvData = 'Patient Name,Workflow Type,Completed,Initials,Date,Timestamp\n';
    
    Object.keys(workflowData).forEach(workflowType => {
        Object.keys(workflowData[workflowType]).forEach(patientName => {
            const data = workflowData[workflowType][patientName];
            csvData += `${patientName},"${workflowType}",${data.completed},${data.initials || ''},${data.date || ''},${data.timestamp}\n`;
        });
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(csvData).then(() => {
        setStatus('Workflow data copied to clipboard - paste into new sheet tab', 'success');
    }).catch(() => {
        // Fallback - show in alert
        alert('Copy this data to create a new sheet tab:\n\n' + csvData);
    });
}

/**
 * Utility functions for dashboard metrics (same as simple-app.html)
 */
function calculateAverageAge(data) {
    const ages = data.filter(p => p.Age && !isNaN(p.Age)).map(p => parseInt(p.Age));
    return ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
}

function countPaidInvoices(data) {
    return data.filter(p => p.PAID && p.PAID.toLowerCase() === 'yes').length;
}

function countCompletedCases(data) {
    return data.filter(p => p['Check list'] && p['Check list'].toLowerCase() === 'complete').length;
}

/**
 * UI Helper functions
 */
function showLoading() {
    document.getElementById('content').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
}

function showError(message) {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center; padding: 50px; color: #e74c3c;">
            <h2>Error</h2>
            <p>${message}</p>
        </div>
    `;
    setStatus('Error', 'error');
}

function showPlaceholder(title, description) {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center; padding: 50px; color: #666;">
            <h1>${title}</h1>
            <p>${description}</p>
            <p><em>Coming soon...</em></p>
        </div>
    `;
}

/**
 * Load user-specific tasks and notes page
 */
function loadUserTasks(userName) {
    const content = document.getElementById('content');
    const userKey = userName.toLowerCase().replace(/\s+/g, '-');
    
    content.innerHTML = `
        <h1>${userName}'s Tasks & Notes</h1>
        
        <div class="task-container">
            <div class="task-input-section">
                <h3>➕ Add New Task/Note</h3>
                <div class="task-form">
                    <input type="text" id="task-title-${userKey}" placeholder="Task title..." />
                    <textarea id="task-description-${userKey}" placeholder="Description or notes..."></textarea>
                    <select id="task-priority-${userKey}">
                        <option value="low">Low Priority</option>
                        <option value="medium" selected>Medium Priority</option>
                        <option value="high">High Priority</option>
                    </select>
                    <input type="url" id="task-link-${userKey}" placeholder="Related link (optional)..." />
                    <div class="task-form-buttons">
                        <button class="btn-primary" onclick="addTask('${userName}')">Add Task</button>
                        <button class="btn-secondary" onclick="clearTaskForm('${userKey}')">Clear</button>
                    </div>
                </div>
            </div>
            
            <div class="task-lists">
                <div class="task-list">
                    <div class="task-list-header pending">
                        📋 Pending Tasks
                    </div>
                    <div id="pending-tasks-${userKey}">
                        <div style="padding: 20px; text-align: center; color: #666;">
                            No pending tasks
                        </div>
                    </div>
                </div>
                
                <div class="task-list">
                    <div class="task-list-header completed">
                        ✅ Completed Tasks
                    </div>
                    <div id="completed-tasks-${userKey}">
                        <div style="padding: 20px; text-align: center; color: #666;">
                            No completed tasks
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load existing tasks
    loadTasksForUser(userName);
}

/**
 * Load all notes overview
 */
function loadAllNotes() {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <h1>📋 All Notes & Tasks</h1>
        <div class="notes-container" id="all-notes-container">
            <div style="padding: 50px; text-align: center; color: #666;">
                <p>Loading all notes...</p>
            </div>
        </div>
    `;
    
    // Load all notes from both users
    loadAllNotesData();
}

/**
 * Add a new task
 */
function addTask(userName) {
    const userKey = userName.toLowerCase().replace(/\s+/g, '-');
    const title = document.getElementById(`task-title-${userKey}`).value.trim();
    const description = document.getElementById(`task-description-${userKey}`).value.trim();
    const priority = document.getElementById(`task-priority-${userKey}`).value;
    const link = document.getElementById(`task-link-${userKey}`).value.trim();
    
    if (!title) {
        alert('Please enter a task title');
        return;
    }
    
    const task = {
        id: Date.now().toString(),
        title: title,
        description: description,
        priority: priority,
        link: link,
        completed: false,
        createdAt: new Date().toISOString(),
        user: userName
    };
    
    // Save to localStorage
    let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    
    // Clear form
    clearTaskForm(userKey);
    
    // Reload tasks
    loadTasksForUser(userName);
    
    setStatus(`Task added for ${userName}`, 'success');
}

/**
 * Clear task form
 */
function clearTaskForm(userKey) {
    document.getElementById(`task-title-${userKey}`).value = '';
    document.getElementById(`task-description-${userKey}`).value = '';
    document.getElementById(`task-priority-${userKey}`).value = 'medium';
    document.getElementById(`task-link-${userKey}`).value = '';
}

/**
 * Load tasks for a specific user
 */
function loadTasksForUser(userName) {
    const userKey = userName.toLowerCase().replace(/\s+/g, '-');
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const userTasks = tasks.filter(task => task.user === userName);
    
    const pendingTasks = userTasks.filter(task => !task.completed);
    const completedTasks = userTasks.filter(task => task.completed);
    
    // Render pending tasks
    const pendingContainer = document.getElementById(`pending-tasks-${userKey}`);
    if (pendingTasks.length === 0) {
        pendingContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No pending tasks</div>';
    } else {
        pendingContainer.innerHTML = pendingTasks.map(task => renderTaskItem(task)).join('');
    }
    
    // Render completed tasks
    const completedContainer = document.getElementById(`completed-tasks-${userKey}`);
    if (completedTasks.length === 0) {
        completedContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No completed tasks</div>';
    } else {
        completedContainer.innerHTML = completedTasks.map(task => renderTaskItem(task)).join('');
    }
}

/**
 * Render a single task item
 */
function renderTaskItem(task) {
    const date = new Date(task.createdAt).toLocaleDateString();
    const linkHtml = task.link ? `<a href="${task.link}" target="_blank" class="note-link">🔗 Link</a>` : '';
    
    return `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <div class="task-title">${task.title}</div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                <span class="task-priority ${task.priority}">${task.priority.toUpperCase()}</span>
                <span>${date}</span>
            </div>
            ${linkHtml ? `<div class="note-links">${linkHtml}</div>` : ''}
            <div class="task-actions">
                ${!task.completed ? `<button class="task-action-btn btn-complete" onclick="toggleTask('${task.id}')">✓ Complete</button>` : 
                  `<button class="task-action-btn btn-complete" onclick="toggleTask('${task.id}')">↩ Reopen</button>`}
                <button class="task-action-btn btn-edit" onclick="editTask('${task.id}')">✏ Edit</button>
                <button class="task-action-btn btn-delete" onclick="deleteTask('${task.id}')">🗑 Delete</button>
            </div>
        </div>
    `;
}

/**
 * Toggle task completion status
 */
function toggleTask(taskId) {
    let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        tasks[taskIndex].completedAt = tasks[taskIndex].completed ? new Date().toISOString() : null;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        // Reload current user's tasks
        const currentUser = tasks[taskIndex].user;
        loadTasksForUser(currentUser);
        
        setStatus(`Task ${tasks[taskIndex].completed ? 'completed' : 'reopened'}`, 'success');
    }
}

/**
 * Delete a task
 */
function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
        const currentUser = tasks[taskIndex].user;
        tasks.splice(taskIndex, 1);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        // Reload current user's tasks
        loadTasksForUser(currentUser);
        
        setStatus('Task deleted', 'success');
    }
}

/**
 * Edit a task (simplified - just prompt for new title)
 */
function editTask(taskId) {
    let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
        const newTitle = prompt('Edit task title:', tasks[taskIndex].title);
        if (newTitle && newTitle.trim()) {
            tasks[taskIndex].title = newTitle.trim();
            tasks[taskIndex].updatedAt = new Date().toISOString();
            localStorage.setItem('tasks', JSON.stringify(tasks));
            
            // Reload current user's tasks
            loadTasksForUser(tasks[taskIndex].user);
            
            setStatus('Task updated', 'success');
        }
    }
}

/**
 * Load all notes data for overview
 */
function loadAllNotesData() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const container = document.getElementById('all-notes-container');
    
    if (tasks.length === 0) {
        container.innerHTML = '<div style="padding: 50px; text-align: center; color: #666;"><p>No notes or tasks yet</p></div>';
        return;
    }
    
    // Sort by creation date (newest first)
    const sortedTasks = tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    container.innerHTML = sortedTasks.map(task => `
        <div class="note-item">
            <div class="note-header">
                <div class="note-title">${task.title} (${task.user})</div>
                <div class="note-date">${new Date(task.createdAt).toLocaleDateString()}</div>
            </div>
            ${task.description ? `<div class="note-content">${task.description}</div>` : ''}
            <div class="note-links">
                <span class="task-priority ${task.priority}">${task.priority.toUpperCase()}</span>
                ${task.completed ? '<span style="color: #27ae60;">✅ COMPLETED</span>' : '<span style="color: #e67e22;">⏳ PENDING</span>'}
                ${task.link ? `<a href="${task.link}" target="_blank" class="note-link">🔗 Link</a>` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Load calendar events
 */
async function loadCalendar() {
    try {
        const content = document.getElementById('calendar-events');
        content.innerHTML = 'Loading events...';

        // Assuming listEvents is defined in sync.js or auth.js
        const events = await listEvents(); // Use the existing listEvents function

        content.innerHTML = '';
        events.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.innerHTML = `
                <span class="event-summary">${event.summary}</span>
                <span class="event-date">${new Date(event.start.dateTime).toLocaleString()}</span>
            `;
            content.appendChild(eventItem);
        });
    } catch (error) {
        console.error('Error loading calendar:', error);
        content.innerHTML = 'Error loading events.';
    }
}

/**
 * Format date for display
 */
function formatDate(date) {
    if (date instanceof Date) {
        return date.toLocaleDateString();
    }
    return date;
}

// Make initMainApp available globally
window.initMainApp = initMainApp; 

async function loadTodos() {
    try {
        const content = document.getElementById('todo-list');
        content.innerHTML = 'Loading tasks...';

        // Assuming listTasks is defined in sync.js or auth.js
        const tasks = await listTasks();

        content.innerHTML = '';
        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <span class="task-title">${task.title}</span>
                <span class="task-due">Due: ${task.due ? new Date(task.due).toLocaleDateString() : 'No due date'}</span>
                <span class="task-status" onclick="completeTask('${task.id}')">${task.status === 'completed' ? '✅' : '⬜'}</span>
            `;
            content.appendChild(taskItem);
        });
    } catch (error) {
        console.error('Error loading todos:', error);
        content.innerHTML = 'Error loading tasks.';
    }
}

async function createNewTask() {
    const title = prompt('Enter task title:');
    if (title) {
        // Assuming createTask is defined
        await createTask(title, new Date()); // Default due date today
        loadTodos(); // Refresh list
    }
}

async function completeTask(taskId) {
    // Assuming a function to mark task as completed
    await updateTaskStatus(taskId, 'completed');
    loadTodos(); // Refresh
} 

/**
 * Load pinned patient from localStorage
 */
function loadPinnedPatient() {
    const pinnedPatient = JSON.parse(localStorage.getItem('pinnedPatient') || '{}');
    if (pinnedPatient['Patient Name']) {
        // Update footer with pinned patient info
        document.getElementById('pinned-name').textContent = pinnedPatient['Patient Name'] || 'Unknown';
        document.getElementById('pinned-dob').textContent = pinnedPatient['DOB'] ? formatDate(pinnedPatient['DOB']) : '-';
        document.getElementById('pinned-age').textContent = pinnedPatient['Age'] || '-';
        document.getElementById('pinned-phone').textContent = pinnedPatient['Phone'] || pinnedPatient['ContactNumber'] || '-';
        document.getElementById('pinned-email').textContent = pinnedPatient['Email'] || pinnedPatient['ContactEmail'] || '-';
        document.getElementById('pinned-address').textContent = pinnedPatient['Address'] || pinnedPatient['City'] || pinnedPatient.city || '-';
        document.getElementById('pinned-diagnosis').textContent = pinnedPatient['Diagnosis'] || pinnedPatient['Condition'] || '-';
        document.getElementById('pinned-hospice').textContent = pinnedPatient['Hospice'] || '-';
        document.getElementById('pinned-social-worker').textContent = pinnedPatient['Social Worker'] || pinnedPatient['SocialWorker'] || '-';
        document.getElementById('pinned-doula').textContent = pinnedPatient['Doula'] || '-';
        document.getElementById('pinned-caretaker').textContent = pinnedPatient['Caretaker'] || pinnedPatient['Care Team'] || '-';
        
        // Show footer
        document.getElementById('pinned-footer').style.display = 'block';
    } else {
        // Hide footer if no patient pinned
        document.getElementById('pinned-footer').style.display = 'none';
    }
} 

/**
 * List events (mock implementation for local mode)
 */
async function listEvents() {
    if (typeof gapi !== 'undefined' && gapi.client && gapi.client.calendar) {
        // Google Calendar API implementation
        const request = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return request.result.items || [];
    } else {
        // Local mode - return mock events from localStorage
        const events = JSON.parse(localStorage.getItem('calendar-events') || '[]');
        return events.map(event => ({
            ...event,
            start: { dateTime: event.start },
            summary: event.summary
        }));
    }
}

/**
 * List tasks (mock implementation for local mode)
 */
async function listTasks() {
    if (typeof gapi !== 'undefined' && gapi.client && gapi.client.tasks) {
        // Google Tasks API implementation
        const request = await gapi.client.tasks.tasks.list({ tasklist: '@default' });
        return request.result.items || [];
    } else {
        // Local mode - return mock tasks from localStorage
        const tasks = JSON.parse(localStorage.getItem('google-tasks') || '[]');
        return tasks.map(task => ({
            ...task,
            status: task.completed ? 'completed' : 'needsAction'
        }));
    }
}

/**
 * Create task (mock implementation for local mode)
 */
async function createTask(title, dueDate) {
    if (typeof gapi !== 'undefined' && gapi.client && gapi.client.tasks) {
        // Google Tasks API implementation
        const task = { title, due: dueDate.toISOString() };
        await gapi.client.tasks.tasks.insert({ tasklist: '@default', resource: task });
    } else {
        // Local mode - store in localStorage
        const tasks = JSON.parse(localStorage.getItem('google-tasks') || '[]');
        const task = {
            id: Date.now().toString(),
            title: title,
            due: dueDate.toISOString(),
            created: new Date().toISOString(),
            completed: false
        };
        tasks.push(task);
        localStorage.setItem('google-tasks', JSON.stringify(tasks));
    }
}

/**
 * Update task status (mock implementation for local mode)
 */
async function updateTaskStatus(taskId, status) {
    if (typeof gapi !== 'undefined' && gapi.client && gapi.client.tasks) {
        // Google Tasks API implementation
        await gapi.client.tasks.tasks.patch({
            tasklist: '@default',
            task: taskId,
            resource: { status }
        });
    } else {
        // Local mode - update in localStorage
        const tasks = JSON.parse(localStorage.getItem('google-tasks') || '[]');
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = (status === 'completed');
            localStorage.setItem('google-tasks', JSON.stringify(tasks));
        }
    }
} 

// New function for loading patient timelines
async function loadPatientTimelines() {
    showLoading();
    
    try {
        const response = await fetch('/api/read-active?spreadsheetId=local');
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data || data.length === 0) {
            throw new Error('No data received');
        }
        
        // Initialize task completion data if not exists
        if (!window.taskCompletionData) {
            window.taskCompletionData = {};
        }
        
        // Ensure task completion data is loaded from localStorage
        const savedTaskData = localStorage.getItem('taskCompletionData');
        if (savedTaskData) {
            try {
                const parsedData = JSON.parse(savedTaskData);
                window.taskCompletionData = { ...window.taskCompletionData, ...parsedData };
                console.log('Loaded task completion data from localStorage:', Object.keys(window.taskCompletionData).length, 'patients');
            } catch (error) {
                console.error('Error parsing task completion data from localStorage:', error);
            }
        }
        
        const content = document.getElementById('content');
        let html = '<h1>Patient Timelines</h1>' +
            '<div class="timeline-header">' +
            '  <div class="legend-box">' +
            '    <h3>Task Status Guide</h3>' +
            '    <div class="legend-items">' +
            '      <div class="legend-item"><span class="bullet-demo not-started">1</span> Not Started (Orange)</div>' +
            '      <div class="legend-item"><span class="bullet-demo partial">2</span> Partially Complete (Yellow)</div>' +
            '      <div class="legend-item"><span class="legend-item"><span class="bullet-demo complete">3</span> Fully Complete (Green)</div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="timeline-controls">' +
            '    <button onclick="expandAllTimelines()">Expand All</button>' +
            '    <button onclick="collapseAllTimelines()">Collapse All</button>' +
            '    <button onclick="filterTimelines(\'incomplete\')">Show Incomplete</button>' +
            '    <button onclick="filterTimelines(\'all\')">Show All</button>' +
            '    <button onclick="refreshAllTaskStatuses()" class="refresh-btn">🔄 Refresh Colors</button>' +
            '    <button onclick="exportPatientData()" class="export-btn">📊 Export to Excel</button>' +
            '  </div>' +
            '</div>' +
            '<div class="simple-search-bar">' +
            '  <input type="text" id="patient-search" placeholder="🔍 Search patients by name..." class="simple-search-input">' +
            '  <button onclick="clearSearch()" class="simple-clear-btn">Clear</button>' +
            '</div>' +
            '<div class="simple-stats">' +
            '  <div class="stat-item">' +
            '    <span class="stat-number">' + data.length + '</span>' +
            '    <span class="stat-label">Total Patients</span>' +
            '  </div>' +
            '  <div class="stat-item">' +
            '    <span class="stat-number">' + data.filter((p, i) => {
                const patientName = p['Patient Name'] || 'Unknown';
                const patientId = p.id || `patient-${patientName.replace(/\s+/g, '-').toLowerCase()}-${i}`;
                return calculateProgress(patientId) < 100;
            }).length + '</span>' +
            '    <span class="stat-label">Incomplete</span>' +
            '  </div>' +
            '  <div class="stat-item">' +
            '    <span class="stat-number">' + data.filter((p, i) => {
                const patientName = p['Patient Name'] || 'Unknown';
                const patientId = p.id || `patient-${patientName.replace(/\s+/g, '-').toLowerCase()}-${i}`;
                return calculateProgress(patientId) === 100;
            }).length + '</span>' +
            '    <span class="stat-label">Complete</span>' +
            '  </div>' +
            '</div>' +
            '<div class="timelines-container">';
        
        data.forEach((patient, index) => {
            const patientName = patient['Patient Name'] || 'Unknown';
            // Use a stable ID based on patient name and index to ensure consistency across page refreshes
            const patientId = patient.id || `patient-${patientName.replace(/\s+/g, '-').toLowerCase()}-${index}`;
            
            // Migrate task completion data from old index-based IDs to new unique IDs
            const oldPatientId = `patient-${index}`;
            if (window.taskCompletionData && window.taskCompletionData[oldPatientId] && !window.taskCompletionData[patientId]) {
                // Copy task data from old ID to new ID
                window.taskCompletionData[patientId] = window.taskCompletionData[oldPatientId];
                // Remove old ID data
                delete window.taskCompletionData[oldPatientId];
                // Save the migrated data
                localStorage.setItem('taskCompletionData', JSON.stringify(window.taskCompletionData));
            }
            
            // Initialize patient tasks if not exists
            if (!window.taskCompletionData[patientId]) {
                window.taskCompletionData[patientId] = initializePatientTasks();
            }
            
            const progress = calculateProgress(patientId);
            const isComplete = progress === 100;
            
            html += `
                <div class="patient-timeline-card" id="${patientId}">
                    <div class="patient-header" onclick="toggleTimelineCard('${patientId}')">
                        <div>
                        <div class="patient-info">
                            <h3>${patientName}</h3>
                                <span class="patient-details">Age: ${patient['Age'] || 'N/A'} | City: ${patient['City'] || patient.city || 'N/A'} | Hospice: ${patient['Hospice'] || 'N/A'}</span>
                        </div>
                        <div class="patient-progress">
                                <span class="progress-text">${progress}% Complete</span>
                            <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                            </div>
                        </div>
                        <div class="patient-actions">
                            ${isComplete ? `<button class="archive-btn" onclick="event.stopPropagation(); archivePatient(${index})" title="Archive completed patient">📦 Archive</button>` : ''}
                            <div class="collapse-indicator">▼</div>
                        </div>
                    </div>
                    <div class="timeline-tasks">
                        ${generateImprovedTimelineSteps(patient, index)}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        content.innerHTML = html;
        
        // Add search functionality
        const searchInput = document.getElementById('patient-search');
        if (searchInput) {
            searchInput.addEventListener('input', filterPatients);
        }
        
        // Force refresh all task status colors after a short delay
        setTimeout(() => {
            refreshAllTaskStatuses();
        }, 100);
        
        setStatus('Timelines loaded', 'success');
    } catch (error) {
        console.error('Error loading timelines:', error);
        showError(`Failed to load timelines: ${error.message}`);
    }
}

// Simple search functionality
function filterPatients() {
    const searchTerm = document.getElementById('patient-search')?.value.toLowerCase() || '';
    const patientCards = document.querySelectorAll('.patient-timeline-card');
    
    patientCards.forEach(card => {
        const patientName = card.querySelector('.patient-info h3')?.textContent.toLowerCase() || '';
        
        if (patientName.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('patient-search');
    if (searchInput) {
        searchInput.value = '';
        filterPatients();
    }
}

// Export patient data to Excel
function exportPatientData() {
    try {
        const patients = JSON.parse(localStorage.getItem('activePatients') || '[]');
        
        if (patients.length === 0) {
            showNotification('No patient data to export', 'warning');
            return;
        }
        
        // Create export data structure
        const exportData = patients.map((patient, index) => {
            const patientId = patient.id || `patient-${patient['Patient Name']?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}-${Date.now()}`;
            const progress = calculateProgress(patientId);
            
            return {
                'Patient Name': patient['Patient Name'] || patient.patientName || 'Unknown',
                'Age': patient['Age'] || patient.age || 'N/A',
                'City': patient['City'] || patient.city || patient['Area'] || 'N/A',
                'Hospice': patient['Hospice'] || patient.hospice || 'N/A',
                'Phone Number': patient['Phone Number'] || patient.phone || 'N/A',
                'Email': patient['Email'] || patient.email || 'N/A',
                'Progress': `${progress}%`,
                'Status': progress === 100 ? 'Complete' : progress > 0 ? 'Partial' : 'Not Started',
                'Dose Level': patient.doseLevel || 'Regular',
                'Last Updated': new Date().toLocaleDateString()
            };
        });
        
        // Convert to CSV
        const headers = Object.keys(exportData[0]);
        const csvContent = [
            headers.join(','),
            ...exportData.map(row => headers.map(header => `"${row[header]}"`).join(','))
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `patient-data-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Patient data exported successfully!', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export data. Please try again.', 'error');
    }
}

// Archive a completed patient
function archivePatient(patientIndex) {
    try {
        const patients = JSON.parse(localStorage.getItem('activePatients') || '[]');
        const archivedPatients = JSON.parse(localStorage.getItem('archivedPatients') || '[]');
        
        if (patientIndex >= 0 && patientIndex < patients.length) {
            const patient = patients[patientIndex];
            const archivedDate = new Date().toLocaleDateString();
            
            // Add archive date to patient data
            patient.archivedDate = archivedDate;
            patient.archivedBy = 'System'; // Could be enhanced to track user
            
            // Move to archived
            archivedPatients.push(patient);
            patients.splice(patientIndex, 1);
            
            // Save both arrays
            localStorage.setItem('activePatients', JSON.stringify(patients));
            localStorage.setItem('archivedPatients', JSON.stringify(archivedPatients));
            
            // Remove task completion data for this patient
            const patientId = patients[patientIndex].id || `patient-${patients[patientIndex]['Patient Name']?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}-${Date.now()}`;
            if (window.taskCompletionData && window.taskCompletionData[patientId]) {
                delete window.taskCompletionData[patientId];
            }
            
            showNotification(`Patient ${patient['Patient Name'] || 'Unknown'} archived successfully!`, 'success');
            
            // Reload the timeline to reflect changes
            setTimeout(() => {
                loadPatientTimelines();
            }, 1000);
            
        } else {
            showNotification('Invalid patient index', 'error');
        }
        
    } catch (error) {
        console.error('Archive error:', error);
        showNotification('Failed to archive patient. Please try again.', 'error');
    }
}

// Load archived patients
function loadArchivedPatients() {
    try {
        const content = document.getElementById('content');
        const archivedPatients = JSON.parse(localStorage.getItem('archivedPatients') || '[]');
        
        if (archivedPatients.length === 0) {
            content.innerHTML = `
                <h1>📦 Archived Patients</h1>
                <div class="empty-state">
                    <p>No archived patients found.</p>
                    <p>Completed patients will appear here when archived.</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <h1>📦 Archived Patients</h1>
            <div class="archived-stats">
                <div class="stat-item">
                    <span class="stat-number">${archivedPatients.length}</span>
                    <span class="stat-label">Archived Patients</span>
                </div>
            </div>
            <div class="archived-patients-container">
        `;
        
        archivedPatients.forEach((patient, index) => {
            const patientName = patient['Patient Name'] || 'Unknown';
            const archivedDate = patient.archivedDate || 'Unknown';
            
            html += `
                <div class="archived-patient-card">
                    <div class="archived-patient-info">
                        <h3>${patientName}</h3>
                        <div class="archived-details">
                            <span>Age: ${patient['Age'] || 'N/A'}</span>
                            <span>City: ${patient['City'] || patient.city || 'N/A'}</span>
                            <span>Hospice: ${patient['Hospice'] || 'N/A'}</span>
                        </div>
                        <div class="archived-meta">
                            <span class="archived-date">Archived: ${archivedDate}</span>
                            <span class="dose-level">Dose: ${patient.doseLevel || 'Regular'}</span>
                        </div>
                    </div>
                    <div class="archived-actions">
                        <button class="restore-btn" onclick="restorePatient(${index})" title="Restore to active patients">↩️ Restore</button>
                        <button class="delete-btn" onclick="deleteArchivedPatient(${index})" title="Permanently delete">🗑️ Delete</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        content.innerHTML = html;
        
        setStatus('Archived patients loaded', 'success');
        
    } catch (error) {
        console.error('Error loading archived patients:', error);
        showNotification('Failed to load archived patients', 'error');
    }
}

// Restore a patient from archive
function restorePatient(archivedIndex) {
    try {
        const archivedPatients = JSON.parse(localStorage.getItem('archivedPatients') || '[]');
        const activePatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
        
        if (archivedIndex >= 0 && archivedIndex < archivedPatients.length) {
            const patient = archivedPatients[archivedIndex];
            
            // Remove archive metadata
            delete patient.archivedDate;
            delete patient.archivedBy;
            
            // Move back to active
            activePatients.push(patient);
            archivedPatients.splice(archivedIndex, 1);
            
            // Save both arrays
            localStorage.setItem('activePatients', JSON.stringify(activePatients));
            localStorage.setItem('archivedPatients', JSON.stringify(archivedPatients));
            
            showNotification(`Patient ${patient['Patient Name'] || 'Unknown'} restored to active patients!`, 'success');
            
            // Reload archived patients
            setTimeout(() => {
                loadArchivedPatients();
            }, 1000);
            
        } else {
            showNotification('Invalid patient index', 'error');
        }
        
    } catch (error) {
        console.error('Restore error:', error);
        showNotification('Failed to restore patient. Please try again.', 'error');
    }
}

// Delete an archived patient permanently
function deleteArchivedPatient(archivedIndex) {
    if (confirm('Are you sure you want to permanently delete this patient? This action cannot be undone.')) {
        try {
            const archivedPatients = JSON.parse(localStorage.getItem('archivedPatients') || '[]');
            
            if (archivedIndex >= 0 && archivedIndex < archivedPatients.length) {
                const patient = archivedPatients[archivedIndex];
                archivedPatients.splice(archivedIndex, 1);
                
                localStorage.setItem('archivedPatients', JSON.stringify(archivedPatients));
                
                showNotification(`Patient ${patient['Patient Name'] || 'Unknown'} permanently deleted!`, 'success');
                
                // Reload archived patients
                setTimeout(() => {
                    loadArchivedPatients();
                }, 1000);
                
            } else {
                showNotification('Invalid patient index', 'error');
            }
            
        } catch (error) {
            console.error('Delete error:', error);
            showNotification('Failed to delete patient. Please try again.', 'error');
        }
    }
}

// Generate individual patient sections for Active Patients tab
function generateActivePatientSections(patients) {
    if (!patients || patients.length === 0) {
        return '<p>No active patients found.</p>';
    }
    
    let html = '<div class="patient-sections-container">';
    
    patients.forEach((patient, index) => {
        const patientName = patient['Patient Name'] || patient.patientName || 'Unknown';
        const age = patient['Age'] || patient.age || 'N/A';
        const city = patient['City'] || patient.city || 'N/A';
        const hospice = patient['Hospice'] || patient.hospice || 'N/A';
        const phone = patient['Phone Number'] || patient.phone || 'N/A';
        const email = patient['Email'] || patient.email || 'N/A';
        const doseLevel = patient['Dose Level'] || patient.doseLevel || 'Regular';
        const dateSubmitted = patient['Date Submitted'] || patient.dateSubmittedFormatted || 'N/A';
        const cpDoctor = patient['CP Doctor'] || patient.cpDoctor || 'N/A';
        const invoiceAmount = patient['Invoice amount'] || patient.invoiceAmount || 'N/A';
        const paymentStatus = patient['PAID'] || patient.paymentStatus || 'Pending';
        
        html += `
            <div class="patient-section" id="patient-section-${index}">
                <div class="patient-section-header">
                    <h3>${patientName}</h3>
                    <div class="patient-section-actions">
                        <button class="btn-small" onclick="viewPatientTimeline(${index})">View Timeline</button>
                        <button class="btn-small" onclick="editPatient(${index})">Edit</button>
                    </div>
                </div>
                
                <div class="patient-section-content">
                    <div class="patient-info-grid">
                        <div class="info-group">
                            <h4>Basic Information</h4>
                            <div class="info-item">
                                <span class="info-label">Age:</span>
                                <span class="info-value">${age}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">City:</span>
                                <span class="info-value">${city}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Dose Level:</span>
                                <span class="info-value dose-${doseLevel.toLowerCase()}">${doseLevel}</span>
                            </div>
                        </div>
                        
                        <div class="info-group">
                            <h4>Contact Information</h4>
                            <div class="info-item">
                                <span class="info-label">Phone:</span>
                                <span class="info-value">${phone}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Email:</span>
                                <span class="info-value">${email}</span>
                            </div>
                        </div>
                        
                        <div class="info-group">
                            <h4>Medical Information</h4>
                            <div class="info-item">
                                <span class="info-label">Hospice:</span>
                                <span class="info-value">${hospice}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">CP Doctor:</span>
                                <span class="info-value">${cpDoctor}</span>
                            </div>
                        </div>
                        
                        <div class="info-group">
                            <h4>Administrative</h4>
                            <div class="info-item">
                                <span class="info-label">Date Submitted:</span>
                                <span class="info-value">${dateSubmitted}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Invoice Amount:</span>
                                <span class="info-value">$${invoiceAmount}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Payment Status:</span>
                                <span class="info-value status-${paymentStatus.toLowerCase()}">${paymentStatus}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Get most recently added patients
function getRecentPatients(patients, limit = 5) {
    return patients
        .filter(patient => patient.dateSubmitted || patient.dateSubmittedFormatted)
        .sort((a, b) => {
            const dateA = new Date(a.dateSubmitted || a.dateSubmittedFormatted || 0);
            const dateB = new Date(b.dateSubmitted || b.dateSubmittedFormatted || 0);
            return dateB - dateA; // Most recent first
        })
        .slice(0, limit);
}

// Generate recent patient cards for dashboard
function generateRecentPatientCards(patients) {
    if (!patients || patients.length === 0) {
        return '<p>No recently added patients found.</p>';
    }
    
    let html = '<div class="recent-patients-grid">';
    
    patients.forEach((patient, index) => {
        const patientName = patient['Patient Name'] || patient.patientName || 'Unknown';
        const age = patient['Age'] || patient.age || 'N/A';
        const city = patient['City'] || patient.city || 'N/A';
        const doseLevel = patient['Dose Level'] || patient.doseLevel || 'Regular';
        const dateSubmitted = patient['Date Submitted'] || patient.dateSubmittedFormatted || 'N/A';
        const hospice = patient['Hospice'] || patient.hospice || 'N/A';
        
        html += `
            <div class="recent-patient-card" onclick="viewPatientTimeline(${index})">
                <div class="recent-patient-header">
                    <h4>${patientName}</h4>
                    <span class="recent-patient-date">${dateSubmitted}</span>
                </div>
                <div class="recent-patient-details">
                    <div class="detail-item">
                        <span class="detail-label">Age:</span>
                        <span class="detail-value">${age}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">City:</span>
                        <span class="detail-value">${city}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Hospice:</span>
                        <span class="detail-value">${hospice}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Dose:</span>
                        <span class="detail-value dose-${doseLevel.toLowerCase()}">${doseLevel}</span>
                    </div>
                </div>
                <div class="recent-patient-actions">
                    <button class="btn-small" onclick="event.stopPropagation(); viewPatientTimeline(${index})">View Timeline</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Switch to section view
function switchToSectionView() {
    const patients = JSON.parse(localStorage.getItem('activePatients') || '[]');
    const content = document.getElementById('content');
    
    // Update button states
    document.querySelectorAll('.active-view-toggle button').forEach(btn => btn.classList.remove('btn-primary'));
    document.querySelectorAll('.active-view-toggle button').forEach(btn => btn.classList.add('btn-secondary'));
    event.target.classList.remove('btn-secondary');
    event.target.classList.add('btn-primary');
    
    content.innerHTML = `
        <div class="active-header">
            <h1>Active Patients (${patients.length})</h1>
            <div class="active-view-toggle">
                <button class="btn-secondary" onclick="switchToTableView()">Table</button>
                <button class="btn-secondary" onclick="switchToCardView()">Cards</button>
                <button class="btn-primary" onclick="switchToSectionView()">Sections</button>
            </div>
        </div>
        ${patients.length > 0 ? generateActivePatientSections(patients) : '<p>No active patients. Add a patient using the Patient Intake form.</p>'}
    `;
}

// Mark all tasks as complete for a specific patient
function markAllTasksComplete(patientName) {
    try {
        const patients = JSON.parse(localStorage.getItem('activePatients') || '[]');
        const patientIndex = patients.findIndex(p => 
            (p['Patient Name'] && p['Patient Name'].toLowerCase().includes(patientName.toLowerCase())) ||
            (p.patientName && p.patientName.toLowerCase().includes(patientName.toLowerCase()))
        );
        
        if (patientIndex === -1) {
            showNotification(`Patient "${patientName}" not found in active patients`, 'error');
            return;
        }
        
        const patientId = patients[patientIndex].id || `patient-${patients[patientIndex]['Patient Name']?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}-${Date.now()}`;
        
        // Initialize task completion data if not exists
        if (!window.taskCompletionData[patientId]) {
            window.taskCompletionData[patientId] = initializePatientTasks();
        }
        
        // Mark all tasks and subtasks as complete
        const tasks = window.taskCompletionData[patientId];
        tasks.forEach(task => {
            // Mark all subtasks as complete
            task.subtasks.forEach(subtask => {
                subtask.complete = true;
                
                // Mark all sub-subtasks as complete
                if (subtask.subSubtasks) {
                    subtask.subSubtasks.forEach(subSubtask => {
                        subSubtask.complete = true;
                    });
                }
            });
        });
        
        // Save the updated task completion data
        localStorage.setItem('taskCompletionData', JSON.stringify(window.taskCompletionData));
        
        showNotification(`All tasks marked as complete for ${patientName}!`, 'success');
        
        // Reload the timeline to show updated progress
        setTimeout(() => {
            loadPatientTimelines();
        }, 1000);
        
    } catch (error) {
        console.error('Error marking tasks complete:', error);
        showNotification('Failed to mark tasks as complete. Please try again.', 'error');
    }
}

// Initialize patient tasks with subtasks and sub-subtasks
function initializePatientTasks() {
    return [
        { 
            id: 'wr', 
            name: 'Send Adobe Forms', 
            subtasks: [
                { 
                    name: 'Written Request', 
                    complete: false,
                    subSubtasks: [
                        { name: 'Completed by Patient', complete: false }
                    ]
                },
                { name: 'Payment Schedule Form', complete: false }
            ]
        },
        { 
            id: 'invoice', 
            name: 'Quickbooks Invoice', 
            subtasks: [
                { name: 'Sent Invoice', complete: false },
                { 
                    name: 'Payment Received', 
                    complete: false,
                    subSubtasks: [
                        { name: 'Paid via Quickbooks', complete: false },
                        { name: 'Paid via Check', complete: false }
                    ]
                }
            ]
        },
        { 
            id: 'records', 
            name: 'Medical Records', 
            subtasks: [
                { 
                    name: 'Request Medical Records', 
                    complete: false,
                    subSubtasks: [
                        { name: 'Hospice/Doctor Name', type: 'input', value: '', complete: false },
                        { name: 'Request Method (Email/Doximity)', type: 'input', value: '', complete: false }
                    ]
                },
                { name: 'Medical Records Received', complete: false }
            ]
        },
        { 
            id: 'visit1', 
            name: 'Visit 1', 
            subtasks: [
                { 
                    name: 'Scheduled', 
                    complete: false,
                    subSubtasks: [
                        { name: 'Visit 1 Date', type: 'input', value: '', complete: false }
                    ]
                },
                { name: 'Complete', complete: false }
            ]
        },
        { 
            id: 'visit2', 
            name: 'Visit 2', 
            subtasks: [
                { 
                    name: 'Scheduled', 
                    complete: false,
                    subSubtasks: [
                        { name: 'Visit 2 Date', type: 'input', value: '', complete: false }
                    ]
                },
                { name: 'Complete', complete: false }
            ]
        },
        { 
            id: 'attending', 
            name: 'Attending Form', 
            subtasks: [
                { name: 'Started', complete: false },
                { name: 'Complete', complete: false },
                { name: 'In Emails Drafts', complete: false }
            ]
        },
        { 
            id: 'consulting', 
            name: 'Consulting Form', 
            subtasks: [
                { 
                    name: 'Received', 
                    complete: false,
                    subSubtasks: [
                        { name: 'CP Name', type: 'input', value: '', complete: false }
                    ]
                }
            ]
        },
        { 
            id: 'rxnt', 
            name: 'RXNT', 
            subtasks: [
                { name: 'Patient Information Inputted', complete: false },
                { 
                    name: 'Prescription', 
                    complete: false,
                    subSubtasks: [
                        { name: 'Pending', complete: false },
                        { name: 'Sent', complete: false }
                    ],
                    note: 'Dose Type: ${patient.doseLevel || "Not specified"}'
                }
            ]
        },
        { 
            id: 'pharmacy', 
            name: 'Pharmacy Coordination', 
            subtasks: [
                { name: 'Email Drafted', complete: false },
                { name: 'Email Sent', complete: false }
            ]
        },
        { 
            id: 'ingestion', 
            name: 'Ingestion', 
            subtasks: [
                { name: 'Ingestion Date', complete: false, subSubtasks: [{ name: 'Date', complete: false, type: 'input' }] },
                { name: 'Medication Received by Patient', complete: false },
                { name: 'Medication Taken by Patient', complete: false }
            ]
        },
        { 
            id: 'followup', 
            name: 'Follow up Form', 
            subtasks: [
                { name: 'Completed', complete: false },
                { name: 'Sent to EOLOA', complete: false }
            ]
        }
    ];
}

// Helper to generate improved timeline steps
function generateImprovedTimelineSteps(patient, index) {
    const patientId = patient.id || `patient-${patient['Patient Name']?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}-${Date.now()}`;
    const tasks = window.taskCompletionData[patientId] || initializePatientTasks();
    
    
    let html = '<div class="task-list">';
    
    tasks.forEach((task, taskIndex) => {
        let completedSubtasks, totalSubtasks, statusClass, statusText;
        
        // Special logic for Quickbooks Invoice task
        if (task.id === 'invoice') {
            const sentInvoice = task.subtasks.find(s => s.name === 'Sent Invoice')?.complete || false;
            const paidInvoice = task.subtasks.find(s => s.name === 'Paid Invoice')?.complete || false;
            const paidViaCheck = task.subtasks.find(s => s.name === 'Paid via Check')?.complete || false;
            
            totalSubtasks = task.subtasks.length;
            
            // Task is complete if: Sent Invoice + (Paid Invoice OR Paid via Check)
            if (sentInvoice && (paidInvoice || paidViaCheck)) {
                completedSubtasks = totalSubtasks;
                statusClass = 'complete';
                statusText = 'Complete';
            } else if (sentInvoice) {
                completedSubtasks = 1;
                statusClass = 'partial';
                statusText = 'Partially Complete';
            } else {
                completedSubtasks = 0;
                statusClass = 'not-started';
                statusText = 'Not Started';
            }
        } else {
            // Standard logic for other tasks
            completedSubtasks = task.subtasks.filter(s => s.complete).length;
            totalSubtasks = task.subtasks.length;
            
            if (completedSubtasks === 0) {
                statusClass = 'not-started';
                statusText = 'Not Started';
            } else if (completedSubtasks === totalSubtasks) {
                statusClass = 'complete';
                statusText = 'Complete';
            } else {
                statusClass = 'partial';
                statusText = `${completedSubtasks}/${totalSubtasks} Complete`;
            }
        }
        
        console.log(`Initial task ${taskIndex} status: ${statusClass} (${completedSubtasks}/${totalSubtasks})`);
        
        html += `
            <div class="task-item ${statusClass}" data-task-index="${taskIndex}">
                <div class="task-header" onclick="toggleTaskDetails('${patientId}', ${taskIndex})">
                    <div class="task-number ${statusClass}">${taskIndex + 1}</div>
                    <div class="task-info">
                        <div class="task-name">${task.name}</div>
                        <div class="task-status">${statusText}</div>
                    </div>
                    <div class="task-expand">▼</div>
                </div>
                <div class="task-subtasks" id="subtasks-${patientId}-${taskIndex}" style="display: none;">
                    ${generateSubtasks(task, patientId, taskIndex)}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Generate subtasks HTML
function generateSubtasks(task, patientId, taskIndex) {
    // Get patient data for dynamic notes
    const patient = window.patientsData?.[patientId] || {};
    let html = '<ul class="subtask-list">';
    
    // Special handling for Quickbooks Invoice task to add "or" between payment options
    if (task.id === 'invoice') {
    task.subtasks.forEach((subtask, subIndex) => {
        html += `
            <li class="subtask-item">
                <input type="checkbox" 
                    id="subtask-${patientId}-${taskIndex}-${subIndex}"
                    ${subtask.complete ? 'checked' : ''}
                        onchange="toggleSubtask('${patientId}', ${taskIndex}, ${subIndex})">
                <label for="subtask-${patientId}-${taskIndex}-${subIndex}">${subtask.name}</label>
            </li>
        `;
            
            // Add sub-subtasks if they exist (like payment options under "Payment Received")
            if (subtask.subSubtasks && subtask.subSubtasks.length > 0) {
                html += '<ul class="sub-subtask-list">';
                subtask.subSubtasks.forEach((subSubtask, subSubIndex) => {
                    html += `
                        <li class="sub-subtask-item">
                            <input type="checkbox" 
                                id="sub-subtask-${patientId}-${taskIndex}-${subIndex}-${subSubIndex}"
                                ${subSubtask.complete ? 'checked' : ''}
                                onchange="toggleSubSubtask('${patientId}', ${taskIndex}, ${subIndex}, ${subSubIndex})">
                            <label for="sub-subtask-${patientId}-${taskIndex}-${subIndex}-${subSubIndex}">${subSubtask.name}</label>
                        </li>
                    `;
                    
                    // Add "or" separator between "Paid via Quickbooks" and "Paid via Check"
                    if (subSubtask.name === 'Paid via Quickbooks') {
                        html += '<li class="subtask-separator">or</li>';
                    }
                });
                html += '</ul>';
            }
        });
    } else {
        // Standard handling for other tasks
        task.subtasks.forEach((subtask, subIndex) => {
            html += `
                <li class="subtask-item">
                    <input type="checkbox" 
                        id="subtask-${patientId}-${taskIndex}-${subIndex}"
                        ${subtask.complete ? 'checked' : ''}
                        onchange="toggleSubtask('${patientId}', ${taskIndex}, ${subIndex})">
                    <label for="subtask-${patientId}-${taskIndex}-${subIndex}">${subtask.name}</label>
                </li>
            `;
            
            // Add sub-subtasks if they exist (like "Completed by Patient" under "Written Request")
            if (subtask.subSubtasks && subtask.subSubtasks.length > 0) {
                html += '<ul class="sub-subtask-list">';
                subtask.subSubtasks.forEach((subSubtask, subSubIndex) => {
                    if (subSubtask.type === 'input') {
                        // Input field sub-subtask
                        html += `
                            <li class="sub-subtask-item input-subtask">
                                <label for="sub-subtask-${patientId}-${taskIndex}-${subIndex}-${subSubIndex}">${subSubtask.name}:</label>
                                <input type="text" 
                                    id="sub-subtask-${patientId}-${taskIndex}-${subIndex}-${subSubIndex}"
                                    value="${subSubtask.value || ''}"
                                    placeholder="Type here..."
                                    onchange="updateSubSubtaskInput('${patientId}', ${taskIndex}, ${subIndex}, ${subSubIndex}, this.value)"
                                    onblur="updateSubSubtaskInput('${patientId}', ${taskIndex}, ${subIndex}, ${subSubIndex}, this.value)">
                            </li>
                        `;
                    } else {
                        // Regular checkbox sub-subtask
                        html += `
                            <li class="sub-subtask-item">
                                <input type="checkbox" 
                                    id="sub-subtask-${patientId}-${taskIndex}-${subIndex}-${subSubIndex}"
                                    ${subSubtask.complete ? 'checked' : ''}
                                    onchange="toggleSubSubtask('${patientId}', ${taskIndex}, ${subIndex}, ${subSubIndex})">
                                <label for="sub-subtask-${patientId}-${taskIndex}-${subIndex}-${subSubIndex}">${subSubtask.name}</label>

                            </li>
                        `;
                    }
                });
                html += '</ul>';
            }
            
            // Add note if it exists (like dose type information)
            if (subtask.note) {
                // Evaluate template strings in notes (like ${patient.doseLevel})
                const evaluatedNote = subtask.note.replace(/\${([^}]+)}/g, (match, path) => {
                    const value = path.split('.').reduce((obj, key) => obj?.[key], patient);
                    return value || 'Not specified';
                });
                html += `<div class="task-note">${evaluatedNote}</div>`;
            }
        });
    }
    
    html += '</ul>';
    return html;
}

// Calculate overall progress for a patient (including sub-subtasks)
function calculateProgress(patientId) {
    const tasks = window.taskCompletionData[patientId];
    if (!tasks) return 0;
    
    let totalItems = 0;
    let completedItems = 0;
    
    tasks.forEach(task => {
        // Special logic for Quickbooks Invoice task
        if (task.id === 'invoice') {
            const sentInvoice = task.subtasks.find(s => s.name === 'Sent Invoice')?.complete || false;
            const paymentReceived = task.subtasks.find(s => s.name === 'Payment Received');
            const paidViaQuickbooks = paymentReceived?.subSubtasks?.find(s => s.name === 'Paid via Quickbooks')?.complete || false;
            const paidViaCheck = paymentReceived?.subSubtasks?.find(s => s.name === 'Paid via Check')?.complete || false;
            
            // Count subtasks for total
            totalItems += task.subtasks.length;
            
            // Count completed items with special logic
            if (sentInvoice) {
                completedItems++; // Sent Invoice counts
                if (paidViaQuickbooks || paidViaCheck) {
                    completedItems++; // Either payment method counts
                }
            }
        } else {
            // Standard logic for other tasks
            task.subtasks.forEach(subtask => {
                totalItems++;
                
                // Check if subtask is complete (including sub-subtasks)
                if (subtask.subSubtasks && subtask.subSubtasks.length > 0) {
                    // For subtasks with sub-subtasks, check if all sub-subtasks are complete
                    let allSubSubtasksComplete = true;
                    subtask.subSubtasks.forEach(subSubtask => {
                        if (!subSubtask.complete) {
                            allSubSubtasksComplete = false;
                        }
                    });
                    if (allSubSubtasksComplete) {
                        completedItems++;
                    }
                } else {
                    // For regular subtasks without sub-subtasks
                    if (subtask.complete) completedItems++;
                }
            });
        }
    });
    
    // Ensure we return a valid percentage
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    // Debug logging to help troubleshoot
    console.log(`Progress calculation for ${patientId}:`, {
        completedItems,
        totalItems,
        percentage,
        tasks: tasks.map(t => ({
            name: t.name,
            subtasks: t.subtasks.map(s => ({
                name: s.name,
                complete: s.complete,
                subSubtasks: s.subSubtasks?.map(ss => ({
                    name: ss.name,
                    complete: ss.complete
                }))
            }))
        }))
    });
    
    return percentage;
}

// Toggle task details visibility
function toggleTaskDetails(patientId, taskIndex) {
    const subtasksDiv = document.getElementById(`subtasks-${patientId}-${taskIndex}`);
    const taskItem = subtasksDiv.parentElement;
    const expandIcon = taskItem.querySelector('.task-expand');
    
    if (subtasksDiv.style.display === 'none') {
        subtasksDiv.style.display = 'block';
        expandIcon.textContent = '▲';
        taskItem.classList.add('expanded');
    } else {
        subtasksDiv.style.display = 'none';
        expandIcon.textContent = '▼';
        taskItem.classList.remove('expanded');
    }
}

// Toggle subtask completion status
function toggleSubtask(patientId, taskIndex, subtaskIndex) {
    const task = window.taskCompletionData[patientId][taskIndex];
    
    // Toggle subtask
    const checked = !task.subtasks[subtaskIndex].complete;
    task.subtasks[subtaskIndex].complete = checked;
    
    // Recalculate task completion status with special logic for Quickbooks Invoice
    let completedSubtasks = 0;
    let totalSubtasks = 0;
    
    if (task.id === 'invoice') {
        // Special logic for Quickbooks Invoice
        const sentInvoice = task.subtasks.find(s => s.name === 'Sent Invoice')?.complete || false;
        const paymentReceived = task.subtasks.find(s => s.name === 'Payment Received');
        const paidViaQuickbooks = paymentReceived?.subSubtasks?.find(s => s.name === 'Paid via Quickbooks')?.complete || false;
        const paidViaCheck = paymentReceived?.subSubtasks?.find(s => s.name === 'Paid via Check')?.complete || false;
        
        totalSubtasks = task.subtasks.length;
        
        // Task is complete if: Sent Invoice + (Paid via Quickbooks OR Paid via Check)
        if (sentInvoice && (paidViaQuickbooks || paidViaCheck)) {
            completedSubtasks = totalSubtasks; // Mark as fully complete
        } else if (sentInvoice) {
            completedSubtasks = 1; // Partially complete
        } else {
            completedSubtasks = 0; // Not started
        }
    } else {
        // Standard logic for other tasks
        task.subtasks.forEach(subtask => {
            totalSubtasks++;
            
            // Check if subtask is complete (including sub-subtasks)
            if (subtask.subSubtasks && subtask.subSubtasks.length > 0) {
                // For subtasks with sub-subtasks, check if all sub-subtasks are complete
                let allSubSubtasksComplete = true;
                subtask.subSubtasks.forEach(subSubtask => {
                    if (!subSubtask.complete) {
                        allSubSubtasksComplete = false;
                    }
                });
                if (allSubSubtasksComplete) {
                    completedSubtasks++;
                }
            } else {
                // For regular subtasks without sub-subtasks
                if (subtask.complete) completedSubtasks++;
            }
        });
    }
    
    // Update task header visual status
    const taskItem = document.querySelector(`#${patientId} .task-item[data-task-index="${taskIndex}"]`);
    const taskNumber = taskItem.querySelector('.task-number');
    const taskStatus = taskItem.querySelector('.task-status');
    
    // Remove old status classes
    taskItem.classList.remove('not-started', 'partial', 'complete');
    taskNumber.classList.remove('not-started', 'partial', 'complete');
    
    // Determine new status
    let statusClass, statusText;
    if (completedSubtasks === 0) {
        statusClass = 'not-started';
        statusText = 'Not Started';
    } else if (completedSubtasks === totalSubtasks) {
        statusClass = 'complete';
        statusText = 'Complete';
    } else {
        statusClass = 'partial';
        statusText = 'Partially Complete';
    }
    
    taskItem.classList.add(statusClass);
    taskNumber.classList.add(statusClass);
    taskStatus.textContent = statusText;
    
    console.log(`Updated task ${taskIndex} status to: ${statusClass} (${completedSubtasks}/${totalSubtasks})`);
    console.log(`Task item classes:`, taskItem.className);
    console.log(`Task number classes:`, taskNumber.className);
    
    // Update overall progress
    const progressText = document.querySelector(`#${patientId} .progress-text`);
    const progressFill = document.querySelector(`#${patientId} .progress-fill`);
    const progress = calculateProgress(patientId);
    progressText.textContent = `${progress}% Complete`;
    progressFill.style.width = `${progress}%`;
    
    // Save to localStorage
    localStorage.setItem('taskCompletionData', JSON.stringify(window.taskCompletionData));
    console.log('Task completion data saved to localStorage in toggleSubtask');
    
    // Auto-archive if 100% complete
    if (progress === 100) {
        setTimeout(() => {
            autoArchivePatient(patientId);
        }, 1000); // Small delay to show the 100% completion briefly
    }
}

// Toggle sub-subtask completion status
function toggleSubSubtask(patientId, taskIndex, subtaskIndex, subSubtaskIndex) {
    const task = window.taskCompletionData[patientId][taskIndex];
    const subtask = task.subtasks[subtaskIndex];
    
    // Toggle sub-subtask
    const checked = !subtask.subSubtasks[subSubtaskIndex].complete;
    subtask.subSubtasks[subSubtaskIndex].complete = checked;
    
    // Recalculate subtask completion status
    let completedSubSubtasks = 0;
    let totalSubSubtasks = subtask.subSubtasks.length;
    
    subtask.subSubtasks.forEach(subSubtask => {
        if (subSubtask.complete) completedSubSubtasks++;
    });
    
    // Update subtask completion based on sub-subtasks
    if (completedSubSubtasks === totalSubSubtasks) {
        subtask.complete = true;
    } else if (completedSubSubtasks > 0) {
        subtask.complete = false; // Partially complete
    } else {
        subtask.complete = false; // Not started
    }
    
    // Recalculate overall task completion
    let completedSubtasks = 0;
    let totalSubtasks = 0;
    
    if (task.id === 'invoice') {
        // Special logic for Quickbooks Invoice
        const sentInvoice = task.subtasks.find(s => s.name === 'Sent Invoice')?.complete || false;
        const paymentReceived = task.subtasks.find(s => s.name === 'Payment Received');
        const paidViaQuickbooks = paymentReceived?.subSubtasks?.find(s => s.name === 'Paid via Quickbooks')?.complete || false;
        const paidViaCheck = paymentReceived?.subSubtasks?.find(s => s.name === 'Paid via Check')?.complete || false;
        
        totalSubtasks = task.subtasks.length;
        
        // Task is complete if: Sent Invoice + (Paid via Quickbooks OR Paid via Check)
        if (sentInvoice && (paidViaQuickbooks || paidViaCheck)) {
            completedSubtasks = totalSubtasks; // Mark as fully complete
        } else if (sentInvoice) {
            completedSubtasks = 1; // Partially complete
        } else {
            completedSubtasks = 0; // Not started
        }
    } else {
        // Standard logic for other tasks
        task.subtasks.forEach(subtask => {
            totalSubtasks++;
            if (subtask.complete) completedSubtasks++;
        });
    }
    
    // Update task header visual status
    const taskItem = document.querySelector(`#${patientId} .task-item[data-task-index="${taskIndex}"]`);
    const taskNumber = taskItem.querySelector('.task-number');
    const taskStatus = taskItem.querySelector('.task-status');
    
    // Remove old status classes
    taskItem.classList.remove('not-started', 'partial', 'complete');
    taskNumber.classList.remove('not-started', 'partial', 'complete');
    
    // Determine new status
    let statusClass, statusText;
    if (completedSubtasks === 0) {
        statusClass = 'not-started';
        statusText = 'Not Started';
    } else if (completedSubtasks === totalSubtasks) {
        statusClass = 'complete';
        statusText = 'Complete';
    } else {
        statusClass = 'partial';
        statusText = 'Partially Complete';
    }
    
    taskItem.classList.add(statusClass);
    taskNumber.classList.add(statusClass);
    taskStatus.textContent = statusText;
    
    console.log(`Updated task ${taskIndex} status to: ${statusClass} (${completedSubtasks}/${totalSubtasks})`);
    console.log(`Task item classes:`, taskItem.className);
    console.log(`Task number classes:`, taskNumber.className);
    
    // Update overall progress
    const progressText = document.querySelector(`#${patientId} .progress-text`);
    const progressFill = document.querySelector(`#${patientId} .progress-fill`);
    const progress = calculateProgress(patientId);
    progressText.textContent = `${progress}% Complete`;
    progressFill.style.width = `${progress}%`;
    
    // Save to localStorage
    localStorage.setItem('taskCompletionData', JSON.stringify(window.taskCompletionData));
    console.log('Task completion data saved to localStorage in toggleSubSubtask');
    
    // Auto-archive if 100% complete
    if (progress === 100) {
        setTimeout(() => {
            autoArchivePatient(patientId);
        }, 1000); // Small delay to show the 100% completion briefly
    }
}

// Update sub-subtask input value
function updateSubSubtaskInput(patientId, taskIndex, subtaskIndex, subSubtaskIndex, value) {
    const task = window.taskCompletionData[patientId][taskIndex];
    const subtask = task.subtasks[subtaskIndex];
    
    // Update the input value
    subtask.subSubtasks[subSubtaskIndex].value = value;
    
    // Mark as complete if there's a value, incomplete if empty
    subtask.subSubtasks[subSubtaskIndex].complete = value.trim().length > 0;
    
    // Recalculate subtask completion status
    let completedSubSubtasks = 0;
    let totalSubSubtasks = subtask.subSubtasks.length;
    
    subtask.subSubtasks.forEach(subSubtask => {
        if (subSubtask.complete) completedSubSubtasks++;
    });
    
    // Update subtask completion based on sub-subtasks
    if (completedSubSubtasks === totalSubSubtasks) {
        subtask.complete = true;
    } else if (completedSubSubtasks > 0) {
        subtask.complete = false; // Partially complete
    } else {
        subtask.complete = false; // Not started
    }
    
    // Recalculate overall task completion
    let completedSubtasks = 0;
    let totalSubtasks = 0;
    
    if (task.id === 'invoice') {
        // Special logic for Quickbooks Invoice
        const sentInvoice = task.subtasks.find(s => s.name === 'Sent Invoice')?.complete || false;
        const paymentReceived = task.subtasks.find(s => s.name === 'Payment Received');
        const paidViaQuickbooks = paymentReceived?.subSubtasks?.find(s => s.name === 'Paid via Quickbooks')?.complete || false;
        const paidViaCheck = paymentReceived?.subSubtasks?.find(s => s.name === 'Paid via Check')?.complete || false;
        
        totalSubtasks = task.subtasks.length;
        
        // Task is complete if: Sent Invoice + (Paid via Quickbooks OR Paid via Check)
        if (sentInvoice && (paidViaQuickbooks || paidViaCheck)) {
            completedSubtasks = totalSubtasks; // Mark as fully complete
        } else if (sentInvoice) {
            completedSubtasks = 1; // Partially complete
        } else {
            completedSubtasks = 0; // Not started
        }
    } else {
        // Standard logic for other tasks
        task.subtasks.forEach(subtask => {
            totalSubtasks++;
            if (subtask.complete) completedSubtasks++;
        });
    }
    
    // Update task header visual status
    const taskItem = document.querySelector(`#${patientId} .task-item[data-task-index="${taskIndex}"]`);
    const taskNumber = taskItem.querySelector('.task-number');
    const taskStatus = taskItem.querySelector('.task-status');
    
    // Remove old status classes
    taskItem.classList.remove('not-started', 'partial', 'complete');
    taskNumber.classList.remove('not-started', 'partial', 'complete');
    
    // Determine new status
    let statusClass, statusText;
    if (completedSubtasks === 0) {
        statusClass = 'not-started';
        statusText = 'Not Started';
    } else if (completedSubtasks === totalSubtasks) {
        statusClass = 'complete';
        statusText = 'Complete';
    } else {
        statusClass = 'partial';
        statusText = 'Partially Complete';
    }
    
    taskItem.classList.add(statusClass);
    taskNumber.classList.add(statusClass);
    taskStatus.textContent = statusText;
    
    console.log(`Updated task ${taskIndex} status to: ${statusClass} (${completedSubtasks}/${totalSubtasks})`);
    console.log(`Task item classes:`, taskItem.className);
    console.log(`Task number classes:`, taskNumber.className);
    
    // Update overall progress
    const progressText = document.querySelector(`#${patientId} .progress-text`);
    const progressFill = document.querySelector(`#${patientId} .progress-fill`);
    const progress = calculateProgress(patientId);
    progressText.textContent = `${progress}% Complete`;
    progressFill.style.width = `${progress}%`;
    
    // Save to localStorage
    localStorage.setItem('taskCompletionData', JSON.stringify(window.taskCompletionData));
    console.log('Task completion data saved to localStorage in updateSubSubtaskInput');
    
    // Auto-archive if 100% complete
    if (progress === 100) {
        setTimeout(() => {
            autoArchivePatient(patientId);
        }, 1000); // Small delay to show the 100% completion briefly
    }
}

// Toggle individual timeline card
function toggleTimelineCard(patientId) {
    const card = document.getElementById(patientId);
    const indicator = card.querySelector('.collapse-indicator');
    
    if (card.classList.contains('collapsed')) {
        card.classList.remove('collapsed');
        indicator.style.transform = 'none';
    } else {
        card.classList.add('collapsed');
    }
}

// Expand all patient timeline cards
function expandAllPatientTimelines() {
    const cards = document.querySelectorAll('.patient-timeline-card');
    cards.forEach(card => {
        card.classList.remove('collapsed');
        const indicator = card.querySelector('.collapse-indicator');
        if (indicator) indicator.style.transform = 'none';
        
        // Update collapse state
        const patientId = card.id;
        if (window.timelineCollapseState) {
            window.timelineCollapseState[patientId] = false;
        }
    });
}

// Collapse all patient timeline cards
function collapseAllPatientTimelines() {
    const cards = document.querySelectorAll('.patient-timeline-card');
    cards.forEach(card => {
        card.classList.add('collapsed');
        const indicator = card.querySelector('.collapse-indicator');
        if (indicator) indicator.style.transform = 'rotate(-90deg)';
        
        // Update collapse state
        const patientId = card.id;
        if (window.timelineCollapseState) {
            window.timelineCollapseState[patientId] = true;
        }
    });
}

// Expand all task subtasks within timelines
function expandAllTimelines() {
    // Expand all patient timeline cards
    expandAllPatientTimelines();
    
    // Also expand all task subtasks
    document.querySelectorAll('.task-subtasks').forEach(subtasks => {
        subtasks.style.display = 'block';
        subtasks.parentElement.classList.add('expanded');
        subtasks.parentElement.querySelector('.task-expand').textContent = '▲';
    });
}

// Collapse all task subtasks within timelines
function collapseAllTimelines() {
    // Collapse all patient timeline cards
    collapseAllPatientTimelines();
    
    // Also collapse all task subtasks
    document.querySelectorAll('.task-subtasks').forEach(subtasks => {
        subtasks.style.display = 'none';
        subtasks.parentElement.classList.remove('expanded');
        subtasks.parentElement.querySelector('.task-expand').textContent = '▼';
    });
}



// Navigate to a specific patient's timeline from other tabs
function navigateToPatientTimeline(patientName, patientIndex) {
    // Switch to timelines tab
    switchTab('timelines');
    
    // Wait for DOM to update then scroll to patient
    setTimeout(() => {
        const patientId = `patient-${patientIndex}`;
        const card = document.getElementById(patientId);
        if (card) {
            // Expand the card if collapsed
            card.classList.remove('collapsed');
            const indicator = card.querySelector('.collapse-indicator');
            if (indicator) indicator.style.transform = 'none';
            
            // Scroll to the card
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight briefly
            card.style.boxShadow = '0 0 20px rgba(79, 195, 247, 0.8)';
            setTimeout(() => {
                card.style.boxShadow = '';
            }, 2000);
        }
    }, 300);
}

// Filter timelines
function filterTimelines(filter) {
    const cards = document.querySelectorAll('.patient-timeline-card');
    cards.forEach(card => {
        if (filter === 'all') {
            card.style.display = 'block';
        } else if (filter === 'incomplete') {
            // Check if this patient has any incomplete tasks (yellow or red)
            const hasIncompleteTasks = hasIncompleteTasksForPatient(card.id);
            card.style.display = hasIncompleteTasks ? 'block' : 'none';
        }
    });
}

// Check if a patient has any incomplete tasks (yellow or red status)
function hasIncompleteTasksForPatient(patientId) {
    const tasks = window.taskCompletionData[patientId];
    if (!tasks) return false;
    
    // Check each task for incomplete status
    for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
        const task = tasks[taskIndex];
        const taskItem = document.querySelector(`#${patientId} .task-item[data-task-index="${taskIndex}"]`);
        
        if (taskItem) {
            // Check if task has yellow (partial) or red (not-started) status
            if (taskItem.classList.contains('partial') || taskItem.classList.contains('not-started')) {
                return true; // Found an incomplete task
            }
        }
    }
    
    return false; // All tasks are complete (green)
}

// Toggle subtasks or details
function toggleStepDetails(patientIndex, stepIndex) {
    const stepElement = document.querySelectorAll('.timeline')[patientIndex].querySelectorAll('.timeline-step')[stepIndex];
    const subtasks = stepElement.querySelector('.subtasks');
    if (subtasks) {
        subtasks.style.display = subtasks.style.display === 'none' ? 'block' : 'none';
    } else {
        const patientName = currentData.active[patientIndex]['Patient Name'];
        const stepName = steps[stepIndex].name; // Assume steps array is accessible or define it
        showModal(`Details for ${patientName} - ${stepName}`, patientIndex, stepIndex);
    }
}

// Simple modal function
function showModal(message, patientIndex, stepIndex) {
    const fakeNotes = [
        'Follow up on patient consent form.',
        'Waiting for medical records from hospice.',
        'Invoice sent - awaiting payment confirmation.',
        'Prescription details verified.',
        'Visit scheduled for next week.'
    ];
    const fakeAttachments = [
        'consent_form.pdf',
        'medical_records.zip',
        'invoice_123.png',
        'rx_details.doc'
    ];
    
    // Randomize for variety
    const randomNote = fakeNotes[Math.floor(Math.random() * fakeNotes.length)];
    const randomAttachment = Math.random() < 0.5 ? fakeAttachments[Math.floor(Math.random() * fakeAttachments.length)] : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    let content = `
        <div class=\"modal-content\">
            <span class=\"close\" onclick=\"this.parentElement.parentElement.remove()\">&times;</span>
            <h3>${message}</h3>
            <p><strong>Note:</strong> ${randomNote}</p>
    `;
    if (randomAttachment) {
        content += `<p><strong>Attachment:</strong> <a href=\"#\" class=\"fake-link\">${randomAttachment}</a></p>`;
    }
    content += '</div>';
    modal.innerHTML = content;
    document.body.appendChild(modal);
}

// Placeholder update functions
function updateStepStatus(patientIndex, stepIndex, checked) {
    console.log(`Updated step ${stepIndex + 1} for patient ${patientIndex} to ${checked ? 'complete' : 'pending'}`);
    // TODO: Save to data
}

function updateSubtask(patientIndex, stepIndex, subIndex, checked) {
    console.log(`Updated subtask ${subIndex + 1} for step ${stepIndex + 1}, patient ${patientIndex}`);
    // TODO: Save to data
} 

// Add dark mode toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
}

// Initialize dark mode on load
window.addEventListener('load', () => {
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }
});

/**
 * Load call log data
 */
function loadCallLog() {
    showPlaceholder('Call Log', 'Call log functionality coming soon...');
}

/**
 * Load chat data and display in UI
 */
async function loadChat(currentUser = null) {
    try {
        showLoading();
        
        // Fetch chat data from the API
        const url = currentUser 
            ? `/api/read-chat?spreadsheetId=local&user=${encodeURIComponent(currentUser)}`
            : '/api/read-chat?spreadsheetId=local';
            
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch chat data');
        }
        
        const messages = await response.json();
        displayChat(messages, currentUser);
        
    } catch (error) {
        console.error('Error loading chat:', error);
        showError('Failed to load chat messages');
    }
}

/**
 * Display chat messages in the UI
 */
function displayChat(messages, currentUser = null) {
    const content = document.getElementById('content');
    
    // User roster and colors (lightweight, no extra deps)
    const CHAT_USERS = [
        { name: 'Alyssa', key: 'alyssa', color: '#6f86ff' },
        { name: 'Dr. Moore', key: 'dr-moore', color: '#ff8c6f' },
        { name: 'Christa', key: 'christa', color: '#28a745' },
        { name: 'Amber', key: 'amber', color: '#d19a66' },
        { name: 'Donnie', key: 'donnie', color: '#a970ff' }
    ];
    window.__CHAT_USERS__ = CHAT_USERS;
    
    // Helper for saved recipients per sender
    function getSavedRecipients(sender) {
        try {
            const raw = localStorage.getItem(`chatRecipients:${sender}`) || '[]';
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch { return []; }
    }
    function saveRecipients(sender, recipients) {
        localStorage.setItem(`chatRecipients:${sender}`, JSON.stringify(recipients));
    }
    
    const chatHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <h2>💬 Team Chat - ${currentUser || 'All Messages'} View</h2>
                <p>Internal mail system with DM/Group messages and @mentions</p>
                <div class="chat-controls">
                    <select id="user-perspective-select" onchange="switchUserPerspective(this.value)" class="user-perspective-select">
                        <option value="Alyssa" ${currentUser === 'Alyssa' ? 'selected' : ''}>👩‍💼 Alyssa's View</option>
                        <option value="Dr. Moore" ${currentUser === 'Dr. Moore' ? 'selected' : ''}>👨‍⚕️ Dr. Moore's View</option>
                        <option value="Christa" ${currentUser === 'Christa' ? 'selected' : ''}>👩‍⚕️ Christa's View</option>
                        <option value="Amber" ${currentUser === 'Amber' ? 'selected' : ''}>👩‍💼 Amber's View</option>
                        <option value="" ${!currentUser ? 'selected' : ''}>👥 All Messages</option>
                    </select>
                </div>
                <div class="chat-stats">
                    <span class="stat">${messages.length} messages</span>
                    <span class="stat">${new Set(messages.map(m => m.Sender)).size} team members</span>
                    <span class="stat">${currentUser ? `${currentUser}'s Inbox` : 'All Messages'}</span>
                </div>
            </div>
            
            <div class="chat-messages" id="chat-messages">
                ${messages.map(message => createChatMessageHTML(message)).join('')}
            </div>
            
            <div class="chat-input-container">
                <div class="chat-input-wrapper">
                    <select id="chat-user-select" class="chat-user-select">
                        ${CHAT_USERS.map(u => `<option value="${u.name}" ${currentUser===u.name?'selected':''}>${u.name}</option>`).join('')}
                    </select>
                    <select id="chat-type-select" class="chat-type-select">
                        <option value="GM">Group Message (GM)</option>
                        <option value="DM">Direct Message (DM)</option>
                        <option value="NOTE">Personal Note (NOTE)</option>
                    </select>
                    <div class="chat-recipients">
                        <div id="recipient-chips" class="chips"></div>
                        <button type="button" class="recipients-btn" onclick="toggleRecipientsPanel()">Recipients ▾</button>
                        <div id="recipients-panel" class="recipients-panel" style="display:none;">
                            ${CHAT_USERS.map(u => `
                                <label class="recipient-row">
                                    <input type="checkbox" class="recipient-checkbox" value="${u.name}">
                                    <span class="dot" style="background:${u.color}"></span>
                                    <span>${u.name}</span>
                                </label>
                            `).join('')}
                            <div class="recipients-actions">
                                <button type="button" class="btn-apply" onclick="applyRecipients()">Apply</button>
                            </div>
                        </div>
                    </div>
                    <input type="text" id="chat-message-input" placeholder="Type your message..." class="chat-message-input">
                    <button onclick="sendChatMessage()" class="chat-send-btn">Send</button>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = chatHTML;
    
    // Initialize recipients from saved or defaults
    const senderSelect = document.getElementById('chat-user-select');
    const typeSelect = document.getElementById('chat-type-select');
    let selectedRecipients = getSavedRecipients(senderSelect.value);
    if (!selectedRecipients.length) {
        // default: for GM -> everyone except sender, for DM -> first other user
        const others = CHAT_USERS.map(u=>u.name).filter(n => n !== senderSelect.value);
        selectedRecipients = typeSelect.value === 'DM' ? [others[0]] : others;
    }
    window.__CHAT_SELECTED_RECIPIENTS__ = selectedRecipients;
    updateRecipientsUI();
    
    // React to sender/type changes to adjust defaults
    senderSelect.addEventListener('change', () => {
        const saved = getSavedRecipients(senderSelect.value);
        if (saved.length) {
            window.__CHAT_SELECTED_RECIPIENTS__ = saved;
        } else {
            const others = CHAT_USERS.map(u=>u.name).filter(n => n !== senderSelect.value);
            window.__CHAT_SELECTED_RECIPIENTS__ = typeSelect.value === 'DM' ? [others[0]] : others;
        }
        updateRecipientsUI();
    });
    typeSelect.addEventListener('change', () => {
        const others = CHAT_USERS.map(u=>u.name).filter(n => n !== senderSelect.value);
        if (typeSelect.value === 'DM' && window.__CHAT_SELECTED_RECIPIENTS__.length !== 1) {
            window.__CHAT_SELECTED_RECIPIENTS__ = [others[0]];
        }
        if (typeSelect.value === 'GM' && window.__CHAT_SELECTED_RECIPIENTS__.length < 1) {
            window.__CHAT_SELECTED_RECIPIENTS__ = others;
        }
        updateRecipientsUI();
    });

    // Scroll to bottom of chat
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Helpers exposed globally for button handlers
    window.toggleRecipientsPanel = function toggleRecipientsPanel() {
        const panel = document.getElementById('recipients-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        // Sync checkboxes with current selection
        document.querySelectorAll('.recipient-checkbox').forEach(cb => {
            cb.checked = window.__CHAT_SELECTED_RECIPIENTS__.includes(cb.value);
        });
    }
    window.applyRecipients = function applyRecipients() {
        const boxes = Array.from(document.querySelectorAll('.recipient-checkbox'));
        const picked = boxes.filter(b => b.checked).map(b => b.value);
        const sender = document.getElementById('chat-user-select').value;
        if (document.getElementById('chat-type-select').value === 'DM' && picked.length !== 1) {
            alert('Direct Message requires exactly 1 recipient.');
            return;
        }
        if (picked.includes(sender)) {
            alert('Sender is included automatically; remove from recipients.');
            return;
        }
        window.__CHAT_SELECTED_RECIPIENTS__ = picked;
        saveRecipients(sender, picked);
        updateRecipientsUI();
        document.getElementById('recipients-panel').style.display = 'none';
    }
    function updateRecipientsUI() {
        const chips = document.getElementById('recipient-chips');
        if (!chips) return;
        chips.innerHTML = window.__CHAT_SELECTED_RECIPIENTS__.map(n => {
            const u = CHAT_USERS.find(x=>x.name===n) || {color:'#999'};
            return `<span class="chip"><span class="dot" style="background:${u.color}"></span>${n}</span>`;
        }).join('');
    }
}

/**
 * Create HTML for a single chat message
 */
function createChatMessageHTML(message) {
    const timestamp = formatChatTimestamp(message.Timestamp);
    const messageType = getMessageTypeLabel(message.Type);
    const participants = parseParticipants(message.Participants);
    const isMention = message.Message.includes('@');
    const mentionClass = isMention ? 'mention' : '';
    const typeClass = message.Type?.toLowerCase() || 'gm';
    const color = getUserColor(message.Sender);
    
    return `
        <div class="chat-message ${mentionClass} message-type-${typeClass}">
            <div class="chat-message-header">
                <span class="chat-user" style="color:${color}">${message.Sender}</span>
                <span class="chat-timestamp">${timestamp}</span>
                <span class="chat-type ${typeClass}">${messageType}</span>
            </div>
            <div class="chat-participants">${participants}</div>
            <div class="chat-message-content">
                ${formatChatMessage(message.Message)}
            </div>
            ${message.Tags ? `<div class="chat-tags"><span class="tag">${message.Tags}</span></div>` : ''}
        </div>
    `;
}

/**
 * Format chat timestamp
 */
function formatChatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    // Convert YYYYMMDDHHMMSS to readable format
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    const second = timestamp.substring(12, 14);
    
    const date = new Date(year, month - 1, day, hour, minute, second);
    return date.toLocaleString();
}

/**
 * Get message type label
 */
function getMessageTypeLabel(type) {
    const labels = {
        'GM': '👥 Group',
        'DM': '💬 Direct',
        'NOTE': '📝 Note'
    };
    return labels[type] || '💬 Message';
}

/**
 * Parse participants string to readable format
 */
function parseParticipants(participants) {
    if (!participants) return '';
    
    // Extract names from <Name> format
    const names = participants.match(/<([^>]+)>/g) || [];
    const cleanNames = names.map(name => name.replace(/[<>]/g, ''));
    
    if (cleanNames.length === 0) return '';
    if (cleanNames.length === 1) return `To: ${cleanNames[0]}`;
    if (cleanNames.length <= 3) return `To: ${cleanNames.join(', ')}`;
    return `To: ${cleanNames[0]}, ${cleanNames[1]} +${cleanNames.length - 2} others`;
}

/**
 * Get message type icon (legacy support)
 */
function getMessageTypeIcon(type) {
    const icons = {
        'message': '💬',
        'question': '❓',
        'update': '📋',
        'task': '📝',
        'good_news': '🎉',
        'info': 'ℹ️',
        'GM': '👥',
        'DM': '💬',
        'NOTE': '📝'
    };
    return icons[type] || '💬';
}

/**
 * Format chat message with @mentions
 */
function formatChatMessage(message) {
    // Color known @mentions
    const users = (window.__CHAT_USERS__ || []).reduce((m,u)=>{m[u.name.toLowerCase()] = u.color; return m;},{});
    return message.replace(/@(\w[\w\.\-]*)/g, (m, p1) => {
        const key = p1.toLowerCase();
        const color = users[key] || '#e74c3c';
        return `<span class="mention" style="color:${color}">@${p1}</span>`;
    });
}

// Return color for a user name
function getUserColor(name) {
    const list = window.__CHAT_USERS__ || [];
    const u = list.find(x => x.name === name);
    return u ? u.color : '#667eea';
}

/**
 * Switch user perspective in chat
 */
function switchUserPerspective(user) {
    if (user) {
        loadChat(user);
    } else {
        loadChat(); // Load all messages
    }
}

/**
 * Send a new chat message
 */
async function sendChatMessage() {
    const userSelect = document.getElementById('chat-user-select');
    const messageInput = document.getElementById('chat-message-input');
    const typeSelect = document.getElementById('chat-type-select');
    
    const user = userSelect.value;
    const message = messageInput.value.trim();
    const type = typeSelect.value;
    const recipients = (window.__CHAT_SELECTED_RECIPIENTS__ || []).slice();
    
    if (!message) {
        alert('Please enter a message');
        return;
    }
    if (type === 'DM' && recipients.length !== 1) {
        alert('Direct Message requires exactly 1 recipient');
        return;
    }
    if (!recipients.length && type !== 'NOTE') {
        alert('Please choose at least one recipient');
        return;
    }
    const participants = [`<${user}>`].concat(recipients.map(r=>`<${r}>`)).join('');
    
    try {
        const response = await fetch('/api/add-chat-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: user,
                message,
                type,
                participants,
                tags: ''
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        
        // Clear input and reload chat
        messageInput.value = '';
        await loadChat(user);
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
}

/**
 * Load vendors data and display in UI
 */
async function loadVendors() {
    try {
        showLoading();
        
        // Fetch vendors data from the API
        const response = await fetch('/api/read-vendors?spreadsheetId=local');
        if (!response.ok) {
            throw new Error('Failed to fetch vendors data');
        }
        
        const vendors = await response.json();
        
        if (vendors.length === 0) {
            showPlaceholder('Vendors', 'No vendors found. Add some service partners to get started.');
            return;
        }
        
        // Group vendors by category
        const vendorsByCategory = {};
        vendors.forEach(vendor => {
            const category = vendor['Category'] || 'Other';
            if (!vendorsByCategory[category]) {
                vendorsByCategory[category] = [];
            }
            vendorsByCategory[category].push(vendor);
        });
        
        // Generate HTML for vendors display
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="vendors-container">
                <div class="vendors-header">
                    <h2>🏢 Vendors & Service Partners</h2>
                    <p>Manage your hospice service providers and partners</p>
                    <div class="vendor-stats">
                        <span class="stat">📊 ${vendors.length} Total Vendors</span>
                        <span class="stat">🏷️ ${Object.keys(vendorsByCategory).length} Categories</span>
                    </div>
                </div>
                
                <div class="vendors-grid">
                    ${Object.entries(vendorsByCategory).map(([category, categoryVendors]) => `
                        <div class="vendor-category">
                            <h3>${getCategoryIcon(category)} ${category}</h3>
                            <div class="vendor-cards">
                                ${categoryVendors.map(vendor => generateVendorCard(vendor)).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading vendors:', error);
        showError('Failed to load vendors data: ' + error.message);
    }
}

/**
 * Generate vendor card HTML
 */
function generateVendorCard(vendor) {
    const rating = vendor['Rating'] || 'N/A';
    const status = vendor['Status'] || 'Active';
    const lastContact = vendor['Last Contact'] || 'N/A';
    
    return `
        <div class="vendor-card ${status.toLowerCase()}">
            <div class="vendor-header">
                <h4>${vendor['Company Name'] || 'Unknown Company'}</h4>
                <span class="vendor-id">${vendor['Vendor ID'] || ''}</span>
            </div>
            
            <div class="vendor-details">
                <p class="service-type">${vendor['Service Type'] || 'General Services'}</p>
                <p class="contact-person">👤 ${vendor['Contact Person'] || 'No contact listed'}</p>
                <p class="phone">📞 ${vendor['Phone'] || 'No phone listed'}</p>
                <p class="email">📧 ${vendor['Email'] || 'No email listed'}</p>
                <p class="address">📍 ${vendor['Address'] || 'No address listed'}</p>
            </div>
            
            <div class="vendor-meta">
                <div class="rating">
                    <span class="rating-label">Rating:</span>
                    <span class="rating-value">${rating}</span>
                </div>
                <div class="status">
                    <span class="status-badge ${status.toLowerCase()}">${status}</span>
                </div>
                <div class="last-contact">
                    <span class="last-contact-label">Last Contact:</span>
                    <span class="last-contact-value">${lastContact}</span>
                </div>
            </div>
            
            <div class="vendor-notes">
                <p>${vendor['Notes'] || 'No notes available'}</p>
            </div>
            
            <div class="vendor-actions">
                <button class="vendor-action-btn" onclick="contactVendor('${vendor['Vendor ID']}')" title="Contact vendor">
                    📞 Contact
                </button>
                <button class="vendor-action-btn" onclick="viewVendorDetails('${vendor['Vendor ID']}')" title="View details">
                    👁️ Details
                </button>
                <button class="vendor-action-btn" onclick="editVendor('${vendor['Vendor ID']}')" title="Edit vendor">
                    ✏️ Edit
                </button>
            </div>
        </div>
    `;
}

/**
 * Get category icon based on vendor category
 */
function getCategoryIcon(category) {
    const icons = {
        'Cremation': '🔥',
        'Pharmacy': '💊',
        'Doula': '🤱',
        'Funeral Services': '⚰️',
        'Medical Equipment': '🩺',
        'Counseling': '🧠',
        'Other': '🏢'
    };
    return icons[category] || '🏢';
}

/**
 * Contact vendor function
 */
function contactVendor(vendorId) {
    // Find vendor data and open contact options
    console.log('Contacting vendor:', vendorId);
    // TODO: Implement contact functionality
    alert('Contact functionality coming soon for vendor: ' + vendorId);
}

/**
 * View vendor details function
 */
function viewVendorDetails(vendorId) {
    console.log('Viewing details for vendor:', vendorId);
    // TODO: Implement detailed view
    alert('Detailed view coming soon for vendor: ' + vendorId);
}

/**
 * Edit vendor function
 */
function editVendor(vendorId) {
    console.log('Editing vendor:', vendorId);
    // TODO: Implement edit functionality
    alert('Edit functionality coming soon for vendor: ' + vendorId);
}

/**
 * Call pinned patient function
 */
function callPatient() {
    const pinnedPatient = JSON.parse(localStorage.getItem('pinnedPatient') || '{}');
    if (!pinnedPatient['Patient Name']) {
        alert('No patient pinned');
        return;
    }
    
    const phoneNumber = pinnedPatient['Phone Number'];
    if (!phoneNumber || phoneNumber === '-') {
        alert('No phone number available for this patient');
        return;
    }
    
    // Open phone dialer
    window.open(`tel:${phoneNumber}`, '_blank');
    setStatus(`Calling ${pinnedPatient['Patient Name']} at ${phoneNumber}`, 'success');
}

/**
 * Email pinned patient function
 */
function emailPatient() {
    const pinnedPatient = JSON.parse(localStorage.getItem('pinnedPatient') || '{}');
    if (!pinnedPatient['Patient Name']) {
        alert('No patient pinned');
        return;
    }
    
    const email = pinnedPatient['Email'];
    if (!email || email === '-') {
        alert('No email available for this patient');
        return;
    }
    
    // Open email client
    const subject = `Follow up - ${pinnedPatient['Patient Name']}`;
    const body = `Dear ${pinnedPatient['Patient Name']},\n\nI hope this email finds you well. I wanted to follow up regarding your care.\n\nBest regards,\nYour Care Team`;
    
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    setStatus(`Emailing ${pinnedPatient['Patient Name']} at ${email}`, 'success');
}

/**
 * Unpin patient function
 */
function unpinPatient() {
    localStorage.removeItem('pinnedPatient');
    document.getElementById('pinned-footer').style.display = 'none';
    setStatus('Patient unpinned', 'success');
}

/**
 * Create task for pinned patient
 */
function createTaskForPinned() {
    const pinnedPatient = JSON.parse(localStorage.getItem('pinnedPatient') || '{}');
    if (!pinnedPatient['Patient Name']) {
        alert('No patient pinned');
        return;
    }
    
    const taskTitle = prompt(`Create task for ${pinnedPatient['Patient Name']}:`, `Follow up with ${pinnedPatient['Patient Name']}`);
    if (taskTitle) {
        // TODO: Implement task creation
        setStatus(`Task created for ${pinnedPatient['Patient Name']}: ${taskTitle}`, 'success');
    }
}

/**
 * Create event for pinned patient
 */
function createEventForPinned() {
    const pinnedPatient = JSON.parse(localStorage.getItem('pinnedPatient') || '{}');
    if (!pinnedPatient['Patient Name']) {
        alert('No patient pinned');
        return;
    }
    
    const eventTitle = prompt(`Create calendar event for ${pinnedPatient['Patient Name']}:`, `Follow up appointment with ${pinnedPatient['Patient Name']}`);
    if (eventTitle) {
        // TODO: Implement event creation
        setStatus(`Event created for ${pinnedPatient['Patient Name']}: ${eventTitle}`, 'success');
    }
}

/**
 * Load Patient Intake Form
 */
function loadPatientIntake() {
    showLoading();
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="patient-intake-container">
            <h2>📋 New Patient Intake Form</h2>
            <p class="intake-description">Enter new patient information below. This data will automatically populate to relevant tabs and sheets.</p>
            
            <form id="patient-intake-form" class="intake-form">
                <!-- Basic Information Section -->
                <div class="form-section">
                    <h3>Basic Information</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="patient-name">Patient Name *</label>
                            <input type="text" id="patient-name" name="patientName" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="dob">Date of Birth *</label>
                            <input type="text" id="dob" name="dob" required placeholder="MM/DD/YYYY" maxlength="10" title="Please enter date in MM/DD/YYYY format (e.g., 12/25/1985)">
                        </div>
                        
                        <div class="form-group">
                            <label for="age">Age</label>
                            <input type="number" id="age" name="age" min="0" max="150" readonly>
                        </div>
                        
                        <div class="form-group">
                            <label for="gender">Gender</label>
                            <select id="gender" name="gender">
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Contact Information Section -->
                <div class="form-section">
                    <h3>Contact Information</h3>
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label for="address">Address *</label>
                            <input type="text" id="address" name="address" required placeholder="Street Address">
                        </div>
                        
                        <div class="form-group">
                            <label for="city">City *</label>
                            <input type="text" id="city" name="city" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="state">State *</label>
                            <input type="text" id="state" name="state" required maxlength="2">
                        </div>
                        
                        <div class="form-group">
                            <label for="zip">ZIP Code *</label>
                            <input type="text" id="zip" name="zip" required pattern="[0-9]{5}(-[0-9]{4})?">
                        </div>
                        
                        <div class="form-group">
                            <label for="phone">Phone Number *</label>
                            <input type="tel" id="phone" name="phone" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input type="email" id="email" name="email">
                        </div>
                        
                        <div class="form-group">
                            <label for="primary-contact">Primary Contact Name *</label>
                            <input type="text" id="primary-contact" name="primaryContact" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="primary-contact-phone">Primary Contact Phone *</label>
                            <input type="tel" id="primary-contact-phone" name="primaryContactPhone" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="primary-contact-relation">Relationship to Patient</label>
                            <select id="primary-contact-relation" name="primaryContactRelation">
                                <option value="">Select...</option>
                                <option value="Spouse">Spouse</option>
                                <option value="Child">Child</option>
                                <option value="Parent">Parent</option>
                                <option value="Sibling">Sibling</option>
                                <option value="Friend">Friend</option>
                                <option value="Caregiver">Caregiver</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Medical Information Section -->
                <div class="form-section">
                    <h3>Medical Information</h3>
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label for="diagnosis">Primary Diagnosis *</label>
                            <input type="text" id="diagnosis" name="diagnosis" required placeholder="e.g., Stage IV Lung Cancer">
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="secondary-diagnosis">Secondary Diagnoses</label>
                            <textarea id="secondary-diagnosis" name="secondaryDiagnosis" rows="2" placeholder="Additional diagnoses..."></textarea>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="symptoms">Current Symptoms *</label>
                            <textarea id="symptoms" name="symptoms" required rows="3" placeholder="Pain, shortness of breath, fatigue, etc."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="medical-history">Relevant Medical History</label>
                            <textarea id="medical-history" name="medicalHistory" rows="3"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="medications">Current Medications</label>
                            <textarea id="medications" name="medications" rows="3" placeholder="List all current medications..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="allergies">Allergies</label>
                            <textarea id="allergies" name="allergies" rows="2" placeholder="Drug allergies, food allergies, etc."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="prognosis">Prognosis</label>
                            <select id="prognosis" name="prognosis">
                                <option value="">Select...</option>
                                <option value="Less than 6 months">Less than 6 months</option>
                                <option value="6-12 months">6-12 months</option>
                                <option value="12+ months">12+ months</option>
                                <option value="Uncertain">Uncertain</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Care Team Section -->
                <div class="form-section">
                    <h3>Care Team Information</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="cp-doctor">CP Doctor *</label>
                            <input type="text" id="cp-doctor" name="cpDoctor" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="referring-physician">Referring Physician</label>
                            <input type="text" id="referring-physician" name="referringPhysician">
                        </div>
                        
                        <div class="form-group">
                            <label for="hospice">Hospice Provider *</label>
                            <input type="text" id="hospice" name="hospice" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="hospice-nurse">Hospice Nurse</label>
                            <input type="text" id="hospice-nurse" name="hospiceNurse">
                        </div>
                        
                        <div class="form-group">
                            <label for="social-worker">Social Worker</label>
                            <input type="text" id="social-worker" name="socialWorker">
                        </div>
                        
                        <div class="form-group">
                            <label for="doula">Doula</label>
                            <input type="text" id="doula" name="doula">
                        </div>
                    </div>
                </div>
                
                <!-- Insurance & Financial Section -->
                <div class="form-section">
                    <h3>Insurance & Financial Information</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="medical-id">Medi-Cal ID Number</label>
                            <input type="text" id="medical-id" name="medicalId" placeholder="Enter Medi-Cal ID">
                        </div>
                        
                        <div class="form-group">
                            <label for="invoice-amount">Invoice Amount</label>
                            <input type="number" id="invoice-amount" name="invoiceAmount" min="0" step="0.01" placeholder="0.00">
                        </div>
                        
                        <div class="form-group">
                            <label for="payment-status">Payment Status</label>
                            <select id="payment-status" name="paymentStatus">
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                                <option value="Insurance Processing">Insurance Processing</option>
                                <option value="Denied">Denied</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Additional Information Section -->
                <div class="form-section">
                    <h3>Additional Information</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="intake-date">Intake Date *</label>
                            <input type="text" id="intake-date" name="intakeDate" required placeholder="MM/DD/YYYY" maxlength="10" title="Please enter date in MM/DD/YYYY format (e.g., 12/25/2024)">
                        </div>
                        
                        <div class="form-group">
                            <label for="intake-staff">Intake Staff *</label>
                            <input type="text" id="intake-staff" name="intakeStaff" required placeholder="Your name">
                        </div>
                        
                        <div class="form-group">
                            <label for="priority">Priority Level</label>
                            <select id="priority" name="priority">
                                <option value="Standard">Standard</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="dose-level">Dose Level</label>
                            <select id="dose-level" name="doseLevel">
                                <option value="">Select dose level</option>
                                <option value="Regular Dose">Regular Dose</option>
                                <option value="High Dose">High Dose</option>
                            </select>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="special-needs">Special Needs/Considerations</label>
                            <textarea id="special-needs" name="specialNeeds" rows="2" placeholder="Language barriers, mobility issues, etc."></textarea>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="notes">Additional Notes</label>
                            <textarea id="notes" name="notes" rows="3" placeholder="Any additional information..."></textarea>
                        </div>
                    </div>
                </div>
                
                <!-- Form Actions -->
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="saveDraft()">Save as Draft</button>
                    <button type="button" class="btn-secondary" onclick="clearIntakeForm()">Clear Form</button>
                    <button type="submit" class="btn-primary">Submit Patient Intake</button>
                </div>
            </form>
        </div>
    `;
    
    // Auto-calculate age from DOB and format date input
    const dobInput = document.getElementById('dob');
    const ageInput = document.getElementById('age');
    
    // Format DOB input as user types
    dobInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        
        if (value.length >= 5) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
        } else if (value.length >= 3) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4);
        } else if (value.length >= 1) {
            value = value.slice(0, 2);
        }
        
        e.target.value = value;
        
        // Calculate age when we have a complete date
        if (value.length === 10) {
            calculateAge(value);
        } else {
            ageInput.value = '';
        }
    });
    
    // Calculate age from formatted date string
    function calculateAge(dateString) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const month = parseInt(parts[0]) - 1; // Month is 0-indexed
            const day = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            
            const dob = new Date(year, month, day);
            const today = new Date();
            
            if (!isNaN(dob.getTime())) {
                let age = today.getFullYear() - dob.getFullYear();
                const monthDiff = today.getMonth() - dob.getMonth();
                
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                    age--;
                }
                
                ageInput.value = age;
            }
        }
    }
    
    // Format phone numbers
    document.getElementById('phone').addEventListener('input', formatPhoneNumber);
    document.getElementById('primary-contact-phone').addEventListener('input', formatPhoneNumber);
    
    // Format intake date input
    document.getElementById('intake-date').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        
        if (value.length >= 5) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
        } else if (value.length >= 3) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4);
        } else if (value.length >= 1) {
            value = value.slice(0, 2);
        }
        
        e.target.value = value;
    });
    
    // Handle form submission
    document.getElementById('patient-intake-form').addEventListener('submit', handleIntakeSubmit);
    
    // Load any saved draft
    loadDraft();
    
    // Load dummy data for testing (remove this in production)
    loadDummyData();
    
    hideLoading();
}

/**
 * Load dummy data for testing purposes
 */
function loadDummyData() {
    const form = document.getElementById('patient-intake-form');
    if (!form) return;
    
    // Dummy patient data
    const dummyData = {
        patientName: 'Sarah Johnson',
        dob: '05/15/1968',
        age: '55',
        gender: 'Female',
        address: '123 Oak Street',
        city: 'San Diego',
        state: 'CA',
        zip: '92101',
        phone: '(619) 555-0123',
        email: 'sarah.johnson@email.com',
        primaryContact: 'Michael Johnson',
        primaryContactPhone: '(619) 555-0124',
        primaryContactRelation: 'Spouse',
        diagnosis: 'Stage IV Lung Cancer',
        secondaryDiagnosis: 'COPD, Hypertension',
        symptoms: 'Shortness of breath, fatigue, chest pain, loss of appetite',
        medicalHistory: 'Former smoker, diagnosed with COPD in 2015, hypertension managed with medication',
        medications: 'Morphine 15mg every 4 hours, Albuterol inhaler, Lisinopril 10mg daily',
        allergies: 'Penicillin, Sulfa drugs',
        prognosis: 'Less than 6 months',
        cpDoctor: 'Dr. Emily Rodriguez',
        referringPhysician: 'Dr. James Wilson',
        hospice: 'Hospice of San Diego',
        hospiceNurse: 'Nurse Jennifer Martinez',
        socialWorker: 'Maria Gonzalez',
        doula: 'Lisa Thompson',
        medicalId: 'MC123456789',
        invoiceAmount: '2500.00',
        paymentStatus: 'Pending',
        city: 'San Diego',
        intakeDate: '01/15/2024',
        intakeStaff: 'Alyssa Forcucci',
        priority: 'High',
        doseLevel: 'High Dose',
        specialNeeds: 'Requires Spanish interpreter, mobility assistance needed',
        notes: 'Patient prefers home care, family very involved in care decisions'
    };
    
    // Fill the form with dummy data
    Object.keys(dummyData).forEach(key => {
        const input = form.elements[key];
        if (input) {
            input.value = dummyData[key];
        }
    });
    
        // Show notification that dummy data is loaded
    showNotification('Dummy data loaded for testing. Remember to clear before entering real patient data.', 'info');
}

/**
 * Format phone number input
 */
function formatPhoneNumber(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 6) {
        value = `(${value.slice(0,3)}) ${value.slice(3,6)}-${value.slice(6,10)}`;
    } else if (value.length >= 3) {
        value = `(${value.slice(0,3)}) ${value.slice(3)}`;
    }
    e.target.value = value;
}

/**
 * Handle intake form submission
 */
async function handleIntakeSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const patientData = Object.fromEntries(formData);
    
    // Add submission date
    const now = new Date();
    patientData.dateSubmitted = now.toISOString();
    patientData.dateSubmittedFormatted = now.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Keep the intake date from the form if provided, otherwise use current date
    if (!patientData.intakeDate) {
        patientData.intakeDate = new Date().toISOString().split('T')[0];
    }
    patientData.lastModified = new Date().toISOString();
    
    try {
        // Save to localStorage first
        savePatientToLocal(patientData);
        
        // Always try to save to Excel file
        try {
            await savePatientToSheets(patientData);
        } catch (error) {
            console.log('Excel save failed, but local save successful');
        }
        
        // Show success message
        showNotification(`Patient ${patientData.patientName} added successfully to Active Patients!`, 'success');
        
        // Clear the form for next patient
        document.getElementById('patient-intake-form').reset();
        document.getElementById('age').value = '';
        
        // Switch to active patients tab to show new entry immediately
        setTimeout(() => {
            switchTab('active-data', document.querySelector('[data-tab="active-data"]'));
        }, 500);
        
    } catch (error) {
        console.error('Error submitting intake:', error);
        showNotification('Error submitting intake. Data saved locally.', 'error');
    }
}

/**
 * Save patient to localStorage
 */
function savePatientToLocal(patientData) {
    // Add unique ID
    patientData.id = 'PAT-' + Date.now();
    
    // Format the data to match the expected structure for display
    const formattedPatientData = {
        ...patientData,
        'Patient Name': patientData.patientName,
        'Age': patientData.age,
        'City': patientData.city,
        'CP Doctor': patientData.cpDoctor,
        'Hospice': patientData.hospice,
        'Phone Number': patientData.phone,
        'Email': patientData.email,
        'DOB': patientData.dob,
        'Ingestion Date': patientData.intakeDate,
        'Invoice amount': patientData.invoiceAmount,
        'PAID': patientData.paymentStatus === 'Paid' ? 'yes' : 'no',
        'Check list': 'In Progress',
        'Date Submitted': patientData.dateSubmittedFormatted,
        'Dose Level': patientData.doseLevel
    };
    
    // Get existing active patients list
    let activePatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
    
    // Check if patient already exists to avoid duplicates
    const patientExists = activePatients.some(p => 
        (p['Patient Name'] === formattedPatientData['Patient Name']) || 
        (p.patientName === formattedPatientData.patientName)
    );
    
    if (!patientExists) {
        // Add new patient to the list
        activePatients.push(formattedPatientData);
        
        // Sort alphabetically by first name (A-Z)
        activePatients.sort((a, b) => {
            const nameA = (a['Patient Name'] || a.patientName || '').split(' ')[0].toLowerCase();
            const nameB = (b['Patient Name'] || b.patientName || '').split(' ')[0].toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        // Save the sorted list
        localStorage.setItem('activePatients', JSON.stringify(activePatients));
        
        // Also save to general patients list
        localStorage.setItem('patients', JSON.stringify(activePatients));
        
        // Update current data if available
        if (currentData.active) {
            currentData.active = activePatients;
        }
    }
}

/**
 * Save patient to Google Sheets
 */
async function savePatientToSheets(patientData) {
    try {
        // Call the API to save patient data to Excel
        const response = await fetch('/api/save-patient', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patientData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Patient saved to Excel:', result);
        showNotification('Patient successfully saved to Excel file!', 'success');
        return result;
        
    } catch (error) {
        console.error('Error saving to Excel:', error);
        showNotification('Failed to save to Excel file. Data saved locally.', 'warning');
        throw error;
    }
}

/**
 * Clear intake form
 */
function clearIntakeForm() {
    document.getElementById('patient-intake-form').reset();
    document.getElementById('age').value = '';
    localStorage.removeItem('intakeDraft');
    localStorage.removeItem('formData_patient-intake');
    showNotification('Form cleared successfully', 'info');
}

/**
 * Save form as draft
 */
function saveDraft() {
    const form = document.getElementById('patient-intake-form');
    const formData = new FormData(form);
    const draft = Object.fromEntries(formData);
    
    localStorage.setItem('intakeDraft', JSON.stringify(draft));
    showNotification('Draft saved successfully!', 'success');
}

/**
 * Load saved draft
 */
function loadDraft() {
    const draft = localStorage.getItem('intakeDraft');
    if (draft) {
        const draftData = JSON.parse(draft);
        const form = document.getElementById('patient-intake-form');
        
        Object.keys(draftData).forEach(key => {
            const input = form.elements[key];
            if (input) {
                input.value = draftData[key];
            }
        });
        
        showNotification('Draft loaded from previous session', 'info');
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Normalize patient data to ensure consistent field names
 */
function normalizePatientData(patient) {
    // Create a normalized object with all possible fields
    return {
        ...patient,
        // Ensure both formats are available
        'Patient Name': patient['Patient Name'] || patient.patientName,
        patientName: patient.patientName || patient['Patient Name'],
        'Age': patient['Age'] || patient.age,
        age: patient.age || patient['Age'],
        'DOB': patient['DOB'] || patient.dob,
        dob: patient.dob || patient['DOB'],
        'Phone Number': patient['Phone Number'] || patient.phone,
        phone: patient.phone || patient['Phone Number'],
        'Email': patient['Email'] || patient.email,
        email: patient.email || patient['Email'],
        'CP Doctor': patient['CP Doctor'] || patient.cpDoctor,
        cpDoctor: patient.cpDoctor || patient['CP Doctor'],
        'Hospice': patient['Hospice'] || patient.hospice,
        hospice: patient.hospice || patient['Hospice'],
        'Ingestion Date': patient['Ingestion Date'] || patient.intakeDate,
        intakeDate: patient.intakeDate || patient['Ingestion Date'],
        'Invoice amount': patient['Invoice amount'] || patient.invoiceAmount,
        invoiceAmount: patient.invoiceAmount || patient['Invoice amount'],
        'PAID': patient['PAID'] || (patient.paymentStatus === 'Paid' ? 'yes' : patient.paymentStatus === 'Pending' ? 'no' : patient['PAID']),
        'Check list': patient['Check list'] || patient.checklistStatus || 'In Progress'
    };
}

/**
 * Show detailed patient information
 */
function showPatientDetail(index) {
    // Get patient data from current view or localStorage
    let patient = null;
    
    // First try currentData
    if (currentData.active && currentData.active[index]) {
        patient = currentData.active[index];
    }
    
    // If not found, try localStorage
    if (!patient) {
        const storedPatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
        if (storedPatients[index]) {
            patient = storedPatients[index];
        }
    }
    
    // If still not found, try the general patients list
    if (!patient) {
        const allPatients = JSON.parse(localStorage.getItem('patients') || '[]');
        if (allPatients[index]) {
            patient = allPatients[index];
        }
    }
    
    if (!patient) {
        showNotification('Patient data not found', 'error');
        return;
    }
    
    // Ensure all fields are properly mapped
    patient = normalizePatientData(patient);
    
    // Store the index globally for saving
    window.currentEditingPatientIndex = index;
    window.currentEditingPatient = {...patient}; // Create a copy
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'patient-detail-modal';
    modal.setAttribute('data-patient-index', index);
    modal.innerHTML = `
        <div class="patient-detail-container">
            <div class="patient-detail-header">
                <h2>Patient Information</h2>
                <button class="close-detail" onclick="closePatientDetail()">✕</button>
            </div>
            
            <div class="patient-detail-body" id="patient-detail-body">
                <!-- Basic Information -->
                <div class="detail-section">
                    <h3>📋 Basic Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Patient Name:</label>
                            <span class="editable-field" data-field="patientName">${patient['Patient Name'] || patient.patientName || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Date of Birth:</label>
                            <span class="editable-field" data-field="dob" data-type="date">${patient['DOB'] || patient.dob || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Age:</label>
                            <span class="editable-field" data-field="age" data-readonly="true">${patient['Age'] || patient.age || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Gender:</label>
                            <span class="editable-field" data-field="gender" data-type="select" data-options="Male,Female,Other,Prefer not to say">${patient.gender || '-'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Contact Information -->
                <div class="detail-section">
                    <h3>📞 Contact Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Address:</label>
                            <span class="editable-field" data-field="address">${patient.address || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>City:</label>
                            <span class="editable-field" data-field="city">${patient.city || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>State:</label>
                            <span class="editable-field" data-field="state">${patient.state || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>ZIP Code:</label>
                            <span class="editable-field" data-field="zip">${patient.zip || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Phone:</label>
                            <span class="editable-field" data-field="phone">${patient['Phone Number'] || patient.phone || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Email:</label>
                            <span class="editable-field" data-field="email">${patient['Email'] || patient.email || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Primary Contact:</label>
                            <span class="editable-field" data-field="primaryContact">${patient.primaryContact || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Contact Phone:</label>
                            <span class="editable-field" data-field="primaryContactPhone">${patient.primaryContactPhone || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Relationship:</label>
                            <span class="editable-field" data-field="primaryContactRelation" data-type="select" data-options="Spouse,Child,Parent,Sibling,Friend,Caregiver,Other">${patient.primaryContactRelation || '-'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Medical Information -->
                <div class="detail-section">
                    <h3>🏥 Medical Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item full-width">
                            <label>Primary Diagnosis:</label>
                            <span class="editable-field" data-field="diagnosis">${patient.diagnosis || '-'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Secondary Diagnoses:</label>
                            <span class="editable-field" data-field="secondaryDiagnosis">${patient.secondaryDiagnosis || '-'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Current Symptoms:</label>
                            <span class="editable-field" data-field="symptoms">${patient.symptoms || '-'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Medical History:</label>
                            <span class="editable-field" data-field="medicalHistory">${patient.medicalHistory || '-'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Current Medications:</label>
                            <span class="editable-field" data-field="medications">${patient.medications || '-'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Allergies:</label>
                            <span class="editable-field" data-field="allergies">${patient.allergies || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Prognosis:</label>
                            <span class="editable-field" data-field="prognosis" data-type="select" data-options="Less than 6 months,6-12 months,12+ months,Uncertain">${patient.prognosis || '-'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Care Team -->
                <div class="detail-section">
                    <h3>👨‍⚕️ Care Team</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>CP Doctor:</label>
                            <span class="editable-field" data-field="cpDoctor">${patient['CP Doctor'] || patient.cpDoctor || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Referring Physician:</label>
                            <span class="editable-field" data-field="referringPhysician">${patient.referringPhysician || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Hospice Provider:</label>
                            <span class="editable-field" data-field="hospice">${patient['Hospice'] || patient.hospice || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Hospice Nurse:</label>
                            <span class="editable-field" data-field="hospiceNurse">${patient.hospiceNurse || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Social Worker:</label>
                            <span class="editable-field" data-field="socialWorker">${patient.socialWorker || '-'}</span>
                        </div>
                        
                        <div class="detail-item">
                            <label>Doula:</label>
                            <span class="editable-field" data-field="doula">${patient.doula || '-'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Insurance & Financial -->
                <div class="detail-section">
                    <h3>💰 Insurance & Financial</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Medi-Cal ID Number:</label>
                            <span class="editable-field" data-field="medicalId">${patient.medicalId || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Invoice Amount:</label>
                            <span class="editable-field" data-field="invoiceAmount">${patient['Invoice amount'] || patient.invoiceAmount || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Payment Status:</label>
                            <span class="editable-field" data-field="paymentStatus" data-type="select" data-options="Pending,Paid,Insurance Processing,Denied">${patient.paymentStatus || 'Pending'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Additional Information -->
                <div class="detail-section">
                    <h3>📝 Additional Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Intake Date:</label>
                            <span class="editable-field" data-field="intakeDate" data-type="date">${patient['Ingestion Date'] || patient.intakeDate || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Intake Staff:</label>
                            <span class="editable-field" data-field="intakeStaff">${patient.intakeStaff || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Priority Level:</label>
                            <span class="editable-field" data-field="priority" data-type="select" data-options="Standard,High,Urgent">${patient.priority || 'Standard'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Dose Level:</label>
                            <span class="editable-field" data-field="doseLevel" data-type="select" data-options="Regular Dose,High Dose">${patient.doseLevel || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Checklist Status:</label>
                            <span class="editable-field" data-field="checklistStatus" data-type="select" data-options="In Progress,Complete">${patient['Check list'] === 'complete' ? 'Complete' : 'In Progress'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Special Needs:</label>
                            <span class="editable-field" data-field="specialNeeds">${patient.specialNeeds || '-'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Notes:</label>
                            <span class="editable-field" data-field="notes">${patient.notes || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="patient-detail-footer" id="patient-detail-footer">
                <button class="btn-secondary" onclick="closePatientDetail()">Close</button>
                <button class="btn-secondary" id="edit-mode-btn" onclick="toggleEditMode(${index})">✏️ Edit</button>
                <button class="btn-primary" id="save-btn" style="display:none;" onclick="saveInlineChanges(${index})">💾 Save Changes</button>
                <button class="btn-secondary" id="cancel-btn" style="display:none;" onclick="cancelEditMode(${index})">Cancel</button>
                <button class="btn-primary" id="pin-btn" onclick="pinPatientFromDetail(${index})">📌 Pin Patient</button>
                <button class="btn-primary" id="task-btn" onclick="createTaskFromDetail(${index})">📝 Create Task</button>
                <button class="btn-primary" id="event-btn" onclick="createEventFromDetail(${index})">📅 Create Event</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closePatientDetail();
        }
    });
    
    // Add escape key to close
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            closePatientDetail();
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

/**
 * Toggle edit mode in patient detail modal
 */
function toggleEditMode(index) {
    const modal = document.querySelector('.patient-detail-modal');
    if (!modal) return;
    
    // Show/hide buttons
    document.getElementById('edit-mode-btn').style.display = 'none';
    document.getElementById('save-btn').style.display = 'inline-block';
    document.getElementById('cancel-btn').style.display = 'inline-block';
    document.getElementById('pin-btn').style.display = 'none';
    document.getElementById('task-btn').style.display = 'none';
    document.getElementById('event-btn').style.display = 'none';
    
    // Make fields editable
    const editableFields = modal.querySelectorAll('.editable-field');
    editableFields.forEach(field => {
        const fieldName = field.dataset.field;
        const fieldType = field.dataset.type;
        const isReadonly = field.dataset.readonly === 'true';
        
        if (isReadonly) return;
        
        const currentValue = field.textContent === '-' ? '' : field.textContent;
        
        if (fieldType === 'select') {
            const options = field.dataset.options.split(',');
            const select = document.createElement('select');
            select.className = 'detail-input';
            select.dataset.field = fieldName;
            
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if (opt === currentValue) option.selected = true;
                select.appendChild(option);
            });
            
            field.parentNode.replaceChild(select, field);
        } else if (fieldType === 'date') {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'detail-input';
            input.dataset.field = fieldName;
            input.value = currentValue;
            input.placeholder = 'MM/DD/YYYY';
            input.maxLength = 10;
            
            // Add date formatting
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 5) {
                    value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
                } else if (value.length >= 3) {
                    value = value.slice(0, 2) + '/' + value.slice(2, 4);
                }
                e.target.value = value;
                
                // Update age if DOB changes
                if (fieldName === 'dob' && value.length === 10) {
                    updateAgeFromDOB(value);
                }
            });
            
            field.parentNode.replaceChild(input, field);
        } else if (fieldName === 'phone' || fieldName === 'primaryContactPhone') {
            const input = document.createElement('input');
            input.type = 'tel';
            input.className = 'detail-input';
            input.dataset.field = fieldName;
            input.value = currentValue;
            
            // Add phone formatting
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 6) {
                    value = `(${value.slice(0,3)}) ${value.slice(3,6)}-${value.slice(6,10)}`;
                } else if (value.length >= 3) {
                    value = `(${value.slice(0,3)}) ${value.slice(3)}`;
                }
                e.target.value = value;
            });
            
            field.parentNode.replaceChild(input, field);
        } else if (fieldName === 'symptoms' || fieldName === 'secondaryDiagnosis' || fieldName === 'medicalHistory' || 
                   fieldName === 'medications' || fieldName === 'allergies' || fieldName === 'specialNeeds' || fieldName === 'notes') {
            const textarea = document.createElement('textarea');
            textarea.className = 'detail-input detail-textarea';
            textarea.dataset.field = fieldName;
            textarea.value = currentValue;
            textarea.rows = 3;
            
            field.parentNode.replaceChild(textarea, field);
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'detail-input';
            input.dataset.field = fieldName;
            input.value = currentValue;
            
            field.parentNode.replaceChild(input, field);
        }
    });
    
    // Add edit mode class to modal
    modal.classList.add('edit-mode');
}

/**
 * Update age from DOB in edit mode
 */
function updateAgeFromDOB(dateString) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1;
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        const dob = new Date(year, month, day);
        const today = new Date();
        
        if (!isNaN(dob.getTime())) {
            let age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
            
            // Find age field and update it
            const ageField = document.querySelector('[data-field="age"]');
            if (ageField) {
                ageField.textContent = age;
            }
        }
    }
}

/**
 * Save inline changes
 */
function saveInlineChanges(index) {
    const modal = document.querySelector('.patient-detail-modal');
    if (!modal) return;
    
    // Collect all edited values
    const editedData = {};
    const inputs = modal.querySelectorAll('.detail-input');
    
    inputs.forEach(input => {
        const fieldName = input.dataset.field;
        const value = input.value || input.textContent;
        editedData[fieldName] = value;
    });
    
    // Also get readonly fields
    const readonlyFields = modal.querySelectorAll('[data-readonly="true"]');
    readonlyFields.forEach(field => {
        const fieldName = field.dataset.field;
        editedData[fieldName] = field.textContent;
    });
    
    // Get the patient's name to find all instances
    const patientName = editedData.patientName || editedData['Patient Name'] || '';
    
    // Update patient data in localStorage
    let patients = JSON.parse(localStorage.getItem('activePatients') || '[]');
    if (patients[index]) {
        // Merge edited data with existing patient data
        patients[index] = {...patients[index], ...editedData};
        patients[index].lastModified = new Date().toISOString();
        
        // Save back to localStorage
        localStorage.setItem('activePatients', JSON.stringify(patients));
    }
    
    // Update current data if available
    if (currentData.active && currentData.active[index]) {
        currentData.active[index] = {...currentData.active[index], ...editedData};
    }
    
    // Update all other patient lists in localStorage
    updateAllPatientLists(patientName, editedData);
    
    // Update any pinned patient if this is the same patient
    updatePinnedPatient(patientName, editedData);
    
    // Update any tasks or notes associated with this patient
    updatePatientReferences(patientName, editedData);
    
    showNotification('Patient information updated successfully across all sections!', 'success');
    
    // Refresh the patient detail view
    closePatientDetail();
    showPatientDetail(index);
}

/**
 * Update all patient lists in localStorage
 */
function updateAllPatientLists(patientName, editedData) {
    if (!patientName) return;
    
    // Update 'patients' list (general patient list)
    let allPatients = JSON.parse(localStorage.getItem('patients') || '[]');
    allPatients.forEach((patient, idx) => {
        if (patient['Patient Name'] === patientName || patient.patientName === patientName) {
            allPatients[idx] = {...patient, ...editedData, lastModified: new Date().toISOString()};
        }
    });
    localStorage.setItem('patients', JSON.stringify(allPatients));
    
    // Update 'activePatients' list
    let activePatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
    activePatients.forEach((patient, idx) => {
        if (patient['Patient Name'] === patientName || patient.patientName === patientName) {
            activePatients[idx] = {...patient, ...editedData, lastModified: new Date().toISOString()};
        }
    });
    localStorage.setItem('activePatients', JSON.stringify(activePatients));
    
    // Update any other patient lists that might exist
    const patientListKeys = ['closedPatients', 'outstandingPatients', 'outreachPatients'];
    patientListKeys.forEach(key => {
        let patientList = JSON.parse(localStorage.getItem(key) || '[]');
        let updated = false;
        patientList.forEach((patient, idx) => {
            if (patient['Patient Name'] === patientName || patient.patientName === patientName) {
                patientList[idx] = {...patient, ...editedData, lastModified: new Date().toISOString()};
                updated = true;
            }
        });
        if (updated) {
            localStorage.setItem(key, JSON.stringify(patientList));
        }
    });
}

/**
 * Update pinned patient if it's the same patient
 */
function updatePinnedPatient(patientName, editedData) {
    if (!patientName) return;
    
    const pinnedPatient = JSON.parse(localStorage.getItem('pinnedPatient') || '{}');
    if (pinnedPatient['Patient Name'] === patientName || pinnedPatient.patientName === patientName) {
        const updatedPinnedPatient = {...pinnedPatient, ...editedData, lastModified: new Date().toISOString()};
        localStorage.setItem('pinnedPatient', JSON.stringify(updatedPinnedPatient));
        
        // Update the pinned patient display if it's currently shown
        updatePinnedPatientDisplay(updatedPinnedPatient);
    }
}

/**
 * Update pinned patient display
 */
function updatePinnedPatientDisplay(updatedPatient) {
    // Update the pinned patient footer if it exists
    const pinnedName = document.getElementById('pinned-name');
    const pinnedDob = document.getElementById('pinned-dob');
    const pinnedAge = document.getElementById('pinned-age');
    const pinnedPhone = document.getElementById('pinned-phone');
    
    if (pinnedName) {
        pinnedName.textContent = updatedPatient['Patient Name'] || updatedPatient.patientName || 'Unknown';
    }
    if (pinnedDob) {
        pinnedDob.textContent = updatedPatient['DOB'] || updatedPatient.dob ? formatDate(updatedPatient['DOB'] || updatedPatient.dob) : '-';
    }
    if (pinnedAge) {
        pinnedAge.textContent = updatedPatient['Age'] || updatedPatient.age || '-';
    }
    if (pinnedPhone) {
        pinnedPhone.textContent = updatedPatient['Phone Number'] || updatedPatient.phone || '-';
    }
}

/**
 * Update any patient references in tasks, notes, etc.
 */
function updatePatientReferences(patientName, editedData) {
    if (!patientName) return;
    
    // Update tasks that reference this patient
    let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    let tasksUpdated = false;
    tasks.forEach((task, idx) => {
        if (task.patientName === patientName || task.patient === patientName) {
            tasks[idx] = {...task, patientName: editedData.patientName || editedData['Patient Name'] || patientName, lastModified: new Date().toISOString()};
            tasksUpdated = true;
        }
    });
    if (tasksUpdated) {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Update notes that reference this patient
    let notes = JSON.parse(localStorage.getItem('notes') || '[]');
    let notesUpdated = false;
    notes.forEach((note, idx) => {
        if (note.patientName === patientName || note.patient === patientName) {
            notes[idx] = {...note, patientName: editedData.patientName || editedData['Patient Name'] || patientName, lastModified: new Date().toISOString()};
            notesUpdated = true;
        }
    });
    if (notesUpdated) {
        localStorage.setItem('notes', JSON.stringify(notes));
    }
}

/**
 * Cancel edit mode
 */
function cancelEditMode(index) {
    // Simply refresh the patient detail view to discard changes
    closePatientDetail();
    showPatientDetail(index);
}

/**
 * Close patient detail modal
 */
function closePatientDetail() {
    const modal = document.querySelector('.patient-detail-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Pin patient from detail view
 */
function pinPatientFromDetail(index) {
    pinPatient(index);
    closePatientDetail();
}

/**
 * Create task from detail view
 */
function createTaskFromDetail(index) {
    createTaskForPatient(index);
}

/**
 * Create event from detail view
 */
function createEventFromDetail(index) {
    createEventForPatient(index);
}

/**
 * Edit patient information
 */
function editPatient(index) {
    // Close detail view
    closePatientDetail();
    
    // Switch to patient intake tab
    switchTab('patient-intake', document.querySelector('[data-tab="patient-intake"]'));
    
    // Load patient data into form
    setTimeout(() => {
        let patient = null;
        if (currentData.active && currentData.active[index]) {
            patient = currentData.active[index];
        } else {
            const storedPatients = JSON.parse(localStorage.getItem('activePatients') || '[]');
            if (storedPatients[index]) {
                patient = storedPatients[index];
            }
        }
        
        if (patient) {
            // Fill the intake form with patient data
            const form = document.getElementById('patient-intake-form');
            if (form) {
                // Map the data to form fields
                form.elements['patientName'].value = patient['Patient Name'] || patient.patientName || '';
                form.elements['dob'].value = patient['DOB'] || patient.dob || '';
                form.elements['age'].value = patient['Age'] || patient.age || '';
                form.elements['gender'].value = patient.gender || '';
                form.elements['address'].value = patient.address || '';
                form.elements['city'].value = patient.city || '';
                form.elements['state'].value = patient.state || '';
                form.elements['zip'].value = patient.zip || '';
                form.elements['phone'].value = patient['Phone Number'] || patient.phone || '';
                form.elements['email'].value = patient['Email'] || patient.email || '';
                form.elements['primaryContact'].value = patient.primaryContact || '';
                form.elements['primaryContactPhone'].value = patient.primaryContactPhone || '';
                form.elements['primaryContactRelation'].value = patient.primaryContactRelation || '';
                form.elements['diagnosis'].value = patient.diagnosis || '';
                form.elements['secondaryDiagnosis'].value = patient.secondaryDiagnosis || '';
                form.elements['symptoms'].value = patient.symptoms || '';
                form.elements['medicalHistory'].value = patient.medicalHistory || '';
                form.elements['medications'].value = patient.medications || '';
                form.elements['allergies'].value = patient.allergies || '';
                form.elements['prognosis'].value = patient.prognosis || '';
                form.elements['cpDoctor'].value = patient['CP Doctor'] || patient.cpDoctor || '';
                form.elements['referringPhysician'].value = patient.referringPhysician || '';
                form.elements['hospice'].value = patient['Hospice'] || patient.hospice || '';
                form.elements['hospiceNurse'].value = patient.hospiceNurse || '';
                form.elements['socialWorker'].value = patient.socialWorker || '';
                form.elements['doula'].value = patient.doula || '';
                form.elements['medicalId'].value = patient.medicalId || '';
                form.elements['invoiceAmount'].value = patient['Invoice amount'] || patient.invoiceAmount || '';
                form.elements['paymentStatus'].value = patient.paymentStatus || 'Pending';
                form.elements['intakeDate'].value = patient['Ingestion Date'] || patient.intakeDate || '';
                form.elements['intakeStaff'].value = patient.intakeStaff || '';
                form.elements['priority'].value = patient.priority || 'Standard';
                form.elements['specialNeeds'].value = patient.specialNeeds || '';
                form.elements['notes'].value = patient.notes || '';
                
                showNotification('Patient data loaded for editing', 'info');
            }
        }
    }, 500);
}

function downloadForm(formType) {
    // This function handles PDF downloads from the forms folder
    
    const formNames = {
        'gaja-regular-dose': 'Gaja - Regular Dose',
        'gaja-high-dose': 'Gaja - High Dose',
        'von-gunten-regular-dose': 'Von Gunten - Regular Dose',
        'von-gunten-high-dose': 'Von Gunten - High Dose',
        'unknown-cp-regular-dose': 'Unknown CP - Regular Dose',
        'unknown-cp-high-dose': 'Unknown CP - High Dose'
    };
    
    // Map to your actual PDF file names
    const pdfFileNames = {
        'gaja-regular-dose': 'Gaja - Reguler Dose.pdf',
        'gaja-high-dose': 'Gaja - High Dose .pdf',
        'von-gunten-regular-dose': 'Von Gunten - Reguler Dose .pdf',
        'von-gunten-high-dose': 'Von Gunten - High Dose .pdf',
        'unknown-cp-regular-dose': 'Unknown CP - Regular Dose .pdf',
        'unknown-cp-high-dose': 'Unknown CP - High Dose .pdf'
    };
    
    const formName = formNames[formType] || 'Form';
    const pdfFileName = pdfFileNames[formType] || `${formType}.pdf`;
    const pdfPath = `/forms/${pdfFileName}`;
    
    // Check if the PDF file exists
    fetch(pdfPath, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                // PDF exists, download it
                const link = document.createElement('a');
                link.href = pdfPath;
                link.download = pdfFileName;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showNotification(`${formName} downloaded successfully!`, 'success');
            } else {
                // PDF doesn't exist, show placeholder message
                showNotification(`${formName} PDF not found. Please add the PDF file to the forms folder.`, 'warning');
                
                // Create a temporary download link with instructions
                const link = document.createElement('a');
                link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(`${formName}\n\nPDF file not found: ${pdfFileName}\n\nTo add this PDF:\n1. Place ${pdfFileName} in the 'forms' folder\n2. Restart the server\n3. Try downloading again`)}`;
                link.download = `${formName}-instructions.txt`;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        })
        .catch(error => {
            console.error('Error checking PDF:', error);
            showNotification(`Error downloading ${formName}. Please try again.`, 'error');
        });
} 

function downloadCompletedForm(patientId) {
    // This function downloads the completed form for a specific patient
    const patients = JSON.parse(localStorage.getItem('activePatients') || '[]');
    const patient = patients[patientId];
    
    if (!patient) {
        showNotification('Patient not found', 'error');
        return;
    }
    
    const patientName = patient['Patient Name'] || patient.patientName || 'Unknown Patient';
    const doseLevel = patient.doseLevel || 'regular';
    
    // Map to your actual PDF file names
    let pdfFileName;
    let formName;
    
    if (doseLevel === 'high') {
        pdfFileName = 'Gaja - High Dose .pdf';
        formName = 'Gaja - High Dose';
    } else {
        pdfFileName = 'Gaja - Reguler Dose.pdf';
        formName = 'Gaja - Regular Dose';
    }
    
    const pdfPath = `/forms/${pdfFileName}`;
    
    // Check if the PDF file exists
    fetch(pdfPath, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                // PDF exists, download it
                const link = document.createElement('a');
                link.href = pdfPath;
                link.download = `${patientName}-${formName}.pdf`;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showNotification(`${formName} downloaded for ${patientName}!`, 'success');
            } else {
                // PDF doesn't exist, show placeholder message
                showNotification(`${formName} PDF not found. Please add the PDF file to the forms folder.`, 'warning');
                
                // Create a temporary download link with instructions
                const link = document.createElement('a');
                link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(`${patientName} - ${formName}\n\nPDF file not found: ${pdfFileName}\n\nTo add this PDF:\n1. Place ${pdfFileName} in the 'forms' folder\n2. Restart the server\n3. Try downloading again`)}`;
                link.download = `${patientName}-${formName}-instructions.txt`;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        })
        .catch(error => {
            console.error('Error checking PDF:', error);
            showNotification(`Error downloading ${formName} for ${patientName}. Please try again.`, 'error');
        });
} 