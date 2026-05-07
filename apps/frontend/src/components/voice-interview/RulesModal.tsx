import React, { useState } from 'react';

/**
 * RulesModal
 * Yêu cầu 6.1: Hiển thị quy tắc phỏng vấn trước khi bắt đầu
 * Yêu cầu 6.2: Yêu cầu xác nhận đồng ý từ người dùng
 */

interface RulesModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

const RULES = [
    'Không chuyển tab hoặc rời khỏi cửa sổ phỏng vấn trong suốt buổi phỏng vấn.',
    'Vi phạm 3 lần chuyển tab sẽ tự động kết thúc phiên phỏng vấn.',
    'Đảm bảo microphone và loa hoạt động tốt trước khi bắt đầu.',
    'Trả lời bằng tiếng Việt rõ ràng, đủ nghe.',
    'Không sử dụng tài liệu hỗ trợ trong quá trình phỏng vấn.',
    'Mỗi câu trả lời tối thiểu 3 giây và tối đa 5 phút.',
];

const RulesModal: React.FC<RulesModalProps> = ({ onConfirm, onCancel }) => {
    const [agreed, setAgreed] = useState(false);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            data-testid="rules-modal"
        >
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-600 fill-current">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Quy Tắc Phỏng Vấn</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Vui lòng đọc kỹ trước khi bắt đầu
                    </p>
                </div>

                {/* Rules list */}
                <ul className="space-y-3 mb-6" data-testid="rules-list">
                    {RULES.map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                            </span>
                            <span className="text-gray-700 text-sm leading-relaxed">{rule}</span>
                        </li>
                    ))}
                </ul>

                {/* Warning about tab switching */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-600 fill-current flex-shrink-0">
                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                        </svg>
                        <p className="text-amber-800 text-sm font-medium">
                            Chuyển tab 3 lần sẽ tự động hủy phiên phỏng vấn
                        </p>
                    </div>
                </div>

                {/* Agreement checkbox */}
                <label
                    className="flex items-center gap-3 cursor-pointer mb-6"
                    data-testid="agreement-checkbox-label"
                >
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                        data-testid="agreement-checkbox"
                    />
                    <span className="text-gray-700 text-sm">
                        Tôi đã đọc và đồng ý với các quy tắc phỏng vấn trên
                    </span>
                </label>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        type="button"
                        className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer font-medium"
                        data-testid="cancel-btn"
                    >
                        Quay lại
                    </button>
                    <button
                        onClick={onConfirm}
                        type="button"
                        disabled={!agreed}
                        className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer font-medium"
                        data-testid="confirm-btn"
                    >
                        Bắt đầu phỏng vấn
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RulesModal;
