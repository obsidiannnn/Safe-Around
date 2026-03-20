package services

import (
	"context"
	"fmt"
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
	// Query database (last 5 minutes) fallback
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
