import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { goalsService, CareerGoal, GoalMilestone } from '../services/goalsService';

const CareerGoalsPage: React.FC = () => {
  const { currentPlan } = useFeatureAccess();
  const location = useLocation();
  const [goals, setGoals] = useState<CareerGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<CareerGoal | null>(null);
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [pendingAIGoalId, setPendingAIGoalId] = useState<number | null>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  // Handle navigation state for opening AI modal
  useEffect(() => {
    const state = location.state as { openAIModal?: boolean; goalId?: number } | null;
    if (state?.openAIModal && state?.goalId) {
      setPendingAIGoalId(state.goalId);
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Open AI modal when goals are loaded and we have a pending goal
  useEffect(() => {
    if (pendingAIGoalId && goals.length > 0 && !loading) {
      const goal = goals.find(g => g.id === pendingAIGoalId);
      if (goal) {
        setSelectedGoal(goal);
        loadGoalDetail(goal.id);
        setShowAIModal(true);
        setPendingAIGoalId(null);
      }
    }
  }, [pendingAIGoalId, goals, loading]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await goalsService.getGoals();
      setGoals(data.goals);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const loadGoalDetail = async (goalId: number) => {
    try {
      const data = await goalsService.getGoalDetail(goalId);
      setSelectedGoal(data.goal);
      setMilestones(data.milestones);
    } catch (err) {
      console.error('Failed to load goal detail:', err);
    }
  };

  const handleStatusChange = async (goalId: number, newStatus: string) => {
    try {
      await goalsService.updateGoal(goalId, { status: newStatus as any });
      loadGoals();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    if (!confirm('Bạn có chắc muốn xóa mục tiêu này?')) return;
    try {
      await goalsService.deleteGoal(goalId);
      loadGoals();
      setSelectedGoal(null);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const handleMilestoneStatusChange = async (milestoneId: number, newStatus: string) => {
    if (!selectedGoal) return;
    try {
      await goalsService.updateMilestone(selectedGoal.id, milestoneId, { status: newStatus as any });
      loadGoalDetail(selectedGoal.id);
      loadGoals(); // Refresh progress
    } catch (err) {
      console.error('Failed to update milestone:', err);
    }
  };

  const handleGenerateAIMilestones = async (targetMonths: number) => {
    if (!selectedGoal) return;
    try {
      setAiGenerating(true);
      const result = await goalsService.generateAIMilestones(selectedGoal.id, targetMonths);
      if (result.success) {
        loadGoalDetail(selectedGoal.id);
        loadGoals();
        setShowAIModal(false);
        // Show warning if any
        if (result.warning) {
          alert(result.warning);
        }
      }
    } catch (err: any) {
      console.error('Failed to generate milestones:', err);
      alert(err.response?.data?.detail || 'Không thể tạo milestone. Vui lòng thử lại.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Check Pro access
  if (currentPlan !== 'pro') {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-12 border border-purple-200 dark:border-purple-700 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Quản lý Mục tiêu Sự nghiệp
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Tính năng này chỉ dành cho người dùng Gói Pro. Thiết lập và theo dõi mục tiêu nghề nghiệp của bạn.
              </p>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                Nâng cấp Gói Pro
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'paused': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'in_progress': return 'Đang thực hiện';
      case 'paused': return 'Tạm dừng';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Quản lý Mục tiêu Sự nghiệp
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Thiết lập và theo dõi các mục tiêu nghề nghiệp của bạn
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tạo mục tiêu mới
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Chưa có mục tiêu nào
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Bắt đầu bằng cách tạo mục tiêu nghề nghiệp đầu tiên của bạn
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl"
              >
                Tạo mục tiêu đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Goals List */}
              <div className="lg:col-span-2 space-y-4">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl p-6 border-2 cursor-pointer transition-all ${
                      selectedGoal?.id === goal.id
                        ? 'border-purple-500 shadow-lg'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    }`}
                    onClick={() => loadGoalDetail(goal.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {goal.goal_text}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(goal.status)}`}>
                            {getStatusLabel(goal.status)}
                          </span>
                        </div>
                        {goal.career_name && (
                          <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                            🎯 {goal.career_name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className={goal.goal_type === 'long_term' ? 'text-orange-600' : 'text-blue-600'}>
                            {goal.goal_type === 'long_term' ? '📅 Dài hạn' : '⚡ Ngắn hạn'}
                          </span>
                          {goal.target_date && (
                            <span>🗓️ {new Date(goal.target_date).toLocaleDateString('vi-VN')}</span>
                          )}
                          <span>⭐ Ưu tiên: {goal.priority}/5</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {(goal.milestone_count || 0) > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">Tiến độ</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {goal.completed_milestones}/{goal.milestone_count} milestones
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${goal.progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Milestones list in card - show when selected */}
                    {selectedGoal?.id === goal.id && milestones.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          📋 Các bước thực hiện
                        </h4>
                        <div className="space-y-3">
                          {milestones.map((milestone, index) => (
                            <div
                              key={milestone.id}
                              className={`p-4 rounded-lg border-l-4 ${
                                milestone.status === 'completed'
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                                  : 'bg-gray-50 dark:bg-gray-900/50 border-purple-500'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  milestone.status === 'completed'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
                                }`}>
                                  {milestone.status === 'completed' ? '✓' : index + 1}
                                </div>
                                <div className="flex-1">
                                  <h5 className={`font-medium ${
                                    milestone.status === 'completed'
                                      ? 'text-green-700 dark:text-green-400 line-through'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {milestone.title}
                                  </h5>
                                  {milestone.description && (
                                    <p className={`text-sm mt-1 ${
                                      milestone.status === 'completed'
                                        ? 'text-green-600 dark:text-green-500'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {milestone.description}
                                    </p>
                                  )}
                                  {milestone.target_date && (
                                    <p className="text-xs text-purple-500 dark:text-purple-400 mt-2">
                                      📅 Mục tiêu: {new Date(milestone.target_date).toLocaleDateString('vi-VN')}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMilestoneStatusChange(
                                      milestone.id,
                                      milestone.status === 'completed' ? 'pending' : 'completed'
                                    );
                                  }}
                                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                    milestone.status === 'completed'
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400'
                                  }`}
                                >
                                  {milestone.status === 'completed' ? 'Hoàn thành ✓' : 'Đánh dấu xong'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Goal Detail Panel */}
              <div className="lg:col-span-1">
                {selectedGoal ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chi tiết mục tiêu</h3>
                      <button
                        onClick={() => handleDeleteGoal(selectedGoal.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Status selector */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Trạng thái
                      </label>
                      <select
                        value={selectedGoal.status}
                        onChange={(e) => handleStatusChange(selectedGoal.id, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="in_progress">Đang thực hiện</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="paused">Tạm dừng</option>
                        <option value="cancelled">Đã hủy</option>
                      </select>
                    </div>

                    {/* Notes */}
                    {selectedGoal.notes && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Ghi chú
                        </label>
                        <p className="text-gray-600 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                          {selectedGoal.notes}
                        </p>
                      </div>
                    )}

                    {/* Milestones */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Các bước thực hiện
                        </label>
                        <button
                          onClick={() => setShowAIModal(true)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-400 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          AI Tạo lộ trình
                        </button>
                      </div>
                      
                      {milestones.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          Chưa có milestone nào
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {milestones.map((milestone) => (
                            <div
                              key={milestone.id}
                              className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => handleMilestoneStatusChange(
                                    milestone.id,
                                    milestone.status === 'completed' ? 'pending' : 'completed'
                                  )}
                                  className={`w-5 h-5 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                    milestone.status === 'completed'
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                                  }`}
                                >
                                  {milestone.status === 'completed' && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <span className={`block text-sm font-medium ${
                                    milestone.status === 'completed'
                                      ? 'text-gray-400 line-through'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {milestone.title}
                                  </span>
                                  {milestone.description && (
                                    <p className={`text-xs mt-1 ${
                                      milestone.status === 'completed'
                                        ? 'text-gray-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                      {milestone.description}
                                    </p>
                                  )}
                                  {milestone.target_date && (
                                    <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                                      📅 {new Date(milestone.target_date).toLocaleDateString('vi-VN')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Chọn một mục tiêu để xem chi tiết
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <CreateGoalModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadGoals();
          }}
        />
      )}

      {/* AI Generate Milestones Modal */}
      {showAIModal && selectedGoal && (
        <AIGenerateMilestonesModal
          goal={selectedGoal}
          onClose={() => setShowAIModal(false)}
          onGenerate={handleGenerateAIMilestones}
          isGenerating={aiGenerating}
        />
      )}
    </MainLayout>
  );
};

// Create Goal Modal Component
const CreateGoalModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    goal_text: '',
    goal_type: 'short_term',
    target_date: '',
    priority: 3,
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.goal_text.trim()) return;

    try {
      setLoading(true);
      await goalsService.createGoal({
        goal_text: formData.goal_text,
        goal_type: formData.goal_type as 'short_term' | 'long_term',
        target_date: formData.target_date || undefined,
        priority: formData.priority,
        notes: formData.notes || undefined
      } as any);
      onCreated();
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tạo mục tiêu mới</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mục tiêu *
            </label>
            <input
              type="text"
              value={formData.goal_text}
              onChange={(e) => setFormData({ ...formData, goal_text: e.target.value })}
              placeholder="VD: Học xong Python trong 3 tháng"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Loại mục tiêu
              </label>
              <select
                value={formData.goal_type}
                onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="short_term">Ngắn hạn</option>
                <option value="long_term">Dài hạn</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mức ưu tiên
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={1}>1 - Thấp</option>
                <option value={2}>2</option>
                <option value={3}>3 - Trung bình</option>
                <option value={4}>4</option>
                <option value={5}>5 - Cao</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ngày mục tiêu
            </label>
            <input
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ghi chú
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Thêm ghi chú..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !formData.goal_text.trim()}
              className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : 'Tạo mục tiêu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// AI Generate Milestones Modal Component
const AIGenerateMilestonesModal: React.FC<{
  goal: CareerGoal;
  onClose: () => void;
  onGenerate: (targetMonths: number) => void;
  isGenerating: boolean;
}> = ({ goal, onClose, onGenerate, isGenerating }) => {
  const [targetMonths, setTargetMonths] = useState(12);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Tạo lộ trình</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-4">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <span className="font-semibold">Mục tiêu:</span> {goal.goal_text}
            </p>
            {goal.career_name && (
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                <span className="font-semibold">Nghề nghiệp:</span> {goal.career_name}
              </p>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            AI sẽ phân tích dữ liệu nghề nghiệp và lộ trình để tạo các bước thực hiện phù hợp với thời gian bạn mong muốn.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Thời gian mong muốn hoàn thành
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={3}
                max={36}
                value={targetMonths}
                onChange={(e) => setTargetMonths(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
              />
              <span className="w-20 text-center font-semibold text-purple-600 dark:text-purple-400">
                {targetMonths} tháng
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3 tháng</span>
              <span>36 tháng</span>
            </div>
          </div>

          {targetMonths < 6 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Thời gian ngắn có thể yêu cầu học tập chăm chỉ hơn
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={() => onGenerate(targetMonths)}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Đang tạo...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Tạo lộ trình
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CareerGoalsPage;
