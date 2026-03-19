package models

import (
	"time"

	"gorm.io/gorm"
)

type UserSession struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       uint           `gorm:"index;not null" json:"user_id"`
	RefreshToken string         `gorm:"not null;uniqueIndex" json:"refresh_token"`
	UserAgent    string         `json:"user_agent"`
	ClientIP     string         `json:"client_ip"`
	IsRevoked    bool           `gorm:"default:false" json:"is_revoked"`
	ExpiresAt    time.Time      `gorm:"not null" json:"expires_at"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
