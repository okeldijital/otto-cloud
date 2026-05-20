import api from '../lib/api';

const worksAdminService = {
    getAll: () => api.get('/works-admin'),
    getByWork: (work_id) => api.get(`/works-admin/${work_id}`),
    update: (id, data) => api.patch(`/works-admin/${id}`, data),
    addDocument: (id, docType, file) => {
        const formData = new FormData();
        formData.append('doc_type', docType);
        formData.append('file', file);
        return api.post(`/works-admin/${id}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    deleteDocument: (adminId, docId) => api.delete(`/works-admin/${adminId}/documents/${docId}`),
    buildDownloadUrl: (adminId, docId) => `${api.defaults.baseURL}/works-admin/${adminId}/documents/${docId}/download`,
};

export default worksAdminService;
