import api from '../lib/api';

const statusQuoService = {
    getDashboard: (params = {}) => api.get('/admin-of-works/status-quo', { params }),
    recompute: () => api.post('/office/status-quo/recompute'),
};

export default statusQuoService;
