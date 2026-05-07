import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RecordingControls } from '../../components/voice-interview/RecordingControls';
import { useRecordingState } from '../../hooks/useRecordingState';

vi.mock('../../hooks/useRecordingState', () => ({
    useRecordingState: vi.fn()
}));

type RecordingStatus = 'idle' | 'recording' | 'recorded';

const buildMockState = (status: RecordingStatus, overrides?: Partial<any>) => ({
    state: {
        status,
        audioBlob: status === 'recorded' ? new Blob(['audio'], { type: 'audio/webm' }) : null,
        duration: status === 'recorded' ? 3.2 : 0,
        error: null,
        isProcessing: false,
        ...overrides
    },
    actions: {
        startRecording: vi.fn(),
        stopRecording: vi.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/webm' })),
        resetRecording: vi.fn()
    }
});

const mockedUseRecordingState = vi.mocked(useRecordingState);

describe('Recording State Regression Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('idle state shows only start control', () => {
        mockedUseRecordingState.mockReturnValue(buildMockState('idle'));

        render(React.createElement(RecordingControls));

        expect(screen.getByTestId('start-recording-btn')).toBeInTheDocument();
        expect(screen.queryByTestId('stop-recording-btn')).not.toBeInTheDocument();
        expect(screen.queryByTestId('play-recording-btn')).not.toBeInTheDocument();
        expect(screen.queryByTestId('reset-recording-btn')).not.toBeInTheDocument();
    });

    test('recording state shows only stop control', () => {
        mockedUseRecordingState.mockReturnValue(buildMockState('recording'));

        render(React.createElement(RecordingControls));

        expect(screen.getByTestId('stop-recording-btn')).toBeInTheDocument();
        expect(screen.queryByTestId('start-recording-btn')).not.toBeInTheDocument();
        expect(screen.queryByTestId('play-recording-btn')).not.toBeInTheDocument();
    });

    test('recorded state shows playback and submit controls', () => {
        mockedUseRecordingState.mockReturnValue(buildMockState('recorded'));

        render(React.createElement(RecordingControls));

        expect(screen.getByTestId('play-recording-btn')).toBeInTheDocument();
        expect(screen.getByTestId('reset-recording-btn')).toBeInTheDocument();
        expect(screen.getByTestId('submit-recording-btn')).toBeInTheDocument();
        expect(screen.queryByTestId('start-recording-btn')).not.toBeInTheDocument();
        expect(screen.queryByTestId('stop-recording-btn')).not.toBeInTheDocument();
    });

    test('renders error message from recording hook state', () => {
        mockedUseRecordingState.mockReturnValue(buildMockState('idle', { error: 'Recording failed: Permission denied' }));

        render(React.createElement(RecordingControls));

        expect(screen.getByText('Recording failed: Permission denied')).toBeInTheDocument();
    });
});
