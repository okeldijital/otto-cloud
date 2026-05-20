import api from '../lib/api';

const AI_ANALYTICS_ENDPOINT = '/ai/analytics';

export const aiAnalyticsClient = {
    getOverview: async (params = {}) => {
        const response = await api.get(`${AI_ANALYTICS_ENDPOINT}/overview`, { params });
        return response.data;
    },

    getContracts: async (params = {}) => {
        const response = await api.get(`${AI_ANALYTICS_ENDPOINT}/contracts`, { params });
        return response.data;
    },

    getCatalog: async (params = {}) => {
        const response = await api.get(`${AI_ANALYTICS_ENDPOINT}/catalog`, { params });
        return response.data;
    },
};

export default aiAnalyticsClient;
