import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { MessageSquare, User, ArrowRight } from 'lucide-react';

export default function Login() {
  const [usernameInput, setUsernameInput] = useState('');
  const [error, setError] = useState('');
  const { currentUser, login } = useChat();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/chat');
    }
  }, [currentUser, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = usernameInput.trim();
    
    if (!name) {
      setError('Please enter a username');
      return;
    }
    
    if (name.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (name.length > 20) {
      setError('Username must be under 20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setError('Only letters, numbers, and underscores are allowed');
      return;
    }

    if (name.toLowerCase() === 'gemini') {
      setError('This username is reserved for the AI Assistant');
      return;
    }

    setError('');
    login(name);
    navigate('/chat');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0f172a] overflow-hidden px-4">
      {/* Decorative blurred background shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl relative z-10 transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 animate-pulse">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ConvoHub
          </h1>
          <p className="text-slate-400 text-sm mt-2 text-center">
            Enter a username to join the real-time conversation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <User className="w-5 h-5" />
              </span>
              <input
                id="username"
                type="text"
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. alex_developer"
                className="w-full pl-10 pr-4 py-3 bg-[#1e293b]/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-rose-400 text-xs mt-2 font-medium flex items-center">
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mr-1.5"></span>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            Connect to Chat
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500">
          <p>Instant deployment. Dynamic database records enabled.</p>
        </div>
      </div>
    </div>
  );
}
