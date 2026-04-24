import { useState } from 'react';
import { scheduleService } from '../../services/scheduleService';

interface Props {
  mentorUserId: number;
  mentorName: string;
  onClose: () => void;
  onBooked?: () => void;
}

function toLocalISOString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function minDateTimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  return toLocalISOString(d);
}

const BookingModal: React.FC<Props> = ({ mentorUserId, mentorName, onClose, onBooked }) => {
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(60);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) { setError('Vui lòng chọn ngày và giờ.'); return; }
    setSaving(true);
    setError('');
    try {
      await scheduleService.book(mentorUserId, scheduledAt, topic, duration, notes);
      setSuccess(true);
      onBooked?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Đặt lịch thất bại, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--neu-bg-card, #fff)',
        borderRadius: 16,
        width: '100%', maxWidth: 460,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--neu-border, #e5e7eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--neu-text, #111)' }}>
              📅 Đặt lịch hẹn
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--neu-text-muted, #666)', marginTop: 2 }}>
              Với {mentorName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.1rem', color: 'var(--neu-text-muted, #888)',
              padding: '0.25rem 0.5rem', borderRadius: 8,
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--neu-text, #111)', marginBottom: '0.5rem' }}>
                Đã gửi yêu cầu đặt lịch!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--neu-text-muted, #666)', marginBottom: '1.5rem' }}>
                {mentorName} sẽ xác nhận lịch hẹn sớm. Bạn có thể theo dõi trong tab "Lịch hẹn".
              </div>
              <button
                onClick={onClose}
                style={{
                  background: '#8b5cf6', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '0.6rem 1.5rem',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                }}
              >Đóng</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 8, padding: '0.6rem 0.9rem',
                  color: '#dc2626', fontSize: '0.84rem', marginBottom: '1rem',
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', color: 'var(--neu-text, #111)', marginBottom: '0.4rem' }}>
                  Ngày & Giờ *
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minDateTimeLocal()}
                  onChange={e => setScheduledAt(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem 0.8rem',
                    border: '1px solid var(--neu-border, #d1d5db)',
                    borderRadius: 10, fontSize: '0.9rem',
                    color: 'var(--neu-text, #111)',
                    background: 'var(--neu-bg, #f9fafb)',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', color: 'var(--neu-text, #111)', marginBottom: '0.4rem' }}>
                  Thời lượng
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[30, 60, 90].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      style={{
                        flex: 1, padding: '0.5rem',
                        border: `2px solid ${duration === d ? '#8b5cf6' : 'var(--neu-border, #d1d5db)'}`,
                        borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                        background: duration === d ? '#ede9fe' : 'var(--neu-bg, #f9fafb)',
                        color: duration === d ? '#7c3aed' : 'var(--neu-text, #374151)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {d} phút
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', color: 'var(--neu-text, #111)', marginBottom: '0.4rem' }}>
                  Chủ đề
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="VD: Hỏi về lộ trình học React, Review CV..."
                  style={{
                    width: '100%', padding: '0.6rem 0.8rem',
                    border: '1px solid var(--neu-border, #d1d5db)',
                    borderRadius: 10, fontSize: '0.9rem',
                    color: 'var(--neu-text, #111)',
                    background: 'var(--neu-bg, #f9fafb)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.84rem', color: 'var(--neu-text, #111)', marginBottom: '0.4rem' }}>
                  Ghi chú
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Thêm thông tin bổ sung cho mentor..."
                  rows={3}
                  style={{
                    width: '100%', padding: '0.6rem 0.8rem',
                    border: '1px solid var(--neu-border, #d1d5db)',
                    borderRadius: 10, fontSize: '0.9rem',
                    color: 'var(--neu-text, #111)',
                    background: 'var(--neu-bg, #f9fafb)',
                    resize: 'vertical', boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '0.65rem', border: '1.5px solid var(--neu-border, #d1d5db)',
                    borderRadius: 10, background: 'none', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: 600, color: 'var(--neu-text, #374151)',
                  }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2, padding: '0.65rem',
                    background: saving ? '#c4b5fd' : '#8b5cf6',
                    border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem', fontWeight: 700, color: '#fff',
                    transition: 'background 0.15s',
                  }}
                >
                  {saving ? 'Đang gửi...' : '📅 Gửi yêu cầu đặt lịch'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
