import api from '../lib/api';

export async function createDraft(file, source = 'wizard') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source', source);
  const response = await api.post('/contracts/drafts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getDraft(draftId) {
  const response = await api.get(`/contracts/drafts/${draftId}`);
  return response.data;
}

export async function createContractFromDraft(draftId, overrides = {}) {
  const response = await api.post('/contracts', {
    draft_id: draftId,
    overrides,
  });
  return response.data;
}

export async function planAttach(contractId, releaseId) {
  const response = await api.post(`/contracts/${contractId}/attach/plan`, {
    release_id: Number(releaseId),
  });
  return response.data;
}

export async function applyAttach(contractId, payload) {
  const response = await api.post(`/contracts/${contractId}/attach/apply`, payload);
  return response.data;
}

export default {
  createDraft,
  getDraft,
  createContractFromDraft,
  planAttach,
  applyAttach,
};
