import api from '../lib/api';

const officeStatusQuoService = {
    list: (params = {}) => api.get('/office/status-quo', { params }),
    recompute: () => api.post('/office/status-quo/recompute'),
    resolve: (id, note) => api.post(`/office/status-quo/${id}/resolve`, { note }),
};

export default officeStatusQuoService;
