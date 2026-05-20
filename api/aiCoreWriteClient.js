import api from '../lib/api';

const ENDPOINT = '/ai/core_write';

export async function health() {
    const response = await api.get(`${ENDPOINT}/health`);
    return response.data;
}

export async function propose(payload) {
    try {
        const response = await api.post(`${ENDPOINT}/propose`, payload);
        return response.data;
    } catch (error) {
        if (error?.response?.status === 404) {
            return { featureDisabled: true };
        }
        throw error;
    }
}

export async function apply(payload) {
    try {
        const response = await api.post(`${ENDPOINT}/apply`, payload);
        return response.data;
    } catch (error) {
        if (error?.response?.status === 404) {
            return { featureDisabled: true };
        }
        throw error;
    }
}

export default { health, propose, apply };
