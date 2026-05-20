import api from '../lib/api';

const ENDPOINT = '/ai/royalty';

export async function getHealth() {
    const response = await api.get(`${ENDPOINT}/health`);
    return response.data;
}

export async function simulate(payload) {
    try {
        const response = await api.post(`${ENDPOINT}/simulate`, payload);
        return response.data;
    } catch (error) {
        if (error?.response?.status === 404) {
            return { featureDisabled: true };
        }
        throw error;
    }
}

export default { getHealth, simulate };
