import api from '../lib/api';

const AI_ENDPOINT = '/ai';

export const aiClient = {
    /**
     * Check AI health and enabled status
     */
    health: async () => {
        const response = await api.get(`${AI_ENDPOINT}/health`);
        return response.data;
    },

    /**
     * List available AI tools
     */
    listTools: async () => {
        const response = await api.get(`${AI_ENDPOINT}/tools`);
        return response.data;
    },

    /**
     * Send a chat message
     * @param {string} message - The user's message
     * @param {number|null} sessionId - Optional session ID to continue conversation
     */
    chat: async (message, sessionId = null) => {
        const response = await api.post(`${AI_ENDPOINT}/chat`, {
            message,
            session_id: sessionId
        });
        return response.data;
    },

    /**
     * Extract structured data from a PDF contract
     * @param {File} file - The PDF file to extract
     */
    extractContract: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`${AI_ENDPOINT}/contracts/extract`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        if (response.data?.version === 'v2' && response.data?.data) {
            return { ...response.data.data, __version: 'v2', __legacy: response.data.legacy_v1 || null };
        }
        return response.data;
    },

    /**
     * Resolve extraction against existing entities
     * @param {Object} extraction - The data extracted from the contract
     */
    resolveContract: async (extraction) => {
        const response = await api.post(`${AI_ENDPOINT}/contracts/resolve`, extraction);
        return response.data;
    },

    /**
     * Get read-only link suggestions for extraction
     * @param {Object} extraction - The data extracted from the contract
     */
    linkSuggest: async (extraction) => {
        const response = await api.post(`${AI_ENDPOINT}/contracts/link_suggest`, { extraction });
        return response.data;
    }
};

export default aiClient;
