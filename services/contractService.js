import api, { BASE_URL } from '../lib/api';

const ENDPOINT = '/contracts';

const contractService = {
    getAll: (params) => api.get(ENDPOINT, { params }),
    getById: (id) => api.get(`${ENDPOINT}?id=${id}`),
    create: (data) => api.post(ENDPOINT, data),
    update: (id, data) => api.put(`${ENDPOINT}?id=${id}`, data),
    delete: (id) => api.delete(`${ENDPOINT}?id=${id}`),

    // Parties
    addParty: (contractId, data) => api.post(`${ENDPOINT}?action=add_party`, { id: contractId, ...data }),
    updateParty: (contractId, partyId, data) => api.post(`${ENDPOINT}?action=update_party`, { id: contractId, party_id: partyId, ...data }),
    removeParty: (contractId, partyId) => api.delete(`${ENDPOINT}?id=${contractId}&partyId=${partyId}`),

    // Assets
    addAsset: (contractId, data) => api.post(`${ENDPOINT}?action=add_asset`, { id: contractId, ...data }),
    removeAsset: (contractId, assetId) => api.delete(`${ENDPOINT}?id=${contractId}&assetId=${assetId}`),

    // Splits
    addSplitGroup: (contractId, data) => api.post(`${ENDPOINT}?action=add_split_group`, { id: contractId, ...data }),
    removeSplitGroup: (contractId, groupId) => api.delete(`${ENDPOINT}?id=${contractId}&splitGroupId=${groupId}`),
    addSplit: (contractId, groupId, data) => api.post(`${ENDPOINT}?action=add_split`, { id: contractId, group_id: groupId, ...data }),
    removeSplit: (contractId, groupId, splitId) => api.delete(`${ENDPOINT}?id=${contractId}&splitGroupId=${groupId}&splitId=${splitId}`),

    // Documents
    addDocument: (contractId, file) => {
        const fd = new FormData();
        fd.append('file', file);
        return api.post(`${ENDPOINT}?action=upload_document&id=${contractId}`, fd);
    },
    removeDocument: (contractId, docId) => api.delete(`${ENDPOINT}?id=${contractId}&docId=${docId}`),
    buildFileUrl: (filePath) => `${BASE_URL}${filePath}`,
    buildDownloadUrl: (contractId, docId) => `${BASE_URL}${ENDPOINT}/${contractId}/documents/${docId}/download`,

    // Track linking
    linkTrack: (contractId, trackId) => api.post(`${ENDPOINT}?action=link_track`, { id: contractId, track_id: trackId }),
    unlinkTrack: (contractId, trackId) => api.delete(`${ENDPOINT}?id=${contractId}&trackId=${trackId}`),

    // Completeness
    getCompleteness: (contractId) => api.get(`${ENDPOINT}?action=completeness&id=${contractId}`),

    // Lookup + inline create
    partyLookup: (q, types = 'artist,organization,individual', limit = 10) =>
        api.get(`${ENDPOINT}?action=party_lookup&q=${encodeURIComponent(q)}&limit=${limit}`),
    lookupTracks: (q, limit = 10) => api.get('/tracks', { params: { q, limit } }),
    lookupWorks: (q, limit = 10) => api.get('/works', { params: { q, limit } }),
    lookupReleases: (q, limit = 10) => api.get('/releases', { params: { q, limit } }),
    createArtistInline: (name) => api.post('/artists', { name }),
};

export default contractService;
