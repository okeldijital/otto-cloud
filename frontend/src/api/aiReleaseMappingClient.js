import api from '../lib/api';

const ENDPOINT = '/ai/release_integration/map_plan';

export async function mapPlan(releaseId, extractV2) {
  try {
    const response = await api.post(ENDPOINT, {
      release_id: Number(releaseId),
      extract_v2: extractV2,
    });
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return { featureDisabled: true };
    }
    throw error;
  }
}

export default { mapPlan };
