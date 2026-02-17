import api from '../lib/api';

const ENDPOINT = '/ai/release_validation';

export async function plan({ release_id, contract_extract, contract_id }) {
    try {
        const response = await api.post(`${ENDPOINT}/plan`, {
            release_id,
            contract_extract,
            contract_id,
        });
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

export default { plan, health };
