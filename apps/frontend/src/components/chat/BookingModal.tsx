import { useState } from 'react';
import { Calendar, X, CheckCircle, AlertCircle, Clock, FileText, StickyNote } from 'lucide-react';
import { scheduleService } from '../../services/scheduleService';

interface Props {
  mentorUserId: number;
  mentorName: string;
  onClose: () => void;
  onBooked?: () => void;
}

function toLocalISOString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function minDateTimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  return toLocalISOString(d);
}

const BookingModal: React.FC<Props> = ({ mentorUserId, mentorName, onClose, onBooked }) => {
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration]       = useState(60);
  const [topic, setTopic]             = useState('');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) { setError('Vui lòng chọn ngày và giờ.'); return; }
    setSaving(true); setError('');
    try {
      await scheduleService.book(mentorUserId, scheduledAt, topic, duration, notes);
      setSuccess(true); onBooked?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Đặt lịch thất bại, vui lòng thử lại.');
    } finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.8rem',
    border: '1px solid var(--neu-border, #d1d5db)', borderRadius: 10,
    fontSize: '0.9rem', color: 'var(--neu-text, #111)',
    background: 'var(--neu-bg, #f9fafb)', boxSizing: 'border-box',
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/45"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[460px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--neu-bg-card, #fff)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--neu-border, #e5e7eb)' }}>
          <div>
            <div className="flex items-center gap-2 font-bold text-base" style={{ color: 'var(--neu-text, #111)' }}>
              <Calendar size={18} className="text-violet-600" />
              Đặt lịch hẹn
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--neu-text-muted, #666)' }}>Với {mentorName}</div>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors border-none bg-transparent cursor-pointer"
            style={{ color: 'var(--neu-text-muted, #888)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle size={52} className="mx-auto mb-3 text-indigo-700" />
              <div className="font-bold text-lg mb-2" style={{ color: 'var(--neu-text, #111)' }}>
                Đã gửi yêu cầu đặt lịch!
              </div>
              <div className="text-sm mb-6" style={{ color: 'var(--neu-text-muted, #666)' }}>
                {mentorName} sẽ xác nhận lịch hẹn sớm. Bạn có thể theo dõi trong tab "Lịch hẹn".
              </div>
              <button onClick={onClose}
                className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 transition-colors border-none cursor-pointer">
                Đóng
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Date & Time */}
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-sm mb-1.5" style={{ color: 'var(--neu-text, #111)' }}>
                  <Calendar size={14} /> Ngày &amp; Giờ *
                </label>
                <input type="datetime-local" value={scheduledAt} min={minDateTimeLocal()}
                  onChange={e => setScheduledAt(e.target.value)} style={inputStyle} required />
              </div>

              {/* Duration */}
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-sm mb-1.5" style={{ color: 'var(--neu-text, #111)' }}>
                  <Clock size={14} /> Thời lượng
                </label>
                <div className="flex gap-2">
                  {[30, 60, 90].map(d => (
                    <button key={d} type="button" onClick={() => setDuration(d)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all border-2 cursor-pointer"
                      style={{
                        borderColor: duration===d ? '#8b5cf6' : 'var(--neu-border, #d1d5db)',
                        background:  duration===d ? '#ede9fe'  : 'var(--neu-bg, #f9fafb)',
                        color:       duration===d ? '#7c3aed'  : 'var(--neu-text, #374151)',
                      }}>
                      {d} phút
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-sm mb-1.5" style={{ color: 'var(--neu-text, #111)' }}>
                  <FileText size={14} /> Chủ đề
                </label>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="VD: Hỏi về lộ trình học React, Review CV..." style={inputStyle} />
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-sm mb-1.5" style={{ color: 'var(--neu-text, #111)' }}>
                  <StickyNote size={14} /> Ghi chú
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Thêm thông tin bổ sung cho mentor..." rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-colors hover:bg-gray-50 cursor-pointer bg-transparent"
                  style={{ borderColor: 'var(--neu-border, #d1d5db)', color: 'var(--neu-text, #374151)' }}>
                  Huỷ
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-2.5 rounded-xl font-bold text-sm text-white transition-colors border-none cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: saving ? '#c4b5fd' : '#8b5cf6', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  <Calendar size={15} />
                  {saving ? 'Đang gửi...' : 'Gửi yêu cầu đặt lịch'}
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
