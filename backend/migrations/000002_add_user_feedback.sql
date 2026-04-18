-- Add user feedback system for ratings and reviews

CREATE TABLE IF NOT EXISTS user_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    responder_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    summary_note TEXT,
    was_helpful BOOLEAN,
    feedback_type VARCHAR(50) NOT NULL DEFAULT 'resolution',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX idx_user_feedbacks_alert_id ON user_feedbacks(alert_id);
CREATE INDEX idx_user_feedbacks_user_id ON user_feedbacks(user_id);
CREATE INDEX idx_user_feedbacks_responder_id ON user_feedbacks(responder_id);
CREATE INDEX idx_user_feedbacks_rating ON user_feedbacks(rating);
CREATE INDEX idx_user_feedbacks_feedback_type ON user_feedbacks(feedback_type);

-- Add new columns to users table for rating statistics
ALTER TABLE users ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS five_star_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS four_star_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS three_star_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_star_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS one_star_count INTEGER DEFAULT 0;

-- Create indexes for the new rating columns
CREATE INDEX IF NOT EXISTS idx_users_average_rating ON users(average_rating);
CREATE INDEX IF NOT EXISTS idx_users_total_ratings ON users(total_ratings);