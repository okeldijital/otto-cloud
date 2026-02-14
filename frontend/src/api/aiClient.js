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
    }
};

export default aiClient;
