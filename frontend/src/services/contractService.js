import api, { BASE_URL } from '../lib/api';

const ENDPOINT = '/contracts';

const contractService = {
    getAll: (params) => api.get(ENDPOINT, { params }),
    getById: (id) => api.get(`${ENDPOINT}/${id}`),
    create: (formData) => api.post(`${ENDPOINT}`, formData),
    update: (id, data) => api.patch(`${ENDPOINT}/${id}`, data),
    delete: (id) => api.delete(`${ENDPOINT}/${id}`),

    // Parties
    addParty: (id, data) => api.post(`${ENDPOINT}/${id}/parties`, data),
    removeParty: (id, partyId) => api.delete(`${ENDPOINT}/${id}/parties/${partyId}`),

    // Assets
    addAsset: (id, data) => api.post(`${ENDPOINT}/${id}/assets`, data),
    removeAsset: (id, assetId) => api.delete(`${ENDPOINT}/${id}/assets/${assetId}`),

    // Splits
    addSplitGroup: (id, data) => api.post(`${ENDPOINT}/${id}/split-groups`, data),
    removeSplitGroup: (id, groupId) => api.delete(`${ENDPOINT}/${id}/split-groups/${groupId}`),
    addSplit: (id, groupId, data) => api.post(`${ENDPOINT}/${id}/split-groups/${groupId}/splits`, data),
    removeSplit: (id, groupId, splitId) => api.delete(`${ENDPOINT}/${id}/split-groups/${groupId}/splits/${splitId}`),

    // Documents
    addDocument: (id, file) => {
        const fd = new FormData();
        fd.append('file', file);
        return api.post(`${ENDPOINT}/${id}/documents`, fd);
    },
    removeDocument: (id, docId) => api.delete(`${ENDPOINT}/${id}/documents/${docId}`),
    makePrimary: (id, docId) => api.patch(`${ENDPOINT}/${id}/documents/${docId}/make-primary`),
    uploadDocumentFile: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/documents/upload', formData);
    },
    buildFileUrl: (filePath) => `${BASE_URL}${filePath}`,
    buildDownloadUrl: (contractId, docId) => `${BASE_URL}${ENDPOINT}/${contractId}/documents/${docId}/download`,

    // Lookup + inline create
    partyLookup: (q, types = 'artist,organization,individual', limit = 10) =>
        api.get('/party_lookup', { params: { q, types, limit } }),
    lookupTracks: (q, limit = 10) => api.get('/tracks', { params: { q, limit } }),
    lookupWorks: (q, limit = 10) => api.get('/works', { params: { q, limit } }),
    lookupReleases: (q, limit = 10) => api.get('/releases', { params: { q, limit } }),
    createArtistInline: (name) => api.post('/artists', { name }),
    createOrganizationInline: (name) => api.post('/organizations', { name }),
    createIndividualInline: (name) => api.post('/individuals', { name }),
};

export default contractService;
