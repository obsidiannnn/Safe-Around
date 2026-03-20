-- =============================================================================
-- SafeAround Complete Database Schema
-- =============================================================================
-- Run with: psql $DATABASE_URL -f schema.sql
-- Requires: PostgreSQL 14+, PostGIS 3+
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- Helper: Auto-update updated_at on any row change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number               VARCHAR(20)  UNIQUE NOT NULL,
    email                      VARCHAR(255) UNIQUE,
    full_name                  VARCHAR(255) NOT NULL,
    password_hash              VARCHAR(255) NOT NULL,
    date_of_birth              DATE,
    gender                     VARCHAR(20),
    location_sharing_enabled   BOOLEAN      DEFAULT true,
    alert_radius_preference    INT          DEFAULT 100,
    dnd_mode_enabled           BOOLEAN      DEFAULT false,
    trust_score                INT          DEFAULT 100,
    account_status             VARCHAR(20)  DEFAULT 'active',
    phone_verified             BOOLEAN      DEFAULT false,
    email_verified             BOOLEAN      DEFAULT false,
    last_active_at             TIMESTAMP,
    created_at                 TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone  ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(account_status) WHERE account_status = 'active';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- emergency_contacts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name   VARCHAR(255) NOT NULL,
    phone_number   VARCHAR(20)  NOT NULL,
    relationship   VARCHAR(100),
    is_primary     BOOLEAN      DEFAULT false,
    notify_on_alert BOOLEAN     DEFAULT true,
    priority_order INT          DEFAULT 1,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user    ON emergency_contacts(user_id, priority_order);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_primary ON emergency_contacts(user_id, is_primary) WHERE is_primary = true;

CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- user_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       VARCHAR(255) NOT NULL,
    device_platform VARCHAR(20),
    fcm_token       TEXT,
    apns_token      TEXT,
    device_info     JSONB,
    refresh_token   TEXT         UNIQUE,
    is_active       BOOLEAN      DEFAULT true,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMP    NOT NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user    ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device  ON user_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = true;

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- user_locations  (partitioned by month)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_locations (
    id              BIGSERIAL,
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy        FLOAT,
    altitude        FLOAT,
    speed           FLOAT,
    heading         FLOAT,
    battery_level   VARCHAR(10),
    network_type    VARCHAR(20),
    location_source VARCHAR(20),
    recorded_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Current + next 2 months (extend via cron)
CREATE TABLE IF NOT EXISTS user_locations_2026_03 PARTITION OF user_locations
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS user_locations_2026_04 PARTITION OF user_locations
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS user_locations_2026_05 PARTITION OF user_locations
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX IF NOT EXISTS idx_user_locations_user_time ON user_locations(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_locations_location  ON user_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_user_locations_recent    ON user_locations(recorded_at)
    WHERE recorded_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- ---------------------------------------------------------------------------
-- emergency_alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES users(id),
    alert_location      GEOGRAPHY(POINT, 4326) NOT NULL,
    alert_type          VARCHAR(50)  DEFAULT 'emergency',
    alert_status        VARCHAR(50)  DEFAULT 'active',
    current_radius      INT          DEFAULT 100,
    max_radius_reached  INT          DEFAULT 100,
    users_notified      INT          DEFAULT 0,
    silent_mode         BOOLEAN      DEFAULT false,
    audio_recording_url TEXT,
    metadata            JSONB,
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    resolved_at         TIMESTAMP,
    cancelled_at        TIMESTAMP,
    cancellation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user     ON emergency_alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status   ON emergency_alerts(alert_status)
    WHERE alert_status IN ('active', 'responding');
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_location ON emergency_alerts USING GIST(alert_location);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_created  ON emergency_alerts(created_at DESC);

CREATE TRIGGER update_emergency_alerts_updated_at BEFORE UPDATE ON emergency_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- alert_responses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_responses (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id                  UUID        NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
    responder_user_id         UUID        NOT NULL REFERENCES users(id),
    response_status           VARCHAR(50) NOT NULL,
    responder_location        GEOGRAPHY(POINT, 4326),
    estimated_arrival_minutes INT,
    distance_meters           FLOAT,
    responded_at              TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    arrived_at                TIMESTAMP,
    response_rating           INT         CHECK (response_rating BETWEEN 1 AND 5),
    response_feedback         TEXT
);

CREATE INDEX IF NOT EXISTS idx_alert_responses_alert     ON alert_responses(alert_id, response_status);
CREATE INDEX IF NOT EXISTS idx_alert_responses_responder ON alert_responses(responder_user_id, responded_at DESC);

-- ---------------------------------------------------------------------------
-- alert_escalations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_escalations (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id             UUID         NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
    escalation_type      VARCHAR(50)  NOT NULL,
    escalation_status    VARCHAR(50)  DEFAULT 'pending',
    escalation_payload   JSONB,
    external_reference_id VARCHAR(255),
    escalated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_escalations_alert ON alert_escalations(alert_id);

-- ---------------------------------------------------------------------------
-- alert_timeline_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_timeline_events (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id         UUID        NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
    event_type       VARCHAR(50) NOT NULL,
    radius_at_event  INT,
    users_notified   INT,
    responders_count INT,
    event_data       JSONB,
    occurred_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_timeline_alert ON alert_timeline_events(alert_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- crime_sources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crime_sources (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name           VARCHAR(255) NOT NULL,
    source_type           VARCHAR(50)  NOT NULL,  -- api, scraper, user_report
    api_endpoint          TEXT,
    auth_config           JSONB,
    reliability_score     INT          DEFAULT 100,
    is_active             BOOLEAN      DEFAULT true,
    last_successful_fetch TIMESTAMP,
    created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crime_sources_active ON crime_sources(is_active) WHERE is_active = true;

CREATE TRIGGER update_crime_sources_updated_at BEFORE UPDATE ON crime_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- crime_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crime_categories (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name    VARCHAR(100) NOT NULL UNIQUE,
    category_code    VARCHAR(20)  NOT NULL UNIQUE,
    default_severity INT         CHECK (default_severity BETWEEN 1 AND 4),
    icon_name        VARCHAR(50),
    color_hex        VARCHAR(7)
);

-- ---------------------------------------------------------------------------
-- crime_incidents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crime_incidents (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id     UUID          REFERENCES crime_sources(id),
    category_id   UUID          REFERENCES crime_categories(id),
    location      GEOGRAPHY(POINT, 4326) NOT NULL,
    incident_type VARCHAR(100)  NOT NULL,
    severity      INT           CHECK (severity BETWEEN 1 AND 4),
    description   TEXT,
    address       TEXT,
    metadata      JSONB,
    verified      BOOLEAN       DEFAULT false,
    occurred_at   TIMESTAMP     NOT NULL,
    reported_at   TIMESTAMP,
    scraped_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crime_incidents_location ON crime_incidents USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_occurred ON crime_incidents(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_type     ON crime_incidents(incident_type, severity);
CREATE INDEX IF NOT EXISTS idx_crime_incidents_verified ON crime_incidents(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_crime_incidents_recent   ON crime_incidents(occurred_at)
    WHERE occurred_at > CURRENT_TIMESTAMP - INTERVAL '30 days';
-- Full-text on description for NLP pipeline lookups
CREATE INDEX IF NOT EXISTS idx_crime_incidents_description ON crime_incidents USING GIN(to_tsvector('english', COALESCE(description, '')));

-- ---------------------------------------------------------------------------
-- danger_zones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS danger_zones (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    boundary      GEOGRAPHY(POLYGON, 4326) NOT NULL,
    risk_level    VARCHAR(20)   NOT NULL,  -- low, medium, high, critical
    crime_count   INT           DEFAULT 0,
    density_score FLOAT,
    severity_sum  INT,
    statistics    JSONB,
    calculated_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    valid_until   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_danger_zones_boundary ON danger_zones USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_danger_zones_risk     ON danger_zones(risk_level) WHERE valid_until > CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_danger_zones_valid    ON danger_zones(valid_until);

-- ---------------------------------------------------------------------------
-- notification_logs  (partitioned by week)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_logs (
    id                UUID,
    user_id           UUID         NOT NULL REFERENCES users(id),
    notification_type VARCHAR(50),
    title             VARCHAR(255),
    body              TEXT,
    data              JSONB,
    channel           VARCHAR(20),
    device_token      TEXT,
    status            VARCHAR(20)  DEFAULT 'pending',
    external_id       VARCHAR(255),
    retry_count       INT          DEFAULT 0,
    alert_id          UUID         REFERENCES emergency_alerts(id),
    sent_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    delivered_at      TIMESTAMP,
    read_at           TIMESTAMP,
    error             TEXT,
    PRIMARY KEY (id, sent_at)
) PARTITION BY RANGE (sent_at);

-- Rolling 4-week partitions
CREATE TABLE IF NOT EXISTS notification_logs_2026_w12 PARTITION OF notification_logs
    FOR VALUES FROM ('2026-03-16') TO ('2026-03-23');
CREATE TABLE IF NOT EXISTS notification_logs_2026_w13 PARTITION OF notification_logs
    FOR VALUES FROM ('2026-03-23') TO ('2026-03-30');
CREATE TABLE IF NOT EXISTS notification_logs_2026_w14 PARTITION OF notification_logs
    FOR VALUES FROM ('2026-03-30') TO ('2026-04-06');
CREATE TABLE IF NOT EXISTS notification_logs_2026_w15 PARTITION OF notification_logs
    FOR VALUES FROM ('2026-04-06') TO ('2026-04-13');

CREATE INDEX IF NOT EXISTS idx_notification_logs_user   ON notification_logs(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type   ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status) WHERE status != 'delivered';
CREATE INDEX IF NOT EXISTS idx_notification_logs_alert  ON notification_logs(alert_id) WHERE alert_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Materialized view: heatmap grid (refreshed by cron)
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_heatmap_grid AS
SELECT
    FLOOR(ST_X(location::geometry) / 0.01)::INT  AS grid_x,
    FLOOR(ST_Y(location::geometry) / 0.01)::INT  AS grid_y,
    COUNT(*)::INT                                 AS incident_count,
    SUM(severity)::INT                            AS severity_total,
    AVG(severity)::FLOAT                          AS avg_severity,
    MAX(occurred_at)                              AS last_incident
FROM crime_incidents
WHERE occurred_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND verified = true
GROUP BY grid_x, grid_y;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_heatmap_grid ON mv_heatmap_grid(grid_x, grid_y);

-- ---------------------------------------------------------------------------
-- Permissions  (apply after creating role in setup)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'safearound_user') THEN
        GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO safearound_user;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO safearound_user;
        GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO safearound_user;
    END IF;
END$$;
