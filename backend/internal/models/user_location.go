package models

import (
	"time"
)

// UserLocation tracks high-frequency telemetry from devices to understand movement and routing continuously.
// In a high-scale production system, this table is partitioned by month.
type UserLocation struct {
	ID             int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         uint      `gorm:"not null;index" json:"user_id"`
	Location       Location  `gorm:"type:geography(POINT,4326);not null" json:"location"`
	Accuracy       float64   `json:"accuracy"`
	Altitude       float64   `json:"altitude"`
	Speed          float64   `json:"speed"`
	Heading        float64   `json:"heading"`
	BatteryLevel   string    `gorm:"type:varchar(20)" json:"battery_level"`
	NetworkType    string    `gorm:"type:varchar(20)" json:"network_type"`
	RecordedAt     time.Time `gorm:"index;not null" json:"recorded_at"`
	LocationSource string    `gorm:"type:varchar(20)" json:"location_source"` // gps, network, wifi
}

func (UserLocation) TableName() string {
	return "user_locations"
}
