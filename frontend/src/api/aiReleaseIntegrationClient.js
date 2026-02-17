import api from '../lib/api';

const ENDPOINT = '/ai/release_integration';

export async function plan(input, contractExtract, extractId) {
    try {
        let payload;
        if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
            payload = { mode: 'readonly', ...input };
        } else {
            payload = {
                release_id: Number(input),
                mode: 'readonly',
            };
            if (contractExtract) payload.contract_extract = contractExtract;
            if (extractId) payload.extract_id = Number(extractId);
        }

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

export async function ingest({ release_id, file, contract_id }) {
    try {
        const formData = new FormData();
        formData.append('release_id', String(release_id));
        if (file) {
            formData.append('file', file);
            formData.append('contract_file', file);
        }
        if (contract_id) formData.append('contract_id', String(contract_id));

        const response = await api.post(`${ENDPOINT}/ingest`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        if (error?.response?.status === 404) {
            return { featureDisabled: true };
        }
        throw error;
    }
}

export default { plan, health, attach, ingest };
