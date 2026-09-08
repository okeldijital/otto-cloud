import api from '../lib/api';

const toLegacyDocument = (item) => ({
    ...item,
    original_filename: item.originalName || item.fileName,
    mime_type: item.mimeType,
    file_size_bytes: item.fileSize,
    created_at: item.createdAt,
});

const officeDocumentsService = {
    async list(params = {}) {
        const response = await api.get('/api/files', {
            params: {
                entityType: params.entityType || params.entity_type,
                entityId: params.entityId || params.entity_id,
            },
        });
        const items = Array.isArray(response.data?.items)
            ? response.data.items
            : Array.isArray(response.data)
                ? response.data
                : [];
        return items.map(toLegacyDocument);
    },

    async upload(payload) {
        const response = await api.post('/api/storage/upload', payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return toLegacyDocument(response.data?.attachment || response.data);
    },

    async link() {
        // The canonical storage upload binds the attachment to the entity at
        // creation time. Linking as a second mutation is intentionally removed.
        return null;
    },

    async remove(documentId) {
        return api.delete(`/api/storage/${documentId}`);
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
