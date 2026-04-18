package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type GeofencingService struct {
	db                  *gorm.DB
	redis               *redis.Client
	notificationService NotificationService
}

const responderFreshnessWindow = "5 minutes"

func NewGeofencingService(db *gorm.DB, rdb *redis.Client, notifSvc NotificationService) *GeofencingService {
	return &GeofencingService{
		db:                  db,
		redis:               rdb,
		notificationService: notifSvc,
	}
}

// GetNearbyUsers finds users within radiusMeters using PostGIS ST_DWithin
func (gs *GeofencingService) GetNearbyUsers(lat, lng float64, radiusMeters int) ([]models.User, error) {
	var users []models.User
	query := `
	SELECT DISTINCT u.* FROM users u
	JOIN user_locations ul ON u.id = ul.user_id
	WHERE ST_DWithin(
		ul.location::geography,
		ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
		?
	)
	AND ul.recorded_at > NOW() - INTERVAL '5 minutes'
	`
	err := gs.db.Raw(query, lng, lat, radiusMeters).Scan(&users).Error
	return users, err
}

func (gs *GeofencingService) GetDispatchCandidates(lat, lng float64, radiusMeters int) ([]models.User, error) {
	var users []models.User
	query := `
	WITH latest_locations AS (
		SELECT
			ul.user_id,
			ul.location,
			ul.recorded_at,
			COALESCE(NULLIF(ul.accuracy, 0), 25) AS accuracy,
			ROW_NUMBER() OVER (PARTITION BY ul.user_id ORDER BY ul.recorded_at DESC) AS rn
		FROM user_locations ul
		WHERE ul.recorded_at > NOW() - INTERVAL '` + responderFreshnessWindow + `'
	),
	eligible_candidates AS (
		SELECT
			u.*,
			ST_Distance(
				ll.location::geography,
				ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
			) AS distance_meters,
			EXTRACT(EPOCH FROM (NOW() - ll.recorded_at)) AS freshness_seconds,
			ll.accuracy,
			(
				LEAST(60, GREATEST(0, 60 - (ST_Distance(
					ll.location::geography,
					ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
				) / 10.0))) +
				LEAST(20, GREATEST(0, 20 - EXTRACT(EPOCH FROM (NOW() - ll.recorded_at)) / 6.0)) +
				LEAST(15, COALESCE(u.trust_level_score, 0) / 8.0) +
				LEAST(10, COALESCE(u.people_helped_count, 0)) -
				LEAST(12, ll.accuracy / 15.0)
			) AS dispatch_score
		FROM latest_locations ll
		JOIN users u ON u.id = ll.user_id
		WHERE ll.rn = 1
		  AND u.is_phone_verified = true
		  AND ST_DWithin(
			ll.location::geography,
			ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
			?
		  )
		  AND NOT EXISTS (
			SELECT 1
			FROM emergency_alerts ea
			WHERE ea.user_id = u.id
			  AND ea.alert_status IN ('active', 'responding')
		  )
		  AND NOT EXISTS (
			SELECT 1
			FROM alert_responses ar
			JOIN emergency_alerts ea ON ea.id = ar.alert_id
			WHERE ar.responder_user_id = u.id
			  AND ar.response_status IN ('accepted', 'arrived', 'helping')
			  AND ea.alert_status IN ('active', 'responding')
		  )
	)
	SELECT
		id,
		name,
		phone,
		email,
		password,
		is_phone_verified,
		subscription_tier,
		total_alerts_triggered,
		people_helped_count,
		trust_level_score,
		profile_picture_url,
		last_login,
		created_at,
		updated_at,
		deleted_at
	FROM eligible_candidates
	ORDER BY dispatch_score DESC, distance_meters ASC, freshness_seconds ASC
	LIMIT ?
	`
	err := gs.db.Raw(
		query,
		lng, lat,
		lng, lat,
		lng, lat, radiusMeters,
		gs.getDispatchLimit(radiusMeters),
	).Scan(&users).Error
	return users, err
}

// GetUsersInRing finds users between oldRadius and newRadius
func (gs *GeofencingService) GetUsersInRing(lat, lng float64, oldRadius, newRadius int) ([]models.User, error) {
	var users []models.User
	query := `
	SELECT DISTINCT u.* FROM users u
	JOIN user_locations ul ON u.id = ul.user_id
	WHERE ST_DWithin(ul.location::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
	AND NOT ST_DWithin(ul.location::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
	AND ul.recorded_at > NOW() - INTERVAL '5 minutes'
	`
	err := gs.db.Raw(query, lng, lat, newRadius, lng, lat, oldRadius).Scan(&users).Error
	return users, err
}

