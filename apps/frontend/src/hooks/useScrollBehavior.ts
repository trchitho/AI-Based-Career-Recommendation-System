import { useState, useEffect } from 'react';

interface ScrollBehavior {
    scrollY: number;
    isScrolled: boolean;
    isScrollingUp: boolean;
    isScrollingDown: boolean;
}

export const useScrollBehavior = (threshold: number = 20): ScrollBehavior => {
    const [scrollY, setScrollY] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isScrollingUp, setIsScrollingUp] = useState(false);
    const [isScrollingDown, setIsScrollingDown] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            setScrollY(currentScrollY);
            setIsScrolled(currentScrollY > threshold);

            // Determine scroll direction
            if (currentScrollY > lastScrollY && currentScrollY > threshold) {
                setIsScrollingDown(true);
                setIsScrollingUp(false);
            } else if (currentScrollY < lastScrollY) {
                setIsScrollingUp(true);
                setIsScrollingDown(false);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY, threshold]);

    return {
        scrollY,
        isScrolled,
        isScrollingUp,
        isScrollingDown,
    };
};