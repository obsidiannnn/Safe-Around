package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Name             string         `json:"name,omitempty"`
	Phone            string         `gorm:"uniqueIndex;not null" json:"phone"`
	Email            string         `gorm:"uniqueIndex" json:"email,omitempty"`
	Password         string         `json:"-"`
	IsPhoneVerified  bool           `gorm:"default:false" json:"is_phone_verified"`
	SubscriptionTier        string         `gorm:"type:varchar(20);default:'free'" json:"subscription_tier"` // free, pro, enterprise
	TotalAlertsTriggered    int            `gorm:"default:0" json:"total_alerts_triggered"`
	PeopleHelpedCount       int            `gorm:"default:0" json:"people_helped_count"`
	TrustLevelScore         float64        `gorm:"default:90.0" json:"trust_level_score"` // 0-100 score
	ProfilePictureURL       string         `gorm:"type:varchar(512)" json:"profile_picture_url"`
	
	// Rating statistics
	AverageRating    float64 `gorm:"type:decimal(3,2);default:0.00" json:"average_rating"`
	TotalRatings     int     `gorm:"default:0" json:"total_ratings"`
	FiveStarCount    int     `gorm:"default:0" json:"five_star_count"`
	FourStarCount    int     `gorm:"default:0" json:"four_star_count"`
	ThreeStarCount   int     `gorm:"default:0" json:"three_star_count"`
	TwoStarCount     int     `gorm:"default:0" json:"two_star_count"`
	OneStarCount     int     `gorm:"default:0" json:"one_star_count"`
	
	LastLogin               *time.Time     `json:"last_login,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}
