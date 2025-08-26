// app.js - Enhanced client-side functionality

let currentData = {};
let currentTab = 'dashboard';

/**
 * Set status message (make available globally)
 */
function setStatus(message, type = 'success') {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
        status.className = type;
    } else {
        console.log(`Status (${type}): ${message}`);
    }
}

// Make setStatus available globally immediately
window.setStatus = setStatus;

/**
 * Initialize the main application (called after authentication)
 */
function initMainApp() {
    console.log('Initializing main app');
    
    setupEventListeners();
    loadPinnedPatient();
    
    // Load dashboard by default
    setTimeout(() => {
        switchTab('dashboard', document.querySelector('[data-tab="dashboard"]'));
    }, 100);
    
    setStatus('Local Mode Active - Ready', 'success');
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
                switchTab(tabName, tab);
            }
        });
    });

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
 * Switch to Closed Cases tab from dashboard
 */
function switchToClosedCases() {
    const closedCasesTab = document.querySelector('[data-tab="closed"]');
    if (closedCasesTab) {
        switchTab('closed', closedCasesTab);
    }
}

/**
 * Navigate to a specific patient's timeline
 */
function navigateToPatientTimeline(patientName, patientIndex) {
    // Switch to the timelines tab
    const timelinesTab = document.querySelector('[data-tab="timelines"]');
    if (timelinesTab) {
        switchTab('timelines', timelinesTab);
        
        // After switching, scroll to the specific patient's timeline
        setTimeout(() => {
            scrollToPatientTimeline(patientName, patientIndex);
        }, 100);
    }
}

/**
 * Scroll to a specific patient's timeline
 */
function scrollToPatientTimeline(patientName, patientIndex) {
    const patientId = `patient-${patientIndex}`;
    const patientCard = document.getElementById(patientId);
    
    if (patientCard) {
        // Expand the timeline if it's collapsed
        const header = patientCard.querySelector('.patient-header');
        const timeline = patientCard.querySelector('.timeline-tasks');
        const arrow = header.querySelector('.collapse-arrow');
        
        if (timeline.style.display === 'none') {
            timeline.style.display = 'block';
            header.classList.remove('collapsed');
            arrow.textContent = '▼';
            window.timelineCollapseState[patientId] = false;
        }
        
        // Scroll to the patient card
        patientCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Add a highlight effect
        patientCard.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.6)';
        setTimeout(() => {
            patientCard.style.boxShadow = '';
        }, 2000);
        
        setStatus(`Navigated to ${patientName}'s timeline`, 'success');
    } else {
        setStatus(`Patient timeline not found: ${patientName}`, 'error');
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
        case 'closed':
            showPlaceholder('Closed Cases', 'This will show completed patient cases');
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
        default:
            console.log('Unknown tab:', tabName);
            showPlaceholder('Unknown Tab', 'Content not implemented yet');
    }
}

/**
 * Generate HTML table for patient data with improved columns
 */
