import api from '../lib/api';

export const RoyaltiesService = {
    getAll: async () => {
        const response = await api.get('/royalties');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/royalties/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/royalties', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/royalties/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/royalties/${id}`);
        return response.data;
    }
};
