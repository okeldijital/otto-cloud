# Document Attachments Feature for Tracks and Works

## Overview
Added the ability to attach documents (split sheets, PRO work notifications/registrations, images, PDFs, and other files) to individual tracks and works in the OTTO application.

## Implementation Summary

### 1. Backend Changes

#### Updated Document Types (`backend/routes/office_documents.py`)
- Added `"split_sheet"` to the list of valid document types
- Document types now include:
  - Split Sheet (NEW)
  - Contract
  - Registration Proof (PRO notifications/registrations)
  - Invoice
  - Report
  - Other

#### Existing Infrastructure Leveraged
- Used the existing `OfficeDocument` and `OfficeDocumentLink` models
- The system already supported linking documents to various entity types including "track" and "work"
- No database migrations were needed

### 2. Frontend Changes

#### New Component: `AttachmentsSection.jsx`
Created a reusable component that provides:
- **Upload functionality**: Upload documents with metadata (type, title, description)
- **Document listing**: Display all attachments with file info (name, type, size, date)
- **Preview capability**: Preview PDFs and images directly in the browser
- **Download functionality**: Download attachments (with Tauri support for desktop)
- **Delete functionality**: Remove attachments with confirmation
- **Automatic linking**: Automatically links uploaded documents to the parent entity (track or work)

Features:
- Clean, modern UI matching OTTO's design system
- File type validation
- File size display
- Document type categorization
- Hover effects and smooth interactions
- Modal preview with full document details

#### Updated Pages

**TrackDetail.jsx**
- Added `AttachmentsSection` component
- Positioned between "Recording Credits" and "Technical Metadata" sections
- Passes track ID and title to the component

**WorkDetail.jsx**
- Added `AttachmentsSection` component
- Positioned between "Exploited Recordings" and "Composition Details" sections
- Passes work ID and title to the component

**Documents.jsx** (Office Documents page)
- Updated document types list to include "Split Sheet"
- Ensures consistency across the application

### 3. Configuration Changes

#### `.env` File
- Commented out relative `DATABASE_URL` to use the default absolute path from `config.py`
- This ensures compatibility with the application's data directory structure

## User Workflow

### Attaching Documents to a Track
1. Navigate to a track detail page
2. Scroll to the "Attachments" section
3. Click "Add Attachment"
4. Select a file (PDF, image, or other supported format)
5. Choose document type (Split Sheet, PRO Registration, etc.)
6. Optionally add a title and description
7. Click "Create" to upload and link the document

### Attaching Documents to a Work
1. Navigate to a work detail page
2. Scroll to the "Attachments" section
3. Follow the same upload process as tracks

### Managing Attachments
- **Preview**: Click the eye icon to preview PDFs and images
- **Download**: Click the download icon to save the file locally
- **Delete**: Click the trash icon to remove an attachment (with confirmation)

## Technical Details

### Supported File Types
- **Documents**: PDF, DOCX, XLSX
- **Images**: PNG, JPG, JPEG, GIF, WEBP, SVG
- **Audio**: MP3, WAV

### API Endpoints Used
- `GET /api/office/documents?entity_type={type}&entity_id={id}` - List attachments
- `POST /api/office/documents` - Upload document
- `POST /api/office/documents/{id}/links` - Link document to entity
- `DELETE /api/office/documents/{id}` - Delete document
- `GET /api/office/documents/{id}/download` - Download document
- `GET /api/office/documents/{id}/preview` - Preview document

### Storage
- Documents are stored in `~/.otto/data/storage/office_documents/{org_id}/`
- Files are stored with UUID-based filenames to prevent conflicts
- Original filenames are preserved in the database

## Benefits

1. **Centralized Documentation**: All track and work-related documents in one place
2. **Easy Access**: Quick preview and download from the detail pages
3. **Organization**: Categorize documents by type (split sheets, registrations, etc.)
4. **Audit Trail**: Track when documents were uploaded and by whom
5. **Flexibility**: Support for multiple document types and formats
6. **Reusability**: The `AttachmentsSection` component can be easily added to other entities

## Future Enhancements (Optional)

- Bulk upload capability
- Document versioning
- Automatic OCR for text extraction
- Integration with external storage (S3, Google Drive, etc.)
- Document expiration/renewal reminders for registrations
- Signature/approval workflow for split sheets