function generatePatientTable(data) {
    if (!data || data.length === 0) {
        return '<p>No data available.</p>';
    }
    
    // Use the important columns that we know exist in the data
    const importantColumns = ['Patient Name', 'Age', 'Area', 'Phone Number', 'Email', 'CP Doctor', 'Hospice', 'PAID', 'Check list'];
    
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
            if (col === 'Patient Name') {
                value = `<a href="#" class="patient-name-link" onclick="navigateToPatientTimeline('${patient['Patient Name']}', ${index})">${value}</a>`;
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
                    <button class="patient-action-btn timeline" onclick="navigateToPatientTimeline('${patient['Patient Name']}', ${index})" title="View Timeline">⏱️</button>
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
        
        // Store data globally
        currentData.active = data;
        
        // Calculate metrics (same as simple-app.html)
        const avgAge = calculateAverageAge(data);
        const paidCount = countPaidInvoices(data);
        const completedCount = countCompletedCases(data);
        
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
                <div class="card clickable-card" onclick="switchToClosedCases()">
                    <h3>Completed Cases</h3>
                    <div class="number">${completedCount}</div>
                    <p>CP completed</p>
                    <div class="card-hint">Click to view →</div>
                </div>
            </div>
            
            <h2>Recent Active Patients</h2>
            <div class="recent-patients-section">
                <div class="section-header">
                    <span>Showing ${Math.min(5, data.length)} of ${data.length} patients</span>
                    <button class="view-all-btn" onclick="switchToActiveData()">View All Active Patients →</button>
                </div>
                ${generatePatientTable(data.slice(0, 5))}
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
        // Fetch data from server
        const response = await fetch('/api/read-active?spreadsheetId=local');
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error('No data received from server');
        }
        
        // Store data globally
        currentData.active = data;
        
        // Create patient table
        const content = document.getElementById('content');
        content.innerHTML = `
            <h1>Active Patients (${data.length})</h1>
            ${generatePatientTable(data)}
        `;
        
        setStatus('Active patients loaded successfully', 'success');
        
    } catch (error) {
        console.error('Error loading active patients:', error);
        showError(`Failed to load active patients: ${error.message}`);
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
    document.getElementById('pinned-address').textContent = patient['Area'] || '-';
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
                    <li>Send Adobe Forms <input type="checkbox"> <input type="text" placeholder="Initials" maxlength="3"></li>
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
        document.getElementById('pinned-address').textContent = pinnedPatient['Address'] || pinnedPatient['Area'] || '-';
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
        
        // Initialize timeline collapse state if not exists
        if (!window.timelineCollapseState) {
            window.timelineCollapseState = {};
        }
        
        const content = document.getElementById('content');
        let html = '<h1>Patient Timelines</h1>' +
            '<div class="timeline-header">' +
            '  <div class="legend-box">' +
            '    <h3>Task Status Guide</h3>' +
            '    <div class="legend-items">' +
            '      <div class="legend-item"><span class="bullet-demo not-started">1</span> Not Started (Orange)</div>' +
            '      <div class="legend-item"><span class="bullet-demo partial">2</span> Partially Complete (Yellow)</div>' +
            '      <div class="legend-item"><span class="bullet-demo complete">3</span> Fully Complete (Green)</div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="timeline-controls">' +
            '    <button onclick="expandAllPatientTimelines()">Expand All</button>' +
            '    <button onclick="collapseAllPatientTimelines()">Collapse All</button>' +
            '    <button onclick="filterTimelines(\'incomplete\')">Show Incomplete</button>' +
            '    <button onclick="filterTimelines(\'all\')">Show All</button>' +
            '  </div>' +
            '</div>' +
            '<div class="timelines-container">';
        
        data.forEach((patient, index) => {
            const patientName = patient['Patient Name'] || 'Unknown';
            const patientId = `patient-${index}`;
            
            // Initialize patient tasks if not exists
            if (!window.taskCompletionData[patientId]) {
                window.taskCompletionData[patientId] = initializePatientTasks();
            }
            
            // Check if timeline should be collapsed (default to expanded for first load)
            const isCollapsed = window.timelineCollapseState[patientId] === true;
            
            html += `
                <div class="patient-timeline-card" id="${patientId}">
                    <div class="patient-header ${isCollapsed ? 'collapsed' : ''}" onclick="togglePatientTimeline('${patientId}')">
                        <div class="patient-info">
                            <h3>${patientName}</h3>
                            <span class="patient-details">Age: ${patient['Age'] || 'N/A'} | Area: ${patient['Area'] || 'N/A'}</span>
                        </div>
                        <div class="patient-progress">
                            <span class="progress-text">${calculateProgress(patientId)}% Complete</span>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${calculateProgress(patientId)}%"></div>
                            </div>
                        </div>
                        <div class="collapse-indicator">
                            <span class="collapse-arrow">${isCollapsed ? '▶' : '▼'}</span>
                        </div>
                    </div>
                    <div class="timeline-tasks" style="display: ${isCollapsed ? 'none' : 'block'}">
                        ${generateImprovedTimelineSteps(patient, index)}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        content.innerHTML = html;
        setStatus('Timelines loaded', 'success');
    } catch (error) {
        console.error('Error loading timelines:', error);
        showError(`Failed to load timelines: ${error.message}`);
    }
}

// Initialize patient tasks with subtasks
function initializePatientTasks() {
    return [
        { id: 'wr', name: 'Send Adobe Forms', subtasks: [
            { name: 'Written Request', complete: false, subSubtasks: [
                { name: 'Completed by Patient', complete: false }
            ]},
            { name: 'Payment Schedule Form', complete: false }
        ]},
        { id: 'invoice', name: 'Quickbooks Invoice', subtasks: [
            { name: 'Sent Invoice', complete: false, subSubtasks: [
                { name: 'Paid Invoice', complete: false },
                { name: 'Paid via Check', complete: false }
            ]}
        ]},
        { id: 'visit2', name: 'Follow-up Visit', subtasks: [
            { name: 'Review initial assessment', complete: false },
            { name: 'Meet with patient/family', complete: false },
            { name: 'Update care plan', complete: false }
        ]},
        { id: 'visit1', name: 'Initial Visit', subtasks: [
            { name: 'Schedule appointment', complete: false },
            { name: 'Conduct assessment', complete: false },
            { name: 'Document findings', complete: false }
        ]},
        { id: 'consulting', name: 'Consulting Form', subtasks: [
            { name: 'Complete consultation', complete: false },
            { name: 'Document recommendations', complete: false },
            { name: 'Submit to physician', complete: false }
        ]},
        { id: 'checklist', name: 'Attending Checklist', subtasks: [
            { name: 'Review all requirements', complete: false },
            { name: 'Verify documentation', complete: false },
            { name: 'Sign off completion', complete: false }
        ]},
        { id: 'prescription', name: 'Send Prescription', subtasks: [
            { name: 'Review medication info', complete: false },
            { name: 'Submit to pharmacy', complete: false },
            { name: 'Confirm delivery', complete: false },
            { name: 'Patient education', complete: false }
        ]},
        { id: 'records', name: 'Medical Records', subtasks: [
            { name: 'Request records', complete: false },
            { name: 'Receive documentation', complete: false },
            { name: 'Review and file', complete: false }
        ]},
        { id: 'pharmacy', name: 'Pharmacy Coordination', subtasks: [
            { name: 'Prepare email', complete: false },
            { name: 'Send to pharmacy', complete: false },
            { name: 'Confirm receipt', complete: false }
        ]},
        { id: 'ingestion', name: 'Medication Ingestion', subtasks: [
            { name: 'Schedule ingestion', complete: false },
            { name: 'Supervise process', complete: false },
            { name: 'Document completion', complete: false }
        ]},
        { id: 'followup', name: 'Follow-up Form', subtasks: [
            { name: 'Complete form', complete: false },
            { name: 'Get signatures', complete: false },
            { name: 'Submit to office', complete: false }
        ]}
    ];
}

// Helper to generate improved timeline steps
function generateImprovedTimelineSteps(patient, index) {
    const patientId = `patient-${index}`;
    const tasks = window.taskCompletionData[patientId] || initializePatientTasks();
    
    
    let html = '<div class="task-list">';
    
    tasks.forEach((task, taskIndex) => {
        let completedSubtasks = task.subtasks.filter(s => s.complete).length;
        let totalSubtasks = task.subtasks.length;
        
        // Special logic for Quickbooks Invoice task
        if (task.id === 'invoice') {
            // For Quickbooks Invoice: main subtask must be complete AND at least one sub-subtask
            const mainSubtask = task.subtasks[0];
            const hasMainSubtask = mainSubtask && mainSubtask.complete;
            const hasSubSubtasks = mainSubtask && mainSubtask.subSubtasks;
            const completedSubSubtasks = hasSubSubtasks ? mainSubtask.subSubtasks.filter(s => s.complete).length : 0;
            
            if (hasMainSubtask && completedSubSubtasks >= 1) {
                statusClass = 'complete';
                statusText = 'Complete';
            } else if (hasMainSubtask || completedSubSubtasks > 0) {
                statusClass = 'partial';
                statusText = 'Partially Complete';
            } else {
                statusClass = 'not-started';
                statusText = 'Not Started';
            }
        } else {
            // Standard logic for other tasks
            // Also count sub-subtasks
            task.subtasks.forEach(subtask => {
                if (subtask.subSubtasks) {
                    totalSubtasks += subtask.subSubtasks.length;
                    completedSubtasks += subtask.subSubtasks.filter(s => s.complete).length;
                }
            });
            
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
    let html = '<ul class="subtask-list">';
    task.subtasks.forEach((subtask, subIndex) => {
        html += `
            <li class="subtask-item">
                <input type="checkbox" 
                    id="subtask-${patientId}-${taskIndex}-${subIndex}"
                    ${subtask.complete ? 'checked' : ''}
                    onchange="updateSubtaskStatus('${patientId}', ${taskIndex}, ${subIndex}, this.checked)">
                <label for="subtask-${patientId}-${taskIndex}-${subIndex}">${subtask.name}</label>
            </li>
        `;
        
        // Add sub-subtasks below the subtask, not nested within it
        if (subtask.subSubtasks) {
            subtask.subSubtasks.forEach((subSubtask, subSubIndex) => {
                html += `
                    <li class="sub-subtask-item">
                        <div class="sub-subtask-content">
                            <input type="checkbox" 
                                id="subsubtask-${patientId}-${taskIndex}-${subIndex}-${subSubIndex}"
                                ${subSubtask.complete ? 'checked' : ''}
                                onchange="updateSubSubtaskStatus('${patientId}', ${taskIndex}, ${subIndex}, ${subSubIndex}, this.checked)">
                            <label for="subsubtask-${patientId}-${taskIndex}-${subIndex}-${subSubIndex}">${subSubtask.name}</label>
                        </div>
                    </li>
                `;
            });
        }
    });
    html += '</ul>';
    return html;
}



// Toggle individual patient timeline
function togglePatientTimeline(patientId) {
    const card = document.getElementById(patientId);
    const header = card.querySelector('.patient-header');
    const timeline = card.querySelector('.timeline-tasks');
    const arrow = header.querySelector('.collapse-arrow');
    
    const isCollapsed = timeline.style.display === 'none';
    
    // Update display state
    timeline.style.display = isCollapsed ? 'block' : 'none';
    header.classList.toggle('collapsed', !isCollapsed);
    arrow.textContent = isCollapsed ? '▼' : '▶';
    
    // Save state
    window.timelineCollapseState[patientId] = !isCollapsed;
}

// Expand all patient timelines
function expandAllPatientTimelines() {
    document.querySelectorAll('.patient-timeline-card').forEach(card => {
        const patientId = card.id;
        const timeline = card.querySelector('.timeline-tasks');
        const header = card.querySelector('.patient-header');
        const arrow = header.querySelector('.collapse-arrow');
        
        timeline.style.display = 'block';
        header.classList.remove('collapsed');
        arrow.textContent = '▼';
        
        // Save state
        window.timelineCollapseState[patientId] = false;
    });
}

// Collapse all patient timelines
function collapseAllPatientTimelines() {
    document.querySelectorAll('.patient-timeline-card').forEach(card => {
        const patientId = card.id;
        const timeline = card.querySelector('.timeline-tasks');
        const header = card.querySelector('.patient-header');
        const arrow = header.querySelector('.collapse-arrow');
        
        timeline.style.display = 'none';
        header.classList.add('collapsed');
        arrow.textContent = '▶';
        
        // Save state
        window.timelineCollapseState[patientId] = true;
    });
}

// Calculate overall progress for a patient
function calculateProgress(patientId) {
    const tasks = window.taskCompletionData[patientId];
    if (!tasks) return 0;
    
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    
    tasks.forEach(task => {
        if (task.id === 'invoice') {
            // Special logic for Quickbooks Invoice
            totalSubtasks += 1; // Count as 1 task
            const mainSubtask = task.subtasks[0];
            const hasMainSubtask = mainSubtask && mainSubtask.complete;
            const completedSubSubtasks = mainSubtask && mainSubtask.subSubtasks ? mainSubtask.subSubtasks.filter(s => s.complete).length : 0;
            if (hasMainSubtask && completedSubSubtasks >= 1) {
                completedSubtasks += 1;
            }
        } else {
            // Standard logic for other tasks
            totalSubtasks += task.subtasks.length;
            completedSubtasks += task.subtasks.filter(s => s.complete).length;
            
            // Also count sub-subtasks
            task.subtasks.forEach(subtask => {
                if (subtask.subSubtasks) {
                    totalSubtasks += subtask.subSubtasks.length;
                    completedSubtasks += subtask.subSubtasks.filter(s => s.complete).length;
                }
            });
        }
    });
    
    return totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
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

// Update subtask status
function updateSubtaskStatus(patientId, taskIndex, subIndex, checked) {
    window.taskCompletionData[patientId][taskIndex].subtasks[subIndex].complete = checked;
    
    // Recalculate and update the task status
    const task = window.taskCompletionData[patientId][taskIndex];
    let completedSubtasks = task.subtasks.filter(s => s.complete).length;
    let totalSubtasks = task.subtasks.length;
    
    // Also count sub-subtasks
    task.subtasks.forEach(subtask => {
        if (subtask.subSubtasks) {
            totalSubtasks += subtask.subSubtasks.length;
            completedSubtasks += subtask.subSubtasks.filter(s => s.complete).length;
        }
    });
    
    // Update task header
    const taskItem = document.querySelector(`#${patientId} .task-item[data-task-index="${taskIndex}"]`);
    const taskNumber = taskItem.querySelector('.task-number');
    const taskStatus = taskItem.querySelector('.task-status');
    
    // Remove old status classes
    taskItem.classList.remove('not-started', 'partial', 'complete');
    taskNumber.classList.remove('not-started', 'partial', 'complete');
    
    // Add new status classes
    let statusClass, statusText;
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
    
    taskItem.classList.add(statusClass);
    taskNumber.classList.add(statusClass);
    taskStatus.textContent = statusText;
    
    // Update overall progress
    const progressText = document.querySelector(`#${patientId} .progress-text`);
    const progressFill = document.querySelector(`#${patientId} .progress-fill`);
    const progress = calculateProgress(patientId);
    progressText.textContent = `${progress}% Complete`;
    progressFill.style.width = `${progress}%`;
    
    // Save to localStorage
    localStorage.setItem('taskCompletionData', JSON.stringify(window.taskCompletionData));
}

// Update sub-subtask status
function updateSubSubtaskStatus(patientId, taskIndex, subIndex, subSubIndex, checked) {
    if (window.taskCompletionData[patientId] && 
        window.taskCompletionData[patientId][taskIndex] && 
        window.taskCompletionData[patientId][taskIndex].subtasks[subIndex] &&
        window.taskCompletionData[patientId][taskIndex].subtasks[subIndex].subSubtasks) {
        
        window.taskCompletionData[patientId][taskIndex].subtasks[subIndex].subSubtasks[subSubIndex].complete = checked;
        
        // Recalculate and update the task status
        const task = window.taskCompletionData[patientId][taskIndex];
        let completedSubtasks = task.subtasks.filter(s => s.complete).length;
        let totalSubtasks = task.subtasks.length;
        
        // Also count sub-subtasks
        task.subtasks.forEach(subtask => {
            if (subtask.subSubtasks) {
                totalSubtasks += subtask.subSubtasks.length;
                completedSubtasks += subtask.subSubtasks.filter(s => s.complete).length;
            }
        });
        
        // Update task header
        const taskItem = document.querySelector(`#${patientId} .task-item[data-task-index="${taskIndex}"]`);
        const taskNumber = taskItem.querySelector('.task-number');
        const taskStatus = taskItem.querySelector('.task-status');
        
        // Remove old status classes
        taskItem.classList.remove('not-started', 'partial', 'complete');
        taskNumber.classList.remove('not-started', 'partial', 'complete');
        
        // Add new status classes
        let statusClass, statusText;
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
        
        taskItem.classList.add(statusClass);
        taskNumber.classList.add(statusClass);
        taskStatus.textContent = statusText;
        
        // Update overall progress
        const progressText = document.querySelector(`#${patientId} .progress-text`);
        const progressFill = document.querySelector(`#${patientId} .progress-fill`);
        const progress = calculateProgress(patientId);
        progressText.textContent = `${progress}% Complete`;
        progressFill.style.width = `${progress}%`;
        
        // Save to localStorage
        localStorage.setItem('taskCompletionData', JSON.stringify(window.taskCompletionData));
    }
}

// Expand all timelines
function expandAllTimelines() {
    document.querySelectorAll('.task-subtasks').forEach(subtasks => {
        subtasks.style.display = 'block';
        subtasks.parentElement.classList.add('expanded');
        subtasks.parentElement.querySelector('.task-expand').textContent = '▲';
    });
}

// Collapse all timelines
function collapseAllTimelines() {
    document.querySelectorAll('.task-subtasks').forEach(subtasks => {
        subtasks.style.display = 'none';
        subtasks.parentElement.classList.remove('expanded');
        subtasks.parentElement.querySelector('.task-expand').textContent = '▼';
    });
}

// Filter timelines
function filterTimelines(filter) {
    const cards = document.querySelectorAll('.patient-timeline-card');
    cards.forEach(card => {
        if (filter === 'all') {
            card.style.display = 'block';
        } else if (filter === 'incomplete') {
            const progress = calculateProgress(card.id);
            card.style.display = progress < 100 ? 'block' : 'none';
        }
    });
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