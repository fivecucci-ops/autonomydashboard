# Checklist Forms

This folder contains the 6 PDF forms that users can download from the dashboard.

## Required PDF Files

1. **Patient Intake Form** - `patient-intake.pdf`
2. **Medical Records Request** - `medical-records.pdf`
3. **Prescription Form** - `prescription.pdf`
4. **Attending Checklist** - `attending-checklist.pdf`
5. **Consulting Form** - `consulting-form.pdf`
6. **Follow-up Form** - `follow-up-form.pdf`

## How to Add Your PDFs

1. **Place your 6 PDF files** in this `forms/` folder
2. **Name them exactly** as shown above (e.g., `patient-intake.pdf`)
3. **Restart the server** after adding the files
4. **The download buttons will automatically work** with your actual PDFs

## Current Status

- ✅ **Patient Intake Form** - Ready for PDF
- ✅ **Medical Records Request** - Ready for PDF  
- ✅ **Prescription Form** - Ready for PDF
- ✅ **Attending Checklist** - Ready for PDF
- ✅ **Consulting Form** - Ready for PDF
- ✅ **Follow-up Form** - Ready for PDF

## File Structure

```
forms/
├── README.md
├── patient-intake.pdf          ← Add your PDF here
├── medical-records.pdf         ← Add your PDF here
├── prescription.pdf            ← Add your PDF here
├── attending-checklist.pdf     ← Add your PDF here
├── consulting-form.pdf         ← Add your PDF here
└── follow-up-form.pdf          ← Add your PDF here
```

## Notes

- The dashboard will automatically detect when PDFs are added
- Users can download forms directly from the "Checklist Forms" tab
- All forms are accessible to authenticated users
- File sizes should be reasonable (under 10MB each recommended)
