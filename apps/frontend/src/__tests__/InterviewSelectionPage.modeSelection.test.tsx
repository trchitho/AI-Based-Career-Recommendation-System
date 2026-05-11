/**
 * Unit tests cho Interview Mode Selection - Yêu Cầu 8.7
 * Test mode selection UI và routing logic trong InterviewSelectionPage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ jobId: '15-1252.00' }),
    };
});

// Mock interviewService
vi.mock('../services/interviewService', () => ({
    interviewService: {
        getJobInfo: vi.fn().mockResolvedValue({
            id: '15-1252.00',
            title: 'Software Developer',
            soft_skills: [],
            hard_skills: [],
            hard_skills_total: 0,
        }),
        getCareerLevels: vi.fn().mockResolvedValue({
            levels: [
                { id: 1, name: 'Junior', slug: 'junior', description: 'Entry level', min_years: 0, max_years: 2, color: '#green' },
            ],
        }),
        startInterview: vi.fn().mockResolvedValue({
            session_id: 'sess-123',
            first_question: 'Tell me about yourself',
        }),
        submitJDManual: vi.fn(),
        uploadJDFile: vi.fn(),
    },
    CareerLevel: {},
}));

// Mock useAuth
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    }),
}));

// Mock child components to simplify rendering
vi.mock('../components/interview/QuestionCountSelector', () => ({
    default: ({ selectedCount, onSelect }: any) => (
        <div data-testid="question-count-selector">
            <button onClick={() => onSelect(7)}>Select 7</button>
        </div>
    ),
}));

vi.mock('../components/interview/STARMethodGuide', () => ({
    default: () => <div data-testid="star-method-guide" />,
}));

vi.mock('../components/interview/LevelCard', () => ({
    default: ({ level, isSelected, onSelect }: any) => (
        <button
            data-testid={`level-card-${level.slug}`}
            onClick={() => onSelect(level)}
            className={isSelected ? 'selected' : ''}
        >
            {level.name}
        </button>
    ),
}));

vi.mock('../components/layout/MainLayout', () => ({
    default: ({ children }: any) => <div>{children}</div>,
}));

import InterviewSelectionPage from '../pages/InterviewSelectionPage';
import { interviewService } from '../services/interviewService';

const renderPage = () =>
    render(
        <BrowserRouter>
            <InterviewSelectionPage />
        </BrowserRouter>
    );

// Helper: wait for page to load and select a level (required to enable start button)
const waitForPageAndSelectLevel = async () => {
    await waitFor(() => {
        expect(screen.getByTestId('interview-mode-selection')).toBeInTheDocument();
    });
    // Wait for level card to appear (async load via setTimeout(100ms) in loadJobInfo)
    await waitFor(() => {
        expect(screen.getByTestId('level-card-junior')).toBeInTheDocument();
    }, { timeout: 3000 });
    // Select the junior level so the start button is enabled
    fireEvent.click(screen.getByTestId('level-card-junior'));
};

describe('InterviewSelectionPage - Mode Selection (Yêu Cầu 8.7)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
    });
    /**
     * Test 1: Default mode is 'text'
     */
    test('Default mode is text - text button highlighted, voice not', async () => {
        renderPage();
        await waitForPageAndSelectLevel();

        const textBtn = screen.getByTestId('interview-mode-text');
        const voiceBtn = screen.getByTestId('interview-mode-voice');

        // Text mode selected by default: has blue border class
        expect(textBtn.className).toContain('border-blue-500');
        expect(voiceBtn.className).not.toContain('border-blue-500');
    });

    /**
     * Test 2: Clicking voice mode button selects voice mode
     */
    test('Clicking voice mode button selects voice mode', async () => {
        renderPage();
        await waitForPageAndSelectLevel();

        const voiceBtn = screen.getByTestId('interview-mode-voice');
        fireEvent.click(voiceBtn);

        await waitFor(() => {
            expect(voiceBtn.className).toContain('border-blue-500');
            expect(screen.getByTestId('interview-mode-text').className).not.toContain('border-blue-500');
        });
    });

    /**
     * Test 3: Clicking text mode button selects text mode
     */
    test('Clicking text mode button re-selects text mode after switching to voice', async () => {
        renderPage();
        await waitForPageAndSelectLevel();

        // Switch to voice first
        fireEvent.click(screen.getByTestId('interview-mode-voice'));
        await waitFor(() => {
            expect(screen.getByTestId('interview-mode-voice').className).toContain('border-blue-500');
        });

        // Switch back to text
        fireEvent.click(screen.getByTestId('interview-mode-text'));
        await waitFor(() => {
            expect(screen.getByTestId('interview-mode-text').className).toContain('border-blue-500');
            expect(screen.getByTestId('interview-mode-voice').className).not.toContain('border-blue-500');
        });
    });

    /**
     * Test 4: In voice mode, start button navigates to /interview/device-test
     */
    test('Voice mode: start button navigates to /interview/device-test', async () => {
        renderPage();
        await waitForPageAndSelectLevel();

        // Switch to voice mode
        fireEvent.click(screen.getByTestId('interview-mode-voice'));

        // Click start
        const startBtn = screen.getByRole('button', { name: /Bắt đầu phỏng vấn/i });
        fireEvent.click(startBtn);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/interview/device-test');
        });

        // interviewService.startInterview should NOT be called in voice mode
        expect(interviewService.startInterview).not.toHaveBeenCalled();
    });

    /**
     * Test 5: In text mode, start button calls interviewService.startInterview
     */
    test('Text mode: start button calls interviewService.startInterview', async () => {
        renderPage();
        await waitForPageAndSelectLevel();

        // Text mode is default - click start
        const startBtn = screen.getByRole('button', { name: /Bắt đầu phỏng vấn/i });
        fireEvent.click(startBtn);

        await waitFor(() => {
            expect(interviewService.startInterview).toHaveBeenCalledWith(
                '15-1252.00',
                expect.any(Number),
                undefined,
                'junior'
            );
        });

        // Should NOT navigate to device-test
        expect(mockNavigate).not.toHaveBeenCalledWith('/interview/device-test');
    });

    /**
     * Test 6: Voice mode saves params to sessionStorage
     */
    test('Voice mode saves voiceInterviewParams to sessionStorage', async () => {
        renderPage();
        await waitForPageAndSelectLevel();

        // Switch to voice mode
        fireEvent.click(screen.getByTestId('interview-mode-voice'));

        // Click start
        const startBtn = screen.getByRole('button', { name: /Bắt đầu phỏng vấn/i });
        fireEvent.click(startBtn);

        await waitFor(() => {
            const stored = sessionStorage.getItem('voiceInterviewParams');
            expect(stored).not.toBeNull();
            const params = JSON.parse(stored!);
            expect(params.job_id).toBe('15-1252.00');
            expect(params.level_slug).toBe('junior');
            expect(typeof params.question_count).toBe('number');
        });
    });
});
