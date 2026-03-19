package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name            string         `json:"name,omitempty"`
	Phone           string         `gorm:"uniqueIndex;not null" json:"phone"`
	Email           string         `gorm:"uniqueIndex" json:"email,omitempty"`
	Password        string         `json:"-"`
	IsPhoneVerified bool           `gorm:"default:false" json:"is_phone_verified"`
	LastLogin *time.Time     `json:"last_login,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
