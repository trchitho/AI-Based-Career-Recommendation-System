// =====================================================
// FRONTEND VOICE INTERVIEW COMPONENTS - OPTIMIZED
// File: apps/frontend/src/components/VoiceInterviewOptimized.tsx
// Purpose: Implement evaluation logic, performance, UI states
// =====================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Clock, TrendingUp } from 'lucide-react';

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface UIState {
  id?: string;
  type: 'processing_stt' | 'processing_ai' | 'processing_tts' | 'waiting_user' | 'playing_audio' | 'recording_audio';
  message: string;
  startTime: number;
  progress?: number;
}

interface EvaluationResults {
  final_score: number;
  scores: {
    technical: number;
    communication: number;
    logic: number;
    experience: number;
    attitude: number;
  };
  question_scores: Array<{
    question_id: number;
    score: number;
    feedback: string;
  }>;
  overall_feedback: string;
}

interface PerformanceMetrics {
  stt_avg_time: number;
  ai_avg_time: number;
  tts_avg_time: number;
  total_wait_time: number;
  ui_responsiveness: number;
}

// =====================================================
// VOICE INTERVIEW MANAGER CLASS
// =====================================================

class VoiceInterviewManager {
  private sessionId: number;
  private apiBase: string;
  private currentUIState: UIState | null = null;
  private performanceMetrics: PerformanceMetrics;
  
  constructor(sessionId: number, apiBase: string = '/api/interview/voice') {
    this.sessionId = sessionId;
    this.apiBase = apiBase;
    this.performanceMetrics = {
      stt_avg_time: 0,
      ai_avg_time: 0,
      tts_avg_time: 0,
      total_wait_time: 0,
      ui_responsiveness: 0
    };
  }

