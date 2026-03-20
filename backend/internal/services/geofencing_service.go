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
