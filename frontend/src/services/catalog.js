import api from '../lib/api';

export const CatalogService = {
    // Generic CRUD helper
    // entity: 'labels', 'artists', 'works', etc.
    getAll: async (entity) => {
        const response = await api.get(`/catalog/${entity}`);
        return response.data;
    },

    getById: async (entity, id) => {
        const response = await api.get(`/catalog/${entity}/${id}`);
        return response.data;
    },

    create: async (entity, data) => {
        const response = await api.post(`/catalog/${entity}`, data);
        return response.data;
    },

    update: async (entity, id, data) => {
        const response = await api.put(`/catalog/${entity}/${id}`, data);
        return response.data;
    },

    delete: async (entity, id) => {
        const response = await api.delete(`/catalog/${entity}/${id}`);
        return response.data;
    },

    // Specific methods if needed (e.g. for custom endpoints)
    getArtistWorks: async (artistId) => {
        const response = await api.get(`/catalog/artists/${artistId}/works`);
        return response.data;
    },

    getArtistReleases: async (artistId) => {
        const response = await api.get(`/catalog/artists/${artistId}/releases`);
        return response.data;
    },

    getReleaseTracks: async (releaseId) => {
        const response = await api.get(`/catalog/releases/${releaseId}/tracks`);
        return response.data;
    },

    getLabelArtists: async (labelId) => {
        const response = await api.get(`/catalog/labels/${labelId}/artists`);
        return response.data;
    },

    getLabelReleases: async (labelId) => {
        const response = await api.get(`/catalog/labels/${labelId}/releases`);
        return response.data;
    },

    getPublisherArtists: async (publisherId) => {
        const response = await api.get(`/catalog/publishers/${publisherId}/artists`);
        return response.data;
    },

    getPublisherWorks: async (publisherId) => {
        const response = await api.get(`/catalog/publishers/${publisherId}/works`);
        return response.data;
    },

    getArtistContracts: async (artistId) => {
        const response = await api.get(`/contracts`, {
            params: { entity_type: 'Artist', entity_id: artistId }
        });
        return response.data;
    }
};
