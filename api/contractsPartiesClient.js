import api from '../lib/api';

export const contractsPartiesClient = {
  async save({ contract_id, parties }) {
    const res = await api.post('/contracts/parties/save', {
      contract_id,
      confirm_non_destructive: true,
      parties,
    });
    return res.data;
  },
};

export default contractsPartiesClient;
