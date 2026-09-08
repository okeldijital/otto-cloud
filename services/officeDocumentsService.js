import api from '../lib/api';

const unwrapItems = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return data ? [data] : [];
};

const officeDocumentsService = {
    async list(params = {}) {
        const response = await api.get('/documents', { params });
        return unwrapItems(response.data);
    },

    async upload(payload) {
        const response = await api.post('/documents', payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data?.item || response.data;
    },

    async link(documentId, payload) {
        const response = await api.post(`/documents/${documentId}/links`, payload);
        return response.data?.item || response.data;
    },

    async remove(documentId) {
        return api.delete(`/documents/${documentId}`);
    },

    downloadUrl(documentId) {
        return `/api/documents/${documentId}/download`;
    },

    previewUrl(documentId) {
        return `/api/documents/${documentId}/preview`;
    },
};

export { officeDocumentsService };
export default officeDocumentsService;
