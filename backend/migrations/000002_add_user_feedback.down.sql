-- Rollback user feedback system

-- Drop indexes for rating columns
DROP INDEX IF EXISTS idx_users_total_ratings;
DROP INDEX IF EXISTS idx_users_average_rating;

-- Remove rating columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS one_star_count;
ALTER TABLE users DROP COLUMN IF EXISTS two_star_count;
ALTER TABLE users DROP COLUMN IF EXISTS three_star_count;
ALTER TABLE users DROP COLUMN IF EXISTS four_star_count;
ALTER TABLE users DROP COLUMN IF EXISTS five_star_count;
ALTER TABLE users DROP COLUMN IF EXISTS total_ratings;
ALTER TABLE users DROP COLUMN IF EXISTS average_rating;

-- Drop indexes for user_feedbacks table
DROP INDEX IF EXISTS idx_user_feedbacks_feedback_type;
DROP INDEX IF EXISTS idx_user_feedbacks_rating;
DROP INDEX IF EXISTS idx_user_feedbacks_responder_id;
DROP INDEX IF EXISTS idx_user_feedbacks_user_id;
DROP INDEX IF EXISTS idx_user_feedbacks_alert_id;

-- Drop user_feedbacks table
DROP TABLE IF EXISTS user_feedbacks;
