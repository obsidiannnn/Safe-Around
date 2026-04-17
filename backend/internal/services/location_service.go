package services

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type LocationService struct {
	db                *gorm.DB
	redis             *redis.Client
	geofencingService *GeofencingService
	locationChan      chan *models.UserLocation
	workerPool        int
}

type NearbyUserLocation struct {
	UserID     uint      `json:"user_id"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	RecordedAt time.Time `json:"recorded_at"`
}

func NewLocationService(db *gorm.DB, redis *redis.Client, geoSvc *GeofencingService) *LocationService {
	ls := &LocationService{
		db:                db,
		redis:             redis,
		geofencingService: geoSvc,
		locationChan:      make(chan *models.UserLocation, 1000),
		workerPool:        10,
	}

	// Start worker pool for batch inserts
	for i := 0; i < ls.workerPool; i++ {
		go ls.locationWorker()
	}

	return ls
}

func (ls *LocationService) UpdateUserLocation(userID uint, loc models.UserLocation) error {
	loc.UserID = userID
	loc.RecordedAt = time.Now()

	// Send to buffer channel (non-blocking)
	select {
	case ls.locationChan <- &loc:
	default:
		// Channel full, insert directly
		ls.db.Create(&loc)
	}

	// Update Redis cache
	ls.cacheLocation(userID, loc)

	// Check if in danger zone
	zone, err := ls.geofencingService.CheckDangerZone(loc.Location.Latitude, loc.Location.Longitude)
	if err == nil && zone != nil {
		ls.geofencingService.NotifyDangerZoneEntry(userID, zone.ID)
	}

	return nil
}

func (ls *LocationService) locationWorker() {
	buffer := make([]*models.UserLocation, 0, 100)
	ticker := time.NewTicker(10 * time.Second)

	for {
		select {
		case loc := <-ls.locationChan:
			buffer = append(buffer, loc)

			// Batch insert when buffer full
			if len(buffer) >= 100 {
				ls.batchInsertLocations(buffer)
				buffer = buffer[:0]
			}

		case <-ticker.C:
			// Insert remaining locations periodically
			if len(buffer) > 0 {
				ls.batchInsertLocations(buffer)
				buffer = buffer[:0]
			}
		}
	}
}

func (ls *LocationService) batchInsertLocations(locations []*models.UserLocation) error {
	// GORM CreateInBatches optimizes multi-row inserts natively
	return ls.db.CreateInBatches(locations, 100).Error
}

func (ls *LocationService) GetCurrentLocation(userID uint) (*models.UserLocation, error) {
	// Try Redis cache first (faster and includes recently updated locations)
	key := fmt.Sprintf("location:user_%d", userID)
	ctx := context.Background()
	
	if exists, _ := ls.redis.Exists(ctx, key).Result(); exists == 1 {
		data, err := ls.redis.HGetAll(ctx, key).Result()
		if err == nil && len(data) > 0 {
			lat, latErr := strconv.ParseFloat(data["lat"], 64)
			lng, lngErr := strconv.ParseFloat(data["lng"], 64)
			ts, tsErr := strconv.ParseInt(data["ts"], 10, 64)
			
			if latErr == nil && lngErr == nil && tsErr == nil {
				return &models.UserLocation{
					UserID: userID,
					Location: models.Location{
						Latitude:  lat,
						Longitude: lng,
					},
					RecordedAt: time.Unix(ts, 0),
				}, nil
			}
		}
	}
	
	// Fallback to database (last 5 minutes)
	var location models.UserLocation
	err := ls.db.Where("user_id = ? AND recorded_at > ?", userID, time.Now().Add(-5*time.Minute)).
		Order("recorded_at DESC").
		First(&location).Error

	if err != nil {
		return nil, err
	}

	// Cache for 1 hour actively
	ls.cacheLocation(userID, location)

	return &location, nil
}

func (ls *LocationService) GetNearbyUsers(lat, lng float64, radius int) ([]uint, error) {
	query := `
	SELECT DISTINCT user_id
	FROM user_locations
	WHERE ST_DWithin(
		location::geography,
		ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
		?
	)
	AND recorded_at > NOW() - INTERVAL '5 minutes'
	`

	var userIDs []uint
	// Note: GORM uses ? for interpolation normally over $1, $2
	err := ls.db.Raw(query, lng, lat, radius).Scan(&userIDs).Error
	return userIDs, err
}

func (ls *LocationService) GetNearbyUserLocations(lat, lng float64, radius int, excludeUserID uint) ([]NearbyUserLocation, error) {
	query := `
	WITH latest_locations AS (
		SELECT DISTINCT ON (user_id)
			user_id,
			ST_Y(location::geometry) AS latitude,
			ST_X(location::geometry) AS longitude,
			recorded_at
		FROM user_locations
		WHERE recorded_at > NOW() - INTERVAL '10 minutes'
		ORDER BY user_id, recorded_at DESC
	)
	SELECT user_id, latitude, longitude, recorded_at
	FROM latest_locations
	WHERE user_id <> ?
	  AND ST_DWithin(
		ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
		ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
		?
	  )
	ORDER BY ST_Distance(
		ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
		ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
	  ) ASC, recorded_at DESC
	`

	var users []NearbyUserLocation
	err := ls.db.Raw(query, excludeUserID, lng, lat, radius, lng, lat).Scan(&users).Error
	return users, err
}

func (ls *LocationService) cacheLocation(userID uint, loc models.UserLocation) {
	key := fmt.Sprintf("location:user_%d", userID)
	data := map[string]interface{}{
		"lat": loc.Location.Latitude,
		"lng": loc.Location.Longitude,
		"ts":  loc.RecordedAt.Unix(),
	}
	ls.redis.HSet(context.Background(), key, data)
	ls.redis.Expire(context.Background(), key, time.Hour)
}
