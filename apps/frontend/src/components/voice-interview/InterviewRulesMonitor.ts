/**
 * InterviewRulesMonitor
 * Yêu cầu 6.3-6.7: Giám sát hành vi trong phiên phỏng vấn
 *
 * - Theo dõi visibilitychange để đếm số lần chuyển tab
 * - Tự động terminate khi vi phạm >= 3 lần
 * - Đồng bộ tab_switch_count với backend
 */

export interface RulesMonitorCallbacks {
    onTabSwitch: (count: number, remaining: number) => void;
    onTerminate: (reason: string) => void;
}

export class InterviewRulesMonitor {
    private tabSwitchCount = 0;
    private readonly maxTabSwitches: number;
    private sessionId: number | null = null;
    private callbacks: RulesMonitorCallbacks;
    private isMonitoring = false;
    private hideTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        callbacks: RulesMonitorCallbacks,
        maxTabSwitches = 3,
    ) {
        this.callbacks = callbacks;
        this.maxTabSwitches = maxTabSwitches;
    }

    /** Yêu cầu 6.3: Bắt đầu theo dõi visibilitychange */
    startMonitoring(sessionId: number): void {
        if (this.isMonitoring) return;
        this.sessionId = sessionId;
        this.isMonitoring = true;
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    /** Dừng theo dõi và cleanup */
    stopMonitoring(): void {
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        this.isMonitoring = false;
        this.tabSwitchCount = 0; // Reset for next session
    }

    /** Force reset toàn bộ state — dùng khi bắt đầu session mới */
    forceReset(): void {
        this.stopMonitoring();
        this.sessionId = null;
    }

    /** Lấy số lần chuyển tab hiện tại */
    getTabSwitchCount(): number {
        return this.tabSwitchCount;
    }

    /** Reset counter (dùng khi test) */
    reset(): void {
        this.tabSwitchCount = 0;
    }

    /** Yêu cầu 6.4: Xử lý sự kiện visibilitychange với debounce 500ms */
    private handleVisibilityChange = (): void => {
        if (!document.hidden) {
            // Tab visible lại — hủy pending count
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }
            return;
        }
        // Tab bị ẩn — chờ 500ms trước khi đếm (debounce cho DevTools/brief switches)
        this.hideTimer = setTimeout(() => {
            this.hideTimer = null;
            if (!document.hidden) return; // Tab quay lại trong thời gian debounce
            this.incrementCount();
        }, 500);
    };

    private incrementCount(): void {
        this.tabSwitchCount++;
        const remaining = Math.max(0, this.maxTabSwitches - this.tabSwitchCount);
        const currentCount = this.tabSwitchCount; // capture before potential reset

        // Yêu cầu 6.6: Đồng bộ với backend — dùng currentCount đã capture
        this.syncWithBackend(currentCount);

        // Yêu cầu 6.4: Hiển thị cảnh báo
        this.callbacks.onTabSwitch(currentCount, remaining);

        // Yêu cầu 6.5: Tự động terminate khi >= maxTabSwitches
        if (currentCount >= this.maxTabSwitches) {
            this.stopMonitoring(); // resets tabSwitchCount, but we captured it above
            this.callbacks.onTerminate(
                `Phiên phỏng vấn đã bị hủy do chuyển tab ${currentCount} lần.`,
            );
        }
    }

    /** Yêu cầu 6.6: Gửi tab_switch_count lên backend */
    private async syncWithBackend(count: number): Promise<void> {
        if (!this.sessionId) return;
        try {
            const token = localStorage.getItem('accessToken');
            const formData = new FormData();
            formData.append('session_id', String(this.sessionId));
            formData.append('tab_switch_count', String(count));

            await fetch('/api/interview/voice/tab-switch', {
                method: 'PATCH',
                body: formData,
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
        } catch {
            // Non-blocking — log only
            console.warn('[RulesMonitor] Failed to sync tab_switch_count with backend');
        }
    }
}
