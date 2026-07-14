import express from 'express';
import { getConversationHistory, createMessage, getUsers } from '../controllers/messageController.js';
import { googleLogin } from '../controllers/authController.js';

const router = express.Router();

// Google Auth Endpoint
router.post('/auth/google', googleLogin);

// Get conversation history between two users
router.get('/messages/:username/:otherUsername', getConversationHistory);

// Create a new message via REST
router.post('/messages', createMessage);

// Get list of all users who have ever sent/received messages
router.get('/users', getUsers);

export default router;
