import api from '../lib/api';

const DOC_TYPE_LABELS = {
    split_sheet: 'Split Sheet',
    registration_proof: 'PRO Registration',
    contract: 'Contract',
    invoice: 'Invoice',
    other: 'Other',
};

const toLegacyDocument = (item) => {
    const originalFilename = item.originalName || item.fileName || 'document';
    const category = item.category || 'other';

    return {
        ...item,
        original_filename: originalFilename,
        mime_type: item.mimeType,
        file_size_bytes: item.fileSize,
        created_at: item.createdAt,
        // The canonical Attachment model does not persist the legacy document
        // title/description/doc_type fields. Keep the compatibility shape
        // deterministic so the existing Files UI never renders empty metadata.
        title: item.title || originalFilename,
        description: item.description || '',
        doc_type: DOC_TYPE_LABELS[category] ? category : 'other',
    };
};

const officeDocumentsService = {
    async list(params = {}) {
        const entityType = params.entityType || params.entity_type;
        const entityId = params.entityId || params.entity_id;
        const response = await api.get('/files', {
            params: { entityType, entityId },
        });
        const items = Array.isArray(response.data?.items)
            ? response.data.items
            : Array.isArray(response.data)
                ? response.data
                : [];
        return items.map(toLegacyDocument);
    },

    async upload(payload, params = {}) {
        const entityType = params.entityType || params.entity_type;
        const entityId = params.entityId || params.entity_id;
        if (!entityType || !entityId) {
            throw new Error('Attachment entity context is not available');
        }

        payload.append('entityType', entityType);
        payload.append('entityId', String(entityId));
        const response = await api.post('/storage/upload', payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return toLegacyDocument(response.data?.attachment || response.data);
    },

    async link() {
        // Canonical storage upload binds the attachment to the entity at creation time.
        return null;
    },

    async remove(documentId) {
        return api.delete(`/storage/${documentId}`);
    },

    downloadUrl(documentId) {
        return `/api/files?attachmentId=${encodeURIComponent(documentId)}`;
    },

    previewUrl(documentId) {
        return `/api/files?attachmentId=${encodeURIComponent(documentId)}`;
    },
};

export { officeDocumentsService };
export default officeDocumentsService;
