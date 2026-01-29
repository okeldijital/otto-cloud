import api from '../lib/api';

export const CRMService = {
    // Companies
    getCompanies: async () => {
        const response = await api.get('/crm/companies');
        return response.data;
    },
    getCompany: async (id) => {
        const response = await api.get(`/crm/companies/${id}`);
        return response.data;
    },
    createCompany: async (data) => {
        const response = await api.post('/crm/companies', data);
        return response.data;
    },
    updateCompany: async (id, data) => {
        const response = await api.put(`/crm/companies/${id}`, data);
        return response.data;
    },
    deleteCompany: async (id) => {
        const response = await api.delete(`/crm/companies/${id}`);
        return response.data;
    },

    // Distributors (Companies)
    getAllDistributors: async () => {
        const response = await api.get('/crm/companies');
        return response.data;
    },

    // Contacts
    getContacts: async () => {
        const response = await api.get('/crm/contacts');
        return response.data;
    },
    getContact: async (id) => {
        const response = await api.get(`/crm/contacts/${id}`);
        return response.data;
    },
    createContact: async (data) => {
        const response = await api.post('/crm/contacts', data);
        return response.data;
    },
    updateContact: async (id, data) => {
        const response = await api.put(`/crm/contacts/${id}`, data);
        return response.data;
    },
    deleteContact: async (id) => {
        const response = await api.delete(`/crm/contacts/${id}`);
        return response.data;
    }
};
