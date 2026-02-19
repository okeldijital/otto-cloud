import api from '../lib/api';

const ENDPOINT = '/ai/contracts/track_map_plan';

export async function trackMapPlan(payload) {
  try {
    const response = await api.post(ENDPOINT, payload);
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return { featureDisabled: true };
    }
    throw error;
  }
}

export default { trackMapPlan };
