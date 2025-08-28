# Checklist Forms

This folder contains the 6 PDF forms that users can download from the dashboard.

## Required PDF Files

1. **Gaja - Regular Dose** - `gaja-regular-dose.pdf`
2. **Gaja - High Dose** - `gaja-high-dose.pdf`
3. **Von Gunten - Regular Dose** - `von-gunten-regular-dose.pdf`
4. **Von Gunten - High Dose** - `von-gunten-high-dose.pdf`
5. **Unknown CP - Regular Dose** - `unknown-cp-regular-dose.pdf`
6. **Unknown CP - High Dose** - `unknown-cp-high-dose.pdf`

## How to Add Your PDFs

1. **Place your 6 PDF files** in this `forms/` folder
2. **Name them exactly** as shown above (e.g., `patient-intake.pdf`)
3. **Restart the server** after adding the files
4. **The download buttons will automatically work** with your actual PDFs

## Current Status

- ✅ **Gaja - Regular Dose** - Ready for PDF
- ✅ **Gaja - High Dose** - Ready for PDF  
- ✅ **Von Gunten - Regular Dose** - Ready for PDF
- ✅ **Von Gunten - High Dose** - Ready for PDF
- ✅ **Unknown CP - Regular Dose** - Ready for PDF
- ✅ **Unknown CP - High Dose** - Ready for PDF

## File Structure

```
forms/
├── README.md
├── gaja-regular-dose.pdf       ← Add your PDF here
├── gaja-high-dose.pdf          ← Add your PDF here
├── von-gunten-regular-dose.pdf ← Add your PDF here
├── von-gunten-high-dose.pdf    ← Add your PDF here
├── unknown-cp-regular-dose.pdf ← Add your PDF here
└── unknown-cp-high-dose.pdf    ← Add your PDF here
```

## Notes

- The dashboard will automatically detect when PDFs are added
- Users can download forms directly from the "Checklist Forms" tab
- All forms are accessible to authenticated users
- File sizes should be reasonable (under 10MB each recommended)
