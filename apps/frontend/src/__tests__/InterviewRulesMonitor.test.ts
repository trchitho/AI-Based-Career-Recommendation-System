/**
 * Unit tests cho InterviewRulesMonitor
 * Yêu cầu 6.3-6.7: Tab switch detection và interview termination
 */

import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { InterviewRulesMonitor } from '../components/voice-interview/InterviewRulesMonitor';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeCallbacks() {
    return {
        onTabSwitch: vi.fn(),
        onTerminate: vi.fn(),
    };
}

function simulateTabHide() {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
}

function simulateTabShow() {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
}

// Simulate tab hide AND advance fake timers past debounce
function simulateTabHideAndCount() {
    simulateTabHide();
    vi.advanceTimersByTime(600); // past 500ms debounce
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('InterviewRulesMonitor - Yêu Cầu 6', () => {

    beforeEach(() => {
        vi.useFakeTimers();
        // Reset document.hidden to false before each test
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        // Mock fetch for backend sync
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    /**
     * Yêu cầu 6.3: Theo dõi visibilitychange
     */
    test('Yêu cầu 6.3: startMonitoring đăng ký visibilitychange listener', () => {
        const addEventSpy = vi.spyOn(document, 'addEventListener');
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);

        monitor.startMonitoring(1);

        expect(addEventSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

        monitor.stopMonitoring();
    });

    /**
     * Yêu cầu 6.4: Tăng tab_switch_count và gọi onTabSwitch callback
     */
    test('Yêu cầu 6.4: Tăng count và gọi onTabSwitch khi chuyển tab', () => {
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);
        monitor.startMonitoring(1);

        simulateTabHideAndCount();

        expect(callbacks.onTabSwitch).toHaveBeenCalledWith(1, 2); // count=1, remaining=2
        expect(monitor.getTabSwitchCount()).toBe(1);

        monitor.stopMonitoring();
    });

    test('Yêu cầu 6.4: Không tăng count khi tab được focus lại', () => {
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);
        monitor.startMonitoring(1);

        simulateTabShow(); // Tab becomes visible — should NOT count
        vi.advanceTimersByTime(600);

        expect(callbacks.onTabSwitch).not.toHaveBeenCalled();
        expect(monitor.getTabSwitchCount()).toBe(0);

        monitor.stopMonitoring();
    });

    test('Yêu cầu 6.4: Đếm chính xác nhiều lần chuyển tab', () => {
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);
        monitor.startMonitoring(1);

        simulateTabHideAndCount(); // count = 1
        simulateTabShow();
        simulateTabHideAndCount(); // count = 2

        expect(monitor.getTabSwitchCount()).toBe(2);
        expect(callbacks.onTabSwitch).toHaveBeenCalledTimes(2);
        expect(callbacks.onTabSwitch).toHaveBeenNthCalledWith(1, 1, 2);
        expect(callbacks.onTabSwitch).toHaveBeenNthCalledWith(2, 2, 1);

        monitor.stopMonitoring();
    });

    /**
     * Yêu cầu 6.5: Tự động terminate khi >= 3 lần
     */
    test('Yêu cầu 6.5: Gọi onTerminate khi tab_switch_count đạt 3', () => {
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);
        monitor.startMonitoring(1);

        simulateTabHideAndCount(); // 1
        simulateTabShow();
        simulateTabHideAndCount(); // 2
        simulateTabShow();
        simulateTabHideAndCount(); // 3 → terminate

        expect(callbacks.onTerminate).toHaveBeenCalledOnce();
        expect(callbacks.onTerminate).toHaveBeenCalledWith(
            expect.stringContaining('3')
        );

        monitor.stopMonitoring();
    });

    test('Yêu cầu 6.5: Không gọi onTerminate trước khi đạt 3 lần', () => {
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);
        monitor.startMonitoring(1);

        simulateTabHideAndCount(); // 1
        simulateTabShow();
        simulateTabHideAndCount(); // 2

        expect(callbacks.onTerminate).not.toHaveBeenCalled();

        monitor.stopMonitoring();
    });

    test('Yêu cầu 6.5: Dừng theo dõi sau khi terminate', () => {
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);
        monitor.startMonitoring(1);

        simulateTabHideAndCount(); // 1
        simulateTabShow();
        simulateTabHideAndCount(); // 2
        simulateTabShow();
        simulateTabHideAndCount(); // 3 → terminate + stop monitoring

        // Reset mocks
        callbacks.onTabSwitch.mockClear();
        callbacks.onTerminate.mockClear();

        // Further tab switches should NOT trigger callbacks
        simulateTabHideAndCount(); // 4 — should be ignored
        expect(callbacks.onTabSwitch).not.toHaveBeenCalled();
        expect(callbacks.onTerminate).not.toHaveBeenCalled();
    });

    /**
     * Yêu cầu 6.6: Đồng bộ với backend
     */
    test('Yêu cầu 6.6: Gọi backend API sau mỗi lần chuyển tab', async () => {
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);
        monitor.startMonitoring(42);

        simulateTabHideAndCount();

        // Wait for async fetch (use real timers for the promise)
        await vi.runAllTimersAsync();

        expect(globalThis.fetch).toHaveBeenCalledWith(
            '/api/interview/voice/tab-switch',
            expect.objectContaining({ method: 'PATCH' })
        );

        monitor.stopMonitoring();
    });

    test('Yêu cầu 6.6: Backend sync failure không block interview', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);
        monitor.startMonitoring(1);

        // Should not throw
        expect(() => simulateTabHideAndCount()).not.toThrow();
        expect(callbacks.onTabSwitch).toHaveBeenCalled();

        monitor.stopMonitoring();
    });

    /**
     * Debounce: tab coming back within 500ms should NOT count
     */
    test('Debounce: tab quay lại trong 500ms không bị đếm', () => {
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);
        monitor.startMonitoring(1);

        simulateTabHide();
        vi.advanceTimersByTime(300); // only 300ms — still in debounce
        simulateTabShow(); // tab came back — cancel debounce

        vi.advanceTimersByTime(600); // advance past debounce window

        expect(callbacks.onTabSwitch).not.toHaveBeenCalled();
        expect(monitor.getTabSwitchCount()).toBe(0);

        monitor.stopMonitoring();
    });

    /**
     * stopMonitoring cleanup
     */
    test('stopMonitoring xóa event listener', () => {
        const removeEventSpy = vi.spyOn(document, 'removeEventListener');
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);

        monitor.startMonitoring(1);
        monitor.stopMonitoring();

        expect(removeEventSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    test('startMonitoring không đăng ký listener 2 lần', () => {
        const addEventSpy = vi.spyOn(document, 'addEventListener');
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);

        monitor.startMonitoring(1);
        monitor.startMonitoring(1); // second call should be no-op

        const visibilityChangeCalls = addEventSpy.mock.calls.filter(
            ([event]) => event === 'visibilitychange'
        );
        expect(visibilityChangeCalls).toHaveLength(1);

        monitor.stopMonitoring();
    });

    /**
     * Custom maxTabSwitches
     */
    test('Hỗ trợ custom maxTabSwitches', () => {
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks, 2); // max 2
        monitor.startMonitoring(1);

        simulateTabHideAndCount(); // 1
        simulateTabShow();
        simulateTabHideAndCount(); // 2 → terminate

        expect(callbacks.onTerminate).toHaveBeenCalledOnce();

        monitor.stopMonitoring();
    });

    test('getTabSwitchCount trả về 0 ban đầu', () => {
        const monitor = new InterviewRulesMonitor(makeCallbacks());
        expect(monitor.getTabSwitchCount()).toBe(0);
    });

    test('reset() đặt lại count về 0', () => {
        const callbacks = makeCallbacks();
        const monitor = new InterviewRulesMonitor(callbacks);
        monitor.startMonitoring(1);

        simulateTabHideAndCount(); // 1
        expect(monitor.getTabSwitchCount()).toBe(1);

        monitor.reset();
        expect(monitor.getTabSwitchCount()).toBe(0);

        monitor.stopMonitoring();
    });
});