func (gs *GeofencingService) GetDispatchCandidatesInRing(lat, lng float64, oldRadius, newRadius int) ([]models.User, error) {
	var users []models.User
	query := `
	WITH latest_locations AS (
		SELECT
			ul.user_id,
			ul.location,
			ul.recorded_at,
			COALESCE(NULLIF(ul.accuracy, 0), 25) AS accuracy,
			ROW_NUMBER() OVER (PARTITION BY ul.user_id ORDER BY ul.recorded_at DESC) AS rn
		FROM user_locations ul
		WHERE ul.recorded_at > NOW() - INTERVAL '` + responderFreshnessWindow + `'
	),
	eligible_candidates AS (
		SELECT
			u.*,
			ST_Distance(
				ll.location::geography,
				ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
			) AS distance_meters,
			EXTRACT(EPOCH FROM (NOW() - ll.recorded_at)) AS freshness_seconds,
			ll.accuracy,
			(
				LEAST(60, GREATEST(0, 60 - (ST_Distance(
					ll.location::geography,
					ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
				) / 10.0))) +
				LEAST(20, GREATEST(0, 20 - EXTRACT(EPOCH FROM (NOW() - ll.recorded_at)) / 6.0)) +
				LEAST(15, COALESCE(u.trust_level_score, 0) / 8.0) +
				LEAST(10, COALESCE(u.people_helped_count, 0)) -
				LEAST(12, ll.accuracy / 15.0)
			) AS dispatch_score
		FROM latest_locations ll
		JOIN users u ON u.id = ll.user_id
		WHERE ll.rn = 1
		  AND u.is_phone_verified = true
		  AND ST_DWithin(
			ll.location::geography,
			ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
			?
		  )
		  AND NOT ST_DWithin(
			ll.location::geography,
			ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
			?
		  )
		  AND NOT EXISTS (
			SELECT 1
			FROM emergency_alerts ea
			WHERE ea.user_id = u.id
			  AND ea.alert_status IN ('active', 'responding')
		  )
		  AND NOT EXISTS (
			SELECT 1
			FROM alert_responses ar
			JOIN emergency_alerts ea ON ea.id = ar.alert_id
			WHERE ar.responder_user_id = u.id
			  AND ar.response_status IN ('accepted', 'arrived', 'helping')
			  AND ea.alert_status IN ('active', 'responding')
		  )
	)
	SELECT
		id,
		name,
		phone,
		email,
		password,
		is_phone_verified,
		subscription_tier,
		total_alerts_triggered,
		people_helped_count,
		trust_level_score,
		profile_picture_url,
		last_login,
		created_at,
		updated_at,
		deleted_at
	FROM eligible_candidates
	ORDER BY dispatch_score DESC, distance_meters ASC, freshness_seconds ASC
	LIMIT ?
	`
	err := gs.db.Raw(
		query,
		lng, lat,
		lng, lat,
		lng, lat, newRadius,
		lng, lat, oldRadius,
		gs.getDispatchLimit(newRadius),
	).Scan(&users).Error
	return users, err
}

func (gs *GeofencingService) getDispatchLimit(radiusMeters int) int {
	switch {
	case radiusMeters <= 100:
		return 12
	case radiusMeters <= 250:
		return 20
	case radiusMeters <= 500:
		return 30
	default:
		return 40
	}
}

func (gs *GeofencingService) CheckDangerZone(lat, lng float64) (*models.DangerZone, error) {
	// Check Redis cache
	cacheKey := fmt.Sprintf("zone:%f:%f", lat, lng)
	cached, err := gs.redis.Get(context.Background(), cacheKey).Result()
	if err == nil {
		var zone models.DangerZone
		json.Unmarshal([]byte(cached), &zone)
		return &zone, nil
	}

	// PostGIS query evaluating bounding polygon contents
	query := `
       SELECT * FROM danger_zones
       WHERE ST_Contains(boundary::geometry, ST_SetSRID(ST_MakePoint(?, ?), 4326))
       AND valid_until > NOW()
       ORDER BY risk_level DESC
       LIMIT 1
       `

	var zone models.DangerZone
	err = gs.db.Raw(query, lng, lat).First(&zone).Error
	if err != nil {
		return nil, err
	}

	// Cache for 1 hour
	data, _ := json.Marshal(zone)
	gs.redis.Set(context.Background(), cacheKey, data, time.Hour)

	return &zone, nil
}

func (gs *GeofencingService) NotifyDangerZoneEntry(userID uint, zoneID uuid.UUID) error {
	// Deduplication: Don't notify same zone within 4 hours
	dedupKey := fmt.Sprintf("geofence:alert:%d:%s", userID, zoneID)
	exists, _ := gs.redis.Exists(context.Background(), dedupKey).Result()
	if exists > 0 {
		return nil // Already notified recently
	}

	// Queue notification alert 
	gs.notificationService.QueueNotification(userID, "Danger Zone Alert", "You have entered a high risk mapped zone.", "danger_zone")

	// Set dedup flag (4 hour TTL)
	gs.redis.Set(context.Background(), dedupKey, "1", 4*time.Hour)

	return nil
}

func (gs *GeofencingService) UpdateDangerZones() error {
	query := `
       WITH grid_crimes AS (
           SELECT
               FLOOR(ST_X(location::geometry) / 0.01) as grid_x,
               FLOOR(ST_Y(location::geometry) / 0.01) as grid_y,
               COUNT(*) as crime_count,
               SUM(severity) as severity_sum,
               AVG(severity) as avg_severity
           FROM crime_incidents
           WHERE occurred_at > NOW() - INTERVAL '30 days'
             AND verified = true
           GROUP BY grid_x, grid_y
           HAVING COUNT(*) >= 5
       )
       INSERT INTO danger_zones (id, boundary, risk_level, crime_count, severity_sum, calculated_at, valid_until)
       SELECT
           gen_random_uuid(),
           ST_MakeEnvelope(
               grid_x * 0.01, 
               grid_y * 0.01,
               (grid_x + 1) * 0.01,
               (grid_y + 1) * 0.01,
               4326
           )::geography,
           CASE
               WHEN crime_count >= 50 THEN 'critical'
               WHEN crime_count >= 20 THEN 'high'
               WHEN crime_count >= 10 THEN 'medium'
               ELSE 'low'
           END,
           crime_count,
           severity_sum,
           NOW(),
           NOW() + INTERVAL '24 hours'
       FROM grid_crimes
       ON CONFLICT (id) DO UPDATE
       SET crime_count = EXCLUDED.crime_count,
           severity_sum = EXCLUDED.severity_sum,
           calculated_at = NOW()
       `
	return gs.db.Exec(query).Error
}
