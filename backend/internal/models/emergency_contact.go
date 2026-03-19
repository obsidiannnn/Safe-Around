package models

import (
	"time"

	"gorm.io/gorm"
)

type EmergencyContact struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       uint           `gorm:"index;not null" json:"user_id"`
	Name         string         `gorm:"not null" json:"name"`
	Phone        string         `gorm:"not null" json:"phone"`
	Relationship string         `json:"relationship"`
	IsPriority   bool           `gorm:"default:false" json:"is_priority"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
