import api from '../lib/api';

export const partyLookupClient = {
  async searchEntities({ q, limit = 20 }) {
    // Preferred contract
    try {
      const res = await api.get('/party_lookup', { params: { query: q, limit } });
      return res.data;
    } catch (e) {
      // Fallback to already-implemented endpoint
      const res = await api.get('/parties/search', { params: { q, types: 'artist,individual,organization', limit } });
      return {
        items: (res?.data?.items || []).map((x) => ({
          entity_type: x.ref_type,
          id: x.ref_id,
          display_name: x.display_name,
          confidence: x.confidence,
          match_strategy: x.match_strategy,
        })),
      };
    }
  },

  async createArtist({ name }) {
    const res = await api.post('/artists', { name });
    return res.data;
  },

  async createOrganization({ name }) {
    const res = await api.post('/organizations', { name });
    return res.data;
  },

  async createIndividual({ full_name }) {
    const res = await api.post('/individuals', { full_name });
    return res.data;
  },
};

export default partyLookupClient;
