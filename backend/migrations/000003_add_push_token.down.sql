-- Rollback: Remove push_token column
DROP INDEX IF EXISTS idx_users_push_token;
ALTER TABLE users DROP COLUMN IF EXISTS push_token;
