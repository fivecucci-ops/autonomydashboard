openapi: 3.0.0
info:
  title: Hospice Dashboard Data Map
  description: Swagger-like schema for the Dashboard Clone.xlsx dataset. Defines structures for each sheet as API-like models, focusing on data points, types, and relationships. This maps to Google Sheets tabs for the app backend. All dates are Excel serial numbers (convertible to ISO dates). Empties/partials handled as nullable.
  version: 1.0.0

components:
  schemas:
    ActivePatient:
      type: object
      properties:
        ti:
          type: string
          nullable: true
          description: Possible ID or typo field.
        Date:
          type: number
          format: float
          description: Excel serial date (e.g., 45523 ≈ 2024-07-01).
        PatientName:
          type: string
          example: Adam Jones
        DOB:
          type: number
          format: float
          description: Birth date serial (e.g., 14647 ≈ 1940-02-01).
        Age:
          type: integer
          example: 84
        City:
          type: string
          example: san diego
        FirstRequest:
          type: number
          format: float
          nullable: true
        SecondRequest:
          type: number
          format: float
          nullable: true
        CPDoctor:
          type: string
          example: Andzel, Gaja
        CPCompleted:
          type: string
          example: complete
          enum: [complete, pending]
        RXNTInfo:
          type: string
          example: complete
        WR:
          type: string
          example: yes
          enum: [yes, no]
        Hospice:
          type: string
          example: Radiant
        PrescriptionSubmit:
          type: number
          format: float
          nullable: true
        InvoiceAmount:
          type: number
          format: float
          example: 4200
        PAID:
          type: string
          example: yes
          enum: [yes, no]
        CheckList:
          type: string
          example: complete
          enum: [complete, in progress]
        IngestionDate:
          type: number
          format: float
          nullable: true
        IngestionLocation:
          type: string
          example: residents
          enum: [residents, private home, assisted living, acute care hospital / inpatient, In-patient hospice resident, other]
        TTSMinutes:
          type: integer
          nullable: true
          example: 3
        TTDMinutes:
          type: integer
          nullable: true
          example: 64
        ConsentReceived:
          type: string
          example: yes
          enum: [yes, no]
        MedicalRecords:
          type: string
          example: yes
          enum: [yes, no]
        PhysicianFollowUpForm:
          type: number
          format: float
          nullable: true
        EOLOAState:
          type: string
          nullable: true
        DeathCertificate:
          type: string
          nullable: true
          enum: [yes, no]
        AllRecordsInDRC:
          type: string
          nullable: true
          enum: [yes, no]
        RiversideEOLOA:
          type: string
          nullable: true
        ReferredFrom:
          type: string
          example: Radiant Hospice

    PastPatientOutreach:
      type: object
      properties:
        PatientName:
          type: string
          example: Rita Krait
        Recipient:
          type: string
          example: John Krait
        Relationship:
          type: string
          example: Husband
        ContactEmail:
          type: string
          example: john.krait2@gmail.com
        ContactNumber:
          type: string
          example: 760-345-7865
        SomethingToMention:
          type: string
          example: married 50 years
        LastContactDate:
          type: number
          format: float
          example: 45383
        DateSent:
          type: string
          example: n/a
        Response:
          type: string
          example: n/a
          enum: [n/a, positive, no response, interested, declined]

    ConsultingDoc:
      type: object
      properties:
        Name:
          type: string
          example: Dr. Gaja Andzel
        Company:
          type: string
          example: Independent
        LicenseNumber:
          type: string
          example: A110569
        Address:
          type: string
          example: 123 Lucky Ave.
        PhoneNumber:
          type: string
          example: 576-687-4095
        Active:
          type: string
          example: Yes
          enum: [Yes, No]

    ClosedPatient:
      type: object
      properties:
        # Mirrors ActivePatient schema, with additional n/a in some fields
        Date:
          type: number
          format: float
        PatientName:
          type: string
        # ... (all fields as in ActivePatient, plus more n/a examples in IngestionDate, etc.)

    OutstandingPatient:
      type: object
      properties:
        # Similar to ActivePatient, but truncated; more pending statuses
        Date:
          type: number
          format: float
        PatientName:
          type: string
        # ... (fields up to ReferredFrom, with PAID often 'no')

    CallLogEntry:
      type: object
      properties:
        Date:
          type: number
          format: float
          example: 45594
        Time:
          type: string
          example: 12
        PersonContact:
          type: string
          example: laura ashby radiant hospis
        Number:
          type: string
          example: 84360533033
        InOut:
          type: string
          example: incominmg
          enum: [incoming, outgoing]
        Patient:
          type: string
          example: jon doe
        Outcome:
          type: string
          example: pt had questions
        Referral:
          type: string
          example: no
          enum: [yes, no]
        Source:
          type: string
          example: Internal
          nullable: true

    Note:  # App-specific addition
      type: object
      properties:
        EntityID:
          type: string
          description: Link to patient/doctor/call (e.g., PatientName)
        NoteText:
          type: string
        Hyperlink:
          type: string
          format: uri
        Timestamp:
          type: string
          format: date-time
        User:
          type: string

