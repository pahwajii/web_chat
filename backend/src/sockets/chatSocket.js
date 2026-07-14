import Message from '../models/message.js';
import { generateGeminiResponse } from '../services/geminiService.js';

// Maps username -> Set of socket IDs (to support multiple tabs per user)
const userSocketMap = new Map();

// Helper to generate and emit Gemini responses
async function handleGeminiChat(io, sender, userMessage) {
  try {
    // 1. Emit typing event so user sees typing indicator
    if (userSocketMap.has(sender)) {
      userSocketMap.get(sender).forEach((socketId) => {
        io.to(socketId).emit('typing', { sender: 'Gemini', receiver: sender });
      });
    }

    // 2. Fetch recent conversation history between the sender and Gemini
    const history = await Message.find({
      $or: [
        { sender: sender, receiver: 'Gemini' },
        { sender: 'Gemini', receiver: sender },
      ],
    }).sort({ createdAt: -1 }).limit(15);

    // Sort to chronological order
    history.reverse();

    // 3. Generate Gemini response
    const botReply = await generateGeminiResponse(history);

    // 4. Save Gemini's message to MongoDB
    const botMessage = new Message({
      sender: 'Gemini',
      receiver: sender,
      message: botReply,
      delivered: true,
      read: false,
    });
    const savedBotMessage = await botMessage.save();

    // 5. Emit stopTyping event
    if (userSocketMap.has(sender)) {
      userSocketMap.get(sender).forEach((socketId) => {
        io.to(socketId).emit('stopTyping', { sender: 'Gemini', receiver: sender });
      });
    }

    // 6. Send the bot message to the sender (all active sockets/tabs)
    if (userSocketMap.has(sender)) {
      userSocketMap.get(sender).forEach((socketId) => {
        io.to(socketId).emit('receiveMessage', savedBotMessage.toObject());
      });
    }
  } catch (error) {
    console.error('Error handling Gemini response:', error);
    // In case of error, make sure to stop typing indicator
    if (userSocketMap.has(sender)) {
      userSocketMap.get(sender).forEach((socketId) => {
        io.to(socketId).emit('stopTyping', { sender: 'Gemini', receiver: sender });
      });
    }
  }
}

export default function chatSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Helper to get list of online users
    const getOnlineUsers = () => {
      return Array.from(userSocketMap.keys());
    };

    // User joins chat (registers username)
    socket.on('join', (username) => {
      if (!username) return;
      
      socket.username = username;
      
      if (!userSocketMap.has(username)) {
        userSocketMap.set(username, new Set());
      }
      userSocketMap.get(username).add(socket.id);

      console.log(`User registered: ${username} with socket ${socket.id}`);
      
      // Broadcast updated online users list
      io.emit('onlineUsers', getOnlineUsers());
    });

    // Handle sending a message
    socket.on('sendMessage', async ({ sender, receiver, message, tempId }) => {
      try {
        if (!sender || !receiver || !message) return;

        // Check if receiver is online (has active socket connections)
        const isReceiverOnline = userSocketMap.has(receiver) && userSocketMap.get(receiver).size > 0;
        
        // Save message to MongoDB
        const newMessage = new Message({
          sender,
          receiver,
          message,
          delivered: isReceiverOnline, // true if online, false if offline
          read: false
        });

        const savedMessage = await newMessage.save();

        // Prepare message payload to send
        const messagePayload = savedMessage.toObject();
        if (tempId) {
          messagePayload.tempId = tempId;
        }

        // Send to receiver if online (to all their active sockets/tabs)
        if (isReceiverOnline) {
          userSocketMap.get(receiver).forEach((socketId) => {
            io.to(socketId).emit('receiveMessage', messagePayload);
          });
        }

        // Send back to the sender (all their active sockets/tabs, e.g. for sync across tabs)
        if (userSocketMap.has(sender)) {
          userSocketMap.get(sender).forEach((socketId) => {
            io.to(socketId).emit('messageSentConfirm', messagePayload);
          });
        }

        // If the receiver is Gemini, trigger AI response generation
        if (receiver === 'Gemini') {
          handleGeminiChat(io, sender, message);
        }

      } catch (error) {
        console.error('Error saving or sending message:', error);
      }
    });

    // Handle typing status
    socket.on('typing', ({ sender, receiver }) => {
      if (userSocketMap.has(receiver)) {
        userSocketMap.get(receiver).forEach((socketId) => {
          io.to(socketId).emit('typing', { sender, receiver });
        });
      }
    });

    socket.on('stopTyping', ({ sender, receiver }) => {
      if (userSocketMap.has(receiver)) {
        userSocketMap.get(receiver).forEach((socketId) => {
          io.to(socketId).emit('stopTyping', { sender, receiver });
        });
      }
    });

    // Handle mark as read
    socket.on('messageRead', async ({ sender, receiver }) => {
      try {
        // sender is the person who sent the messages, receiver is the person who read them (current socket user)
        // Update all unread messages from sender to receiver
        await Message.updateMany(
          { sender, receiver, read: false },
          { $set: { read: true, delivered: true } }
        );

        // Notify the original sender that their messages were read
        if (userSocketMap.has(sender)) {
          userSocketMap.get(sender).forEach((socketId) => {
            io.to(socketId).emit('messagesReadUpdate', { sender, receiver });
          });
        }
      } catch (error) {
        console.error('Error updating read status:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const username = socket.username;
      console.log(`Socket disconnected: ${socket.id} (User: ${username || 'anonymous'})`);

      if (username && userSocketMap.has(username)) {
        const sockets = userSocketMap.get(username);
        sockets.delete(socket.id);
        
        if (sockets.size === 0) {
          userSocketMap.delete(username);
          console.log(`User completely offline: ${username}`);
          
          // Broadcast updated list to others
          io.emit('onlineUsers', getOnlineUsers());
        }
      }
    });
  });
}
