package services

import (
	"fmt"

	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"gorm.io/gorm"
)

type FeedbackService struct {
	db *gorm.DB
}

func NewFeedbackService(db *gorm.DB) *FeedbackService {
	return &FeedbackService{db: db}
}

// SubmitFeedback creates a new feedback entry and updates user ratings
func (s *FeedbackService) SubmitFeedback(feedback *models.UserFeedback) error {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create the feedback record
	if err := tx.Create(feedback).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to create feedback: %w", err)
	}

	// Update responder ratings if this is responder feedback
	if feedback.ResponderID != nil {
		if err := s.updateUserRatings(tx, *feedback.ResponderID); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to update user ratings: %w", err)
		}
	}

	return tx.Commit().Error
}

// updateUserRatings recalculates and updates user rating statistics
func (s *FeedbackService) updateUserRatings(tx *gorm.DB, userID uint) error {
	var stats struct {
		TotalRatings   int64
		AverageRating  float64
		FiveStarCount  int64
		FourStarCount  int64
		ThreeStarCount int64
		TwoStarCount   int64
		OneStarCount   int64
	}

	// Calculate rating statistics
	if err := tx.Model(&models.UserFeedback{}).
		Select(`
			COUNT(*) as total_ratings,
			AVG(rating::decimal) as average_rating,
			COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
			COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
			COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
			COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
			COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
		`).
		Where("responder_id = ? AND deleted_at IS NULL", userID).
		Scan(&stats).Error; err != nil {
		return fmt.Errorf("failed to calculate rating statistics: %w", err)
	}

	// Update user record with new statistics
	updates := map[string]interface{}{
		"total_ratings":     stats.TotalRatings,
		"average_rating":    stats.AverageRating,
		"five_star_count":   stats.FiveStarCount,
		"four_star_count":   stats.FourStarCount,
		"three_star_count":  stats.ThreeStarCount,
		"two_star_count":    stats.TwoStarCount,
		"one_star_count":    stats.OneStarCount,
	}

	if err := tx.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update user rating statistics: %w", err)
	}

	return nil
}

// GetUserRatingStats returns detailed rating statistics for a user
func (s *FeedbackService) GetUserRatingStats(userID uint) (*UserRatingStats, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Get recent feedback
	var recentFeedback []models.UserFeedback
	if err := s.db.Where("responder_id = ?", userID).
		Order("created_at DESC").
		Limit(10).
		Find(&recentFeedback).Error; err != nil {
		return nil, fmt.Errorf("failed to get recent feedback: %w", err)
	}

	return &UserRatingStats{
		UserID:         user.ID,
		AverageRating:  user.AverageRating,
		TotalRatings:   user.TotalRatings,
		FiveStarCount:  user.FiveStarCount,
		FourStarCount:  user.FourStarCount,
		ThreeStarCount: user.ThreeStarCount,
		TwoStarCount:   user.TwoStarCount,
		OneStarCount:   user.OneStarCount,
		RecentFeedback: recentFeedback,
	}, nil
}

// GetTopRatedUsers returns users with highest ratings
func (s *FeedbackService) GetTopRatedUsers(limit int) ([]models.User, error) {
	var users []models.User
	if err := s.db.Where("total_ratings >= ?", 5). // Minimum 5 ratings to be considered
		Order("average_rating DESC, total_ratings DESC").
		Limit(limit).
		Find(&users).Error; err != nil {
		return nil, fmt.Errorf("failed to get top rated users: %w", err)
	}

	return users, nil
}

type UserRatingStats struct {
	UserID         uint                    `json:"user_id"`
	AverageRating  float64                 `json:"average_rating"`
	TotalRatings   int                     `json:"total_ratings"`
	FiveStarCount  int                     `json:"five_star_count"`
	FourStarCount  int                     `json:"four_star_count"`
	ThreeStarCount int                     `json:"three_star_count"`
	TwoStarCount   int                     `json:"two_star_count"`
	OneStarCount   int                     `json:"one_star_count"`
	RecentFeedback []models.UserFeedback   `json:"recent_feedback"`
}