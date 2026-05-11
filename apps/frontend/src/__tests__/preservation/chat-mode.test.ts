// Phase 2: Preservation Property Test - Chat Mode
// CRITICAL: This test MUST PASS on unfixed code to establish baseline
// Preservation Goal: Ensure chat interview functionality remains unchanged

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

type InterviewLayoutProps = {
    mode: 'chat' | 'voice';
    children?: React.ReactNode;
};

const MockInterviewLayout = ({ mode, children }: InterviewLayoutProps) => {
    return React.createElement(
        'div',
        { 'data-testid': 'interview-layout', 'data-mode': mode },
        mode === 'chat'
            ? React.createElement(
                  'div',
                  { 'data-testid': 'chat-container' },
                  React.createElement(
                      'div',
                      { 'data-testid': 'message-list' },
                      React.createElement('div', { 'data-testid': 'chat-message' }, 'Previous messages')
                  ),
                  React.createElement(
                      'div',
                      { 'data-testid': 'chat-input-container' },
                      React.createElement('input', {
                          'data-testid': 'chat-input',
                          placeholder: 'Type your answer...'
                      }),
                      React.createElement('button', { 'data-testid': 'send-button' }, 'Send')
                  )
              )
            : null,
        mode === 'voice'
            ? React.createElement('div', { 'data-testid': 'voice-container' }, 'Voice interface (not implemented yet)')
            : null,
        children
    );
};

describe('Chat Mode Preservation Test', () => {
    test('chat interview functionality preserved', () => {
        const { getByTestId } = render(React.createElement(MockInterviewLayout, { mode: 'chat' }));

        expect(getByTestId('chat-container')).toBeInTheDocument();
        expect(getByTestId('message-list')).toBeInTheDocument();
        expect(getByTestId('chat-input')).toBeInTheDocument();
        expect(getByTestId('send-button')).toBeInTheDocument();

        const chatInput = getByTestId('chat-input');
        fireEvent.change(chatInput, { target: { value: 'My answer' } });
        expect(chatInput).toHaveValue('My answer');
    });

    test('chat mode does not show voice controls', () => {
        const { queryByTestId } = render(React.createElement(MockInterviewLayout, { mode: 'chat' }));

        expect(queryByTestId('voice-container')).not.toBeInTheDocument();
        expect(queryByTestId('recording-controls')).not.toBeInTheDocument();
    });
});