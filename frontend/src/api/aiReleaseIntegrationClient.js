import api from '../lib/api';

const ENDPOINT = '/ai/release_integration';

export async function plan(releaseId, contractExtract, extractId) {
    try {
        const payload = {
            release_id: Number(releaseId),
            mode: 'readonly',
        };

        if (contractExtract) payload.contract_extract = contractExtract;
        if (extractId) payload.extract_id = Number(extractId);

        const response = await api.post(`${ENDPOINT}/plan`, payload);
        return response.data;
    } catch (error) {
        if (error?.response?.status === 404) {
            return { featureDisabled: true };
        }
        throw error;
    }
}

export async function health() {
    const response = await api.get(`${ENDPOINT}/health`);
    return response.data;
}

export async function attach(payload) {
    try {
        const response = await api.post(`${ENDPOINT}/attach`, payload);
        return response.data;
    } catch (error) {
        if (error?.response?.status === 404) {
            return { featureDisabled: true };
        }
        throw error;
    }
}

export default { plan, health, attach };
