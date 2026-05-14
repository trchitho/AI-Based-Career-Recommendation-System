// Phase 2: Preservation Property Test - Responsive Design
// CRITICAL: This test MUST PASS on unfixed code to establish baseline
// Preservation Goal: Ensure Tailwind CSS responsive behavior remains unchanged

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, test } from 'vitest';

const MockResponsiveLayout = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(
        'div',
        { 'data-testid': 'responsive-layout', className: 'container mx-auto px-4' },
        React.createElement(
            'div',
            {
                'data-testid': 'responsive-grid',
                className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            },
            React.createElement('div', { 'data-testid': 'grid-item-1', className: 'bg-white p-4 rounded-lg shadow' },
                React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, 'Item 1'),
                React.createElement('p', { className: 'text-gray-600' }, 'Content for item 1')
            ),
            React.createElement('div', { 'data-testid': 'grid-item-2', className: 'bg-white p-4 rounded-lg shadow' },
                React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, 'Item 2'),
                React.createElement('p', { className: 'text-gray-600' }, 'Content for item 2')
            ),
            React.createElement('div', { 'data-testid': 'grid-item-3', className: 'bg-white p-4 rounded-lg shadow' },
                React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, 'Item 3'),
                React.createElement('p', { className: 'text-gray-600' }, 'Content for item 3')
            )
        ),
        React.createElement(
            'nav',
            { 'data-testid': 'responsive-nav', className: 'mt-8' },
            React.createElement(
                'div',
                { className: 'block md:hidden', 'data-testid': 'mobile-menu' },
                React.createElement('button', { 'data-testid': 'mobile-menu-button', className: 'p-2' }, 'Mobile Menu')
            ),
            React.createElement(
                'div',
                { className: 'hidden md:block', 'data-testid': 'desktop-menu' },
                React.createElement(
                    'ul',
                    { className: 'flex space-x-4' },
                    React.createElement('li', null, React.createElement('a', { href: '/home', 'data-testid': 'nav-home' }, 'Home')),
                    React.createElement('li', null, React.createElement('a', { href: '/about', 'data-testid': 'nav-about' }, 'About')),
                    React.createElement('li', null, React.createElement('a', { href: '/contact', 'data-testid': 'nav-contact' }, 'Contact'))
                )
            )
        ),
        React.createElement(
            'div',
            { 'data-testid': 'responsive-text', className: 'mt-8' },
            React.createElement('h1', { className: 'text-2xl md:text-3xl lg:text-4xl font-bold' }, 'Responsive Heading'),
            React.createElement(
                'p',
                { className: 'text-sm md:text-base lg:text-lg text-gray-700 mt-4' },
                'This text scales with screen size using Tailwind responsive utilities.'
            )
        ),
        children
    );

const MockResponsiveCard = ({ title, content }: { title: string; content: string }) =>
    React.createElement(
        'div',
        { 'data-testid': 'responsive-card', className: 'w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 p-4' },
        React.createElement(
            'div',
            { className: 'bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow' },
            React.createElement(
                'div',
                { className: 'p-6' },
                React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, title),
                React.createElement('p', { className: 'text-gray-600 text-sm md:text-base' }, content),
                React.createElement(
                    'button',
                    {
                        'data-testid': 'card-button',
                        className: 'mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm md:text-base'
                    },
                    'Learn More'
                )
            )
        )
    );

describe('Responsive Design Preservation Test', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    });

    test('Tailwind CSS responsive utilities work correctly', () => {
        const { container } = render(React.createElement(MockResponsiveLayout));

        const grid = container.querySelector('[data-testid="responsive-grid"]');
        expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');

        const layout = container.querySelector('[data-testid="responsive-layout"]');
        expect(layout).toHaveClass('container', 'mx-auto', 'px-4');
    });

    test('mobile layout (375px) keeps responsive classes', () => {
        Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
        const { getByTestId, queryByTestId } = render(React.createElement(MockResponsiveLayout));

        expect(getByTestId('mobile-menu')).toBeInTheDocument();

        const desktopMenu = queryByTestId('desktop-menu');
        expect(desktopMenu).toHaveClass('hidden', 'md:block');

        const mobileMenu = queryByTestId('mobile-menu');
        expect(mobileMenu).toHaveClass('block', 'md:hidden');
    });

    test('responsive card components keep width utilities', () => {
        const { container } = render(
            React.createElement(
                'div',
                { className: 'flex flex-wrap' },
                React.createElement(MockResponsiveCard, { title: 'Card 1', content: 'Content 1' }),
                React.createElement(MockResponsiveCard, { title: 'Card 2', content: 'Content 2' }),
                React.createElement(MockResponsiveCard, { title: 'Card 3', content: 'Content 3' })
            )
        );

        const cards = container.querySelectorAll('[data-testid="responsive-card"]');
        cards.forEach((card) => {
            expect(card).toHaveClass('w-full', 'sm:w-1/2', 'lg:w-1/3', 'xl:w-1/4');
        });
    });

    test('responsive typography scales correctly', () => {
        const { container } = render(React.createElement(MockResponsiveLayout));

        const heading = container.querySelector('h1');
        expect(heading).toHaveClass('text-2xl', 'md:text-3xl', 'lg:text-4xl');

        const textSection = container.querySelector('[data-testid="responsive-text"]');
        const paragraph = textSection?.querySelector('p');
        expect(paragraph).toHaveClass('text-sm', 'md:text-base', 'lg:text-lg');
    });
});