import Message from '../models/message.js';

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
    const senders = await Message.distinct('sender');
    const receivers = await Message.distinct('receiver');
    
    // Combine and deduplicate
    const uniqueUsers = Array.from(new Set([...senders, ...receivers]));
    
    res.status(200).json(uniqueUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users list', error: error.message });
  }
};
