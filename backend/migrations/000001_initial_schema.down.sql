-- Rollback initial schema

DROP INDEX IF EXISTS idx_user_sessions_refresh_token;
DROP INDEX IF EXISTS idx_emergency_contacts_user_id;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_users_phone;

DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS emergency_contacts;
DROP TABLE IF EXISTS users;
