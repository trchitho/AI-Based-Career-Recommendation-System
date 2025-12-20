import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ChatbotButton } from './ChatbotButton';

export const ChatbotWrapper: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Chỉ hiển thị chatbot khi user đã đăng nhập
  if (!isAuthenticated || !user) {
    return null;
  }

  return <ChatbotButton />;
};