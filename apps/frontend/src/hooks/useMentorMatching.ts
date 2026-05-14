/**
 * @file hooks/useMentorMatching.ts
 * @description Domain hook cho tính năng Mentor Matching.
 *
 * Tại sao tách thành hook?
 * - Component chỉ render, không biết về API calls
 * - Logic có thể tái sử dụng ở nhiều nơi
 * - Dễ viết unit test (mock hook thay vì mock API)
 *
 * Update guide:
 *   - Thêm filter mentor     → thêm state filterOptions + filterMentors()
 *   - Thêm pagination        → thêm currentPage state vào useAsync options
 *   - Đổi source dữ liệu    → sửa loadMentors() gọi service khác
 *   - Thêm optimistic update → dùng setData() trong useAsync sau khi gửi request
 */

import { useCallback, useEffect, useState } from 'react';
import { mentorMatchingService } from '../services/mentorMatchingService';
import type {
  MentorMatch,
  MentorProfileCreate,
  MentorshipRequest,
} from '../services/mentorMatchingService';
import { scheduleService } from '../services/scheduleService';
import type { MentorSession } from '../services/scheduleService';
import { useAsync } from './useAsync';

// ─────────────────────────────────────────────────────────────
//  Sub-hook: Mentor list
// ─────────────────────────────────────────────────────────────

/**
 * Hook tải danh sách mentor phù hợp với mentee hiện tại.
 *
 * @returns mentors, isLoading, error, refresh
 */
