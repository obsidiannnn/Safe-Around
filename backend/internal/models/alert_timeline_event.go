package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AlertTimelineEvent establishes an audit log and progression tracker for Emergency Alerts
type AlertTimelineEvent struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	AlertID         uuid.UUID `gorm:"type:uuid;not null;index" json:"alert_id"`
	EventType       string    `gorm:"type:varchar(100);not null" json:"event_type"` // created, radius_expanded, responder_accepted, etc.
	RadiusAtEvent   int       `gorm:"default:0" json:"radius_at_event"`
	UsersNotified   int       `gorm:"default:0" json:"users_notified"`
	RespondersCount int       `gorm:"default:0" json:"responders_count"`
	EventData       string    `gorm:"type:jsonb" json:"event_data"` // Store contextual info via JSON strings
	OccurredAt      time.Time `gorm:"autoCreateTime;index" json:"occurred_at"` // index on (alert_id, occurred_at DESC) natively covered if declared explicitly later
}

func (t *AlertTimelineEvent) TableName() string {
	return "alert_timeline_events"
}

func (t *AlertTimelineEvent) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
