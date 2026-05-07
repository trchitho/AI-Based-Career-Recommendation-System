import React from 'react';
import { VoiceInterface } from '../voice-interview/VoiceInterface';

interface InterviewLayoutProps {
    mode: 'chat' | 'voice';
    children?: React.ReactNode;
}

export const InterviewLayout: React.FC<InterviewLayoutProps> = ({ mode, children }) => {
    if (mode === 'voice') {
        return (
            <div data-testid="interview-layout" data-mode={mode}>
                <VoiceInterface />
            </div>
        );
    }

    // Chat mode layout
    return (
        <div data-testid="interview-layout" data-mode={mode}>
            <div data-testid="chat-container">
                <div data-testid="message-list">
                    <div data-testid="chat-message">Previous messages</div>
                </div>
                <div data-testid="chat-input-container">
                    <input data-testid="chat-input" placeholder="Type your answer..." />
                    <button data-testid="send-button">Send</button>
                </div>
            </div>
            {children}
        </div>
    );
};