import api, { BASE_URL } from '../lib/api';

const ENDPOINT = '/office/documents';

export const officeDocumentsService = {
    list: async (params = {}) => {
        const response = await api.get(ENDPOINT, { params });
        return response.data;
    },
    upload: async (formData) => {
        const response = await api.post(ENDPOINT, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
    get: async (id) => {
        const response = await api.get(`${ENDPOINT}/${id}`);
        return response.data;
    },
    remove: async (id) => {
        const response = await api.delete(`${ENDPOINT}/${id}`);
        return response.data;
    },
    downloadUrl: (id) => `${BASE_URL}/api/office/documents/${id}/download`,
    previewUrl: (id) => `${BASE_URL}/api/office/documents/${id}/preview`,
    update: async (id, payload) => {
        const response = await api.patch(`${ENDPOINT}/${id}`, payload);
        return response.data;
    },
    link: async (id, payload) => {
        const response = await api.post(`${ENDPOINT}/${id}/links`, payload);
        return response.data;
    },
    unlink: async (id, payload) => {
        const response = await api.delete(`${ENDPOINT}/${id}/links`, { data: payload });
        return response.data;
    },
};
