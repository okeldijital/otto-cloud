import api from '../lib/api';

export function normalizeContractsListResponse(payload) {
    // Preferred envelope shape
    if (payload && Array.isArray(payload.contracts)) {
        return payload;
    }

    // Current backend shape compatibility
    if (payload && Array.isArray(payload.items)) {
        return {
            contracts: payload.items,
            counts: payload.counts || {},
            meta: payload.meta || payload.page || {},
            ...payload,
        };
    }

    // Legacy shape: bare list
    if (Array.isArray(payload)) {
        return { contracts: payload, counts: {}, meta: {} };
    }

    // Defensive fallback
    return { contracts: [], counts: {}, meta: {} };
}

export async function getContracts(params) {
    const res = await api.get('/contracts', { params });
    return normalizeContractsListResponse(res.data);
}

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
    runSystemBackup: async () => {
        const response = await api.post('/admin/backups');
        return response.data;
    },
    getBackups: async () => {
        const response = await api.get('/admin/backups');
        return response.data?.backups || [];
    },
    restore: async (backupId) => {
        const response = await api.post('/admin/backups/restore', { backup_id: Number(backupId), confirm: true });
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
    downloadBackup: async (backupId, filename = 'backup.zip') => {
        const response = await api.get(`/admin/backups/download/${backupId}`, {
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
        const response = await api.post('/admin/backups/upload', formData, {
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
    },
    getSCCHealth: async () => {
        const response = await api.get('/admin/scc/health');
        return response.data;
    },
    getSCCRuntime: async () => {
        const response = await api.get('/admin/scc/runtime');
        return response.data;
    },
    getSCCDBInventory: async () => {
        const response = await api.get('/admin/scc/db/inventory');
        return response.data;
    },
    switchSCCDB: async (dbId) => {
        const response = await api.post('/admin/scc/db/switch', { db_id: dbId, confirm: true });
        return response.data;
    },
    switchSCCDBPath: async (dbPath, confirmExternal = false) => {
        const response = await api.post('/admin/scc/db/switch_path', {
            db_path: dbPath,
            confirm: true,
            confirm_external: !!confirmExternal,
        });
        return response.data;
    },
    getSCCOrgs: async () => {
        const response = await api.get('/admin/scc/orgs');
        return response.data;
    },
    switchSCCOrg: async (organizationId) => {
        const response = await api.post('/admin/scc/orgs/switch', { organization_id: organizationId, confirm: true });
        return response.data;
    },
};
