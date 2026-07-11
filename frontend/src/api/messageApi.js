import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const messageApi = {
  // Fetch messages between two users
  getConversationHistory: async (username, otherUsername) => {
    try {
      const response = await api.get(`/messages/${username}/${otherUsername}`);
      return response.data;
    } catch (error) {
      console.error(`Error loading history for ${username} <-> ${otherUsername}:`, error);
      throw error;
    }
  },

  // Fetch all users who have history in the app
  getUsers: async () => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // REST fallback for posting messages (normally we use socket)
  sendMessage: async (messageData) => {
    try {
      const response = await api.post('/messages', messageData);
      return response.data;
    } catch (error) {
      console.error('Error sending message via API:', error);
      throw error;
    }
  }
};

export default api;
