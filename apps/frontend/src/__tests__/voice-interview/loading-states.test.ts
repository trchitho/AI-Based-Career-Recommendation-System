import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

import { ProcessingIndicator } from '../../components/voice-interview/ProcessingIndicator';

describe('Loading States Regression Test', () => {
    test('shows stage-specific Vietnamese messages', () => {
        const { rerender } = render(React.createElement(ProcessingIndicator, { stage: 'stt' }));
        expect(screen.getByText('Đang xử lý giọng nói…')).toBeInTheDocument();
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();

        rerender(React.createElement(ProcessingIndicator, { stage: 'ai' }));
        expect(screen.getByText('AI đang suy nghĩ…')).toBeInTheDocument();

        rerender(React.createElement(ProcessingIndicator, { stage: 'tts' }));
        expect(screen.getByText('Đang tạo giọng nói…')).toBeInTheDocument();
    });

    test('renders progress and percentage when progress is provided', () => {
        render(React.createElement(ProcessingIndicator, { stage: 'stt', progress: 60 }));
        expect(screen.getByText('60%')).toBeInTheDocument();
    });

    test('shows stage detail and time estimate while processing', () => {
        render(React.createElement(ProcessingIndicator, { stage: 'ai' }));

        expect(screen.getByText('Phân tích và tạo phản hồi')).toBeInTheDocument();
        expect(screen.getByText('Ước tính: 1-2 giây')).toBeInTheDocument();
        expect(screen.getByText('Vui lòng đợi trong giây lát...')).toBeInTheDocument();
    });

    test('has stable root test id for integration', () => {
        render(React.createElement(ProcessingIndicator, { stage: 'idle' }));
        expect(screen.getByTestId('processing-indicator')).toBeInTheDocument();
        expect(screen.getByText('Sẵn sàng')).toBeInTheDocument();
    });
});
