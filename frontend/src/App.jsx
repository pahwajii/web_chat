import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatProvider } from './context/ChatContext';
import Login from './pages/Login';
import Chat from './pages/Chat';

export default function App() {
  return (
    <BrowserRouter>
      <ChatProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </ChatProvider>
    </BrowserRouter>
  );
}