  // UI State Management
  async startUIState(type: UIState['type'], message: string, metadata: any = {}): Promise<string> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.apiBase}/ui-state/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          state_type: type,
          state_value: message,
          action: 'start',
          metadata: metadata
        })
      });
      
      const result = await response.json();
      
      this.currentUIState = {
        id: result.state_id,
        type,
        message,
        startTime,
        progress: 0
      };
      
      return result.state_id;
      
    } catch (error) {
      console.error('Error starting UI state:', error);
      return '';
    }
  }

  async endUIState(stateId: string, type: UIState['type']): Promise<number> {
    try {
      const response = await fetch(`${this.apiBase}/ui-state/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          state_type: type,
          state_value: 'ended',
          action: 'end',
          metadata: { state_id: stateId }
        })
      });
      
      const result = await response.json();
      this.currentUIState = null;
      
      return result.duration_ms || 0;
      
    } catch (error) {
      console.error('Error ending UI state:', error);
      return 0;
    }
  }

  // Voice Processing Pipeline
  async processVoiceMessage(audioBlob: Blob): Promise<void> {
    let sttStateId = '';
    let aiStateId = '';
    let ttsStateId = '';
    let playStateId = '';
    
    try {
      // 1. STT Processing
      sttStateId = await this.startUIState('processing_stt', 'Đang xử lý giọng nói...');
      const sttStartTime = Date.now();
      
      const transcript = await this.sendAudioForSTT(audioBlob);
      
      const sttDuration = await this.endUIState(sttStateId, 'processing_stt');
      this.performanceMetrics.stt_avg_time = (Date.now() - sttStartTime) / 1000;
      
      // 2. AI Processing
      aiStateId = await this.startUIState('processing_ai', 'AI đang suy nghĩ...');
      const aiStartTime = Date.now();
      
      const aiResponse = await this.sendToAI(transcript);
      
      const aiDuration = await this.endUIState(aiStateId, 'processing_ai');
      this.performanceMetrics.ai_avg_time = (Date.now() - aiStartTime) / 1000;
      
      // 3. TTS Processing
      ttsStateId = await this.startUIState('processing_tts', 'Đang tạo giọng nói...');
      const ttsStartTime = Date.now();
      
      const audioUrl = await this.generateTTS(aiResponse);
      
      const ttsDuration = await this.endUIState(ttsStateId, 'processing_tts');
      this.performanceMetrics.tts_avg_time = (Date.now() - ttsStartTime) / 1000;
      
      // 4. Audio Playback
      playStateId = await this.startUIState('playing_audio', 'Đang phát câu trả lời...');
      
      await this.playAudio(audioUrl);
      
      await this.endUIState(playStateId, 'playing_audio');
      
      // 5. Log performance optimization if needed
      await this.checkAndApplyOptimizations();
      
    } catch (error) {
      console.error('Voice processing error:', error);
      
      // Clean up any active states
      if (sttStateId) await this.endUIState(sttStateId, 'processing_stt');
      if (aiStateId) await this.endUIState(aiStateId, 'processing_ai');
      if (ttsStateId) await this.endUIState(ttsStateId, 'processing_tts');
      if (playStateId) await this.endUIState(playStateId, 'playing_audio');
    }
  }

  // Performance Optimization
  async checkAndApplyOptimizations(): Promise<void> {
    const { stt_avg_time, ai_avg_time, tts_avg_time } = this.performanceMetrics;
    
    // STT Optimization
    if (stt_avg_time > 3.0) {
      await this.applyOptimization('stt', 'compress_audio', stt_avg_time, stt_avg_time * 0.7);
    }
    
    // AI Optimization  
    if (ai_avg_time > 5.0) {
      await this.applyOptimization('ai', 'use_gemini_flash', ai_avg_time, ai_avg_time * 0.6);
    }
    
    // TTS Optimization
    if (tts_avg_time > 2.0) {
      await this.applyOptimization('tts', 'async_processing', tts_avg_time, tts_avg_time * 0.8);
    }
  }

  async applyOptimization(stage: string, type: string, beforeTime: number, afterTime: number): Promise<void> {
    try {
      await fetch(`${this.apiBase}/optimization/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          stage,
          optimization_type: type,
          before_time: beforeTime,
          after_time: afterTime,
          metadata: { applied_at: new Date().toISOString() }
        })
      });
    } catch (error) {
      console.error('Error applying optimization:', error);
    }
  }

  // Evaluation Logic
  async startDeferredEvaluation(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/evaluation/start-deferred/${this.sessionId}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      return result.success;
      
    } catch (error) {
      console.error('Error starting deferred evaluation:', error);
      return false;
    }
  }

  async completeEvaluation(evaluationResults: EvaluationResults): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/evaluation/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          evaluation_results: evaluationResults
        })
      });
      
      const result = await response.json();
      return result.success;
      
    } catch (error) {
      console.error('Error completing evaluation:', error);
      return false;
    }
  }

  // Placeholder methods (implement based on your existing services)
  private async sendAudioForSTT(audioBlob: Blob): Promise<string> {
    // TODO: Implement STT service call
    return "Sample transcript";
  }

  private async sendToAI(transcript: string): Promise<string> {
    // TODO: Implement AI service call
    return "Sample AI response";
  }

  private async generateTTS(text: string): Promise<string> {
    // TODO: Implement TTS service call
    return "/audio/sample.wav";
  }

  private async playAudio(audioUrl: string): Promise<void> {
    // TODO: Implement audio playback
    return new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// =====================================================
// REACT COMPONENTS
// =====================================================

// UI State Display Component
const UIStateDisplay: React.FC<{ uiState: UIState | null }> = ({ uiState }) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!uiState) return;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - uiState.startTime;
      const maxTime = getMaxTimeForState(uiState.type);
      const newProgress = Math.min((elapsed / maxTime) * 100, 95);
      setProgress(newProgress);
    }, 100);
    
    return () => clearInterval(interval);
  }, [uiState]);
  
  if (!uiState) return null;
  
  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <div className="flex-1">
            <p className="text-sm font-medium">{uiState.message}</p>
            <Progress value={progress} className="mt-2" />
          </div>
          <Badge variant="outline">{getStateIcon(uiState.type)}</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Performance Metrics Component
