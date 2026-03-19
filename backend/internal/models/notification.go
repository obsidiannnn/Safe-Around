package models

import (
	"time"

	"gorm.io/gorm"
)

type Notification struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"index;not null" json:"user_id"`
	Title     string         `gorm:"not null" json:"title"`
	Body      string         `gorm:"not null" json:"body"`
	Type      string         `gorm:"index;not null" json:"type"` // e.g., 'alert', 'system'
	Status    string         `gorm:"index;default:'pending'" json:"status"` // 'pending', 'sent', 'failed'
	MessageID string         `json:"message_id,omitempty"` // populated if sent via FCM
	Error     string         `json:"error,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
