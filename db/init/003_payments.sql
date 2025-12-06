-- Migration: Tạo bảng payments cho ZaloPay
-- Created: 2025-12-06

CREATE TABLE IF NOT EXISTS core.payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    
    -- Thông tin đơn hàng
    order_id VARCHAR(100) UNIQUE NOT NULL,
    app_trans_id VARCHAR(100) UNIQUE,
    
    -- Thông tin thanh toán
    amount INTEGER NOT NULL,
    description TEXT,
    payment_method VARCHAR(20) DEFAULT 'zalopay',
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Thông tin từ gateway
    zp_trans_token VARCHAR(255),
    order_url TEXT,
    
    -- Callback data
    callback_data TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    
    -- Indexes
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES core.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON core.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON core.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_app_trans_id ON core.payments(app_trans_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON core.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON core.payments(created_at DESC);

-- Comments
COMMENT ON TABLE core.payments IS 'Bảng lưu trữ thông tin thanh toán';
COMMENT ON COLUMN core.payments.order_id IS 'Mã đơn hàng nội bộ';
COMMENT ON COLUMN core.payments.app_trans_id IS 'Mã giao dịch từ ZaloPay';
COMMENT ON COLUMN core.payments.status IS 'Trạng thái: pending, success, failed, cancelled';
