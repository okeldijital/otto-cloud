import api from '../lib/api';

let activeEntity = { entityType: null, entityId: null };

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
        title: item.title || originalFilename,
        description: item.description || '',
        doc_type: DOC_TYPE_LABELS[category] ? category : 'other',
    };
};

const officeDocumentsService = {
    async list(params = {}) {
        const entityType = params.entityType || params.entity_type;
        const entityId = params.entityId || params.entity_id;
        activeEntity = { entityType, entityId };
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
        // Accept explicit entity context while retaining compatibility with the existing Files UI.
        const entityType = params.entityType || params.entity_type || activeEntity.entityType;
        const entityId = params.entityId || params.entity_id || activeEntity.entityId;
        if (!entityType || !entityId) {
            throw new Error('Attachment entity context is not available');
        }

        activeEntity = { entityType, entityId };
        payload.append('entityType', entityType);
        payload.append('entityId', String(entityId));

        // The canonical Storage API persists `category`. The legacy Files UI sends `doc_type`.
        // Translate that field at the service boundary so the selected document type is not lost.
        if (!payload.get('category')) {
            const legacyType = payload.get('doc_type');
            if (typeof legacyType === 'string' && DOC_TYPE_LABELS[legacyType]) {
                payload.append('category', legacyType);
            }
        }

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