paths:
  /sheets/active:
    get:
      summary: Fetch Active Patients
      responses:
        '200':
          description: Array of ActivePatient
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ActivePatient'
  # Similar paths for other sheets...


Summary of the Document: Dashboard Clone.xlsx
This Excel file appears to be a sample dataset for a medical/hospice patient management system, likely focused on end-of-life care (e.g., references to EOLOA - End of Life Option Act, hospice, prescriptions, ingestions, consents, and death certificates). It contains 6 sheets with structured tabular data. Dates are in Excel serial number format (e.g., 45523 represents a date like 2024-07-01, assuming standard epoch). Data points are primarily strings (names, locations, statuses), numbers (ages, amounts, times), dates, and booleans (yes/no/pending). I've summarized each sheet's structure, key data points, and inferred types below. This uses the provided sample data (including the fake rows I generated), treating empty or partial cells as placeholders. The file emphasizes tracking patient journeys from active to closed/outstanding, outreach, consulting resources, and interactions.

Sheet 0: "Active" (Active Patients Tracking)
Purpose: Tracks ongoing patient cases with detailed lifecycle info, from requests to ingestion, billing, and records.
Headers (Row 1): ti (possibly typo/ID), Date, Patient Name, DOB, Age, City, 1st request, 2nd request, CP Doctor, CP Completed, RXNT Info, WR, Hospice, Prescription Submit, (empty), invoice amount, PAID, Check list, Ingestion Date, Ingestion Location, TTS (Minutes), TTD (Minutes), Consent Received, Medical Records, Physician follow up form, EOLOA State, Death Certificate, All Recodrs in DRC, (empty), Riverside EOLOA, Referred From.
Data Points and Types (based on sample rows):
Date: Excel serial dates (e.g., 45523 → ~2024-07-01; type: number/date).
Patient Name: Full names (e.g., "Adam Jones", "Emily Carter"; type: string).
DOB: Excel serial dates (e.g., 14647 → ~1940-02-01; type: number/date).
Age: Calculated ages (e.g., 84, 75; type: integer).
City: Locations (e.g., "san diego", "Encinitas"; type: string).
1st/2nd request: Dates (e.g., 45525; type: number/date).
CP Doctor: Doctor names (e.g., "Andzel, Gaja", "Dr. Lisa Green"; type: string).
CP Completed: Statuses (e.g., 45529 or "complete", "pending"; type: mixed number/string).
RXNT Info: Statuses/dates (e.g., "complete", 45723; type: mixed).
WR: Yes/no flags (e.g., 45525, "yes"; type: mixed).
Hospice: Provider names (e.g., "Radiant", "Serenity Hospice"; type: string).
Prescription Submit: Dates (e.g., 45530; type: number/date).
Invoice amount: Monetary values (e.g., 4200, 3500; type: number/currency).
PAID: Yes/no (e.g., "yes", "no"; type: string/boolean).
Check list: Statuses (e.g., "complete", "in progress"; type: string).
Ingestion Date: Dates (e.g., 45536; type: number/date).
Ingestion Location: Categories (e.g., "residents", "private home", "assisted living"; type: string).
TTS (Minutes)/TTD (Minutes): Times (e.g., 3, 64; type: integer).
Consent Received/Medical Records/etc.: Yes/no flags (e.g., "yes", "no"; type: string/boolean).
Physician follow up form/Death Certificate/etc.: Dates or yes/no (e.g., 45545, "yes"; type: mixed).
Referred From: Sources (e.g., "Radiant Hospice", "Serenity Hospice"; type: string).
Row Count in Sample: 11 rows (1 header + 10 data).
Notes: Many cells are empty in incomplete rows; focuses on active monitoring with billing and compliance checks.
Sheet 1: "Past patient Outreach" (Outreach to Past Patients' Contacts)
Purpose: Logs outreach to relatives/contacts of past patients for follow-up or feedback.
Headers (Row 1): Patient Name, Recipient, Relationship, Contact Email, Contact Number, Something to mention, Last contact date, Date Sent, Response.
Data Points and Types:
Patient Name: Names (e.g., "Rita Krait", "Samuel Lee"; type: string).
Recipient: Contact names (e.g., "John Krait", "Maria Lee"; type: string).
Relationship: Relations (e.g., "Husband", "Wife"; type: string).
Contact Email: Emails (e.g., "john.krait2@gmail.com", "maria.lee@example.com"; type: string).
Contact Number: Phone numbers (e.g., "760-345-7865", "619-123-4567"; type: string).
Something to mention: Notes (e.g., "married 50 years", "high school sweethearts"; type: string).
Last contact date: Excel dates (e.g., 45383 → ~2024-03-01; type: number/date).
Date Sent: Dates or n/a (e.g., "n/a", 45405; type: mixed).
Response: Outcomes (e.g., "n/a", "positive", "no response"; type: string).
Row Count in Sample: 11 rows (1 header + 10 data).
Notes: Simple CRM-like log; responses indicate engagement levels.
Sheet 2: "Consulting Docs" (Consulting Doctors Directory)
Purpose: Directory of consulting physicians for reference.
Headers (Row 1): Name, Company, License Number, Address, Phone Number, Active?
Data Points and Types:
Name: Doctor names (e.g., "Dr. Gaja Andzel", "Dr. Lisa Green"; type: string).
Company: Affiliations (e.g., "Independent", "Green Medical Group"; type: string).
License Number: IDs (e.g., "A110569", "B223456"; type: string).
Address: Locations (e.g., "123 Lucky Ave.", "456 Elm St."; type: string).
Phone Number: Phones (e.g., "576-687-4095", "619-234-5678"; type: string).
Active?: Status (e.g., "Yes", "No"; type: string/boolean).
Row Count in Sample: 11 rows (1 header + 10 data).
Notes: Static reference list; easy for searching/lookup.
Sheet 3: "Closed" (Closed Patient Cases)
Purpose: Archives completed/closed patient cases, similar to "Active" but with final outcomes.
Headers (Row 1): Same as "Active" (Date, Patient Name, etc., up to Referred From).
Data Points and Types: Mirror "Active" (e.g., dates as numbers, names as strings, yes/no flags). Additional notes in some rows for locations/TTS/TTD.
Examples: Ingestion Location varies (e.g., "private home", "assisted living residence"); some rows have partial data like aggregated stats.
Row Count in Sample: 11 rows (1 header + 10 data, including some blank/aggregated rows).
Notes: Includes more "n/a" and final flags (e.g., Death Certificate "yes").
Sheet 4: "Oustanding" (Likely "Outstanding" - Pending Cases)
Purpose: Tracks unresolved/outstanding patient items, similar to "Active" but focused on pendings.
Headers (Row 1): Similar to "Active" but truncated (ends at Referred From, missing some record fields).
Data Points and Types: Like "Active" (e.g., "pending" statuses frequent; invoice PAID often "no").
Examples: CP Completed as "pending"; fewer completion fields filled.
Row Count in Sample: 11 rows (1 header + 10 data).
Notes: Emphasizes open items; some rows reference doctors mid-process.
Sheet 5: "Call Log" (Interaction Log)
Purpose: Records phone/email interactions related to patients or referrals.
Headers (Row 1): Date, Time, Person contact, Number, In / Out, Patient, Outcome, Referral?, Source?
Data Points and Types:
Date: Excel dates (e.g., 45594 → ~2024-09-01; type: number/date).
Time: Times (e.g., "12", "14:30"; type: string/time).
Person contact: Names/affiliations (e.g., "laura ashby radiant hospis", "Dr. Lisa Green"; type: string).
Number: Phones (e.g., "84360533033", "619-234-5678"; type: string).
In / Out: Directions (e.g., "incominmg" [typo for "incoming"], "outgoing"; type: string).
Patient: Linked patients (e.g., "jon doe", "Emily Carter"; type: string).
Outcome: Results (e.g., "pt had questions", "scheduled follow-up"; type: string).
Referral?: Yes/no (e.g., "no", "yes"; type: string/boolean).
Source?: Origins (e.g., blank, "Internal", "Family"; type: string).
Row Count in Sample: 11 rows (1 header + 10 data).
Notes: Chronological log; useful for auditing communications.
Overall Document Insights:

Themes: Patient-centric tracking in hospice/EOL care; HIPAA-sensitive in real use (names, DOBs, medical details).
Data Volume: ~10 rows per sheet for testing; scalable.
Common Types: Strings (60%), Numbers/Dates (30%), Booleans (10%). Many empties for incomplete records.
Potential Issues: Typos (e.g., "Oustanding", "incominmg"); inconsistent formats (mixed date/strings).
For App Integration: This structure maps well to Google Sheets tabs; app can dashboard aggregates (e.g., active vs. closed counts, average TTS/TTD).
Detailed Outline of the App: Lightweight Local Notion Clone (Google Sheets Dashboard GUI)
With the summarized data structure, we can now refine the project outline to tailor it specifically to this dataset. The app will serve as a GUI frontend for a Google Sheet mirroring this Excel (e.g., import the XLSX to Sheets first). It runs locally on browsers/computers (e.g., via Electron for desktop), syncs bi-directionally, and provides Notion-like views: dashboards, searchable pages, note-taking with hyperlinks (e.g., to patient emails or external records). Focus on simplicity: vanilla JS core, minimal deps, poll-based sync for live updates across 2+ devices (same Gmail login). Users can search (e.g., patient "Adam Jones" pulls details + notes), add notes (e.g., "Follow-up email: [hyperlink to Gmail]"), and view dashboards (e.g., charts of active patients by area).

Updated Overview
App Name: Hospice Dashboard Clone (or similar).
Goal: "Poor man's Notion/Salesforce" for HIPAA-like data: View/edit patient trackers, outreach, docs, logs; add contextual notes; dashboard visuals; all synced to Google Sheets for collaboration.
Key Constraints: Offline-first (local cache), lightweight (no crashes: <500 lines core code), multi-device via Sheets sync (poll every 30s). Notes stored in a new "Notes" tab, linked to entities (e.g., patient name as key).
Target Users: Medical staff like Donald/Alyssa, on 2 computers.
Data Backend: Google Sheets with tabs matching Excel sheets + "Notes" tab (columns: EntityID (e.g., patient name), NoteText, Hyperlink, Timestamp, User).
Tech Stack: Vanilla JS/HTML/CSS; Google Sheets API (browser-based OAuth); localStorage for cache; optional Chart.js for dashboards, Electron for packaging.
High-Level Architecture
Data Model (Google Sheets Structure):
Import Excel to Sheets: Tabs = Active, Past patient Outreach, Consulting Docs, Closed, Outstanding, Call Log.
Add "Notes" tab: For app-specific annotations (e.g., row: "Adam Jones", "Check DOB accuracy: [link to email]", "https://mail.google.com/...").
Add "DashboardData" tab: Auto-generated via formulas (e.g., COUNTIF for active patients, AVERAGE for TTS minutes).
Keys for Linking: Use Patient Name as primary key for search/notes; fallback to dates for logs.
UI Components (Notion-Like Interface):
Main Layout: Sidebar with tabs (Active, Closed, Outstanding, Outreach, Consulting Docs, Call Log, Notes, Dashboard). Central pane for content.
Search Bar: Global fuzzy search (e.g., "Adam Jones" → card with details from Active sheet + linked notes/hyperlinks; opens in modal).
Dashboard View:
Tables: Grid views of sheets (editable inline).
Charts: e.g., Pie chart of patients by City (from Active/Closed); Bar for TTS/TTD averages; Line for call logs over time.
Metrics: Cards like "Active Patients: 10", "Outstanding Invoices: 5".
Entity Pages: Click a patient/doctor/call → Dedicated view with all related data (e.g., for "Emily Carter": Active row + outreach if past + notes).
Note Editor: Inline or modal textarea; insert hyperlink button (prompts for URL, e.g., Gmail link). Save pushes to Notes tab. Display notes with clickable links (open in new tab, stay in app).
Sync Indicator: Status bar (e.g., "Synced 10s ago"); button to force sync.
Core Features in Detail:
Dashboarding Data:
Pull from Sheets tabs; render as interactive tables (sortable/filterable via JS).
Visuals: Use Chart.js for simple charts (e.g., age distribution histogram from DOB/Age columns).
Aggregates: JS-calculated (e.g., total invoice amount from Active: sum of "invoice amount" where PAID="no").
Search Functionality:
Input: Any string (e.g., "Stephen Clare" – assume sample addition; searches all tabs for matches in Patient Name, Person contact, etc.).
Output: Results list with snippets (e.g., "Active Patient: Age 55, City La Jolla") + buttons to view full or add note.
Advanced: Filter by type (e.g., "patients only").
Note-Taking:
Add to any entity (e.g., right-click row → "Add Note").
Shorthand: Support markdown-like (e.g., link text for hyperlinks).
Beyond-Sheet: Notes can reference external (e.g., "HIPAA note: See email [link]"); hyperlinks to Gmail work across same-login browsers.
Sync: On save, append to Notes tab; other users see on next poll.
Multi-User/Computer Sync:
Bi-directional: Read all tabs on load/interval; write changes (edits/notes) immediately.
Conflict: Timestamp-based (overwrite older); notify if detected.
Live Updates: Poll Sheets API every 30s; refresh UI if changes.
Editing: Inline edits to sheet data (e.g., update PAID to "yes"); validate types (e.g., ensure Age is number).
HIPAA Considerations: Local-only; no app storage beyond cache; remind in UI to use secure devices.
Workflow Examples:
Search "Clare Burd": Pulls Active row (age 55, La Jolla); shows notes if any; add note "Tax discussion: [link to email]".
Dashboard: View chart of ingestion locations (private home vs. hospital); click to drill into Closed sheet.
Multi-Device: Edit a call log on Computer 1 → Syncs to Sheets → Computer 2 sees update on refresh.
Stay in App: Click hyperlink in note → Opens Gmail in tab; return to app without leaving.
Development Phases (Refined for This Data):
Phase 1: Setup & Auth: Google API OAuth; import sample XLSX to test Sheet.
Phase 2: Data Sync: Functions to read/write all tabs; parse dates (convert serial to JS Date).
Phase 3: GUI Build: Tabbed interface; search across tabs; note editor with hyperlink support.
Phase 4: Dashboards: Integrate Chart.js; compute aggregates from data types (e.g., sum numbers, count strings).
Phase 5: Features & Test: Inline editing; multi-device simulation; error handling (e.g., invalid date).
Phase 6: Polish: UI for types (date pickers for serial dates); export back to XLSX if needed.
Potential Challenges & Mitigations:
Date Handling: Convert Excel serials (e.g., code: new Date((serial - 25569) * 86400 * 1000)); test with samples.
Data Volume: Limit to 100 rows/tab for perf; paginate if more.
Typos/Inconsistencies: App normalizes (e.g., fix "Oustanding" to "Outstanding" in UI).
Security: Local run; no API keys in code (user inputs creds).
Crashes: Modular code; try-catch on sync; fallback to cache if offline.
This outline integrates the data summary directly—next steps in Cursor: Prompt to implement Phase 1 with sample Sheet ID. Let me know if you need code snippets or further tweaks!