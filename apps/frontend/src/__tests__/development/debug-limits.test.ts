import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import developmentConfig, { developmentConfig as namedDevelopmentConfig } from '../../config/development';

const mockUseAuth = vi.fn();
const mockGetAccessToken = vi.fn();

vi.mock('../../components/layout/MainLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'main-layout' }, children)
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth()
}));

vi.mock('../../utils/auth', () => ({
    getAccessToken: () => mockGetAccessToken()
}));

import DebugAuthPage from '../../pages/DebugAuthPage';

describe('Development Debug Support', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    test('development config keeps debug settings enabled', () => {
        expect(developmentConfig.MAX_TAB_SWITCH).toBeGreaterThanOrEqual(10);
        expect(developmentConfig.DEBUG_VOICE_PROCESSING).toBe(true);
        expect(developmentConfig.ENABLE_PERFORMANCE_LOGGING).toBe(true);
        expect(developmentConfig.ENABLE_TEST_HELPERS).toBe(true);
        expect(developmentConfig.API_TIMEOUT).toBe(30000);
    });

    test('default export and named export point to same config object', () => {
        expect(developmentConfig).toBe(namedDevelopmentConfig);
    });

    test('DebugAuthPage renders debug sections for authenticated users', () => {
        const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));

        mockUseAuth.mockReturnValue({
            user: { id: 1, email: 'dev@example.com' },
            isAuthenticated: true
        });
        mockGetAccessToken.mockReturnValue(`header.${payload}.signature`);

        localStorage.setItem('accessToken', 'present');
        localStorage.setItem('token', 'present');

        render(React.createElement(DebugAuthPage));

        expect(screen.getByTestId('main-layout')).toBeInTheDocument();
        expect(screen.getByText(/Debug Authentication/i)).toBeInTheDocument();
        expect(screen.getByText(/Auth Status/i)).toBeInTheDocument();
        expect(screen.getByText(/Token Info/i)).toBeInTheDocument();
        expect(screen.getByText(/LocalStorage Keys/i)).toBeInTheDocument();
    });

    test('DebugAuthPage shows no token state when token is missing', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isAuthenticated: false
        });
        mockGetAccessToken.mockReturnValue(null);

        render(React.createElement(DebugAuthPage));

        expect(screen.getByText(/No token found/i)).toBeInTheDocument();
        expect(screen.getByText(/No user data/i)).toBeInTheDocument();
    });
});
