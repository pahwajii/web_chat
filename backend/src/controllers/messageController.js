import Message from '../models/message.js';
import User from '../models/user.js';

// Get conversation history between two users
export const getConversationHistory = async (req, res) => {
  try {
    const { username, otherUsername } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: username, receiver: otherUsername },
        { sender: otherUsername, receiver: username },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving conversation history', error: error.message });
  }
};

// Create a new message via REST API (fallback/alternate to socket direct send)
export const createMessage = async (req, res) => {
  try {
    const { sender, receiver, message } = req.body;
    if (!sender || !receiver || !message) {
      return res.status(400).json({ message: 'Sender, receiver, and message content are required.' });
    }

    const newMessage = new Message({
      sender,
      receiver,
      message,
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: 'Error creating message', error: error.message });
  }
};

// Get list of all unique users who have previously sent or received messages
export const getUsers = async (req, res) => {
  try {
    // 1. Get all unique usernames from message history
    const senders = await Message.distinct('sender');
    const receivers = await Message.distinct('receiver');
    const messageUsernames = Array.from(new Set([...senders, ...receivers]));

    // 2. Fetch all Google-registered users
    const registeredUsers = await User.find({});
    
    // Create a map for easy lookup
    const userMap = new Map();
    registeredUsers.forEach(u => {
      userMap.set(u.name, { username: u.name, picture: u.picture, email: u.email });
    });

    // 3. Construct the final users list
    const finalUsers = [];
    
    // Add all registered users first
    registeredUsers.forEach(u => {
      finalUsers.push({ username: u.name, picture: u.picture, email: u.email });
    });

    // Add any message usernames that are NOT in the registered users list (e.g. guests)
    messageUsernames.forEach(username => {
      if (!userMap.has(username) && username !== 'Gemini') {
        finalUsers.push({ username, picture: null, email: null });
      }
    });
    
    res.status(200).json(finalUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users list', error: error.message });
  }
};
