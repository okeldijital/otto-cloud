import api from '../lib/api';

let activeEntity = { entityType: null, entityId: null };

const toLegacyDocument = (item) => ({
    ...item,
    original_filename: item.originalName || item.fileName,
    mime_type: item.mimeType,
    file_size_bytes: item.fileSize,
    created_at: item.createdAt,
});

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

    async upload(payload) {
        if (!activeEntity.entityType || !activeEntity.entityId) {
            throw new Error('Attachment entity context is not available');
        }
        payload.append('entityType', activeEntity.entityType);
        payload.append('entityId', String(activeEntity.entityId));
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
