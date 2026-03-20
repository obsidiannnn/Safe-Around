package database

import (
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"gorm.io/gorm"
)

// RunMigrations automigrates all internal structs against the active DB
func RunMigrations(db *gorm.DB) error {
	err := db.AutoMigrate(
		&models.User{},
		&models.Notification{},
		&models.EmergencyContact{},
		&models.UserSession{},
		&models.EmergencyAlert{},
		&models.AlertResponse{},
		&models.AlertEscalation{},
		&models.AlertTimelineEvent{},
	)
	if err != nil {
		return err
	}

	// PostGIS spatial indexes
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_emergency_alerts_location ON emergency_alerts USING GIST(alert_location);`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(alert_status) WHERE alert_status IN ('active', 'responding');`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_alert_responses_alert ON alert_responses(alert_id, response_status);`)

	return nil
}
