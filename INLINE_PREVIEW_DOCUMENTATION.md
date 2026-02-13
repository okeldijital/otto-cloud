# Inline Preview Functionality - Implementation Details

## ✅ Already Implemented!

The **inline preview functionality** is **already fully implemented** in the `AttachmentsSection` component. Users can view attachments (PDFs, images) directly within the app without leaving the page.

## How It Works

### 1. Preview Button (Eye Icon)
Each attachment in the list has an **Eye icon button** that triggers the preview:

```javascript
<button
    className="btn-icon"
    onClick={() => openPreview(doc)}
    title="Preview"
    style={{ padding: '0.5rem' }}
>
    <Eye size={18} />
</button>
```

### 2. Preview Modal
When the Eye icon is clicked, a full-screen modal opens with the document preview:

**Location in code:** `/frontend/src/components/AttachmentsSection.jsx` (lines 346-423)

```javascript
{previewDoc && (
    <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem',
    }}>
        <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem',
        }}>
            {/* Modal content */}
        </div>
    </div>
)}
```

### 3. Smart Content Rendering
The preview modal intelligently renders different file types:

#### PDF Files
PDFs are displayed inline using an `<iframe>`:

```javascript
if (isPdf) {
    return (
        <iframe
            title="Document preview"
            src={previewUrl}
            style={{ 
                width: '100%', 
                height: '500px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                background: '#000' 
            }}
        />
    );
}
```

#### Image Files
Images (PNG, JPG, JPEG, GIF, WEBP, SVG) are displayed directly:

```javascript
if (isImage) {
    return (
        <img
            src={previewUrl}
            alt={previewDoc.title || previewDoc.original_filename}
            style={{ 
                width: '100%', 
                maxHeight: '500px', 
                objectFit: 'contain', 
                borderRadius: '8px', 
                border: '1px solid #e5e7eb', 
                background: '#000' 
            }}
        />
    );
}
```

#### Other File Types
For unsupported file types (DOCX, XLSX, etc.), a helpful message is shown:

```javascript
return (
    <div style={{ 
        border: '2px dashed #e5e7eb', 
        borderRadius: '8px', 
        padding: '3rem', 
        textAlign: 'center', 
        color: '#9ca3af' 
    }}>
        Download to view this file type.
    </div>
);
```

### 4. Preview Modal Features

The preview modal includes:

1. **Document Header**
   - Document title or filename
   - Document type badge
   - File size

2. **Preview Area**
   - Full inline preview for PDFs and images
   - 500px height for optimal viewing
   - Black background for better contrast

3. **Description Section** (if available)
   - Shows any notes/description added during upload

4. **Action Buttons**
   - **Download**: Download the file to local storage
   - **Close**: Close the preview modal

### 5. File Type Detection

The component automatically detects file types using:

```javascript
const mime = previewDoc.mime_type || '';
const fileName = previewDoc.original_filename || '';
const isPdf = mime === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
const isImage = mime.startsWith('image/');
```

## User Experience Flow

1. **User clicks Eye icon** on any attachment
2. **Modal opens** with semi-transparent dark overlay
3. **Document renders inline**:
   - PDFs show in embedded viewer
   - Images display at full quality
   - Other files show download prompt
4. **User can**:
   - View the document without leaving the page
   - Read any description/notes
   - Download if needed
   - Close and return to the detail page

## API Endpoint Used

The preview uses the backend's preview endpoint:

```javascript
previewUrl: (id) => `${BASE_URL}/api/office/documents/${id}/preview`
```

This endpoint (`GET /api/office/documents/{document_id}/preview`) returns the file with appropriate headers for inline viewing.

## Supported Preview Formats

### ✅ Full Inline Preview
- **PDF**: `.pdf` files
- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`

### ⚠️ Download Required
- **Documents**: `.docx`, `.xlsx`
- **Audio**: `.mp3`, `.wav`

## Visual Example

When a user uploads a split sheet (PDF) and clicks the Eye icon:

```
┌─────────────────────────────────────────────────────┐
│  [X]  Final Split Sheet - Approved                 │
│       Split Sheet • 245.3 KB                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────┐    │
│  │                                           │    │
│  │         [PDF PREVIEW RENDERED HERE]       │    │
│  │                                           │    │
│  │     (Full split sheet visible inline)     │    │
│  │                                           │    │
│  └───────────────────────────────────────────┘    │
│                                                     │
│  DESCRIPTION                                        │
│  Approved by all parties on Feb 13, 2026           │
│                                                     │
│                        [Download]  [Close]          │
└─────────────────────────────────────────────────────┘
```

## Benefits

1. **No Page Navigation**: Users stay on the track/work detail page
2. **Fast Access**: Instant preview without downloading
3. **Context Preservation**: Can view document while seeing track/work details
4. **Bandwidth Efficient**: Only loads when preview is requested
5. **Professional UX**: Clean, modal-based interface

## Testing the Feature

To test the inline preview:

1. Navigate to a track or work detail page
2. Upload a PDF or image file as an attachment
3. Click the **Eye icon** next to the attachment
4. The preview modal will open showing the document inline
5. Click **Close** to return to the detail page

The feature is **production-ready** and requires no additional implementation!
