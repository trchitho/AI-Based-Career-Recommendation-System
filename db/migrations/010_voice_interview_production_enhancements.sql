-- Migration: Voice Interview System Production Enhancements
-- Version: 010
-- Date: 2024-01-26
-- Description: Enhance existing interview tables for voice interview production features
-- Extends: 009_voice_interview_support.sql

-- Add voice-related columns to existing interview_sessions table
ALTER TABLE interview.interview_sessions 
ADD COLUMN IF NOT EXISTS voice_type VARCHAR(10) DEFAULT 'female' CHECK (voice_type IN ('male', 'female')),
ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS processing_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS conversation_metadata JSONB DEFAULT '{}';

-- Add voice-related columns to existing interview_messages table  
ALTER TABLE interview.interview_messages
ADD COLUMN IF NOT EXISTS voice_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS processing_time FLOAT,
ADD COLUMN IF NOT EXISTS word_timestamps JSONB,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create voice_preferences table for user voice settings
CREATE TABLE IF NOT EXISTS interview.voice_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    preferred_voice VARCHAR(10) DEFAULT 'female' CHECK (preferred_voice IN ('male', 'female')),
    voice_rate VARCHAR(10) DEFAULT '+0%',
    voice_pitch VARCHAR(10) DEFAULT '+0Hz', 
    voice_volume FLOAT DEFAULT 1.0 CHECK (voice_volume BETWEEN 0.0 AND 2.0),
    language VARCHAR(10) DEFAULT 'vi-VN',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create voice_performance_metrics table for monitoring
CREATE TABLE IF NOT EXISTS interview.voice_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id INTEGER REFERENCES interview.interview_sessions(id) ON DELETE CASCADE,
    stage VARCHAR(20) NOT NULL CHECK (stage IN ('stt', 'ai', 'tts', 'total')),
    processing_time FLOAT NOT NULL,
    input_size INTEGER,
    output_size INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audio_cache table for TTS caching
CREATE TABLE IF NOT EXISTS interview.audio_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash VARCHAR(64) NOT NULL UNIQUE,
    voice_type VARCHAR(20) NOT NULL,
    voice_model VARCHAR(100) NOT NULL,
    audio_url VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    duration_seconds FLOAT,
    word_timestamps JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 1
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_sessions_voice_type 
    ON interview.interview_sessions(voice_type);

CREATE INDEX IF NOT EXISTS idx_interview_messages_voice_type 
    ON interview.interview_messages(voice_type);

CREATE INDEX IF NOT EXISTS idx_interview_messages_order 
    ON interview.interview_messages(session_id, order_index);

CREATE INDEX IF NOT EXISTS idx_voice_preferences_user_id 
    ON interview.voice_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_voice_performance_session 
    ON interview.voice_performance_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_voice_performance_stage 
    ON interview.voice_performance_metrics(stage);

CREATE INDEX IF NOT EXISTS idx_audio_cache_content_hash 
    ON interview.audio_cache(content_hash);

CREATE INDEX IF NOT EXISTS idx_audio_cache_voice_type 
    ON interview.audio_cache(voice_type);

CREATE INDEX IF NOT EXISTS idx_audio_cache_last_accessed 
    ON interview.audio_cache(last_accessed);

-- Add comments for documentation
COMMENT ON COLUMN interview.interview_sessions.voice_type IS 'Loại giọng nói: male hoặc female';
COMMENT ON COLUMN interview.interview_sessions.voice_settings IS 'Cài đặt giọng nói (rate, pitch, volume)';
COMMENT ON COLUMN interview.interview_sessions.processing_metrics IS 'Metrics hiệu suất xử lý voice';
COMMENT ON COLUMN interview.interview_sessions.conversation_metadata IS 'Metadata cuộc trò chuyện voice';

COMMENT ON COLUMN interview.interview_messages.voice_type IS 'Loại giọng nói cho message này';
COMMENT ON COLUMN interview.interview_messages.processing_time IS 'Thời gian xử lý STT/TTS (seconds)';
COMMENT ON COLUMN interview.interview_messages.word_timestamps IS 'Timestamps từng từ cho karaoke effect';
COMMENT ON COLUMN interview.interview_messages.order_index IS 'Thứ tự message trong conversation';

COMMENT ON TABLE interview.voice_preferences IS 'Cài đặt giọng nói của user';
COMMENT ON TABLE interview.voice_performance_metrics IS 'Metrics hiệu suất voice processing';
COMMENT ON TABLE interview.audio_cache IS 'Cache audio files từ TTS';

-- Update existing data to have proper order_index
UPDATE interview.interview_messages 
SET order_index = subquery.row_number
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp) as row_number
    FROM interview.interview_messages
) AS subquery
WHERE interview.interview_messages.id = subquery.id
AND order_index = 0;