export function useMentors() {
  const { data: mentors, isLoading, error, execute: loadMentors } = useAsync(
    () => mentorMatchingService.findMentors(),
    { immediate: true, initialData: [] },
  );

  /** Set các mentor ID đã gửi request (optimistic UI) */
  const [sentMentorIds, setSentMentorIds] = useState<Set<number>>(new Set());

  /**
   * Gửi yêu cầu kết nối đến mentor.
   *
   * @param mentorId - mentor_id (profile ID, không phải user_id)
   * @param message  - Lời nhắn gửi kèm
   * @returns True nếu gửi thành công
   */
  const sendRequest = useCallback(async (mentorId: number, message: string): Promise<boolean> => {
    try {
      await mentorMatchingService.sendMentorshipRequest(mentorId, message);
      setSentMentorIds((prev) => new Set([...prev, mentorId]));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    mentors: mentors ?? [],
    isLoading,
    error,
    sentMentorIds,
    refresh: loadMentors,
    sendRequest,
  };
}

// ─────────────────────────────────────────────────────────────
//  Sub-hook: Requests (both sides)
// ─────────────────────────────────────────────────────────────

/**
 * Hook tải requests từ 2 phía: mentee đã gửi + mentor nhận được.
 *
 * @returns myRequests, incomingRequests, mentees, isLoading, error, refresh, respondToRequest
 */
export function useMentorshipRequests() {
  const [myRequests, setMyRequests]           = useState<MentorshipRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MentorshipRequest[]>([]);
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  /** Mentor đã accepted */
  const mentees = incomingRequests.filter((r) => r.status === 'accepted');

  /** Tổng pending để hiển thị badge */
  const pendingCount =
    myRequests.filter((r) => r.status === 'pending').length +
    incomingRequests.filter((r) => r.status === 'pending').length;

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // 1. Fetch cả 2 nguồn song song
    const [mineResult, incomingResult] = await Promise.allSettled([
      mentorMatchingService.getMenteeRequests(),
      mentorMatchingService.getMentorRequests(),
    ]);

    // 2. Cập nhật state theo kết quả
    if (mineResult.status === 'fulfilled')     setMyRequests(mineResult.value);
    if (incomingResult.status === 'fulfilled') setIncomingRequests(incomingResult.value);
    if (mineResult.status === 'rejected' && incomingResult.status === 'rejected') {
      setError('Không thể tải danh sách yêu cầu');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  /**
   * Mentor phản hồi (chấp nhận/từ chối) request.
   *
   * @param requestId      - ID của mentorship request
   * @param action         - "accepted" | "rejected"
   * @param responseMessage - Lời nhắn phản hồi (tuỳ chọn)
   * @returns True nếu thành công
   */
  const respondToRequest = useCallback(async (
    requestId: number,
    action: 'accepted' | 'rejected',
    responseMessage = '',
  ): Promise<boolean> => {
    try {
      await mentorMatchingService.respondToRequest(requestId, action, responseMessage);
      await loadRequests(); // refresh list
      return true;
    } catch {
      return false;
    }
  }, [loadRequests]);

  return {
    myRequests,
    incomingRequests,
    mentees,
    pendingCount,
    isLoading,
    error,
    refresh: loadRequests,
    respondToRequest,
  };
}

// ─────────────────────────────────────────────────────────────
//  Sub-hook: Schedule sessions
// ─────────────────────────────────────────────────────────────

/**
 * Hook quản lý lịch hẹn mentor session.
 *
 * @returns sessions, isLoading, error, refresh, confirmSession, cancelSession
 */
export function useMentorSessions() {
  const { data: sessions, isLoading, error, execute: loadSessions } = useAsync(
    () => scheduleService.mySessions(),
    { immediate: true, initialData: [] },
  );

  const [respondingSessionId, setRespondingSessionId] = useState<number | null>(null);

  /**
   * Mentor xác nhận session.
   *
   * @param sessionId - ID của MentorSession
   * @param note      - Ghi chú xác nhận (tuỳ chọn)
   */
  const confirmSession = useCallback(async (sessionId: number, note = ''): Promise<boolean> => {
    setRespondingSessionId(sessionId);
    try {
      await scheduleService.respond(sessionId, 'confirmed', note);
      await loadSessions();
      return true;
    } catch {
      return false;
    } finally {
      setRespondingSessionId(null);
    }
  }, [loadSessions]);

  /**
   * Huỷ session (cả 2 phía đều có thể huỷ).
   *
   * @param sessionId - ID của MentorSession
   */
  const cancelSession = useCallback(async (sessionId: number): Promise<boolean> => {
    setRespondingSessionId(sessionId);
    try {
      await scheduleService.cancel(sessionId);
      await loadSessions();
      return true;
    } catch {
      return false;
    } finally {
      setRespondingSessionId(null);
    }
  }, [loadSessions]);

  return {
    sessions: sessions ?? [],
    isLoading,
    error,
    respondingSessionId,
    refresh: loadSessions,
    confirmSession,
    cancelSession,
  };
}

// ─────────────────────────────────────────────────────────────
//  Sub-hook: Mentor profile management
// ─────────────────────────────────────────────────────────────

/**
 * Hook quản lý hồ sơ mentor của user hiện tại.
 *
 * @returns profile, isMentor, isLoading, error, saveProfile, autoFillFromProfile
 */
export function useMentorProfile() {
  const [isMentor, setIsMentor] = useState(false);

  const {
    data: profile,
    isLoading,
    error,
    execute: loadProfile,
    setData: setProfile,
  } = useAsync(() => mentorMatchingService.getMentorProfile(), {
    onSuccess: () => setIsMentor(true),
    onError: () => setIsMentor(false),
  });

  useEffect(() => { loadProfile(); }, [loadProfile]);

  /**
   * Lưu hoặc cập nhật hồ sơ mentor.
   *
   * @param profileData - Validated mentor profile data
   * @returns True nếu lưu thành công
   */
  const saveProfile = useCallback(async (profileData: MentorProfileCreate): Promise<boolean> => {
    try {
      await mentorMatchingService.createOrUpdateMentorProfile(profileData);
      setIsMentor(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Tự động điền hồ sơ từ CV đã upload + kết quả assessment.
   *
   * @returns Data đã auto-fill, null nếu thất bại
   */
  const autoFillFromProfile = useCallback(async () => {
    try {
      return await mentorMatchingService.createMentorFromProfile();
    } catch {
      return null;
    }
  }, []);

  return {
    profile,
    isMentor,
    isLoading,
    error,
    setProfile,
    saveProfile,
    autoFillFromProfile,
  };
}
