# Alyssa's Dashboard - Hospice Patient Management System

A lightweight, local-first web application for managing hospice patient data with a Notion-like interface. Built with vanilla JavaScript, Node.js, and Excel integration for simplicity and reliability.

## 🎯 Project Overview

This dashboard application reads patient data from a local Excel file (`Dashboard Clone.xlsx`) and provides a modern web interface for viewing and managing hospice patient information. It's designed to be simple, crash-resistant, and work entirely offline with optional Google Sheets integration.

## ✨ Features

- **📊 Dashboard Overview**: Summary cards showing active patients, average age, paid invoices, and completed cases
- **👥 Patient Management**: View detailed patient information with filtering and search
- **📌 Pinned Patient Footer**: Quick access to key patient details (horizontal layout)
- **📝 Notes & Tasks**: Local task management with localStorage persistence
- **📅 Calendar Integration**: Mock calendar events for patient follow-ups
- **🔍 Search Functionality**: Real-time search across all patient data
- **💾 Local-First**: Works entirely offline using local Excel file
- **🌐 Google Sheets Sync**: Optional integration with Google Sheets API

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend**: Node.js with Express server
- **Data Source**: Excel files (`.xlsx`) via SheetJS library
- **Optional**: Google Sheets API integration
- **Styling**: Custom CSS with modern design patterns

### Project Structure
```
Aly Notion/
├── public/                 # Frontend files
│   ├── index.html         # Main application
│   ├── simple-app.html    # Simplified dashboard (working version)
│   ├── simple-test.html   # Basic data test page
│   ├── app.js             # Main application logic
│   ├── auth.js            # Authentication (local mode)
│   └── styles.css         # Application styles
├── server.js              # Express server
├── sync.js                # Excel file reading logic
├── Dashboard Clone.xlsx   # Main data source
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Excel file with patient data (`Dashboard Clone.xlsx`)

### Installation
1. Clone or download the project files
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install express xlsx dotenv
   ```

### Running the Application
1. Start the server:
   ```bash
   node server.js
   ```
2. Open your browser and navigate to:
   - **Main App**: http://localhost:3000
   - **Simple Dashboard**: http://localhost:3000/simple-app.html
   - **Data Test**: http://localhost:3000/simple-test.html

## 📊 Data Structure

The application reads from `Dashboard Clone.xlsx` with the following sheets:
- **Active**: Current patient cases
- **Past patient Outreach**: Historical outreach records
- **Consulting Docs**: Doctor directory
- **Closed**: Completed cases
- **Outstanding**: Pending cases
- **Call Log**: Communication history

### Key Data Fields
- `Patient Name`: Primary identifier
- `Age`: Patient age
- `City`: Geographic location
- `CP Doctor`: Consulting physician
- `Hospice`: Hospice provider
- `PAID`: Payment status (yes/no)
- `Check list`: Completion status
- `DOB`: Date of birth
- `Ingestion Date`: Data entry date
- `Invoice amount`: Billing amount

## 🎨 User Interface

### Dashboard Cards
- **Active Patients**: Total count of current cases
- **Average Age**: Calculated from all patients
- **Paid Invoices**: Count of paid vs total invoices
- **Completed Cases**: Cases with complete checklists

### Patient Table
- Displays key patient information in a sortable table
- Action buttons for pinning, creating tasks, and calendar events
- Visual indicators for status (✅/❌ icons)

### Pinned Patient Footer
- Horizontal layout showing detailed patient information
- Quick access to patient details, contact info, and care team
- Action buttons for tasks, calendar events, calls, and emails

## 🔧 Technical Details

### Server (server.js)
- Express.js server running on port 3000
- Single API endpoint: `/api/read-active`
- Serves static files from `public/` directory
- Handles XLSX file reading via `sync.js`

### Data Processing (sync.js)
- Reads Excel files using SheetJS (xlsx library)
- Converts spreadsheet data to JSON objects
- Handles multiple sheets and data types
- Local-first approach with Google Sheets fallback

### Frontend (app.js)
- Vanilla JavaScript for maximum compatibility
- Modular function structure
- Event-driven architecture
- localStorage for local data persistence

### Styling (styles.css)
- Modern CSS with flexbox and grid layouts
- Responsive design for different screen sizes
- Custom color scheme and typography
- Hover effects and smooth transitions

## 🌐 Google Sheets Integration (Optional)

### Setup Instructions
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API, Calendar API, and Tasks API
4. Create OAuth 2.0 Client ID (Web application)
5. Add `http://localhost:3000` to authorized origins
6. Update `CLIENT_ID` in `auth.js`

