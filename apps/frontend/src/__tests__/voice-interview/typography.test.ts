import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

import { VoiceInterviewLayout } from '../../components/voice-interview/VoiceInterviewLayout';

describe('Voice UI Typography and Layout Regression Test', () => {
    test('renders semantic layout structure', () => {
        const { container } = render(
            React.createElement(
                VoiceInterviewLayout,
                null,
                React.createElement('p', null, 'Sample content')
            )
        );

        expect(screen.getByTestId('voice-interview-layout')).toBeInTheDocument();
        expect(container.querySelector('header')).toBeInTheDocument();
        expect(container.querySelector('main')).toBeInTheDocument();
    });

    test('keeps typography style contract on text content', () => {
        const { container } = render(
            React.createElement(
                VoiceInterviewLayout,
                null,
                React.createElement('p', null, 'Sample content')
            )
        );

        const textContent = container.querySelector('.text-content') as HTMLElement;
        expect(textContent).toBeInTheDocument();
        expect(textContent.style.fontSize).toBe('20px');
        expect(textContent.style.lineHeight).toBe('1.8');
        expect(textContent.style.maxWidth).toBe('700px');
        expect(textContent.style.letterSpacing).toBe('0.3px');
    });

    test('keeps animation and interactive classes for avatar and mic', () => {
        const { container } = render(
            React.createElement(
                VoiceInterviewLayout,
                null,
                React.createElement('p', null, 'Sample content')
            )
        );

        const avatar = container.querySelector('.avatar');
        const micButton = container.querySelector('.mic-button');

        expect(avatar).toHaveClass('pulse-animation');
        expect(micButton).toHaveClass('glow-effect');
        expect(micButton).toHaveClass('transition-all');
    });

    test('includes inline animation keyframe definitions', () => {
        const { container } = render(React.createElement(VoiceInterviewLayout));
        const styleElement = container.querySelector('style');

        expect(styleElement).toBeInTheDocument();
        expect(styleElement?.textContent).toContain('@keyframes glow');
        expect(styleElement?.textContent).toContain('@keyframes pulse');
    });
});
