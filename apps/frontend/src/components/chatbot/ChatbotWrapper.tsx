import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ChatbotButton } from './ChatbotButton';

export const ChatbotWrapper: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Hiển thị chatbot cho tất cả user đã đăng nhập
  // Tính năng nâng cao sẽ được kiểm tra bên trong Chatbot component
  if (!isAuthenticated || !user) {
    return null;
  }

  return <ChatbotButton />;
};