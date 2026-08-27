import axios from 'axios';

export const API_URL = '/api';
export const BASE_URL = '/api';

// Better Auth's cookie-backed session is the canonical authentication boundary.
// Do not inject or clear a competing localStorage bearer token.
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    if (config.url === '/iam/roles') {
        config.url = '/auth/organizations/roles';
    }
    return config;
});

api.interceptors.response.use((response) => {
    if (response.config.url === '/organizations/members' && Array.isArray(response.data?.members)) {
        response.data = response.data.members.map((member) => ({
            ...member,
            name: member.displayName,
            roles: member.roleName ? [{ id: member.roleId || member.roleKey, name: member.roleName }] : [],
            is_active: member.status === 'active',
            accepted_at: member.joinedAt,
            user_id: member.identityId,
        }));
    }
    if (response.config.url === '/auth/organizations/roles' && Array.isArray(response.data?.roles)) {
        response.data = response.data.roles.map((role) => ({
            ...role,
            is_system: role.isSystem,
            _count: { role_permissions: role.permissionCount },
        }));
    }
    return response;
});

export default api;
