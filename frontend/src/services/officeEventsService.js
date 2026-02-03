import api from '../lib/api';

const ENDPOINT = '/office/events';

export const officeEventsService = {
    list: async (params = {}) => {
        const response = await api.get(ENDPOINT, { params });
        return response.data;
    },
    create: async (payload) => {
        const response = await api.post(ENDPOINT, payload);
        return response.data;
    },
    update: async (id, payload) => {
        const response = await api.put(`${ENDPOINT}/${id}`, payload);
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
};
