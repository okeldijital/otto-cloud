import api from '../lib/api';

export const tracksClient = {
  async search({ q, limit = 25 }) {
    const query = String(q || '').trim();
    if (!query) return { items: [] };

    const normalize = (rows) => (Array.isArray(rows) ? rows : []).map((row) => ({
      id: Number(row.id),
      label: row.title || row.name || row.display_name || row.filename || `Track #${row.id}`,
      display_name: row.display_name || row.title || row.name || `Track #${row.id}`,
      title: row.title || row.display_name || row.name || `Track #${row.id}`,
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

  async byIds(ids = []) {
    const normalized = Array.from(new Set((ids || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
    if (!normalized.length) return { items: [] };
    const res = await api.post('/tracks/by_ids', { ids: normalized });
    const items = Array.isArray(res?.data?.items)
      ? res.data.items.map((row) => ({
        id: Number(row.id),
        title: row.title || `Track #${row.id}`,
        label: row.title || `Track #${row.id}`,
      }))
      : [];
    return { items };
  },
};

export default tracksClient;
