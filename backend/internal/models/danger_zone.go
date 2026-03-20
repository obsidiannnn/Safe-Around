package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DangerZone represents dynamically calculated geospatial bounding areas representing active risk zones based on aggregated crime incidents.
type DangerZone struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Boundary     string    `gorm:"type:geography(POLYGON,4326);not null" json:"-"` // Represented strictly inside the DB. When read via Go, ST_AsGeoJSON is preferred.
	RiskLevel    string    `gorm:"type:varchar(20);not null" json:"risk_level"`    // low, medium, high, critical
	CrimeCount   int       `gorm:"default:0" json:"crime_count"`
	DensityScore int       `gorm:"default:0" json:"density_score"`
	SeveritySum  int       `gorm:"default:0" json:"severity_sum"`
	Statistics   string    `gorm:"type:jsonb" json:"statistics"`
	CalculatedAt time.Time `gorm:"autoCreateTime" json:"calculated_at"`
	ValidUntil   time.Time `gorm:"not null;index" json:"valid_until"`
}

func (z *DangerZone) TableName() string {
	return "danger_zones"
}

func (z *DangerZone) BeforeCreate(tx *gorm.DB) error {
	if z.ID == uuid.Nil {
		z.ID = uuid.New()
	}
	return nil
}

// Below are stubs for bounding logic. Typically, this evaluates in DB bounds (ST_Contains)

func (z *DangerZone) ContainsPoint(lat, lng float64) bool {
	// Fallback stub: True implementation requires PostGIS evaluating ST_Contains
	return false 
}

func (z *DangerZone) GetCenterPoint() (float64, float64) {
	// Fallback stub: True implementation requires PostGIS ST_Centroid
	return 0.0, 0.0
}