const PerformanceMetrics: React.FC<{ metrics: PerformanceMetrics }> = ({ metrics }) => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Performance Metrics</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">STT Processing:</span>
              <span className="text-sm font-mono">{metrics.stt_avg_time.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">AI Processing:</span>
              <span className="text-sm font-mono">{metrics.ai_avg_time.toFixed(1)}s</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">TTS Processing:</span>
              <span className="text-sm font-mono">{metrics.tts_avg_time.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total Wait:</span>
              <span className="text-sm font-mono">{metrics.total_wait_time.toFixed(1)}s</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Evaluation Interface Component
const EvaluationInterface: React.FC<{
  sessionId: number;
  onEvaluationComplete: (results: EvaluationResults) => void;
}> = ({ sessionId, onEvaluationComplete }) => {
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResults>({
    final_score: 0,
    scores: {
      technical: 0,
      communication: 0,
      logic: 0,
      experience: 0,
      attitude: 0
    },
    question_scores: [],
    overall_feedback: ''
  });
  
  const handleCompleteEvaluation = async () => {
    const manager = new VoiceInterviewManager(sessionId);
    const success = await manager.completeEvaluation(evaluationResults);
    
    if (success) {
      onEvaluationComplete(evaluationResults);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview Evaluation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Final Score</label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={evaluationResults.final_score}
              onChange={(e) => setEvaluationResults(prev => ({
                ...prev,
                final_score: parseFloat(e.target.value)
              }))}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Overall Feedback</label>
            <textarea
              value={evaluationResults.overall_feedback}
              onChange={(e) => setEvaluationResults(prev => ({
                ...prev,
                overall_feedback: e.target.value
              }))}
              className="w-full mt-1 px-3 py-2 border rounded-md"
              rows={4}
            />
          </div>
          
          <Button onClick={handleCompleteEvaluation} className="w-full">
            Complete Evaluation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Voice Interview Component
const VoiceInterviewOptimized: React.FC<{
  sessionId: number;
  mode: 'text' | 'voice';
  onModeChange: (mode: 'text' | 'voice') => void;
}> = ({ sessionId, mode, onModeChange }) => {
  const [uiState, setUIState] = useState<UIState | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    stt_avg_time: 0,
    ai_avg_time: 0,
    tts_avg_time: 0,
    total_wait_time: 0,
    ui_responsiveness: 0
  });
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const managerRef = useRef<VoiceInterviewManager>();
  
  useEffect(() => {
    managerRef.current = new VoiceInterviewManager(sessionId);
  }, [sessionId]);
  
  const handleStartRecording = async () => {
    if (!managerRef.current) return;
    
    setIsRecording(true);
    const stateId = await managerRef.current.startUIState('recording_audio', 'Đang ghi âm...');
    
    // TODO: Implement actual recording logic
    setTimeout(async () => {
      if (managerRef.current) {
        await managerRef.current.endUIState(stateId, 'recording_audio');
        setIsRecording(false);
        
        // Simulate audio processing
        const audioBlob = new Blob(); // Replace with actual audio
        await managerRef.current.processVoiceMessage(audioBlob);
      }
    }, 3000);
  };
  
  const handleEndInterview = async () => {
    if (!managerRef.current) return;
    
    const success = await managerRef.current.startDeferredEvaluation();
    if (success) {
      setShowEvaluation(true);
    }
  };
  
  const handleEvaluationComplete = (results: EvaluationResults) => {
    setShowEvaluation(false);
    // Show final results
    console.log('Evaluation completed:', results);
  };
  
  // Hide chatbot in voice mode
  useEffect(() => {
    const chatbotElement = document.getElementById('ai-chatbot');
    if (chatbotElement) {
      chatbotElement.style.display = mode === 'voice' ? 'none' : 'block';
    }
  }, [mode]);
  
  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex space-x-2">
        <Button
          variant={mode === 'text' ? 'default' : 'outline'}
          onClick={() => onModeChange('text')}
        >
          Text Interview
        </Button>
        <Button
          variant={mode === 'voice' ? 'default' : 'outline'}
          onClick={() => onModeChange('voice')}
        >
          Voice Interview
        </Button>
      </div>
      
      {mode === 'voice' && (
        <>
          {/* UI State Display */}
          <UIStateDisplay uiState={uiState} />
          
          {/* Performance Metrics */}
          <PerformanceMetrics metrics={performanceMetrics} />
          
          {/* Voice Controls */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={handleStartRecording}
                  disabled={isRecording}
                  className="flex items-center space-x-2"
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>{isRecording ? 'Recording...' : 'Start Recording'}</span>
                </Button>
                
                <Button
                  onClick={handleEndInterview}
                  variant="outline"
                >
                  End Interview
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Evaluation Interface */}
          {showEvaluation && (
            <EvaluationInterface
              sessionId={sessionId}
              onEvaluationComplete={handleEvaluationComplete}
            />
          )}
        </>
      )}
    </div>
  );
};

// Helper Functions
function getMaxTimeForState(type: UIState['type']): number {
  switch (type) {
    case 'processing_stt': return 5000; // 5 seconds
    case 'processing_ai': return 8000;  // 8 seconds
    case 'processing_tts': return 3000; // 3 seconds
    case 'playing_audio': return 10000; // 10 seconds
    case 'recording_audio': return 30000; // 30 seconds
    default: return 5000;
  }
}

function getStateIcon(type: UIState['type']): string {
  switch (type) {
    case 'processing_stt': return '🎤';
    case 'processing_ai': return '🤖';
    case 'processing_tts': return '🔊';
    case 'playing_audio': return '▶️';
    case 'recording_audio': return '🔴';
    default: return '⏳';
  }
}

export default VoiceInterviewOptimized;