import api from '../lib/api';

export const AnalyticsService = {
    getKPIs: async () => {
        const response = await api.get('/analytics/kpi');
        return response.data;
    },

    getCatalogGrowth: async () => {
        const response = await api.get('/analytics/catalog-growth');
        return response.data;
    },

    getUpcomingEvents: async (limit = 5) => {
        const response = await api.get(`/analytics/upcoming-events?limit=${limit}`);
        return response.data;
    },

    getRecentActivity: async (limit = 10) => {
        const response = await api.get(`/analytics/recent-activity?limit=${limit}`);
        return response.data;
    },

    getLatestRelease: async () => {
        const response = await api.get('/analytics/latest-release');
        return response.data;
    },

    getPendingContracts: async () => {
        const response = await api.get('/analytics/pending-contracts');
        return response.data;
    }
};
