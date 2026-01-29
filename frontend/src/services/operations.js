import api from '../lib/api';

const createCrudService = (resource) => ({
    getAll: async () => {
        const response = await api.get(`/${resource}`);
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/${resource}/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post(`/${resource}`, data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/${resource}/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/${resource}/${id}`);
        return response.data;
    }
});

export const DocumentsService = {
    getAll: async (params = {}) => {
        const response = await api.get('/documents', { params });
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/documents/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/documents', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/documents/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/documents/${id}`);
        return response.data;
    },
    upload: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/documents/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};
export const NotesService = createCrudService('notes');
export const EventsService = createCrudService('events');
export const PlaylistsService = createCrudService('playlists');
export const TasksService = createCrudService('tasks');
export const UsersService = createCrudService('users');
export const AdminService = {
    ...createCrudService('admin'),
    backup: async () => {
        const response = await api.post('/admin/backup');
        return response.data;
    },
    getBackups: async () => {
        const response = await api.get('/admin/backups');
        return response.data;
    },
    restore: async (filename) => {
        const response = await api.post(`/admin/restore/${filename}`);
        return response.data;
    },
    getStats: async () => {
        const response = await api.get('/admin/stats');
        return response.data;
    },
    getAuditLogs: async () => {
        const response = await api.get('/admin/audit-logs');
        return response.data;
    },
    downloadBackup: async (filename) => {
        const response = await api.get(`/admin/backup/download/${filename}`, {
            responseType: 'blob'
        });
        // Trigger download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
    uploadBackup: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/admin/backup/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    getBackupSchedule: async () => {
        const response = await api.get('/admin/backup/schedule');
        return response.data;
    },
    updateBackupSchedule: async (frequency) => {
        const response = await api.post('/admin/backup/schedule', { frequency });
        return response.data;
    }
};
