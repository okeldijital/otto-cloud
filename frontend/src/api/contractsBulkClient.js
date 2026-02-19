import api from '../lib/api';

const contractsBulkClient = {
  extractBulk: async (formData) => {
    const response = await api.post('/ai/contracts/extract_bulk', formData);
    return response.data;
  },

  getBulkStatus: async (jobId) => {
    const response = await api.get(`/ai/contracts/extract_bulk/status/${jobId}`);
    return response.data;
  },

  trackMapPlan: async (payload) => {
    const response = await api.post('/ai/contracts/track_map_plan', payload);
    return response.data;
  },

  createFromExtract: async (formData) => {
    const response = await api.post('/contracts/from_extract', formData);
    return response.data;
  },

  searchTracks: async (q, limit = 20, offset = 0) => {
    const response = await api.get('/tracks/search', { params: { q, limit, offset } });
    return response.data;
  },

  searchParties: async (q, limit = 20) => {
    const response = await api.get('/contracts/party_search', { params: { q, limit } });
    return response.data;
  },

  createPartyInline: async (payload) => {
    const response = await api.post('/contracts/party_create', payload);
    return response.data;
  },

  batchSetParties: async (contractId, payload) => {
    const response = await api.post(`/contracts/${contractId}/parties/batch_set`, payload);
    return response.data;
  },

  batchSetTracks: async (contractId, payload) => {
    const response = await api.post(`/contracts/${contractId}/tracks/batch_set`, payload);
    return response.data;
  },
};

export default contractsBulkClient;
