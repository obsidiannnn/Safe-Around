package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EmergencyAlert tracks the core SOS alert
type EmergencyAlert struct {
	ID                uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID            uint       `gorm:"not null;index" json:"user_id"` // Matches User.ID uint
	AlertLocation     Location   `gorm:"type:geography(POINT,4326);not null" json:"alert_location"`
	AlertType         string     `gorm:"type:varchar(50);default:'emergency'" json:"alert_type"`
	AlertStatus       string     `gorm:"type:varchar(50);default:'active';index" json:"alert_status"`
	CurrentRadius     int        `gorm:"default:100" json:"current_radius"`
	MaxRadiusReached  int        `gorm:"default:1000" json:"max_radius_reached"`
	UsersNotified     int        `gorm:"default:0" json:"users_notified"`
	SilentMode        bool       `gorm:"default:false" json:"silent_mode"`
	AudioRecordingURL string     `gorm:"type:text" json:"audio_recording_url"`
	Metadata          *string    `gorm:"type:jsonb" json:"metadata,omitempty"` // JSON mapped as *string to allow NULL
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	ResolvedAt        *time.Time `json:"resolved_at,omitempty"`
	CancelledAt       *time.Time `json:"cancelled_at,omitempty"`
}

func (e *EmergencyAlert) TableName() string {
	return "emergency_alerts"
}

func (e *EmergencyAlert) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

func (e *EmergencyAlert) CanExpand() bool {
	// Active or responding alerts can expand if needed
	return e.AlertStatus == "active" || e.AlertStatus == "responding"
}

func (e *EmergencyAlert) GetNextRadius() int {
	switch {
	case e.CurrentRadius < 250:
		return 250
	case e.CurrentRadius < 500:
		return 500
	case e.CurrentRadius < 1000:
		return 1000
	default:
		return e.CurrentRadius
	}
}
