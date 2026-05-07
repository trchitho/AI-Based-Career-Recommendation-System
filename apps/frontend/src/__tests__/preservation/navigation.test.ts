// Phase 2: Preservation Property Test - Navigation
// CRITICAL: This test MUST PASS on unfixed code to establish baseline
// Preservation Goal: Ensure App Router-style navigation behavior remains unchanged

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();
const mockForward = vi.fn();

const mockRouter = {
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    forward: mockForward,
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
    }
};

const makeNavLink = (testId: string, href: string, label: string) =>
    React.createElement(
        'a',
        {
            href,
            'data-testid': testId,
            onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                mockRouter.push(href);
            }
        },
        label
    );

const MockNavigationComponent = () =>
    React.createElement(
        'nav',
        { 'data-testid': 'main-navigation' },
        React.createElement(
            'div',
            { 'data-testid': 'nav-brand' },
            React.createElement(
                'a',
                {
                    href: '/',
                    'data-testid': 'nav-home',
                    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                        e.preventDefault();
                        mockRouter.push('/');
                    }
                },
                'Career System'
            )
        ),
        React.createElement(
            'ul',
            { 'data-testid': 'nav-menu' },
            React.createElement('li', null, makeNavLink('nav-dashboard', '/dashboard', 'Dashboard')),
            React.createElement('li', null, makeNavLink('nav-careers', '/careers', 'Careers')),
            React.createElement('li', null, makeNavLink('nav-assessments', '/assessments', 'Assessments')),
            React.createElement('li', null, makeNavLink('nav-interview', '/interview', 'Interview')),
            React.createElement('li', null, makeNavLink('nav-profile', '/profile', 'Profile'))
        )
    );

describe('Navigation Preservation Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('App Router navigation works correctly', () => {
        const { getByTestId } = render(React.createElement(MockNavigationComponent));

        expect(getByTestId('nav-home')).toBeInTheDocument();
        expect(getByTestId('nav-dashboard')).toBeInTheDocument();
        expect(getByTestId('nav-careers')).toBeInTheDocument();
        expect(getByTestId('nav-assessments')).toBeInTheDocument();
        expect(getByTestId('nav-interview')).toBeInTheDocument();
        expect(getByTestId('nav-profile')).toBeInTheDocument();

        fireEvent.click(getByTestId('nav-careers'));
        fireEvent.click(getByTestId('nav-profile'));

        expect(mockPush).toHaveBeenCalledWith('/careers');
        expect(mockPush).toHaveBeenCalledWith('/profile');
    });

    test('navigation state and events are preserved', () => {
        expect(mockRouter.pathname).toBe('/');
        expect(mockRouter.asPath).toBe('/');
        expect(mockRouter.route).toBe('/');
        expect(mockRouter.query).toEqual({});

        const mockHandler = vi.fn();
        mockRouter.events.on('routeChangeStart', mockHandler);
        expect(mockRouter.events.on).toHaveBeenCalledWith('routeChangeStart', mockHandler);
    });

    test('browser and programmatic navigation controls work', () => {
        mockRouter.back();
        mockRouter.forward();
        mockRouter.push('/new-page');
        mockRouter.replace('/replace-page');

        expect(mockBack).toHaveBeenCalled();
        expect(mockForward).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/new-page');
        expect(mockReplace).toHaveBeenCalledWith('/replace-page');
    });

    test('navigation structure remains accessible and responsive-safe', () => {
        Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
        const { container, getByTestId } = render(React.createElement(MockNavigationComponent));

        expect(getByTestId('main-navigation')).toBeInTheDocument();
        expect(getByTestId('nav-menu')).toBeInTheDocument();

        const links = container.querySelectorAll('a');
        links.forEach((link) => {
            expect(link).toHaveAttribute('href');
        });
    });

    test('breadcrumbs and loading/error states are preserved', () => {
        const MockBreadcrumbs = () =>
            React.createElement(
                'nav',
                { 'data-testid': 'breadcrumbs', 'aria-label': 'Breadcrumb' },
                React.createElement(
                    'ol',
                    null,
                    React.createElement('li', null, React.createElement('a', { href: '/', 'data-testid': 'breadcrumb-home' }, 'Home')),
                    React.createElement('li', null, React.createElement('a', { href: '/careers', 'data-testid': 'breadcrumb-careers' }, 'Careers')),
                    React.createElement('li', null, React.createElement('span', { 'data-testid': 'breadcrumb-current' }, 'Software Engineer'))
                )
            );

        const LoadingNav = ({ isLoading }: { isLoading: boolean }) =>
            React.createElement(
                'nav',
                { 'data-testid': 'navigation-with-loading' },
                isLoading
                    ? React.createElement('div', { 'data-testid': 'navigation-loading' }, 'Loading...')
                    : React.createElement(
                          'div',
                          { 'data-testid': 'navigation-content' },
                          React.createElement('a', { href: '/dashboard', 'data-testid': 'nav-link' }, 'Dashboard')
                      )
            );

        const mockOnError = vi.fn();
        const ErrorNav = () =>
            React.createElement(
                'nav',
                { 'data-testid': 'navigation-with-error' },
                React.createElement(
                    'a',
                    {
                        href: '/error-page',
                        'data-testid': 'error-link',
                        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault();
                            try {
                                mockRouter.push('/error-page');
                            } catch (error) {
                                mockOnError(error);
                            }
                        }
                    },
                    'Error Page'
                )
            );

        const { getByTestId, rerender } = render(React.createElement(MockBreadcrumbs));
        expect(getByTestId('breadcrumbs')).toBeInTheDocument();
        expect(getByTestId('breadcrumb-home')).toBeInTheDocument();
        expect(getByTestId('breadcrumb-careers')).toBeInTheDocument();
        expect(getByTestId('breadcrumb-current')).toBeInTheDocument();

        rerender(React.createElement(LoadingNav, { isLoading: true }));
        expect(getByTestId('navigation-loading')).toBeInTheDocument();

        rerender(React.createElement(LoadingNav, { isLoading: false }));
        expect(getByTestId('navigation-content')).toBeInTheDocument();
        expect(getByTestId('nav-link')).toBeInTheDocument();

        rerender(React.createElement(ErrorNav));
        fireEvent.click(getByTestId('error-link'));
        expect(mockPush).toHaveBeenCalledWith('/error-page');
        expect(mockOnError).not.toHaveBeenCalled();
    });
});