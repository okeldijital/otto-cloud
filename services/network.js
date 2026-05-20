import api from '../lib/api';

export const NetworkService = {
    // Health Snapshot
    getHealth: async () => {
        const response = await api.get('/network/health');
        return response.data;
    },

    // Unified All Contacts
    getAllContacts: async () => {
        const response = await api.get('/network/all');
        return response.data;
    },

    // Organizations
    getOrganizations: async (params = {}) => {
        const defaultParams = { limit: 1000, ...params };
        const response = await api.get('/network/organizations', { params: defaultParams });
        return response.data;
    },
    getOrganization: async (id) => {
        const response = await api.get(`/network/organizations/${id}`);
        return response.data;
    },
    createOrganization: async (data) => {
        const response = await api.post('/network/organizations', data);
        return response.data;
    },
    deleteOrganization: async (id) => {
        await api.delete(`/network/organizations/${id}`);
    },

    // Individuals
    getIndividuals: async (params = {}) => {
        const defaultParams = { limit: 1000, ...params };
        const response = await api.get('/network/individuals', { params: defaultParams });
        return response.data;
    },
    getIndividual: async (id) => {
        const response = await api.get(`/network/individuals/${id}`);
        return response.data;
    },
    createIndividual: async (data) => {
        const response = await api.post('/network/individuals', data);
        return response.data;
    },
    deleteIndividual: async (id) => {
        await api.delete(`/network/individuals/${id}`);
    },

    // Platforms
    getPlatforms: async () => {
        const response = await api.get('/network/platforms');
        return response.data;
    },
    createPlatform: async (data) => {
        const response = await api.post('/network/platforms', data);
        return response.data;
    },
    deletePlatform: async (id) => {
        await api.delete(`/network/platforms/${id}`);
    },

    // Relationships
    getRelationships: async () => {
        const response = await api.get('/network/relationships');
        return response.data;
    },
    createRelationship: async (data) => {
        const response = await api.post('/network/relationships', data);
        return response.data;
    },

    // Legacy Aliases (pointing to new endpoints where possible)
    getCompanies: async () => NetworkService.getOrganizations(),
    getContacts: async () => NetworkService.getIndividuals(),
};

// Also export as CRMService for backward compatibility if needed
export const CRMService = NetworkService;
