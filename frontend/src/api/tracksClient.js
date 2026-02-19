import api from '../lib/api';

export const tracksClient = {
  async search({ q, limit = 25 }) {
    const query = String(q || '').trim();
    if (!query) return { items: [] };

    const normalize = (rows) => (Array.isArray(rows) ? rows : []).map((row) => ({
      id: Number(row.id),
      display_name: row.display_name || row.title || `Track #${row.id}`,
      artist: row.artist || (Array.isArray(row.artists) ? row.artists.filter(Boolean).join(', ') : null),
      release: row.release || null,
      isrc: row.isrc || null,
    }));

    try {
      const res = await api.get('/tracks/search', { params: { q: query, limit, offset: 0 } });
      return { items: normalize(res?.data?.items), runtime: res?.data?.runtime, org_id: res?.data?.org_id };
    } catch (e) {
      const res = await api.get('/tracks', { params: { query, limit } });
      return { items: normalize(res?.data?.items || res?.data?.results) };
    }
  },
};

export default tracksClient;
