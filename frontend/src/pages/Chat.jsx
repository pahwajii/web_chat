import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import {
  MessageSquare,
  LogOut,
  Send,
  UserPlus,
  Search,
  Wifi,
  WifiOff,
  Check,
  CheckCheck
} from 'lucide-react';

export default function Chat() {
  const navigate = useNavigate();
  const {
    currentUser,
    activeChatUser,
    messages,
    onlineUsers,
    typingUsers,
    unreadCounts,
    socketConnected,
    usersList,
    logout,
    selectChatUser,
    sendMessage,
    sendTypingStatus,
    refreshUsersList
  } = useChat();

  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newUserQuery, setNewUserQuery] = useState('');
  const [newUserError, setNewUserError] = useState('');

  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Redirect to login if not logged in
  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Scroll to bottom on new messages or chat partner switch
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Trigger read receipt when active conversation gains new messages
  useEffect(() => {
    if (activeChatUser && currentUser && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender === activeChatUser && !lastMessage.read) {
        // Double check that we have socket and send read ack
        const socket = socketConnected;
        if (socket) {
          // Simply let the context know we need to emit read
          selectChatUser(activeChatUser);
        }
      }
    }
  }, [messages.length, activeChatUser, currentUser, socketConnected, selectChatUser]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    sendMessage(messageInput.trim());
    setMessageInput('');

    // Clear typing timeout and emit stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStatus(false);
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    // Emit typing status
    sendTypingStatus(true);

    // Debounce stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 1500);
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    const targetUser = newUserQuery.trim();
    if (!targetUser) return;

    if (targetUser === currentUser) {
      setNewUserError("You cannot chat with yourself.");
      return;
    }

    // Check if user matches validation pattern
    if (!/^[a-zA-Z0-9_]+$/.test(targetUser)) {
      setNewUserError('Letters, numbers, and underscores only.');
      return;
    }

    setNewUserError('');
    setNewUserQuery('');
    
    // Select the chat partner (this automatically populates historical messages)
    selectChatUser(targetUser);
  };

  // Filter users based on search
  const filteredUsers = usersList.filter((user) =>
    user.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isUserOnline = (username) => onlineUsers.includes(username);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-0 md:p-4">
      {/* Container */}
      <div className="w-full h-screen md:h-[90vh] md:max-w-6xl glass-panel md:rounded-2xl shadow-2xl flex overflow-hidden border border-slate-800/40 relative">
        
        {/* SIDEBAR: Users list */}
        <div className="w-80 border-r border-slate-800/50 flex flex-col bg-[#1e293b]/40 backdrop-blur-md">
          
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/10">
                {currentUser ? currentUser.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="leading-tight">
                <h2 className="font-semibold text-sm truncate max-w-[120px]">{currentUser}</h2>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {socketConnected ? 'Connected' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={logout}
              title="Logout"
              className="p-2 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Start New Chat Form */}
          <div className="p-3 border-b border-slate-800/50">
            <form onSubmit={handleAddUser} className="relative flex items-center">
              <input
                type="text"
                placeholder="Chat with username..."
                value={newUserQuery}
                onChange={(e) => {
                  setNewUserQuery(e.target.value);
                  if (newUserError) setNewUserError('');
                }}
                className="w-full bg-[#0f172a]/50 text-xs px-3 py-2 pr-8 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-500"
              />
              <button
                type="submit"
                className="absolute right-1 p-1 text-slate-400 hover:text-blue-400 cursor-pointer"
                title="Start Conversation"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </form>
            {newUserError && (
              <p className="text-[10px] text-rose-400 mt-1 font-medium pl-1">{newUserError}</p>
            )}
          </div>

          {/* Users Search */}
          <div className="p-3 border-b border-slate-800/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0f172a]/20 text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-800/50 focus:outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                <MessageSquare className="w-6 h-6 stroke-[1.5] mb-2 opacity-50" />
                <p className="text-xs">No active chats</p>
              </div>
            ) : (
              filteredUsers.map((username) => {
                const isSelected = activeChatUser === username;
                const isOnline = isUserOnline(username);
                const isTyping = typingUsers[username];
                const unreadCount = unreadCounts[username] || 0;

                return (
                  <button
                    key={username}
                    onClick={() => selectChatUser(username)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-150 cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-600/10 text-white border border-blue-500/20 shadow-md shadow-blue-500/5'
                        : 'hover:bg-slate-800/40 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {username.substring(0, 2).toUpperCase()}
                        </div>
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0f172a] ${
                          isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                        }`}></span>
                      </div>
                      
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{username}</p>
                        <p className="text-xs truncate">
                          {isTyping ? (
                            <span className="text-blue-400 font-medium">typing...</span>
                          ) : (
                            <span className="text-slate-500">{isOnline ? 'Active now' : 'Offline'}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-blue-500/10">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* MAIN PANEL: Chat pane */}
        <div className="flex-1 flex flex-col bg-[#0f172a]/20">
          {activeChatUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-[#1e293b]/20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white">
                      {activeChatUser.substring(0, 2).toUpperCase()}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0f172a] ${
                      isUserOnline(activeChatUser) ? 'bg-emerald-500' : 'bg-slate-500'
                    }`}></span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{activeChatUser}</h3>
                    <p className="text-xs text-slate-400">
                      {typingUsers[activeChatUser] ? (
                        <span className="text-blue-400 font-medium">typing...</span>
                      ) : isUserOnline(activeChatUser) ? (
                        'Online'
                      ) : (
                        'Offline'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md">
                    Direct Message
                  </span>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <div className="w-12 h-12 rounded-full bg-slate-800/30 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <p className="text-sm font-medium">This is the start of your history with {activeChatUser}</p>
                    <p className="text-xs text-slate-600 mt-1">Send a message to start the conversation.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isSelf = msg.sender === currentUser;
                    
                    return (
                      <div
                        key={msg._id || index}
                        className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 relative shadow-md group ${
                            isSelf
                              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-tr-none'
                              : 'bg-slate-800/80 text-slate-100 rounded-tl-none border border-slate-700/30'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed break-words pr-4">
                            {msg.message}
                          </p>
                          
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-300 opacity-70">
                            <span>{formatTime(msg.createdAt)}</span>
                            {isSelf && (
                              <span>
                                {msg.read ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                                ) : msg.delivered ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Receiver typing indicators inside feed */}
                {typingUsers[activeChatUser] && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800/50 text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></span>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Composer */}
              <div className="p-4 border-t border-slate-800/50 bg-[#1e293b]/10 backdrop-blur-md">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={handleInputChange}
                    placeholder={`Write a message to ${activeChatUser}...`}
                    className="flex-1 bg-[#0f172a]/50 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 border border-slate-800 focus:outline-none focus:border-blue-500/80 transition-all text-sm"
                  />
                  <button
                    type="submit"
                    className="p-3 bg-gradient-to-tr from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.96] transition-all cursor-pointer flex items-center justify-center"
                    title="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10 mb-6 shadow-xl shadow-blue-500/5">
                <MessageSquare className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h2 className="text-xl font-bold">Select a user to chat</h2>
              <p className="text-slate-400 text-sm max-w-sm mt-2 leading-relaxed">
                Add another username in the sidebar, or click on a contact from the active list to start a secure conversation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
