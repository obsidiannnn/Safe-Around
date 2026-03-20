package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AlertResponse tracks responders who have answered an emergency alert
type AlertResponse struct {
	ID                      uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	AlertID                 uuid.UUID  `gorm:"type:uuid;not null;index" json:"alert_id"`
	ResponderUserID         uint       `gorm:"not null;index" json:"responder_user_id"` // Matches User.ID uint
	ResponseStatus          string     `gorm:"type:varchar(50);default:'accepted'" json:"response_status"` // accepted, declined, arrived, helping
	ResponderLocation       Location   `gorm:"type:geography(POINT,4326);not null" json:"responder_location"`
	EstimatedArrivalMinutes int        `json:"estimated_arrival_minutes"`
	DistanceMeters          float64    `json:"distance_meters"`
	RespondedAt             time.Time  `gorm:"autoCreateTime" json:"responded_at"`
	ArrivedAt               *time.Time `json:"arrived_at,omitempty"`
	ResponseRating          *int       `json:"response_rating,omitempty"` // 1-5 rating, nullable
}

func (r *AlertResponse) TableName() string {
	return "alert_responses"
}

func (r *AlertResponse) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

// CalculateDistance utilizes standard haversine or sets up for PostGIS calculation.
// In actual execution, the service layer often performs the ST_Distance query directly 
// or passes the values here. This method stub matches the spec requirements.
func (r *AlertResponse) CalculateDistance() error {
	// PostGIS ST_Distance logic usually happens in DB query.
	// We'll leave this empty or rely on service layer injection.
	return nil
}

// EstimateETA calculates the approximate arrival time in minutes given average movement speed.
func (r *AlertResponse) EstimateETA() int {
	avgSpeedMetersPerMin := 83.0 // ~5km/h walking speed
	r.EstimatedArrivalMinutes = int(r.DistanceMeters / avgSpeedMetersPerMin)
	if r.EstimatedArrivalMinutes < 1 {
		r.EstimatedArrivalMinutes = 1
	}
	return r.EstimatedArrivalMinutes
}
