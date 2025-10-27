export interface Notification {
  id: string;
  user_id: string;
  type: 'LEARNING_REMINDER' | 'ESSAY_FEEDBACK' | 'SYSTEM_UPDATE' | 'MILESTONE_ACHIEVEMENT';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}