### API Scopes
- `https://www.googleapis.com/auth/spreadsheets.readonly`
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/tasks`

## 📱 Features Detail

### Dashboard Tab
- Overview cards with key metrics
- Recent patient table (first 5 patients)
- Responsive grid layout

### Active - Data Tab
- Complete patient table with all records
- Sortable columns
- Action buttons for each patient

### Active - Todo Tab
- Workflow tracking system
- 9 workflow cards for different stages
- Checkbox completion with initials and dates
- Export functionality to CSV format

### Notes & Tasks
- User-specific task lists (Alyssa, Dr. Donnie)
- Priority levels and due dates
- Local storage persistence
- Task completion tracking

### Calendar
- Mock calendar events
- Patient-specific event creation
- Integration with Google Calendar API (optional)

## 🔍 Search & Filter

### Search Functionality
- Real-time search across all patient data
- Searches names, areas, doctors, and other fields
- Debounced input for performance
- Results highlighting

### Filter Options
- Tab-based filtering (Active, Closed, Outstanding, etc.)
- Status-based filtering (Paid, Completed, etc.)

## 💾 Data Persistence

### Local Storage
- Task and note data stored in browser
- Workflow progress tracking
- Pinned patient information
- Calendar events (mock mode)

### Excel File Integration
- Primary data source: `Dashboard Clone.xlsx`
- Read-only access to prevent data corruption
- Automatic refresh on file changes

## 🎯 Design Principles

### Simplicity First
- Minimal dependencies to reduce crashes
- Vanilla JavaScript over complex frameworks
- Direct API calls without heavy abstractions

### Local-First Approach
- Works entirely offline
- No cloud dependencies required
- Fast loading and response times

### Error Handling
- Comprehensive try-catch blocks
- Graceful fallbacks for missing data
- Clear error messages for debugging

### Modularity
- Small, focused functions
- Separate concerns (auth, data, UI)
- Easy to maintain and extend

## 🐛 Troubleshooting

### Common Issues

**Dashboard not loading:**
- Check if server is running on port 3000
- Verify `Dashboard Clone.xlsx` exists in project root
- Check browser console for error messages

**No data showing:**
- Confirm Excel file has "Active" sheet
- Check server logs for file reading errors
- Test with simple-test.html page

**Port conflicts:**
- Change port in `server.js` if 3000 is occupied
- Update any hardcoded URLs in frontend files

### Debug Tools
- **Test API Button**: Red button in top-right corner
- **Simple Test Page**: http://localhost:3000/simple-test.html
- **Browser Console**: F12 for detailed error logs
- **Server Logs**: Check terminal for backend errors

## 📈 Performance Considerations

### Optimization Strategies
- Debounced search input (300ms delay)
- Lazy loading for large datasets
- Efficient DOM manipulation
- Minimal CSS and JavaScript

### Memory Management
- Proper event listener cleanup
- Avoid memory leaks in long-running sessions
- Efficient data structures

## 🔒 Security & Privacy

### HIPAA Considerations
- Local-only data processing
- No external data transmission (local mode)
- Secure device recommendations
- Data encryption at rest (OS-level)

### Best Practices
- Use on secure, private networks
- Regular data backups
- Access control via device security
- Audit trail through server logs

## 🚀 Future Enhancements

### Planned Features
- [ ] Chart.js integration for visual analytics
- [ ] Advanced search filters
- [ ] Data export functionality
- [ ] Multi-user collaboration
- [ ] Mobile-responsive improvements
- [ ] Automated backup system

### Technical Improvements
- [ ] Unit testing with Jest
- [ ] TypeScript conversion
- [ ] Progressive Web App (PWA) features
- [ ] Offline synchronization
- [ ] Real-time updates

## 📝 Development Notes

### Code Style
- ES6+ syntax throughout
- Consistent naming conventions
- Comprehensive JSDoc comments
- Modular function organization

### Testing Strategy
- Manual testing with real data
- Browser compatibility testing
- Performance testing with large datasets
- Error condition testing

### Deployment Options
- Local development server (current)
- Electron app for desktop distribution
- Docker containerization
- Cloud deployment (with data privacy considerations)

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit pull request with detailed description

### Code Standards
- Use vanilla JavaScript (no frameworks)
- Follow existing code style
- Add comments for complex logic
- Test all changes manually

## 📞 Support

For technical issues or questions:
1. Check browser console for errors
2. Review server logs
3. Test with simple-test.html
4. Verify Excel file structure
5. Check network connectivity (if using Google Sheets)

## 📄 License

This project is for internal use. All patient data should be handled according to HIPAA and other applicable privacy regulations.

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Server**: Node.js/Express
**Frontend**: Vanilla JavaScript
**Data**: Excel (XLSX) + Optional Google Sheets 