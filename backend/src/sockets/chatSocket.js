import Message from '../models/message.js';

// Maps username -> Set of socket IDs (to support multiple tabs per user)
const userSocketMap = new Map();

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
