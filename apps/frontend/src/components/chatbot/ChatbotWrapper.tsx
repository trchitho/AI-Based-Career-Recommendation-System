import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { ChatbotButton } from './ChatbotButton';

export const ChatbotWrapper: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Hiển thị chatbot cho tất cả user đã đăng nhập
  // Tính năng nâng cao sẽ được kiểm tra bên trong Chatbot component
  if (!isAuthenticated || !user) {
    return null;
  }

  // Ẩn chatbot khi đang trong game Personality Garden (assessment page với mode game)
  const isInAssessment = location.pathname.includes('/assessment');
  if (isInAssessment) {
    return null;
  }

  return <ChatbotButton />;
};