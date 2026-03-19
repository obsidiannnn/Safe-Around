package repository

import (
	"errors"
	"time"

	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"gorm.io/gorm"
)

var ErrSessionNotFound = errors.New("session not found")

type SessionRepo interface {
	Create(session *models.UserSession) error
	GetByRefreshToken(token string) (*models.UserSession, error)
	GetByUserID(userID uint) ([]*models.UserSession, error)
	Revoke(token string) error
	RevokeAllForUser(userID uint) error
	DeleteExpired() error
}

type sessionRepo struct {
	db *gorm.DB
}

func NewSessionRepo(db *gorm.DB) SessionRepo {
	return &sessionRepo{db: db}
}

func (r *sessionRepo) Create(session *models.UserSession) error {
	return r.db.Create(session).Error
}

func (r *sessionRepo) GetByRefreshToken(token string) (*models.UserSession, error) {
	var s models.UserSession
	err := r.db.Where("refresh_token = ? AND is_revoked = false", token).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSessionNotFound
		}
		return nil, err
	}
	// Check expiry
	if time.Now().After(s.ExpiresAt) {
		return nil, ErrSessionNotFound
	}
	return &s, nil
}

func (r *sessionRepo) GetByUserID(userID uint) ([]*models.UserSession, error) {
	var sessions []*models.UserSession
	err := r.db.Where("user_id = ? AND is_revoked = false AND expires_at > ?", userID, time.Now()).
		Find(&sessions).Error
	return sessions, err
}

func (r *sessionRepo) Revoke(token string) error {
	return r.db.Model(&models.UserSession{}).
		Where("refresh_token = ?", token).
		Update("is_revoked", true).Error
}

func (r *sessionRepo) RevokeAllForUser(userID uint) error {
	return r.db.Model(&models.UserSession{}).
		Where("user_id = ?", userID).
		Update("is_revoked", true).Error
}

func (r *sessionRepo) DeleteExpired() error {
	return r.db.Where("expires_at < ? OR is_revoked = true", time.Now()).
		Delete(&models.UserSession{}).Error
}
