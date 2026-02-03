import api from '../lib/api';

const ENDPOINT = '/office/notes';

export const officeNotesService = {
    list: async (params = {}) => {
        const response = await api.get(ENDPOINT, { params });
        return response.data;
    },
    create: async (payload) => {
        const response = await api.post(ENDPOINT, payload);
        return response.data;
    },
    update: async (id, payload) => {
        const response = await api.patch(`${ENDPOINT}/${id}`, payload);
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
    link: async (id, payload) => {
        const response = await api.post(`${ENDPOINT}/${id}/links`, payload);
        return response.data;
    },
    unlink: async (id, payload) => {
        const response = await api.delete(`${ENDPOINT}/${id}/links`, { data: payload });
        return response.data;
    },
};
