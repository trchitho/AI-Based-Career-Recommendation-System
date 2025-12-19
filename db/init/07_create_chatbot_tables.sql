-- Tạo schema chatbot nếu chưa có
CREATE SCHEMA IF NOT EXISTS chatbot;

-- Tạo bảng chat_sessions
CREATE TABLE IF NOT EXISTS chatbot.chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Tạo bảng chat_messages
CREATE TABLE IF NOT EXISTS chatbot.chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chatbot.chat_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    message_type VARCHAR(50) DEFAULT 'text',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    response_time_ms INTEGER
);

-- Tạo indexes để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chatbot.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chatbot.chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_active ON chatbot.chat_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chatbot.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chatbot.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chatbot.chat_messages(created_at);

-- Note: Trigger sẽ được tạo sau nếu cần