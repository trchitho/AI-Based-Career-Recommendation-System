import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { ChatbotButton } from './ChatbotButton';
import { useAnalysisLock } from '../../contexts/AnalysisLockContext';

export const ChatbotWrapper: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const { isLocked } = useAnalysisLock();

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

  // Ẩn chatbot khi đang phân tích CV để tránh người dùng tương tác
  if (isLocked) {
    return null;
  }

  return <ChatbotButton />;
};