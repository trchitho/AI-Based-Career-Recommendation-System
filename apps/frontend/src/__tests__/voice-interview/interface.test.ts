import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

import { InterviewLayout } from '../../components/interview/InterviewLayout';

describe('Voice Interface Regression Test', () => {
    test('voice mode hides chat UI and shows voice interface', () => {
        render(React.createElement(InterviewLayout, { mode: 'voice' }));

        expect(screen.queryByTestId('chat-container')).not.toBeInTheDocument();
        expect(screen.queryByTestId('chat-input')).not.toBeInTheDocument();
        expect(screen.queryByTestId('send-button')).not.toBeInTheDocument();

        expect(screen.getByTestId('voice-interface')).toBeInTheDocument();
        expect(screen.getByTestId('voice-layout')).toBeInTheDocument();
        expect(screen.getByTestId('recording-controls')).toBeInTheDocument();
    });

    test('chat mode shows chat UI and hides voice interface', () => {
        render(React.createElement(InterviewLayout, { mode: 'chat' }));

        expect(screen.getByTestId('chat-container')).toBeInTheDocument();
        expect(screen.getByTestId('chat-input')).toBeInTheDocument();
        expect(screen.getByTestId('send-button')).toBeInTheDocument();

        expect(screen.queryByTestId('voice-interface')).not.toBeInTheDocument();
        expect(screen.queryByTestId('recording-controls')).not.toBeInTheDocument();
    });

    test('interview layout always exposes mode attribute', () => {
        const { rerender } = render(React.createElement(InterviewLayout, { mode: 'chat' }));
        expect(screen.getByTestId('interview-layout')).toHaveAttribute('data-mode', 'chat');

        rerender(React.createElement(InterviewLayout, { mode: 'voice' }));
        expect(screen.getByTestId('interview-layout')).toHaveAttribute('data-mode', 'voice');
    });

    test('voice mode includes dedicated voice interview shell', () => {
        render(React.createElement(InterviewLayout, { mode: 'voice' }));

        expect(screen.getByTestId('voice-interview-layout')).toBeInTheDocument();
    });
});
