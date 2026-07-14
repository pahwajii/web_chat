import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../socket/socketService';
import { messageApi } from '../api/messageApi';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('chat_username') || '');
  const [currentUserEmail, setCurrentUserEmail] = useState(() => localStorage.getItem('chat_email') || '');
  const [currentUserPicture, setCurrentUserPicture] = useState(() => localStorage.getItem('chat_picture') || '');
  const [userProfiles, setUserProfiles] = useState({}); // { username: { username, picture, email } }
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // { username: boolean }
  const [unreadCounts, setUnreadCounts] = useState({}); // { username: count }
  const [socketConnected, setSocketConnected] = useState(false);

  // Use refs to avoid re-binding socket events on state change
  const activeChatUserRef = useRef(activeChatUser);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    activeChatUserRef.current = activeChatUser;
  }, [activeChatUser]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Load all users from REST endpoint
  const loadUsersList = useCallback(async () => {
    try {
      const usersData = await messageApi.getUsers();
      const profilesMap = {};
      const usernames = [];
      
      usersData.forEach(u => {
        profilesMap[u.username] = u;
        usernames.push(u.username);
      });
      
      setUserProfiles(prev => ({ ...prev, ...profilesMap }));
      
      // Filter out self
      const filtered = usernames.filter(u => u !== currentUserRef.current);
      setAllRegisteredUsers(filtered);
    } catch (err) {
      console.error('Failed to load registered users:', err);
    }
  }, []);

  // Set up socket listener
  const setupSocketListeners = useCallback((socket) => {
    if (!socket) return;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('onlineUsers', (users) => {
      // Filter out self
      const filtered = users.filter(u => u !== currentUserRef.current);
      setOnlineUsers(filtered);
    });

    socket.on('receiveMessage', (msg) => {
      const activeUser = activeChatUserRef.current;
      
      // If the message is from the user we are currently chatting with
      if (msg.sender === activeUser) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        
        // Send read acknowledgment back
        socketService.emitMessageRead(msg.sender, currentUserRef.current);
      } else {
        // Increment unread count for this sender
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.sender]: (prev[msg.sender] || 0) + 1,
        }));
      }

      // Refresh database users list to include this sender if not already listed
      loadUsersList();
    });

    socket.on('messageSentConfirm', (msg) => {
      setMessages((prev) => {
        // Find by tempId and replace
        if (msg.tempId) {
          const index = prev.findIndex(m => m._id === msg.tempId || m.tempId === msg.tempId);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = msg;
            return updated;
          }
        }
        
        // Fallback: append if not exists
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      // Refresh users list in case this was a first-time message
      loadUsersList();
    });

    socket.on('messagesReadUpdate', ({ sender, receiver }) => {
      // sender is the person who sent the messages (us), receiver is who read them
      if (receiver === activeChatUserRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender === currentUserRef.current && msg.receiver === receiver
              ? { ...msg, read: true, delivered: true }
              : msg
          )
        );
      }
    });

    socket.on('typing', ({ sender }) => {
      setTypingUsers((prev) => ({ ...prev, [sender]: true }));
    });

    socket.on('stopTyping', ({ sender }) => {
      setTypingUsers((prev) => ({ ...prev, [sender]: false }));
    });
  }, [loadUsersList]);

  // Login handler
  const login = useCallback((username, email = '', picture = '') => {
    const trimmed = username.trim();
    if (!trimmed) return;
    
    localStorage.setItem('chat_username', trimmed);
    localStorage.setItem('chat_email', email);
    localStorage.setItem('chat_picture', picture);
    
    setCurrentUser(trimmed);
    setCurrentUserEmail(email);
    setCurrentUserPicture(picture);
    
    const socket = socketService.connect(trimmed);
    setSocketConnected(socket.connected);
    setupSocketListeners(socket);
    loadUsersList();
  }, [setupSocketListeners, loadUsersList]);

  // Logout handler
  const logout = useCallback(() => {
    socketService.disconnect();
    localStorage.removeItem('chat_username');
    localStorage.removeItem('chat_email');
    localStorage.removeItem('chat_picture');
    setCurrentUser('');
    setCurrentUserEmail('');
    setCurrentUserPicture('');
    setUserProfiles({});
    setActiveChatUser(null);
    setMessages([]);
    setOnlineUsers([]);
    setAllRegisteredUsers([]);
    setTypingUsers({});
    setUnreadCounts({});
    setSocketConnected(false);
  }, []);

  // Handle selecting another user to chat with
  const selectChatUser = useCallback(async (otherUsername) => {
    setActiveChatUser(otherUsername);
    
    // Clear unread count locally
    setUnreadCounts((prev) => ({
      ...prev,
      [otherUsername]: 0,
    }));

    if (otherUsername && currentUser) {
      try {
        // Load messages history from DB
        const history = await messageApi.getConversationHistory(currentUser, otherUsername);
        setMessages(history);
        
        // Notify socket that we've read these messages
        socketService.emitMessageRead(otherUsername, currentUser);
      } catch (err) {
        console.error('Failed to load message history:', err);
      }
    } else {
      setMessages([]);
    }
  }, [currentUser]);

  // Send message handler
  const sendMessage = useCallback((text) => {
    if (!text.trim() || !activeChatUser || !currentUser) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: tempId,
      tempId,
      sender: currentUser,
      receiver: activeChatUser,
      message: text,
      read: false,
      delivered: false,
      createdAt: new Date().toISOString(),
      isTemp: true,
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, tempMessage]);

    // Send through Socket
    socketService.sendMessage(currentUser, activeChatUser, text, tempId);
  }, [currentUser, activeChatUser]);

  // Send typing state
  const sendTypingStatus = useCallback((isTyping) => {
    if (!currentUser || !activeChatUser) return;
    if (isTyping) {
      socketService.emitTyping(currentUser, activeChatUser);
    } else {
      socketService.emitStopTyping(currentUser, activeChatUser);
    }
  }, [currentUser, activeChatUser]);

  // Reconnect socket on mount if currentUser exists
  useEffect(() => {
    if (currentUser) {
      const socket = socketService.connect(currentUser);
      setSocketConnected(socket.connected);
      setupSocketListeners(socket);
      loadUsersList();
    }
    return () => {
      // Socket cleanup
      socketService.disconnect();
    };
  }, [currentUser, setupSocketListeners, loadUsersList]);

  // Compute a list of all distinct users (online + historical)
  const getUniqueUsersList = useCallback(() => {
    const set = new Set([...onlineUsers, ...allRegisteredUsers]);
    const filtered = Array.from(set).filter(u => u !== 'Gemini' && u !== currentUserRef.current);
    return currentUserRef.current === 'Gemini' ? filtered : ['Gemini', ...filtered];
  }, [onlineUsers, allRegisteredUsers]);

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        currentUserEmail,
        currentUserPicture,
        userProfiles,
        activeChatUser,
        messages,
        onlineUsers,
        typingUsers,
        unreadCounts,
        socketConnected,
        usersList: getUniqueUsersList(),
        login,
        logout,
        selectChatUser,
        sendMessage,
        sendTypingStatus,
        refreshUsersList: loadUsersList
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
