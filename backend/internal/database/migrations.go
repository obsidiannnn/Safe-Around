package database

import (
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"gorm.io/gorm"
)

// RunMigrations automigrates all internal structs against the active DB
func RunMigrations(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Notification{},
		&models.EmergencyContact{},
		&models.UserSession{},
	)
}
