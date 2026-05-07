import api from '../lib/api';

export interface MentorSession {
  id: number;
  mentor_id: number;
  mentee_id: number;
  mentor_name: string;
  mentee_name: string;
  other_name: string;
  scheduled_at: string;
  duration_minutes: number;
  topic: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  mentor_note: string;
  created_at: string;
  role: 'mentor' | 'mentee';
}

class ScheduleService {
  async book(mentorUserId: number, scheduledAt: string, topic: string, durationMinutes = 60, notes = ''): Promise<MentorSession> {
    const res = await api.post('/api/schedule/book', {
      mentor_user_id: mentorUserId,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      topic,
      notes,
    });
    return res.data;
  }

  async mySessions(): Promise<MentorSession[]> {
    const res = await api.get('/api/schedule/my');
    return res.data;
  }

  async respond(sessionId: number, action: 'confirmed' | 'cancelled', mentorNote = ''): Promise<MentorSession> {
    const res = await api.post('/api/schedule/respond', {
      session_id: sessionId,
      action,
      mentor_note: mentorNote,
    });
    return res.data;
  }

  async cancel(sessionId: number): Promise<void> {
    await api.delete(`/api/schedule/${sessionId}`);
  }
}

export const scheduleService = new ScheduleService();
