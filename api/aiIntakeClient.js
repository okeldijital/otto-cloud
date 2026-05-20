import api from '../lib/api';

const ENDPOINT = '/ai/contracts/intake';

export async function wizardPlan({ release_id, file, contract_id }) {
    const formData = new FormData();
    formData.append('release_id', String(release_id));
    if (file) formData.append('file', file);
    if (contract_id) formData.append('contract_id', String(contract_id));

    try {
        const response = await api.post(`${ENDPOINT}/wizard_plan`, formData, {
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

export default { wizardPlan };
