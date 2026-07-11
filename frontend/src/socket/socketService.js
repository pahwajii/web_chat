import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

class SocketService {
  socket = null;

  connect(username) {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(BACKEND_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server:', this.socket.id);
      this.socket.emit('join', username);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(sender, receiver, message, tempId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('sendMessage', { sender, receiver, message, tempId });
    } else {
      console.warn('Socket not connected, cannot send message');
    }
  }

  emitTyping(sender, receiver) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing', { sender, receiver });
    }
  }

  emitStopTyping(sender, receiver) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('stopTyping', { sender, receiver });
    }
  }

  emitMessageRead(sender, receiver) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('messageRead', { sender, receiver });
    }
  }

  // Generic register listener
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Generic unregister listener
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

const socketService = new SocketService();
export default socketService;
