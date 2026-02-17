import api from '../lib/api';

export async function extract(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/ai/contracts/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function createFromExtract(file, payload) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('payload', JSON.stringify(payload));
  const response = await api.post('/contracts/from_extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export default { extract, createFromExtract };
