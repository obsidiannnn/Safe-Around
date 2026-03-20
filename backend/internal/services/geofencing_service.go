package services

import (
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"gorm.io/gorm"
)

type GeofencingService struct {
	db *gorm.DB
}

func NewGeofencingService(db *gorm.DB) *GeofencingService {
	return &GeofencingService{db: db}
}

// GetNearbyUsers finds users within radiusMeters using PostGIS ST_DWithin
func (s *GeofencingService) GetNearbyUsers(lat, lng float64, radiusMeters int) ([]models.User, error) {
	var users []models.User
	// Basic stub for successful compilation bridging
	return users, nil
}

// GetUsersInRing finds users between oldRadius and newRadius
func (s *GeofencingService) GetUsersInRing(lat, lng float64, oldRadius, newRadius int) ([]models.User, error) {
	var users []models.User
	// Basic stub for successful compilation bridging
	return users, nil
}
