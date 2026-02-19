import api from '../lib/api';

const partyClient = {
  async search(q, limit = 20) {
    const response = await api.get('/contracts/party_search', { params: { q, limit } });
    return response.data;
  },

  async create(payload) {
    const response = await api.post('/contracts/party_create', payload);
    return response.data;
  },

  async setContractParties(contractId, items) {
    const response = await api.post(`/contracts/${contractId}/parties/batch_set`, {
      confirm_non_destructive: true,
      items,
    });
    return response.data;
  },
};

export default partyClient;
