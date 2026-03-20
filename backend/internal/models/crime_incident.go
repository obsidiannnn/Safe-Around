package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CrimeIncident struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Type        string         `gorm:"type:varchar(100);not null;index" json:"type"`
	Severity    float64        `gorm:"not null" json:"severity"`
	Location    string         `gorm:"type:geometry(Point,4326);not null;index:idx_crime_location,type:gist" json:"-"`
	Description string         `gorm:"type:text" json:"description"`
	OccurredAt  time.Time      `gorm:"not null;index" json:"occurred_at"`
	Verified    bool           `gorm:"default:false" json:"verified"`
	Source      string         `gorm:"type:varchar(50);default:'user'" json:"source"` // 'police' or 'user'
	ReportedBy  *uint          `json:"reported_by,omitempty"`                          // Foreign key to users
	User        *User          `gorm:"foreignKey:ReportedBy" json:"user,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
