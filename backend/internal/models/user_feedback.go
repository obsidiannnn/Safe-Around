package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserFeedback stores detailed feedback from emergency resolution
type UserFeedback struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	AlertID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"alert_id"`
	UserID      uint       `gorm:"not null;index" json:"user_id"` // Person who gave feedback
	ResponderID *uint      `gorm:"index" json:"responder_id,omitempty"` // Person being rated (if applicable)
	Rating      int        `gorm:"not null;check:rating >= 1 AND rating <= 5" json:"rating"` // 1-5 stars
	Feedback    string     `gorm:"type:text" json:"feedback,omitempty"` // Optional text feedback
	SummaryNote string     `gorm:"type:text" json:"summary_note,omitempty"` // Optional summary
	WasHelpful  *bool      `json:"was_helpful,omitempty"` // Was the response helpful?
	FeedbackType string    `gorm:"type:varchar(50);not null" json:"feedback_type"` // 'resolution', 'responder', 'system'
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (f *UserFeedback) TableName() string {
	return "user_feedbacks"
}

func (f *UserFeedback) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}