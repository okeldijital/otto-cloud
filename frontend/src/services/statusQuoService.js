import api from '../lib/api';

const statusQuoService = {
    getDashboard: (params = {}) => api.get('/admin-of-works/status-quo', { params }),
};

export default statusQuoService;
